# Documentation Index

> **Guide to all documentation files in the offsetX project**

This file provides an overview of all documentation files, their purpose, and maintenance requirements.

---

## Core Documentation (MUST be maintained)

These files are living documents that must be kept up-to-date as the project evolves.

### Primary Documentation
- **`KNOWLEDGE_BASE.md`** - **CRITICAL:** Essential project knowledge, flows, bugs, fixes, and implementation details
  - **Update when:** Bugs discovered, flows understood, implementation details found
  - **Always update:** "Last Updated" date at top of file
  
- **`progress.md`** - Current status and progress tracking
  - **Update when:** After EVERY work session
  - **Contains:** Current phase/step, completed work, problems, solutions, change log

- **`plan.md`** - Project plan with objectives, roles, flows, and architecture
  - **Update when:** Architecture changes significantly, new roles/flows added, specs modified

- **`implementation.md`** - Step-by-step implementation guide
  - **Update when:** Steps completed, steps modified, new steps added

- **`non-negotiables.md`** - Development rules and constraints
  - **Update when:** Rules change or new rules added

- **`README.md`** - Project overview and quick start
  - **Update when:** Setup instructions change, project status changes, new features added

---

## Reference Documentation (update as needed)

These files provide reference information and should be updated when relevant information changes.

- **`TROUBLESHOOTING.md`** - Common issues and solutions
  - **Update when:** New common issues discovered
  - **Purpose:** Quick reference for debugging

- **`QUICK_START.md`** - Quick setup guide
  - **Update when:** Setup process changes
  - **Purpose:** Fast onboarding for new developers

- **`RESTART_GUIDE.md`** - How to restart the project
  - **Update when:** Restart process changes
  - **Purpose:** Guide for restarting services

- **`TESTING_GUIDE.md`** - Testing procedures
  - **Update when:** Testing procedures change
  - **Purpose:** Testing documentation

- **`TEST_DOCUMENTATION_READING.md`** - Test questions to verify documentation reading
  - **Update when:** New test questions needed
  - **Purpose:** Verify AI reads documentation correctly

---

## Historical Documentation (archived, don't update)

These files are snapshots of past events or fixes. They should NOT be updated - they are historical records.

- **`WHAT_HAPPENED.md`** - Snapshot of a past issue (route files deleted)
- **`QUICK_FIX_SUMMARY.md`** - Snapshot of fixes applied
- **`FIX_DEVELOPER_HOLDINGS.md`** - Snapshot of a specific fix
- **`backend/TRADING_ACCOUNT_SETUP.md`** - Snapshot of trading account setup
- **`FIX_GITHUB_DESKTOP.md`** - Snapshot of a git issue fix
- **`HOW_TO_PULL_FROM_GITHUB.md`** - Snapshot of git workflow
- **`GIT_STATUS.md`** - Snapshot of git status

**Note:** These files are kept for reference but should not be maintained. If information needs updating, it should go in `KNOWLEDGE_BASE.md` instead.

---

## Codebase Dumps (reference only)

These are full codebase exports for backup/reference purposes.

- **`CODEBASE_DUMP.md`** - Complete codebase dump (backup)
- **`codebase_export.md`** - Codebase export
- **`implementation_full_merged.md`** - Merged implementation guide

**Note:** These are snapshots, not maintained files.

---

## Documentation Maintenance Workflow

### After Every Work Session:

1. **ALWAYS update:**
   - `progress.md` - Current status, problems, solutions, change log

2. **Update if relevant:**
   - `KNOWLEDGE_BASE.md` - If bugs/flows/details discovered (update "Last Updated" date)
   - `plan.md` - If architecture/specs changed
   - `implementation.md` - If steps completed/modified
   - `README.md` - If setup/status changed

3. **Update reference docs as needed:**
   - `TROUBLESHOOTING.md` - If new common issues found
   - `QUICK_START.md` - If setup process changed
   - `RESTART_GUIDE.md` - If restart process changed

4. **DO NOT update:**
   - Historical documentation files (they are snapshots)

### Before Committing:

- Verify all relevant documentation is updated
- Check "Last Updated" dates are current
- Ensure documentation changes are in the same commit as related code
- Never commit code without updating relevant docs

---

## Documentation Reading Order

When starting a new chat session, read documentation in this order:

1. **`KNOWLEDGE_BASE.md`** - Essential context first
2. **`non-negotiables.md`** - Development rules
3. **`plan.md`** - Project overview
4. **`progress.md`** - Current status
5. **`implementation.md`** - Implementation guide (if working on steps)

---

## Quick Reference

**Need to find information about:**
- **Bugs/Fixes** → `KNOWLEDGE_BASE.md` → "Known Bugs & Fixes"
- **How flows work** → `KNOWLEDGE_BASE.md` → "Key Flows & How They Work"
- **Current status** → `progress.md` → "Current Status"
- **Project architecture** → `plan.md` → "Architecture Overview"
- **Setup instructions** → `QUICK_START.md` or `README.md`
- **Common issues** → `TROUBLESHOOTING.md` or `KNOWLEDGE_BASE.md` → "Common Issues & Solutions"
- **Development rules** → `non-negotiables.md`

---

**Last Updated:** 2024-12-19


