# Non-Negotiables – Development Rules

> **CRITICAL:** These rules must be followed for every interaction. They are not optional.

---

## Rule 0: Read Non-Negotiables FIRST

**BEFORE ANYTHING ELSE, read this file (`non-negotiables.md`) completely.**

This file contains the fundamental rules that govern all development work. These rules are non-negotiable and must be followed in every interaction.

**If you haven't read this file yet, STOP and read it now before proceeding.**

---

## Rule 1: Always Review Documentation Before Responding

**Before writing ANY code, making ANY changes, or providing ANY implementation:**

0. **MUST read `non-negotiables.md`** (this file) to understand:
   - All development rules and constraints
   - Step-by-step workflow requirements
   - Approval processes
   - Error handling expectations

0.5. **MUST read `KNOWLEDGE_BASE.md`** FIRST to understand:
   - Project structure and architecture
   - Key flows and how they work
   - Known bugs and their fixes
   - Important implementation details
   - Common issues and solutions
   - Configuration and environment setup
   - **This file is critical for maintaining context across chat sessions**

1. **MUST read `plan.md`** to understand:
   - The overall objective and requirements
   - All roles and actors
   - Core flows and business logic
   - Data models and architecture
   - Project structure
   - Technical specifications (contracts, conversions, catchments)

2. **MUST read `implementation.md`** to understand:
   - Which phase and step we're currently on
   - What needs to be built in the current step
   - How it should be implemented
   - What checks/tests are required
   - Environment setup requirements
   - Error handling guidelines

3. **MUST confirm understanding** by referencing specific sections from all documentation files in your response

**Failure to do this will result in incorrect implementations that don't align with the project plan.**

---

## Rule 2: One Step at a Time

**NEVER skip ahead or implement multiple steps simultaneously.**

1. **Only work on ONE step** from `implementation.md` at a time
2. **Complete the entire step** including:
   - All code changes
   - All tests/checks
   - Documentation updates if needed
3. **Wait for explicit user approval** before moving to the next step

**Example workflow:**
- User: "Let's do Step 1.1"
- AI: Reads non-negotiables.md → Reviews plan.md, implementation.md, and progress.md → Implements Step 1.1 → Runs tests → Updates progress.md → Reports results
- User: "Looks good, approved"
- AI: Updates progress.md (marks Step 1.1 complete) → "Step 1.1 complete. Ready for Step 1.2 when you are."

---

## Rule 3: Test Before Approval

**Every step MUST pass all checks before requesting approval.**

1. **Run all tests** specified in the step's "Checks" section
2. **Verify all requirements** from "What to build" are met
3. **Report test results** clearly:
   - ✅ Passed tests
   - ❌ Failed tests (with error details)
   - ⚠️ Warnings or issues
4. **Only request approval** when ALL checks pass

**If tests fail:**
- Fix the issues
- Re-run tests
- Report again
- Do NOT request approval until everything passes

---

## Rule 4: Explicit Approval Required

**NEVER assume approval or proceed to the next step without explicit confirmation.**

1. **After completing a step:**
   - Summarize what was built
   - Show test results
   - Ask: "Step X.Y complete. All tests passing. Ready for your approval before proceeding to Step X.Z."

2. **Wait for user to say:**
   - "Approved" / "Looks good" / "Proceed" / "Yes"
   - Or: "Fix [issue]" / "Change [thing]"

3. **Only after explicit approval:**
   - Mark the step as complete
   - Ask if user wants to proceed to next step
   - Do NOT automatically start the next step

---

## Rule 5: Reference Current Step

**Always state which step you're working on at the start of your response.**

**Format:**
```
Working on: Phase X, Step X.Y - [Step Name]

[Review of plan.md, implementation.md, and progress.md context]

[Implementation]

[Update progress.md after completion]
```

**Example:**
```
Working on: Phase 1, Step 1.1 - Define SchemeNFT.sol (ERC-721 skeleton)

From plan.md: SchemeNFT is an ERC-721 that stores scheme metadata including catchment, tonnage, and IPFS CID.
From implementation.md: Need to implement mintScheme function that mints to owner and stores SchemeInfo.
From progress.md: Currently on Step 0.4, moving to Phase 1.

[Implementation follows...]

[After completion: Update progress.md with Step 1.1 completion, test results, any problems/solutions]
```

---

## Rule 6: No Scope Creep

**Stick to EXACTLY what the step requires. No extras.**

- If step says "skeleton" → build skeleton only, not full implementation
- If step says "DB-only" → don't add blockchain integration yet
- If step says "placeholder" → keep it simple, don't over-engineer

**Save enhancements for later steps** when they're explicitly required.

---

## Rule 7: Document Deviations

**If you need to deviate from the plan, explain why and get approval.**

- If implementation.md seems unclear → ask for clarification
- If plan.md has conflicting requirements → point it out
- If technical constraints require changes → explain and get approval

**Never silently change the plan without discussion.**

---

## Rule 8: Update Progress File

**After completing ANY work, MUST update `progress.md`.**

1. **Update "Current Status"** section with current phase/step
2. **Move completed steps** from "In Progress" to "Completed Steps"
3. **Document any problems** encountered in "Problems Encountered"
4. **Document solutions** in "Solutions & Learnings"
5. **Add technical notes** if relevant
6. **Update "Change Log"** with date and summary

**The progress file is a living document that tracks:**
- What's been built
- Current work status
- Problems and their solutions
- Technical decisions and notes
- Environment setup status

**This ensures continuity and helps debug issues later.**

---

## Rule 9: Maintain Knowledge Base

**MUST update `KNOWLEDGE_BASE.md` when encountering important information.**

**Update the knowledge base when:**
1. **Discovering a bug** - Document the bug, root cause, and fix in "Known Bugs & Fixes"
2. **Fixing a bug** - Add the solution and prevention steps
3. **Understanding a flow** - Document how it works in "Key Flows & How They Work"
4. **Finding implementation details** - Add to "Important Implementation Details"
5. **Encountering recurring issues** - Add to "Common Issues & Solutions"
6. **Configuration changes** - Update "Configuration & Environment"
7. **Architectural decisions** - Document in "Architecture & Structure"

**Format for bug entries:**
```markdown
### N. Bug Name (STATUS)

**Problem:** [Description]

**Root Cause:** [Why it happened]

**Fix:** [How it was fixed]

**Prevention:** [How to avoid in future]

**Key Files:** [Relevant file paths]
```

**Format for flow entries:**
```markdown
### N. Flow Name

**Path:** [Step-by-step path]

1. **Step 1** ([endpoint/file])
   - What happens
   - Key details

**Key Files:**
- `path/to/file.py`
```

**The knowledge base ensures:**
- Future chat sessions can quickly understand the project
- Bugs don't get rediscovered
- Flows are documented for reference
- Common issues have known solutions
- Implementation details are preserved

**This is critical for maintaining project continuity across chat sessions.**

---

## Rule 10: Keep All Documentation Synchronized

**MUST update ALL relevant documentation files when making changes to the project.**

**Priority Order for Documentation Updates:**

1. **progress.md** - ALWAYS update after work:
   - Current phase/step status
   - Completed work
   - Problems encountered
   - Solutions applied
   - Change log entry with date

2. **KNOWLEDGE_BASE.md** - Update when:
   - Discovering new bugs or fixes
   - Understanding new flows
   - Finding important implementation details
   - Encountering recurring issues
   - **ALWAYS update "Last Updated" date at top of file**

3. **plan.md** - Update only when:
   - Architecture changes significantly
   - Adding new roles or actors
   - Changing core flows
   - Modifying technical specifications

4. **implementation.md** - Update only when:
   - Steps are completed (mark as done)
   - Steps need modification
   - New steps are added

5. **README.md** - Update only when:
   - Setup instructions change
   - Project status changes
   - New features added

**Reference Documentation (update as needed, not required):**
- `TROUBLESHOOTING.md` - Add new common issues
- `QUICK_START.md` - Update if setup changes
- `RESTART_GUIDE.md` - Update if restart process changes

**Historical Documentation (DO NOT update):**
- Files like `WHAT_HAPPENED.md`, `QUICK_FIX_SUMMARY.md` are snapshots
- Archive them, don't maintain them

**Documentation + Code = One Unit:**
- Commit documentation changes WITH code changes
- Documentation updates should be in the same commit as related code
- Never commit code without updating relevant docs

**Documentation Review:**
- Before major commits, verify all relevant docs are updated
- Check "Last Updated" dates are current
- Ensure cross-references between docs are accurate

---

## Summary Checklist

Before every response, verify:

- [ ] **Read `non-negotiables.md` (THIS FILE) - FIRST AND ALWAYS**
- [ ] **Read `KNOWLEDGE_BASE.md` - CRITICAL FOR CONTEXT**
- [ ] Read `plan.md` (or relevant sections)
- [ ] Read `implementation.md` (or relevant sections)
- [ ] Read `progress.md` to understand current status
- [ ] Identified current step
- [ ] Understood what needs to be built
- [ ] Understood how to build it
- [ ] Understood what tests are required
- [ ] Ready to implement ONLY the current step
- [ ] Will wait for approval before next step

After every response, verify:

- [ ] Updated `progress.md` with current status
- [ ] Updated `progress.md` change log with date
- [ ] Updated `KNOWLEDGE_BASE.md` if:
  - [ ] Discovered a new bug
  - [ ] Fixed a bug
  - [ ] Learned a new flow
  - [ ] Found important implementation details
  - [ ] Encountered recurring issues
  - [ ] Updated "Last Updated" date in KNOWLEDGE_BASE.md
- [ ] Updated `plan.md` if architecture/specs changed
- [ ] Updated `implementation.md` if steps completed/modified
- [ ] Updated `README.md` if setup/status changed
- [ ] Documented any problems encountered
- [ ] Documented solutions applied
- [ ] Verified documentation changes will be committed with code changes

---

## Violation Consequences

If these rules are violated:

1. **Stop immediately** when called out
2. **Revert any changes** that go beyond the current step
3. **Re-read both .md files** before continuing
4. **Restart from the correct step** with proper context

---

**These rules exist to ensure:**
- Code quality and correctness
- Alignment with project goals
- Manageable, testable increments
- Clear communication and expectations
- Successful delivery of the end-to-end system

