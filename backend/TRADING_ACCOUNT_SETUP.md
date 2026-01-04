# Trading Account Setup and ERC-1155 Approval Prevention

## Problem
When transferring credits FROM the trading account, the code was using the landowner's private key to sign the transaction. This caused `ERC1155MissingApprovalForAll` errors because:
- ERC-1155 requires the caller (signer) to be the token owner OR be approved by the token owner
- The trading account owns the tokens, but the landowner's key was signing
- The trading account had NOT approved the landowner to transfer on its behalf

## Solution - Hardcoded Safeguards

### 1. **Hardcoded Trading Account Private Key**
The trading account private key is now hardcoded as a constant in `backend/app/services/order_matching.py`:

```python
# Hardhat default account #1 (trading account) private key
# Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
HARDHAT_TRADING_ACCOUNT_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
```

This ensures we always use the correct key when transferring FROM the trading account.

### 2. **Automatic Key Selection**
The `match_order` function now automatically selects the correct private key:
- **If transferring FROM trading account** → Uses trading account's private key (hardcoded fallback)
- **If transferring FROM landowner/regulator** → Uses their private key from environment

### 3. **Private Key Validation**
Added validation in `transfer_credits_on_chain()` that ensures the private key matches the seller address:

```python
# CRITICAL: Validate that the private key matches the seller address
if seller_address_from_key != seller_address_checksum:
    raise ValueError(
        f"Private key mismatch! "
        f"The provided private key corresponds to address {seller_address_from_key}, "
        f"but the seller address is {seller_address_checksum}. "
        f"This will cause an ERC1155MissingApprovalForAll error."
    )
```

This catches the error **before** attempting the on-chain transfer, providing a clear error message.

### 4. **Environment Variable Logging**
Added `TRADING_ACCOUNT_PRIVATE_KEY` to the environment variable status logging in `main.py` so you can see if it's set (though the hardcoded fallback ensures it works even if not set).

## How It Works

1. **Order Matching**: When a trade is matched, the code checks if the seller is a landowner
2. **Address Selection**: If landowner, uses trading account address as the seller
3. **Key Selection**: Automatically uses the trading account's private key (hardcoded)
4. **Validation**: Before transfer, validates that the key matches the address
5. **Transfer**: Executes the on-chain transfer with the correct key

## Environment Variables

### Optional (has hardcoded fallback):
- `TRADING_ACCOUNT_PRIVATE_KEY` - Trading account private key (defaults to Hardhat account #1)

### Required:
- `TRADING_ACCOUNT_ADDRESS` - Trading account address (defaults to `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
- `LANDOWNER_PRIVATE_KEY` or `REGULATOR_PRIVATE_KEY` - For other transfers

## Testing

To verify the setup is correct, run:
```bash
python backend/check_trading_account.py
```

This will show:
- Trading account balances
- ERC-1155 approvals
- Any setup issues

## Future-Proofing

These safeguards ensure:
1. ✅ **Automatic key selection** - No manual configuration needed
2. ✅ **Hardcoded fallback** - Works even if env var not set
3. ✅ **Early validation** - Catches errors before on-chain attempt
4. ✅ **Clear error messages** - Easy to diagnose if something goes wrong
5. ✅ **Logging** - Shows which key is being used in logs

The system will now automatically use the correct private key for trading account transfers, preventing `ERC1155MissingApprovalForAll` errors.



