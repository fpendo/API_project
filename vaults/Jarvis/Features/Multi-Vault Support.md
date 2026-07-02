---
title: Multi-Vault Support
type: feature
project: Jarvis
status: proposed
updated: 2026-07-02
---

# Multi-Vault Support

Part of [[Home]]. See [[Agent & Tools]], [[Vault Filing]].

## Current state

Jarvis reads **one** vault via `VAULT_DIR` in `.env` (currently the personal vault `/opt/app/Jarvis/vault/`). The three project vaults created 2026-07-02 are standalone Obsidian vaults:

```
/opt/app/vaults/NEMX/
/opt/app/vaults/ETAnalytics/
/opt/app/vaults/Jarvis/
```

They are **not yet** searchable by Jarvis — they're for you to browse in Obsidian.

## Opening them in Obsidian

File → Open vault → Open folder as vault → pick one of the folders above. Each is fully independent (own graph, plugins, settings). Switch instantly from the vault switcher.

## Proposed Jarvis integration (not yet built)

To let Jarvis search project vaults too, add named vaults in `.env`:

```
VAULT_PERSONAL=/opt/app/Jarvis/vault
VAULT_NEMX=/opt/app/vaults/NEMX
VAULT_ETA=/opt/app/vaults/ETAnalytics
VAULT_JARVIS=/opt/app/vaults/Jarvis
```

Then give `vault_search` a `vault` parameter (default `personal`), so you can ask:

> "Search my NEMX vault for the planning QR flow"
> "Search my personal vault for last month's gas bill"

Estimated effort: ~1 hour (extend `connectors/vault.py` + tool schema). Kept **personal separate from project** vaults by design.
