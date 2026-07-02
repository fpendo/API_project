---
title: Smart Contracts
type: architecture
project: NEMX
updated: 2026-07-02
---

# Smart Contracts

Part of [[Home]]. Location: `/opt/app/contracts/`. Solidity 0.8.24, OpenZeppelin 5.x, Hardhat 2.27.

## SchemeNFT.sol (ERC-721)

Scheme registry — one NFT per approved scheme.

- `SchemeInfo`: name, catchment, location, originalTonnes, remainingTonnes, ipfsCid, sha256Hash
- `mintScheme(...)` — regulator (owner) mints to landowner recipient
- `reduceRemainingTonnes(tokenId, tonnes)` — callable by PlanningLock only
- Token IDs start at 1

## SchemeCredits.sol (ERC-1155)

Fungible credits — token ID = scheme NFT token ID.

- `mintCredits`, `lockCredits`, `unlockCredits`, `burnLockedCredits`
- Lock/unlock/burn callable by the planning contract only
- `_update` hook prevents transferring locked balances

## PlanningLock.sol

Planning application lifecycle.

- `Application`: developer, catchmentHash, schemeIds[], amounts[], status (PENDING/APPROVED/REJECTED)
- `submitApplication` — validates catchment per scheme via SchemeNFT, locks credits
- `approveApplication` — burns locked credits, reduces scheme remaining tonnes
- `rejectApplication` — unlocks credits back to developer

## Deployment & tests

- **Deploy script:** `/opt/app/scripts/deploy.ts` — deploys all three, wires PlanningLock into SchemeCredits and SchemeNFT.
- **Tests:** `/opt/app/test/` — SchemeNFT, SchemeCredits locking, PlanningLock integration.
- **Config:** `/opt/app/hardhat.config.ts` — Solidity 0.8.24, localhost:8545.

```bash
npx hardhat node                                        # from /opt/app
npx hardhat run scripts/deploy.ts --network localhost
```
