import { ethers } from 'ethers';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

// Contract addresses
const TIME_ADDRESS = '0xCA35638A3fdDD02fEC597D8c1681198C06b23F58';
const ST3_ADDRESS = '0x2806F9d083BABbDbB9a92b0722F1b5D4E6FEF6cC';
const PLSX_ROUTER_ADDRESS = '0xDA9aBA4eACF54E0273f56dfFee6B8F1e20B23Bba';
const WPLS_ADDRESS = '0xA1077a294dDE1B09bB078844df40758a5D0f9a27';

// TIME Token ABI (only the functions we need)
const TIME_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "claimableDividendOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address payable", "name": "recipient", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "claimDividend",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// PLSX Router ABI (only the functions we need)
const PLSX_ROUTER_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
      {"internalType": "address[]", "name": "path", "type": "address[]"},
      {"internalType": "address", "name": "to", "type": "address"}
    ],
    "name": "swapExactTokensForTokensV2",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
      {"internalType": "address[]", "name": "path", "type": "address[]"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"}
    ],
    "name": "swapExactTokensForETH",
    "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "bytes[]", "name": "data", "type": "bytes[]"}
    ],
    "name": "multicall",
    "outputs": [{"internalType": "bytes[]", "name": "results", "type": "bytes[]"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "address[]", "name": "path", "type": "address[]"}
    ],
    "name": "getAmountsOut",
    "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// ERC20 ABI for token transfers
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// WPLS ABI for unwrapping
const WPLS_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "wad", "type": "uint256"}],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

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
  calculateGasCost(receipt) {
    // Use effectiveGasPrice for EIP-1559 transactions, fallback to gasPrice for legacy
    const gasPrice = receipt.effectiveGasPrice || receipt.gasPrice;
    return receipt.gasUsed * gasPrice;
  }

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
    this.st3Recipient = process.env.ST3_RECIPIENT_ADDRESS;
    this.claimCheckInterval = parseInt(process.env.CLAIM_CHECK_INTERVAL_MINUTES || '15') * 60 * 1000;
    
    // Slippage tolerance percentages for swaps
    this.timeSlippagePercent = parseFloat(process.env.TIME_SLIPPAGE_PERCENT || '1');
    this.st3SlippagePercent = parseFloat(process.env.ST3_SLIPPAGE_PERCENT || '5');

    // Detect test mode - no private key means test mode
    this.testMode = !this.privateKey;
    if (this.testMode) {
      console.log('\n🧪 TEST MODE ENABLED - No transactions will be executed\n');
      // Use dummy values for test mode
      this.walletAddress = this.walletAddress || '0x0000000000000000000000000000000000000001';
      this.st3Recipient = this.st3Recipient || '0x0000000000000000000000000000000000000002';
    }

    // Health monitoring
    this.lastSuccessfulOperation = Date.now();
    this.operationCount = 0;
    this.healthCheckInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.maxInactivityTime = 30 * 60 * 1000; // Alert if no activity for 30 minutes

    // Validate configuration
    this.validateConfig();

    // Initialize provider and wallet
    if (!this.testMode) {
      this.initializeProvider();
    } else {
      this.provider = null;
      this.wallet = null;
      this.timeContract = null;
      this.plsxRouter = null;
      this.st3Contract = null;
      this.wplsContract = null;
    }

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
    
    // Test mode balances
    this.testTimeBalance = ethers.parseEther('100');
    this.testPlsBalance = ethers.parseEther('5000');
    this.testClaimable = ethers.parseEther('2500');

    const modeLabel = this.testMode ? '🧪 TEST MODE' : '✅ PRODUCTION MODE';
    console.log(`${modeLabel} Initialized Time Dividend Claimer`);
    console.log(`📊 Monitoring wallet: ${this.walletAddress}`);
    console.log(`💰 Claim threshold: ${ethers.formatEther(this.thresholdPls)} PLS`);
    console.log(`🔄 Compound percentage (TIME): ${this.compoundPercentage}%`);
    console.log(`📈 Buy percentage (ST3): ${this.buyPercentage}%`);
    console.log(`💵 Keep in wallet: ${100 - this.compoundPercentage - this.buyPercentage}%`);
    console.log(`📤 ST3 recipient: ${this.st3Recipient}`);
    console.log(`⏰ Check interval: ${this.claimCheckInterval / 60000} minutes`);
    console.log(`💱 Price check interval: ${this.priceCheckInterval / 1000} seconds`);
    if (!this.testMode) {
      console.log(`🌐 Primary RPC: ${this.rpcUrls[0]}`);
      console.log(`🔄 Backup RPCs: ${this.rpcUrls.length - 1} available`);
    }
    console.log('');
  }

  validateConfig() {
    // Skip private key check in test mode
    if (!this.testMode && !this.privateKey) {
      throw new Error('❌ PRIVATE_KEY not set in .env file. Use test mode: run with PRIVATE_KEY unset');
    }
    if (!this.testMode && !this.walletAddress) {
      throw new Error('❌ WALLET_ADDRESS not set in .env file');
    }
    if (!this.testMode && !ethers.isAddress(this.walletAddress)) {
      throw new Error('❌ WALLET_ADDRESS is not a valid Ethereum address');
    }
    if (!this.testMode && !this.st3Recipient) {
      throw new Error('❌ ST3_RECIPIENT_ADDRESS not set in .env file');
    }
    if (!this.testMode && !ethers.isAddress(this.st3Recipient)) {
      throw new Error('❌ ST3_RECIPIENT_ADDRESS is not a valid Ethereum address');
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
    if (this.timeSlippagePercent < 0 || this.timeSlippagePercent > 50) {
      throw new Error('❌ TIME_SLIPPAGE_PERCENT must be between 0 and 50');
    }
    if (this.st3SlippagePercent < 0 || this.st3SlippagePercent > 100) {
      throw new Error('❌ ST3_SLIPPAGE_PERCENT must be between 0 and 100');
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
    this.st3Contract = new ethers.Contract(ST3_ADDRESS, ERC20_ABI, this.wallet);
    this.wplsContract = new ethers.Contract(WPLS_ADDRESS, WPLS_ABI, this.wallet);

    // Track gas costs
    this.totalGasSpent = 0n;
  }

  async validateContractAbis() {
    if (this.testMode) {
      console.log('\n🧪 Skipping contract validation in test mode');
      return true;
    }

    try {
      console.log('\n🔍 Validating contract ABIs and addresses...');
      
      // Check if contracts are at expected addresses
      console.log(`   Checking TIME at ${TIME_ADDRESS}...`);
      const timeCode = await this.provider.getCode(TIME_ADDRESS);
      if (timeCode === '0x') throw new Error(`TIME contract not found at ${TIME_ADDRESS}`);
      console.log('   ✓ TIME contract found');
      
      console.log(`   Checking PLSX Router at ${PLSX_ROUTER_ADDRESS}...`);
      const routerCode = await this.provider.getCode(PLSX_ROUTER_ADDRESS);
      if (routerCode === '0x') throw new Error(`PLSX Router contract not found at ${PLSX_ROUTER_ADDRESS}`);
      console.log('   ✓ PLSX Router contract found');
      
      console.log(`   Checking ST3 at ${ST3_ADDRESS}...`);
      const st3Code = await this.provider.getCode(ST3_ADDRESS);
      if (st3Code === '0x') throw new Error(`ST3 contract not found at ${ST3_ADDRESS}`);
      console.log('   ✓ ST3 contract found');
      
      console.log(`   Checking WPLS at ${WPLS_ADDRESS}...`);
      const wplsCode = await this.provider.getCode(WPLS_ADDRESS);
      if (wplsCode === '0x') throw new Error(`WPLS contract not found at ${WPLS_ADDRESS}`);
      console.log('   ✓ WPLS contract found');
      
      // Verify key functions exist by checking interface
      console.log('   Checking TIME contract functions...');
      const timeInterface = this.timeContract.interface;
      if (!timeInterface.hasFunction('claimableDividendOf')) throw new Error('claimableDividendOf not in TIME ABI');
      if (!timeInterface.hasFunction('claimDividend')) throw new Error('claimDividend not in TIME ABI');
      if (!timeInterface.hasFunction('balanceOf')) throw new Error('balanceOf not in TIME ABI');
      console.log('   ✓ All required TIME functions found');
      
      console.log('\n✅ All contracts validated successfully!');
      return true;
    } catch (error) {
      console.error('\n❌ Contract validation failed:', error.message);
      console.error('\n📋 Debugging information:');
      console.error(`   Current RPC: ${this.rpcUrls[this.currentRpcIndex]}`);
      console.error(`   Network ChainID: ${this.provider?.network?.chainId || 'unknown'}`);
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify RPC endpoint is responding');
      console.error('   3. Confirm contract addresses in code are correct for PulseChain');
      console.error('   4. Check if you are connected to the correct blockchain network');
      return false;
    }
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

  async unwrapWpls() {
    try {
      // Check WPLS balance
      const wplsBalance = await this.executeWithRetry(
        async () => await this.wplsContract.balanceOf(this.walletAddress),
        'getWplsBalance'
      );

      if (wplsBalance > 0n) {
        console.log(`\n🔄 Unwrapping ${ethers.formatEther(wplsBalance)} WPLS to PLS...`);
        const tx = await this.wplsContract.withdraw(wplsBalance, { gasLimit: 100000 });
        console.log(`📝 Unwrap transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ WPLS unwrapped! Block: ${(await tx.wait()).blockNumber}`);
      }
    } catch (error) {
      console.error('⚠️  Error unwrapping WPLS:', error.message);
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
        const sellResult = await this.sellTimeToken(this.sellPercentageOnIncrease);
        // Update reference price ONLY after successful trade
        if (sellResult) {
          this.referencePriceForTrading = this.currentTimePriceInPls;
          console.log(`📍 Reference price updated to: ${this.referencePriceForTrading.toFixed(8)}`);
        } else {
          console.log('⚠️  Trade failed, reference price not updated');
        }
      } else if (priceChange <= -this.timeDecreasePercent) {
        // TIME decreased - BUY
        console.log(`\n📉 TIME price decreased ${Math.abs(priceChange).toFixed(2)}% (threshold: ${this.timeDecreasePercent}%) - BUYING TIME`);
        const buyResult = await this.buyTimeWithPls(this.buyPercentageOnDecrease);
        // Update reference price ONLY after successful trade
        if (buyResult) {
          this.referencePriceForTrading = this.currentTimePriceInPls;
          console.log(`📍 Reference price updated to: ${this.referencePriceForTrading.toFixed(8)}`);
        } else {
          console.log('⚠️  Trade failed, reference price not updated');
        }
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

      // Get current price to calculate slippage protection
      const currentPrice = await this.getTimePriceInPls();
      let amountOutMin = 0n;
      
      if (currentPrice) {
        // Calculate expected PLS output with configurable slippage tolerance
        const expectedPls = parseFloat(ethers.formatEther(sellAmount)) * currentPrice;
        const slippageFraction = 1 - (this.timeSlippagePercent / 100);
        const minPls = expectedPls * slippageFraction;
        amountOutMin = ethers.parseEther(minPls.toFixed(18));
        console.log(`📊 Minimum output (${this.timeSlippagePercent}% slippage): ${ethers.formatEther(amountOutMin)} PLS`);
      } else {
        console.log('⚠️  Could not fetch price, proceeding without slippage protection');
      }

      // Step 1: Swap TIME -> WPLS
      console.log(`🔄 Swapping TIME for WPLS...`);
      const tx1 = await this.plsxRouter.swapExactTokensForTokensV2(
        sellAmount,
        amountOutMin,
        [TIME_ADDRESS, WPLS_ADDRESS],
        this.wallet.address,
        {
          gasLimit: 500000
        }
      );

      console.log(`📝 TIME→WPLS transaction sent: ${tx1.hash}`);
      const receipt1 = await tx1.wait();
      const gasCost1 = this.calculateGasCost(receipt1);
      console.log(`✅ TIME swapped for WPLS! Block: ${receipt1.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost1)} PLS`);

      // Step 2: Unwrap WPLS -> PLS
      console.log(`🔄 Unwrapping WPLS to native PLS...`);
      const wplsBalance = await this.executeWithRetry(
        async () => await this.wplsContract.balanceOf(this.walletAddress),
        'getWplsBalance'
      );

      if (wplsBalance > 0n) {
        const tx2 = await this.wplsContract.withdraw(wplsBalance, { gasLimit: 100000 });
        console.log(`📝 WPLS unwrap transaction sent: ${tx2.hash}`);
        const receipt2 = await tx2.wait();
        const gasCost2 = this.calculateGasCost(receipt2);
        console.log(`✅ WPLS unwrapped to PLS! Block: ${receipt2.blockNumber}`);
        console.log(`⛽ Gas used: ${ethers.formatEther(gasCost2)} PLS`);
        
        const totalGasCost = gasCost1 + gasCost2;
        this.recordSuccessfulOperation();
        return { receipt: receipt2, gasCost: totalGasCost, amountSold: sellAmount };
      } else {
        console.log(`⚠️  No WPLS balance to unwrap`);
        this.recordSuccessfulOperation();
        return { receipt: receipt1, gasCost: gasCost1, amountSold: sellAmount };
      }
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

      // Get current price to calculate slippage protection
      const currentPrice = await this.getTimePriceInPls();
      let amountOutMin = 0n;
      
      if (currentPrice) {
        // Calculate expected TIME output with configurable slippage tolerance
        const expectedTime = parseFloat(ethers.formatEther(buyAmount)) / currentPrice;
        const slippageFraction = 1 - (this.timeSlippagePercent / 100);
        const minTime = expectedTime * slippageFraction;
        amountOutMin = ethers.parseEther(minTime.toFixed(18));
        console.log(`📊 Minimum output (${this.timeSlippagePercent}% slippage): ${ethers.formatEther(amountOutMin)} TIME`);
      } else {
        console.log('⚠️  Could not fetch price, proceeding without slippage protection');
      }

      // Path: PLS -> WPLS -> TIME (need to wrap native PLS first via value parameter)
      // When sending native PLS with value parameter, router automatically handles conversion
      const path = [WPLS_ADDRESS, TIME_ADDRESS];

      const tx = await this.plsxRouter.swapExactTokensForTokensV2(
        buyAmount,
        amountOutMin,
        path,
        this.wallet.address,
        {
          value: buyAmount,  // Send native PLS - router wraps it to WPLS
          gasLimit: 500000
        }
      );

      console.log(`📝 TIME purchase transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = this.calculateGasCost(receipt);
      console.log(`✅ TIME purchased! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);
      this.recordSuccessfulOperation();

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

  recordSuccessfulOperation() {
    this.lastSuccessfulOperation = Date.now();
    this.operationCount++;
  }

  checkHealth() {
    const timeSinceLastOp = Date.now() - this.lastSuccessfulOperation;
    const minutesInactive = Math.floor(timeSinceLastOp / 60000);
    
    if (timeSinceLastOp > this.maxInactivityTime) {
      console.warn(`\n⚠️  ⚠️  ⚠️  HEALTH WARNING: No successful operations for ${minutesInactive} minutes!`);
      console.warn(`   Last successful operation: ${new Date(this.lastSuccessfulOperation).toLocaleString()}`);
      console.warn(`   Total operations completed: ${this.operationCount}`);
      console.warn('   Bot may be stuck. Check RPC connection and contract state.\n');
    } else if (minutesInactive > 5) {
      console.log(`\n💚 Health check: Last operation ${minutesInactive} min ago (${this.operationCount} total)`);
    }
  }

  async claimDividend(amount) {
    try {
      console.log(`🔄 Claiming ${ethers.formatEther(amount)} PLS...`);
      
      if (this.testMode) {
        console.log(`📝 [TEST MODE] Simulated transaction: 0x` + '0'.repeat(64));
        const mockReceipt = {
          blockNumber: 999999,
          gasUsed: 123456n,
          effectiveGasPrice: ethers.parseUnits('100', 'gwei')
        };
        const gasCost = this.calculateGasCost(mockReceipt);
        console.log(`✅ Dividend claimed! Block: ${mockReceipt.blockNumber}`);
        console.log(`⛽ Gas used (simulated): ${ethers.formatEther(gasCost)} PLS`);
        this.recordSuccessfulOperation();
        this.testPlsBalance += amount;
        return { receipt: mockReceipt, gasCost };
      }
      
      // claimDividend expects the amount in wei (uint256)
      const tx = await this.timeContract.claimDividend(this.walletAddress, amount, {
        gasLimit: 300000
      });
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = this.calculateGasCost(receipt);
      console.log(`✅ Dividend claimed! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);
      this.recordSuccessfulOperation();
      
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
      const gasCost = this.calculateGasCost(receipt);
      console.log(`✅ TIME purchase completed! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);
      this.recordSuccessfulOperation();

      return { receipt, gasCost };
    } catch (error) {
      console.error('❌ Error buying TIME token:', error.message);
      throw error;
    }
  }

  async swapPlsForSt3(claimedPlsAmount) {
    try {
      // Calculate swap amount from the CLAIMED PLS, not wallet balance
      const swapAmount = (claimedPlsAmount * BigInt(this.buyPercentage)) / BigInt(100);
      
      if (swapAmount === 0n) {
        console.log('⚠️  Swap amount too small, skipping swap');
        return null;
      }

      console.log(`🔄 Swapping ${ethers.formatEther(swapAmount)} PLS (${this.buyPercentage}% of claimed) for ST3...`);

      // Get current price for ST3 and calculate slippage protection
      let amountOutMin = 0n;
      try {
        // Get ST3 price from router (PLS -> ST3)
        const amounts = await this.plsxRouter.getAmountsOut(swapAmount, [WPLS_ADDRESS, ST3_ADDRESS]);
        const expectedSt3 = amounts[1];
        const slippageFraction = 1 - (this.st3SlippagePercent / 100);
        const minSt3 = BigInt(Math.floor(parseFloat(ethers.formatEther(expectedSt3)) * slippageFraction * 1e18).toString());
        amountOutMin = minSt3;
        console.log(`📊 Expected ST3 output: ${ethers.formatEther(expectedSt3)} with ${this.st3SlippagePercent}% slippage protection`);
      } catch (priceError) {
        console.warn('⚠️  Could not calculate ST3 slippage, proceeding without protection:', priceError.message);
      }

      // Path: WPLS -> ST3
      const path = [WPLS_ADDRESS, ST3_ADDRESS];

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
      const gasCost = this.calculateGasCost(receipt);
      console.log(`✅ Swap completed! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);
      this.recordSuccessfulOperation();

      return { receipt, gasCost };
    } catch (error) {
      console.error('❌ Error swapping PLS for ST3:', error.message);
      throw error;
    }
  }

  async sendSt3ToRecipient() {
    try {
      // Get ST3 balance with retry
      const balance = await this.executeWithRetry(
        async () => await this.st3Contract.balanceOf(this.wallet.address),
        'getSt3Balance'
      );
      
      console.log(`📊 Current ST3 balance: ${ethers.formatEther(balance)}`);
      
      if (balance === 0n) {
        console.log('⚠️  No ST3 balance to send - skipping transfer');
        return null;
      }

      console.log(`🔄 Sending ${ethers.formatEther(balance)} ST3 to ${this.st3Recipient}...`);

      const tx = await this.st3Contract.transfer(this.st3Recipient, balance, {
        gasLimit: 100000
      });

      console.log(`📝 Transfer transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const gasCost = this.calculateGasCost(receipt);
      console.log(`✅ ST3 sent successfully! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${ethers.formatEther(gasCost)} PLS`);
      this.recordSuccessfulOperation();

      return { receipt, gasCost, amount: balance };
    } catch (error) {
      console.error('❌ Error sending ST3:', error.message);
      throw error;
    }
  }

  async checkAndSendExistingSt3() {
    try {
      console.log('\n🔍 Checking for existing ST3 balance from prior operations...');
      
      const balance = await this.executeWithRetry(
        async () => await this.st3Contract.balanceOf(this.wallet.address),
        'getStartupSt3Balance'
      );
      
      if (balance > 0n) {
        console.log(`💰 Found ${ethers.formatEther(balance)} ST3 in wallet`);
        const result = await this.sendSt3ToRecipient();
        if (result) {
          console.log(`✅ Startup cleanup: Sent ${ethers.formatEther(result.amount)} ST3 to recipient`);
        }
      } else {
        console.log('✅ No existing ST3 balance found');
      }
    } catch (error) {
      console.error('⚠️  Error checking/sending existing ST3:', error.message);
      console.log('Continuing with normal operation...');
    }
  }

  async checkAndClaim() {
    try {
      const timestamp = new Date().toLocaleString();
      console.log(`\n⏰ [${timestamp}] Checking for claimable dividends...`);

      let timeBalance, plsBalanceBefore, claimable;
      
      if (this.testMode) {
        // Use simulated test balances
        timeBalance = this.testTimeBalance;
        plsBalanceBefore = this.testPlsBalance;
        claimable = this.testClaimable;
      } else {
        // Get balances before claim - wrapped in retry logic
        timeBalance = await this.executeWithRetry(
          async () => await this.timeContract.balanceOf(this.walletAddress),
          'getTimeBalance'
        );
        plsBalanceBefore = await this.executeWithRetry(
          async () => await this.provider.getBalance(this.walletAddress),
          'getPlsBalance'
        );
        claimable = await this.getClaimableDividend();
      }
      
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
        let st3Sent = 0n;
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

        // Step 3: Swap percentage of PLS for ST3
        if (this.buyPercentage > 0) {
          // Check ST3 balance before swap
          const st3BalanceBefore = await this.executeWithRetry(
            async () => await this.st3Contract.balanceOf(this.wallet.address),
            'getSt3BalanceBefore'
          );
          console.log(`📊 ST3 balance before swap: ${ethers.formatEther(st3BalanceBefore)}`);

          const swapResult = await this.swapPlsForSt3(claimable);
          if (swapResult) {
            totalGas += swapResult.gasCost;

            // Check ST3 balance after swap to verify tokens were received
            const st3BalanceAfter = await this.executeWithRetry(
              async () => await this.st3Contract.balanceOf(this.wallet.address),
              'getSt3BalanceAfter'
            );
            const st3Received = st3BalanceAfter - st3BalanceBefore;
            console.log(`📊 ST3 balance after swap: ${ethers.formatEther(st3BalanceAfter)} (+${ethers.formatEther(st3Received)})`);

            if (st3Received === 0n) {
              console.log('⚠️  Warning: Swap completed but no ST3 tokens received!');
            }

            // Step 4: Send ST3 to recipient
            const sendResult = await this.sendSt3ToRecipient();
            if (sendResult) {
              totalGas += sendResult.gasCost;
              st3Sent = sendResult.amount;
            } else {
              console.log('⚠️  Warning: ST3 was not sent to recipient (balance might be 0)');
            }
          }
        } else {
          console.log('ℹ️  Buy percentage is 0%, skipping ST3 swap');
        }

        // Get final PLS balance
        const plsBalanceAfter = await this.executeWithRetry(
          async () => await this.provider.getBalance(this.walletAddress),
          'getFinalPlsBalance'
        );

        // Update cumulative gas tracker
        this.totalGasSpent += totalGas;

        // Calculate amounts spent on TIME and ST3
        const compoundAmount = (claimable * BigInt(this.compoundPercentage)) / BigInt(100);
        const swapAmount = (claimable * BigInt(this.buyPercentage)) / BigInt(100);
        const totalSpent = compoundAmount + swapAmount + totalGas;
        const netPlsChange = plsBalanceAfter - plsBalanceBefore;
        const expectedNetChange = claimable - totalSpent;

        console.log(`\n📈 Summary:`);
        console.log(`   💰 PLS Claimed: ${ethers.formatEther(claimable)}`);
        console.log(`   🔄 TIME Compounded: ${ethers.formatEther(timeBought)} (${ethers.formatEther(compoundAmount)} PLS spent)`);
        console.log(`   📤 ST3 Sent: ${ethers.formatEther(st3Sent)} (${ethers.formatEther(swapAmount)} PLS spent)`);
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

    // Validate contracts exist and have required functions before starting
    const abiValid = await this.validateContractAbis();
    if (!abiValid) {
      process.exit(1);
    }

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

    // Check and send any existing ST3 balance from prior runs
    await this.checkAndSendExistingSt3();

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

    // Schedule health checks (every 5 minutes)
    const healthInterval = setInterval(() => {
      this.checkHealth();
    }, this.healthCheckInterval);

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
