import { ethers } from 'ethers';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

// Contract addresses
const TIME_ADDRESS = '0xCA35638A3fdDD02fEC597D8c1681198C06b23F58';
const EXAMPLE_TOKEN_ADDRESS = '0xAddressHere';
const PLSX_ROUTER_ADDRESS = '0xDA9aBA4eACF54E0273f56dfFee6B8F1e20B23Bba';
const WPLS_ADDRESS = '0xA1077a294dDE1B09bB078844df40758a5D0f9a27';

// TIME Token ABI (only the functions we need)
const TIME_ABI = [{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"claimableDividendOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address payable","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"claimDividend","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

// PLSX Router ABI (only the functions we need)
const PLSX_ROUTER_ABI = [{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"}],"name":"swapExactTokensForTokensV2","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"}];

// ERC20 ABI for token transfers
const ERC20_ABI = [{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

// WPLS ABI for unwrapping
const WPLS_ABI = [{"inputs":[{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

// Helper to calculate gas cost
function calculateGasCost(receipt) {
  return receipt.gasUsed * receipt.gasPrice;
}

// Helper to get user input
function getUserInput(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

class TimeDividendClaimer {
  constructor() {
    // Load configuration
    this.rpcUrls = [
      process.env.RPC_URL || 'https://rpc.pulsechain.com',
      'https://rpc.pulsechain.box',
      'https://rpc.gigatheminter.com',
      'https://rpc-pulsechain.g4mm4.io'
    ];
    this.currentRpcIndex = 0;
    this.privateKey = process.env.PRIVATE_KEY;
    this.walletAddress = process.env.WALLET_ADDRESS;
    this.thresholdPls = ethers.parseEther(process.env.THRESHOLD_PLS || '1500');
    this.compoundPercentage = parseInt(process.env.COMPOUND_PERCENTAGE || '15');
    this.buyPercentage = parseInt(process.env.BUY_PERCENTAGE || '55');
    this.exampleTokenRecipient = process.env.EXAMPLE_TOKEN_RECIPIENT_ADDRESS;
    this.claimCheckInterval = parseInt(process.env.CLAIM_CHECK_INTERVAL_MINUTES || '15') * 60 * 1000;

    // Validate configuration
    this.validateConfig();

    // Initialize provider and wallet
    this.initializeProvider();

    // Price monitoring state
    this.priceMonitoringActive = true;
    this.priceCheckInterval = 30 * 1000; // 30 seconds
    this.currentTimePriceInPls = null;
    this.startingTimePriceInPls = null;
    this.referencePriceForTrading = null; // Price from last trade or startup
    this.timePriceDelta = 0; // percentage change
    
    // Startup time tracking
    this.startTime = Date.now();
    
    // Balance tracking
    this.initialTimeBalance = null;
    this.initialPlsBalance = null;
    this.initialClaimable = null;
    
    // User configuration for trading
    this.timeIncreasePercent = null;
    this.timeDecreasePercent = null;
    this.sellPercentageOnIncrease = null;
    this.buyPercentageOnDecrease = null;
    
    // Track if we're in the middle of a claim sequence
    this.isClaimingInProgress = false;

    console.log('✅ Initialized Time Dividend Claimer');
    console.log(`📊 Monitoring wallet: ${this.walletAddress}`);
    console.log(`💰 Claim threshold: ${ethers.formatEther(this.thresholdPls)} PLS`);
    console.log(`🔄 Compound percentage (TIME): ${this.compoundPercentage}%`);
    console.log(`📈 Buy percentage (exampleToken): ${this.buyPercentage}%`);
    console.log(`💵 Keep in wallet: ${100 - this.compoundPercentage - this.buyPercentage}%`);
    console.log(`📤 exampleToken recipient: ${this.exampleTokenRecipient}`);
    console.log(`⏰ Check interval: ${this.claimCheckInterval / 60000} minutes`);
    console.log(`💱 Price check interval: ${this.priceCheckInterval / 1000} seconds`);
    console.log(`🌐 Primary RPC: ${this.rpcUrls[0]}`);
    console.log(`🔄 Backup RPCs: ${this.rpcUrls.length - 1} available\n`);
  }

  validateConfig() {
    if (!this.privateKey) {
      throw new Error('❌ PRIVATE_KEY not set in .env file');
    }
    if (!this.walletAddress) {
      throw new Error('❌ WALLET_ADDRESS not set in .env file');
    }
    if (!this.exampleTokenRecipient) {
      throw new Error('❌ EXAMPLE_TOKEN_RECIPIENT_ADDRESS not set in .env file');
    }
    if (this.compoundPercentage < 0 || this.compoundPercentage > 100) {
      throw new Error('❌ COMPOUND_PERCENTAGE must be between 0 and 100');
    }
    if (this.buyPercentage < 0 || this.buyPercentage > 100) {
      throw new Error('❌ BUY_PERCENTAGE must be between 0 and 100');
    }
    if (this.compoundPercentage + this.buyPercentage > 100) {
      throw new Error('❌ COMPOUND_PERCENTAGE + BUY_PERCENTAGE must not exceed 100');
    }
  }

  initializeProvider() {
    const rpcUrl = this.rpcUrls[this.currentRpcIndex];
    
    // Specify PulseChain network explicitly to avoid auto-detection
    const network = ethers.Network.from({
      name: 'pulsechain',
      chainId: 369
    });
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl, network, {
      staticNetwork: network
    });
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);

    // Initialize contracts
    this.timeContract = new ethers.Contract(TIME_ADDRESS, TIME_ABI, this.wallet);
    this.plsxRouter = new ethers.Contract(PLSX_ROUTER_ADDRESS, PLSX_ROUTER_ABI, this.wallet);
    this.exampleTokenContract = new ethers.Contract(EXAMPLE_TOKEN_ADDRESS, ERC20_ABI, this.wallet);
    this.wplsContract = new ethers.Contract(WPLS_ADDRESS, WPLS_ABI, this.wallet);

    // Track gas costs
    this.totalGasSpent = 0n;
  }

  async switchToNextRpc() {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcUrls.length;
    const newRpcUrl = this.rpcUrls[this.currentRpcIndex];
    console.log(`\n🔄 Switching to backup RPC: ${newRpcUrl}`);
    this.initializeProvider();
  }

  async executeWithRetry(operation, operationName) {
    const maxRetries = this.rpcUrls.length;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const isRpcError = error.code === 'SERVER_ERROR' || 
                          error.code === 'TIMEOUT' || 
                          error.code === 'NETWORK_ERROR';
        
        if (isRpcError && attempt < maxRetries - 1) {
          console.log(`⚠️  RPC error during ${operationName}, trying backup...`);
          await this.switchToNextRpc();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }

  async getClaimableDividend() {
    return await this.executeWithRetry(
      async () => await this.timeContract.claimableDividendOf(this.walletAddress),
      'getClaimableDividend'
    );
  }

  async getTimePriceInPls() {
    try {
      // Use a known TIME/WPLS pair address to get reserves directly
      // TIME/WPLS pair on PulseX V2
      const pairAddress = '0xEFab2c9c33C42960F2fF653aDb39dC5C4c10630e';
      
      const rpcUrl = this.rpcUrls[this.currentRpcIndex];
      
      // Get token0 - function selector: 0x0dfe1681
      const token0Response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: pairAddress, data: '0x0dfe1681' }, 'latest'],
          id: 1
        })
      });
      const token0Data = await token0Response.json();
      
      if (token0Data.error) {
        // Pair might not exist, silently return null
        return null;
      }
      
      if (!token0Data.result || token0Data.result === '0x') {
        return null;
      }
      
      const token0 = '0x' + token0Data.result.slice(-40);

      // Get reserves - function selector: 0x0902f1ac
      const reservesResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: pairAddress, data: '0x0902f1ac' }, 'latest'],
          id: 2
        })
      });
      const reservesData = await reservesResponse.json();
      
      if (reservesData.error || !reservesData.result || reservesData.result === '0x') {
        return null;
      }
      
      // Parse reserves from the result
      const reservesResult = reservesData.result;
      const reserve0Hex = '0x' + reservesResult.slice(2, 66);
      const reserve1Hex = '0x' + reservesResult.slice(66, 130);
      
      const reserve0 = BigInt(reserve0Hex);
      const reserve1 = BigInt(reserve1Hex);

      if (reserve0 === 0n || reserve1 === 0n) {
        return null;
      }

      // Determine which token is which and calculate price
      let timePriceInPls;
      if (token0.toLowerCase() === TIME_ADDRESS.toLowerCase()) {
        // token0 = TIME, token1 = WPLS
        // Price of TIME in PLS = reserve1 / reserve0
        timePriceInPls = parseFloat(ethers.formatEther(reserve1)) / parseFloat(ethers.formatEther(reserve0));
      } else {
        // token0 = WPLS, token1 = TIME
        // Price of TIME in PLS = reserve0 / reserve1
        timePriceInPls = parseFloat(ethers.formatEther(reserve0)) / parseFloat(ethers.formatEther(reserve1));
      }

      return timePriceInPls > 0 ? timePriceInPls : null;
    } catch (error) {
      // Silently fail for price fetching - don't spam console
      return null;
    }
  }

  async handlePriceMovement(priceChange) {
    try {
      if (this.isClaimingInProgress) {
        console.log('⏳ Claim sequence in progress, skipping trade to avoid stuck tx');
        return;
      }

      if (priceChange >= this.timeIncreasePercent) {
        // TIME increased - SELL
        console.log(`\n🚀 TIME price increased ${priceChange.toFixed(2)}% (threshold: ${this.timeIncreasePercent}%) - SELLING TIME`);
        await this.sellTimeToken(this.sellPercentageOnIncrease);
        // Update reference price after successful trade
        this.referencePriceForTrading = this.currentTimePriceInPls;
        console.log(`📍 Reference price updated to: ${this.referencePriceForTrading.toFixed(8)}`);
      } else if (priceChange <= -this.timeDecreasePercent) {
        // TIME decreased - BUY
        console.log(`\n📉 TIME price decreased ${Math.abs(priceChange).toFixed(2)}% (threshold: ${this.timeDecreasePercent}%) - BUYING TIME`);
        await this.buyTimeWithPls(this.buyPercentageOnDecrease);
        // Update reference price after successful trade
        this.referencePriceForTrading = this.currentTimePriceInPls;
        console.log(`📍 Reference price updated to: ${this.referencePriceForTrading.toFixed(8)}`);
      }
    } catch (error) {
      console.error('❌ Error handling price movement:', error.message);
    }
  }

  async sellTimeToken(sellPercentage) {
    try {
      // Get current TIME balance
      const timeBalance = await this.executeWithRetry(
        async () => await this.timeContract.balanceOf(this.walletAddress),
        'getTimeBalance'
      );

      const sellAmount = (timeBalance * BigInt(sellPercentage)) / BigInt(100);

      if (sellAmount === 0n) {
        console.log('⚠️  Sell amount too small, skipping TIME sale');
        return null;
      }

      console.log(`🔄 Selling ${ethers.formatEther(sellAmount)} TIME (${sellPercentage}% of balance)...`);

      // Check and approve TIME token for router if needed
      const allowance = await this.executeWithRetry(
        async () => await this.timeContract.allowance(this.walletAddress, PLSX_ROUTER_ADDRESS),
        'getTimeAllowance'
      );

      if (allowance < sellAmount) {
        console.log(`🔓 Approving TIME token for router...`);
        const approveTx = await this.timeContract.approve(
          PLSX_ROUTER_ADDRESS,
          ethers.MaxUint256, // Approve max amount to avoid future approvals
          { gasLimit: 100000 }
        );
        console.log(`📝 Approval transaction sent: ${approveTx.hash}`);
        await approveTx.wait();
        console.log(`✅ TIME token approved!`);
      }

      // Path: TIME -> WPLS -> native PLS using multicall for gas efficiency
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minute deadline
      const amountOutMin = 0;

      // Encode swap functions for multicall
      // First swap: TIME -> WPLS
      const swap1Data = this.plsxRouter.interface.encodeFunctionData('swapExactTokensForTokensV2', [
        sellAmount,
        amountOutMin,
        [TIME_ADDRESS, WPLS_ADDRESS],
        PLSX_ROUTER_ADDRESS, // Send WPLS to router for second swap
      ]);

      // Second swap: WPLS -> PLS (native)
      const swap2Data = this.plsxRouter.interface.encodeFunctionData('swapExactTokensForETH', [
        ethers.MaxUint256, // Will use all WPLS from previous swap (router handles this)
        amountOutMin,
        [WPLS_ADDRESS],
        this.wallet.address,
        deadline
      ]);

      // Execute both swaps in one transaction
      const tx = await this.plsxRouter.multicall(
        deadline,
        [swap1Data, swap2Data],
        {
          gasLimit: 700000
        }
      );

      console.log(`📝 TIME sale transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = calculateGasCost(receipt);
      console.log(`✅ TIME sold! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);

      return { receipt, gasCost, amountSold: sellAmount };
    } catch (error) {
      console.error('❌ Error selling TIME token:', error.message);
      return null;
    }
  }

  async buyTimeWithPls(buyPercentage) {
    try {
      // Get current PLS balance
      const plsBalance = await this.executeWithRetry(
        async () => await this.provider.getBalance(this.walletAddress),
        'getPlsBalance'
      );

      const buyAmount = (plsBalance * BigInt(buyPercentage)) / BigInt(100);

      if (buyAmount === 0n) {
        console.log('⚠️  Buy amount too small, skipping TIME purchase');
        return null;
      }

      console.log(`🔄 Buying TIME with ${ethers.formatEther(buyAmount)} PLS (${buyPercentage}% of balance)...`);

      // Path: WPLS -> TIME
      const path = [WPLS_ADDRESS, TIME_ADDRESS];
      const amountOutMin = 0;

      const tx = await this.plsxRouter.swapExactTokensForTokensV2(
        buyAmount,
        amountOutMin,
        path,
        this.wallet.address,
        {
          value: buyAmount,
          gasLimit: 500000
        }
      );

      console.log(`📝 TIME purchase transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = calculateGasCost(receipt);
      console.log(`✅ TIME purchased! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);

      return { receipt, gasCost, amountSpent: buyAmount };
    } catch (error) {
      console.error('❌ Error buying TIME with PLS:', error.message);
      return null;
    }
  }

  async monitorPrice() {
    try {
      const price = await this.getTimePriceInPls();
      
      if (!price) {
        return;
      }

      // Initialize starting price on first check
      if (this.startingTimePriceInPls === null) {
        this.startingTimePriceInPls = price;
        this.referencePriceForTrading = price;
        this.currentTimePriceInPls = price;
        const timestamp = new Date().toLocaleString();
        console.log(`\n💱 [${timestamp}] Initial TIME/PLS Price: ${price.toFixed(8)}`);
        return;
      }

      this.currentTimePriceInPls = price;
      
      // Calculate delta from startup (for display only)
      const priceDeltaPercent = ((price - this.startingTimePriceInPls) / this.startingTimePriceInPls) * 100;
      this.timePriceDelta = priceDeltaPercent;
      
      // Calculate delta from reference price (for trading decisions)
      const tradingDeltaPercent = ((price - this.referencePriceForTrading) / this.referencePriceForTrading) * 100;

      const timestamp = new Date().toLocaleString();
      const priceChangeSymbol = priceDeltaPercent >= 0 ? '📈' : '📉';
      const tradingChangeSymbol = tradingDeltaPercent >= 0 ? '📈' : '📉';
      console.log(`\n💱 [${timestamp}] TIME/PLS: ${price.toFixed(8)} (Change: ${priceChangeSymbol} ${priceDeltaPercent.toFixed(2)}% from startup, ${tradingChangeSymbol} ${tradingDeltaPercent.toFixed(2)}% from last trade)`);

      // Check if price movement threshold is crossed (using reference price)
      if (this.timeIncreasePercent && this.timeDecreasePercent) {
        await this.handlePriceMovement(tradingDeltaPercent);
      }
    } catch (error) {
      console.error('❌ Error in price monitoring:', error.message);
    }
  }

  async getSessionStats() {
    try {
      const now = Date.now();
      const sessionDuration = Math.floor((now - this.startTime) / 1000);
      const hours = Math.floor(sessionDuration / 3600);
      const minutes = Math.floor((sessionDuration % 3600) / 60);
      const seconds = sessionDuration % 60;

      const timeBalance = await this.executeWithRetry(
        async () => await this.timeContract.balanceOf(this.walletAddress),
        'getTimeBalance'
      );
      const plsBalance = await this.executeWithRetry(
        async () => await this.provider.getBalance(this.walletAddress),
        'getPlsBalance'
      );
      const claimable = await this.getClaimableDividend();

      const timeDelta = this.initialTimeBalance ? timeBalance - this.initialTimeBalance : 0n;
      const plsDelta = this.initialPlsBalance ? plsBalance - this.initialPlsBalance : 0n;

      console.log(`\n📊 === SESSION STATISTICS ===`);
      console.log(`⏱️  Time Running: ${hours}h ${minutes}m ${seconds}s`);
      console.log(`💰 PLS Balance: ${ethers.formatEther(plsBalance)} (Δ ${ethers.formatEther(plsDelta)})`);
      console.log(`🕐 TIME Balance: ${ethers.formatEther(timeBalance)} (Δ ${ethers.formatEther(timeDelta)})`);
      console.log(`📈 Claimable PLS: ${ethers.formatEther(claimable)}`);
      if (this.currentTimePriceInPls && this.startingTimePriceInPls) {
        console.log(`💱 TIME/PLS Price: ${this.currentTimePriceInPls.toFixed(8)} (Δ ${this.timePriceDelta.toFixed(2)}% from startup: ${this.startingTimePriceInPls.toFixed(8)})`);
      }
      console.log(`===========================\n`);
    } catch (error) {
      console.error('⚠️  Error getting session stats:', error.message);
    }
  }

  startPriceMonitoring() {
    if (!this.priceMonitoringActive) return;

    console.log('💱 Starting TIME/PLS price monitoring...');
    
    // Initial check
    this.monitorPrice();

    // Schedule periodic checks
    this.priceMonitorInterval = setInterval(() => {
      this.monitorPrice();
    }, this.priceCheckInterval);
  }

  stopPriceMonitoring() {
    if (this.priceMonitorInterval) {
      clearInterval(this.priceMonitorInterval);
      this.priceMonitorInterval = null;
    }
  }

  async claimDividend(amount) {
    try {
      this.isClaimingInProgress = true;
      console.log(`🔄 Claiming ${ethers.formatEther(amount)} PLS...`);
      
      // claimDividend expects the amount in wei (uint256)
      const tx = await this.timeContract.claimDividend(this.walletAddress, amount, {
        gasLimit: 300000
      });
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = calculateGasCost(receipt);
      console.log(`✅ Dividend claimed! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);
      
      return { receipt, gasCost };
    } catch (error) {
      console.error('❌ Error claiming dividend:', error.message);
      throw error;
    } finally {
      this.isClaimingInProgress = false;
    }
  }

  async buyTimeToken(claimedPlsAmount) {
    try {
      // Calculate compound amount from the CLAIMED PLS
      const compoundAmount = (claimedPlsAmount * BigInt(this.compoundPercentage)) / BigInt(100);
      
      if (compoundAmount === 0n) {
        console.log('⚠️  Compound amount too small, skipping TIME purchase');
        return null;
      }

      console.log(`🔄 Buying ${ethers.formatEther(compoundAmount)} PLS worth of TIME (${this.compoundPercentage}% of claimed)...`);

      // Path: WPLS -> TIME
      const path = [WPLS_ADDRESS, TIME_ADDRESS];
      
      // Set minimum output to 0 (you may want to add slippage protection)
      const amountOutMin = 0;

      const tx = await this.plsxRouter.swapExactTokensForTokensV2(
        compoundAmount,
        amountOutMin,
        path,
        this.wallet.address,
        {
          value: compoundAmount,
          gasLimit: 500000
        }
      );

      console.log(`📝 TIME purchase transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = calculateGasCost(receipt);
      console.log(`✅ TIME purchase completed! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);

      return { receipt, gasCost };
    } catch (error) {
      console.error('❌ Error buying TIME token:', error.message);
      throw error;
    }
  }

  async swapPlsForExampleToken(claimedPlsAmount) {
    try {
      // Calculate swap amount from the CLAIMED PLS, not wallet balance
      const swapAmount = (claimedPlsAmount * BigInt(this.buyPercentage)) / BigInt(100);
      
      if (swapAmount === 0n) {
        console.log('⚠️  Swap amount too small, skipping swap');
        return null;
      }

      console.log(`🔄 Swapping ${ethers.formatEther(swapAmount)} PLS (${this.buyPercentage}% of claimed) for exampleToken...`);

      // Path: WPLS -> exampleToken
      const path = [WPLS_ADDRESS, EXAMPLE_TOKEN_ADDRESS];
      
      // Set minimum output to 0 (you may want to add slippage protection)
      const amountOutMin = 0;

      const tx = await this.plsxRouter.swapExactTokensForTokensV2(
        swapAmount,
        amountOutMin,
        path,
        this.wallet.address,
        {
          value: swapAmount,
          gasLimit: 500000
        }
      );

      console.log(`📝 Swap transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = calculateGasCost(receipt);
      console.log(`✅ Swap completed! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);

      return { receipt, gasCost };
    } catch (error) {
      console.error('❌ Error swapping PLS for exampleToken:', error.message);
      throw error;
    }
  }

  async sendExampleTokenToRecipient() {
    try {
      // Get exampleToken balance with retry
      const balance = await this.executeWithRetry(
        async () => await this.exampleTokenContract.balanceOf(this.wallet.address),
        'getExampleTokenBalance'
      );
      
      console.log(`📊 Current exampleToken balance: ${ethers.formatEther(balance)}`);
      
      if (balance === 0n) {
        console.log('⚠️  No exampleToken balance to send - skipping transfer');
        return null;
      }

      console.log(`🔄 Sending ${ethers.formatEther(balance)} exampleToken to ${this.exampleTokenRecipient}...`);

      const tx = await this.exampleTokenContract.transfer(this.exampleTokenRecipient, balance, {
        gasLimit: 100000
      });

      console.log(`📝 Transfer transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = calculateGasCost(receipt);
      console.log(`✅ exampleToken sent successfully! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);

      return { receipt, gasCost, amount: balance };
    } catch (error) {
      console.error('❌ Error sending exampleToken:', error.message);
      throw error;
    }
  }

  async checkAndSendExistingExampleToken() {
    try {
      console.log('\n🔍 Checking for existing exampleToken balance from prior operations...');
      
      const balance = await this.executeWithRetry(
        async () => await this.exampleTokenContract.balanceOf(this.wallet.address),
        'getStartupExampleTokenBalance'
      );
      
      if (balance > 0n) {
        console.log(`💰 Found ${ethers.formatEther(balance)} exampleToken in wallet`);
        const result = await this.sendExampleTokenToRecipient();
        if (result) {
          console.log(`✅ Startup cleanup: Sent ${ethers.formatEther(result.amount)} exampleToken to recipient`);
        }
      } else {
        console.log('✅ No existing exampleToken balance found');
      }
    } catch (error) {
      console.error('⚠️  Error checking/sending existing exampleToken:', error.message);
      console.log('Continuing with normal operation...');
    }
  }

  async checkAndClaim() {
    try {
      const timestamp = new Date().toLocaleString();
      console.log(`\n⏰ [${timestamp}] Checking for claimable dividends...`);

      // Get balances before claim - wrapped in retry logic
      const timeBalance = await this.executeWithRetry(
        async () => await this.timeContract.balanceOf(this.walletAddress),
        'getTimeBalance'
      );
      const plsBalanceBefore = await this.executeWithRetry(
        async () => await this.provider.getBalance(this.walletAddress),
        'getPlsBalance'
      );
      const claimable = await this.getClaimableDividend();
      const claimableFormatted = ethers.formatEther(claimable);

      // Store initial balances if not set
      if (this.initialTimeBalance === null) {
        this.initialTimeBalance = timeBalance;
      }
      if (this.initialPlsBalance === null) {
        this.initialPlsBalance = plsBalanceBefore;
      }
      if (this.initialClaimable === null) {
        this.initialClaimable = claimable;
      }

      console.log(`\n📊 Current Balances:`);
      console.log(`   TIME: ${ethers.formatEther(timeBalance)} (Δ ${ethers.formatEther(timeBalance - this.initialTimeBalance)})`);
      console.log(`   PLS: ${ethers.formatEther(plsBalanceBefore)} (Δ ${ethers.formatEther(plsBalanceBefore - this.initialPlsBalance)})`);
      console.log(`   Claimable: ${claimableFormatted} PLS`);

      if (claimable >= this.thresholdPls) {
        console.log(`\n🎉 Threshold met! Starting claim process...\n`);

        this.isClaimingInProgress = true;

        let totalGas = 0n;
        let exampleTokenSent = 0n;
        let timeBought = 0n;

        // Step 1: Claim dividend
        const claimResult = await this.claimDividend(claimable);
        totalGas += claimResult.gasCost;

        // Step 2: Compound - Buy TIME token
        if (this.compoundPercentage > 0) {
          const timeBalanceBefore = await this.executeWithRetry(
            async () => await this.timeContract.balanceOf(this.walletAddress),
            'getTimeBalanceBefore'
          );
          
          const compoundResult = await this.buyTimeToken(claimable);
          if (compoundResult) {
            totalGas += compoundResult.gasCost;
            
            const timeBalanceAfter = await this.executeWithRetry(
              async () => await this.timeContract.balanceOf(this.walletAddress),
              'getTimeBalanceAfter'
            );
            timeBought = timeBalanceAfter - timeBalanceBefore;
          }
        } else {
          console.log('ℹ️  Compound percentage is 0%, skipping TIME purchase');
        }

        // Step 3: Swap percentage of PLS for exampleToken
        if (this.buyPercentage > 0) {
          // Check exampleToken balance before swap
          const exampleTokenBalanceBefore = await this.executeWithRetry(
            async () => await this.exampleTokenContract.balanceOf(this.wallet.address),
            'getExampleTokenBalanceBefore'
          );
          console.log(`📊 exampleToken balance before swap: ${ethers.formatEther(exampleTokenBalanceBefore)}`);

          const swapResult = await this.swapPlsForExampleToken(claimable);
          if (swapResult) {
            totalGas += swapResult.gasCost;

            // Check exampleToken balance after swap to verify tokens were received
            const exampleTokenBalanceAfter = await this.executeWithRetry(
              async () => await this.exampleTokenContract.balanceOf(this.wallet.address),
              'getExampleTokenBalanceAfter'
            );
            const exampleTokenReceived = exampleTokenBalanceAfter - exampleTokenBalanceBefore;
            console.log(`📊 exampleToken balance after swap: ${ethers.formatEther(exampleTokenBalanceAfter)} (+${ethers.formatEther(exampleTokenReceived)})`);

            if (exampleTokenReceived === 0n) {
              console.log('⚠️  Warning: Swap completed but no exampleToken tokens received!');
            }

            // Step 4: Send exampleToken to recipient
            const sendResult = await this.sendExampleTokenToRecipient();
            if (sendResult) {
              totalGas += sendResult.gasCost;
              exampleTokenSent = sendResult.amount;
            } else {
              console.log('⚠️  Warning: exampleToken was not sent to recipient (balance might be 0)');
            }
          }
        } else {
          console.log('ℹ️  Buy percentage is 0%, skipping exampleToken swap');
        }

        // Get final PLS balance
        const plsBalanceAfter = await this.executeWithRetry(
          async () => await this.provider.getBalance(this.walletAddress),
          'getFinalPlsBalance'
        );

        // Update cumulative gas tracker
        this.totalGasSpent += totalGas;

        // Calculate amounts spent on TIME and exampleToken
        const compoundAmount = (claimable * BigInt(this.compoundPercentage)) / BigInt(100);
        const swapAmount = (claimable * BigInt(this.buyPercentage)) / BigInt(100);
        const totalSpent = compoundAmount + swapAmount + totalGas;
        const netPlsChange = plsBalanceAfter - plsBalanceBefore;
        const expectedNetChange = claimable - totalSpent;

        console.log(`\n📈 Summary:`);
        console.log(`   💰 PLS Claimed: ${ethers.formatEther(claimable)}`);
        console.log(`   🔄 TIME Compounded: ${ethers.formatEther(timeBought)} (${ethers.formatEther(compoundAmount)} PLS spent)`);
        console.log(`   📤 exampleToken Sent: ${ethers.formatEther(exampleTokenSent)} (${ethers.formatEther(swapAmount)} PLS spent)`);
        console.log(`   ⛽ Total Gas: ${ethers.formatEther(totalGas)} PLS`);
        console.log(`   💸 Total Spent: ${ethers.formatEther(totalSpent)} PLS (compound + swap + gas)`);
        console.log(`   💵 PLS Balance: ${ethers.formatEther(plsBalanceBefore)} → ${ethers.formatEther(plsBalanceAfter)}`);
        console.log(`   📊 Net PLS Change: ${ethers.formatEther(netPlsChange)} (expected: ${ethers.formatEther(expectedNetChange)})`);
        console.log(`   📈 Cumulative Gas Spent: ${ethers.formatEther(this.totalGasSpent)} PLS`);

        console.log('\n✅ All operations completed successfully!');

        this.isClaimingInProgress = false;
      } else {
        const remaining = ethers.formatEther(this.thresholdPls - claimable);
        console.log(`⏳ Threshold not met. Need ${remaining} more PLS`);
      }
    } catch (error) {
      console.error('\n❌ Error in check and claim process:', error);
      this.isClaimingInProgress = false;
    }
  }

  async start() {
    console.log('🚀 Starting Time Dividend Claimer...\n');

    // Get configuration from user at startup
    console.log('⚙️  === PRICE TRADING CONFIGURATION ===');
    const enableTrading = await getUserInput('Enable TIME price-based trading? (yes/no): ');
    
    if (enableTrading.toLowerCase() === 'yes' || enableTrading.toLowerCase() === 'y') {
      const increaseInput = await getUserInput('TIME increase threshold for selling (%)?: ');
      this.timeIncreasePercent = parseFloat(increaseInput) || 1;
      
      const decreaseInput = await getUserInput('TIME decrease threshold for buying (%)?: ');
      this.timeDecreasePercent = parseFloat(decreaseInput) || 1;
      
      const sellInput = await getUserInput('Percentage of TIME to sell on increase (%)?: ');
      this.sellPercentageOnIncrease = parseInt(sellInput) || 10;
      
      const buyInput = await getUserInput('Percentage of PLS to spend on decrease (%)?: ');
      this.buyPercentageOnDecrease = parseInt(buyInput) || 10;
      
      console.log(`\n✅ Trading enabled:`);
      console.log(`   📈 Sell ${this.sellPercentageOnIncrease}% of TIME if price increases ${this.timeIncreasePercent}%`);
      console.log(`   📉 Buy with ${this.buyPercentageOnDecrease}% of PLS if price decreases ${this.timeDecreasePercent}%\n`);
      
      this.startPriceMonitoring();
    } else {
      console.log('⏭️  Price trading disabled\n');
      this.priceMonitoringActive = false;
    }

    // Check and send any existing exampleToken balance from prior runs
    await this.checkAndSendExistingExampleToken();

    // Run initial check
    await this.checkAndClaim();

    // Schedule periodic checks
    const claimCheckInterval = setInterval(() => {
      this.checkAndClaim();
    }, this.claimCheckInterval);

    // Schedule periodic stats display (every minute)
    const statsInterval = setInterval(() => {
      this.getSessionStats();
    }, 60 * 1000);

    console.log(`\n✅ Bot is running!`);
    console.log(`   ⏰ Claim check: every ${this.claimCheckInterval / 60000} minutes`);
    if (this.priceMonitoringActive) {
      console.log(`   💱 Price check: every ${this.priceCheckInterval / 1000} seconds`);
    }
    console.log('   Press Ctrl+C to stop.\n');
  }
}

// Start the bot
const claimer = new TimeDividendClaimer();
claimer.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
