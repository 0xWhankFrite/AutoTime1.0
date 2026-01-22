# AutoTime Claimer 🤖

Automated TIME token dividend claimer and portfolio manager for PulseChain with advanced trading features.

## Features ✨

- **Automated Dividend Claiming**: Monitors wallet and claims TIME token dividends when threshold is met
- **Auto-Compounding**: Reinvest a percentage of claimed PLS into TIME tokens to maximize future dividends
- **exampleToken Portfolio Builder**: Automatically swap a portion of dividends for exampleToken tokens and send to your recipient address
- **Smart Price Trading**: Optional automated trading based on TIME/PLS price movements
  - Sell TIME when price increases by threshold percentage
  - Buy TIME when price decreases by threshold percentage
  - Tracks reference prices to ensure only ONE trade per price movement
- **Gas Optimization**: Uses router multicall for TIME→PLS swaps (saves ~10 PLS per transaction)
- **Multi-RPC Failover**: Automatic backup RPC switching for reliability
- **Session Tracking**: Real-time balance monitoring and cumulative statistics
- **Smart Contract Interaction**: Full contract interaction with approvals and gas estimation

## Prerequisites 📋

- Node.js v16 or higher
- TIME tokens in your PulseChain wallet
- PulseChain native coins (PLS) for gas fees
- Private key from your wallet (keep this secure!)
- Understand and assume any and all risks

## Installation 🚀

1. Clone or download this repository:
```bash
git clone <repository-url>
cd autotime-claimer
```

2. Install dependencies:
```bash
npm install
```

3. Create your `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:
```env
# Your private key (KEEP THIS SECRET - never commit it!)
PRIVATE_KEY=your_private_key_here

# Your wallet address
WALLET_ADDRESS=0xYourWalletAddress

# Minimum PLS to claim (triggers the claim process)
THRESHOLD_PLS=1500

# Distribution percentages of claimed PLS
COMPOUND_PERCENTAGE=15      # Buy more TIME tokens
BUY_PERCENTAGE=55           # Buy exampleToken tokens
# Remaining (30%) stays in wallet

# Where to send exampleToken tokens
EXAMPLE_TOKEN_RECIPIENT_ADDRESS=0xAddressHere

# How often to check for claimable dividends (minutes)
CLAIM_CHECK_INTERVAL_MINUTES=15
```

## Usage 🎯

Run the bot:
```bash
npm start
```

On startup, you'll be prompted to enable/configure price-based trading:
```
⚙️  === PRICE TRADING CONFIGURATION ===
Enable TIME price-based trading? (yes/no): 
```

### Configuration Options

If you enable trading, configure:
- **TIME increase threshold**: Price % increase to trigger TIME selling
- **TIME decrease threshold**: Price % decrease to trigger TIME buying
- **Sell percentage**: % of TIME balance to sell when price increases
- **Buy percentage**: % of PLS balance to spend when price decreases

Example trading configuration:
```
Enable TIME price-based trading? (yes/no): yes
TIME increase threshold for selling (%)?:  1
TIME decrease threshold for buying (%)?:   1
Percentage of TIME to sell on increase (%)?:  1
Percentage of PLS to spend on decrease (%)?:  5
```

## How It Works 🔧

### Dividend Claiming Process

1. **Check**: Monitors wallet every 15 minutes (configurable) for claimable dividends
2. **Claim**: When claimable PLS ≥ threshold, claims the dividend
3. **Compound**: Uses configured percentage to buy more TIME tokens (increases future dividends)
4. **Portfolio**: Converts configured percentage to exampleToken tokens for diversification
5. **Send**: Transfers exampleToken tokens to recipient address
6. **Hold**: Remaining PLS stays in wallet for gas and manual use

### Price Trading (Optional)

When enabled, the bot:
- Monitors TIME/PLS price every 30 seconds
- Tracks a "reference price" (updated after each trade)
- Sells TIME if price increases by configured threshold from reference price
- Buys TIME if price decreases by configured threshold from reference price
- Updates reference price after each successful trade to prevent repeated trades

**Example**: If reference price is $60 and threshold is 1%:
- Sell triggered at $60.60 (1% increase) → reference price updates to $60.60
- No more sells until price drops below $59.99 or increases above $61.20

### Gas Optimization

Time sales use an optimized multicall approach:
1. Swap TIME → WPLS (wrapped PLS)
2. Unwrap WPLS → native PLS
**In a single transaction** (saves ~10 PLS gas per sell vs two transactions)

## Distribution Example 📊

With defaults: Compound 15%, Buy exampleToken 55%, Keep 30%

**If you claim 1000 PLS:**
- 150 PLS → Buy TIME tokens (compounds your position)
- 550 PLS → Buy exampleToken tokens (sent to recipient)
- 300 PLS → Stays in wallet
- Gas fees → Deducted from claimed amount

## Configuration Details ⚙️

### Threshold PLS
The minimum amount of claimable PLS before the bot initiates a claim:
- Lower threshold = more frequent claims = more gas costs
- Higher threshold = less frequent claims = wait longer for dividends
- Recommendation: 1000-2000 PLS based on your gas costs

### Compound Percentage
% of claimed PLS spent on buying TIME tokens:
- Increases your TIME holdings → increases future dividends
- Recommendation: 10-20%

### Buy Percentage
% of claimed PLS used for exampleToken purchases:
- Builds diversified portfolio
- Can be 0 if you only want TIME compounding
- Recommendation: 50-70%

### Claim Check Interval
How often the bot checks for claimable dividends:
- 15 minutes = good balance of responsiveness and RPC calls
- Can be adjusted based on your preferences
- Range: 1-1440 minutes

## Custom Token Configuration 🔄

By default, the bot uses a placeholder token address. To configure it for your desired token:

### Step 1: Update the Token Address

Edit `index.js` and find this line (around line 9):
```javascript
const EXAMPLE_TOKEN_ADDRESS = '0xAddressHere';
```

Replace `0xAddressHere` with your token's contract address:
```javascript
const EXAMPLE_TOKEN_ADDRESS = '0xYourTokenAddressHere';
```

### Step 2: Update Environment Variable

In your `.env` file, update the recipient address if needed:
```env
# Where to send your custom token
EXAMPLE_TOKEN_RECIPIENT_ADDRESS=0xYourRecipientAddress
```

### Step 3: Verify Token Trading on PulseX

Ensure your custom token can be traded on PulseX:
1. Go to [PulseX](https://pulsex.com)
2. Search for a trading pair: `WPLS → Your Token`
3. Confirm there's sufficient liquidity and the pair exists

### Step 4: Test with Small Amounts

Before running with production amounts:
- Set `THRESHOLD_PLS` to a small value (e.g., 10)
- Set `BUY_PERCENTAGE` to 10% (smaller buy)
- Run the bot and monitor the first transaction
- Verify tokens arrive at the recipient address

### Important Considerations

**Token Compatibility:**
- Token must be ERC20 compliant
- Token must have a trading pair with WPLS on PulseX
- Token must support `transfer()` function for sending

**Gas Costs:**
- Swapping to different tokens may have different gas costs
- Monitor your cumulative gas spending
- Adjust `THRESHOLD_PLS` if gas costs exceed benefits

**Liquidity:**
- Lower liquidity tokens may have high slippage
- Check PulseX charts for volume and spread
- Test swaps manually first to see expected amounts

**Tax Tokens:**
- Verify if token has transaction fees or taxes
- If yes, received amount will be less than expected
- Check token contract before using

### Example: Changing to a Different Token

```javascript
// Example: Change to HEX token on PulseChain
const EXAMPLE_TOKEN_ADDRESS = '0x2b591e99afE9f32eaA6214f7B7629E2e1eba84c9';
```

Then in `.env`:
```env
BUY_PERCENTAGE=50           # Buy this custom token with 50% of claimed
EXAMPLE_TOKEN_RECIPIENT_ADDRESS=0xYourWalletAddress
```

### Troubleshooting Custom Tokens

**"Swap transaction reverted"**
- Token address is incorrect
- WPLS → Token pair doesn't exist on PulseX
- Insufficient liquidity for the amount being swapped
- Token has special trading restrictions

**"Transfer failed"**
- Recipient address is invalid
- Token has transfer restrictions or whitelist
- Token contract doesn't support standard transfer function

**"No tokens received after swap"**
- Token has a high transaction tax/fee
- Swap reverted silently due to slippage
- Check token contract for special behavior

## Security ⚠️

**IMPORTANT:**
- Never commit your `.env` file to version control
- Never share your `PRIVATE_KEY`
- The `.gitignore` is configured to prevent accidental commits
- Use a dedicated wallet for this bot if possible
- Test with small amounts first
- This is only as secure as your device, private key in plaintext .env is terrible practice

## Monitoring 📈

The bot displays:
- **Real-time balance updates** every minute
- **TIME/PLS price** and change percentage
- **Session statistics** including cumulative gas spent
- **Transaction confirmations** for each operation
- **Error logging** with automatic RPC failover

## Troubleshooting 🔧

### "Transaction reverted" errors
- Ensure your wallet has enough PLS for gas
- Check TIME allowance is set (bot handles this automatically)
- Try increasing gas limit in the code if on network congestion

### No dividends claiming
- Verify TIME tokens are in your wallet
- Check wallet address in `.env` is correct
- Ensure claimable amount exceeds `THRESHOLD_PLS`

### Price trading not working
- Confirm you enabled trading at startup
- Verify threshold percentages are reasonable (0.1% - 5%)
- Check TIME/WPLS pair exists on PulseX

### RPC errors
- Bot automatically switches to backup RPCs
- Check internet connection
- Verify RPC URLs are accessible

## Smart Contract Addresses 📝

These are hardcoded and used on PulseChain mainnet:

```
TIME Token:           0xCA35638A3fdDD02fEC597D8c1681198C06b23F58
exampleToken:         0xAddressHere
PLSX Router:          0xDA9aBA4eACF54E0273f56dfFee6B8F1e20B23Bba
WPLS (Wrapped):       0xA1077a294dDE1B09bB078844df40758a5D0f9a27
TIME/WPLS Pair:       0xEFab2c9c33C42960F2fF653aDb39dC5C4c10630e
```

## Advanced Features 🚀

### Single Trade Per Price Movement
The bot tracks a "reference price" independently from the startup price:
- Each successful trade updates the reference price
- Prevents multiple trades on the same price movement
- Display shows both startup change and reference change for monitoring

### Automatic Allowance Management
- Checks if router has approval before trading
- Automatically approves with unlimited allowance (saves future gas)
- One-time approval per new token

### Multi-RPC Failover
- 4 RPC endpoints configured by default
- Automatic failover if one RPC is slow/down
- 2-second delay between retries

## Performance Tips 💡

1. **Optimize RPC**: Use primary RPC that's fastest for you
2. **Batch Claims**: Higher threshold = fewer gas costs overall
3. **Monitor Gas**: Watch cumulative gas in statistics
4. **Price Thresholds**: 1-2% thresholds work best (not too sensitive)
5. **Claim Interval**: 15-30 minutes provides good balance

## Contributing 🤝

Feel free to fork and submit pull requests for improvements!

## License 📄

MIT License - See LICENSE file

## Disclaimer ⚖️

This bot interacts with smart contracts and blockchain transactions. Use at your own risk. Always:
- Test with small amounts first
- Keep your private key secure
- Understand the contract interactions
- Monitor the bot regularly
- Have sufficient PLS for gas fees

## Support 💬

For issues and questions, please open an issue on the repository.

---

**Happy trading! 🚀**
