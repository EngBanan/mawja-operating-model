# 01 · Task prompt

This is a shortened example of a completed task prompt for the [fictional notes app](README.md).

In a project configured with Mawja, `npm run wave:new -- --slug=w3-atomic-save --title="W3: Atomic save"` generates the full prompt. Complete its task sections, run `npm run wave:check -- WAVE_PROMPT_W3_ATOMIC_SAVE.md`, and resolve any gaps or changed measurements before sending it to the Executor.

```markdown
# Wave W3: Atomic save: Executor instructions

Your goal: a process crash or kill during save leaves a complete notes file on the supported local filesystem.

**Mode:** resolve routine choices within scope and document them. Commit after each batch. Report at the stop gate when complete, or earlier if an Owner decision blocks progress.

> Naming: the tool is `keep`, the binary is `keep`, the notes file is `~/.keep/notes.json`. Use them verbatim.

## Step 0: Read first (in this order, mandatory)
`CLAUDE.md` · `_docs/CONSTITUTION.md` · `LESSONS_LEARNED.md` (section "the half-written file") · `src/store.ts` · `src/cli.ts` · `scripts/governance/check-store-shape.ts`

## Step 1: Owner decisions ⛔ do not reopen them
1. "One file. I am not adding a database for a notes tool."
2. "Saved notes must survive an interrupted save. Slower is fine."
### Out of scope by owner decision
- Encryption at rest: deliberate deferral F1 in PROGRESS/FUTURE_ENHANCEMENTS.md; trigger: first shared machine.
- Multiple notebooks: rejected.

## Step 2: Repository measurements (measured **2026-03-11**)
| Measurement | Value | Verification command |
|---|---|---|
| `main` HEAD | `3f9c2a1` | `git rev-parse --short HEAD` |
| Type errors / ceiling | **2 / 2** · crash class **zero** | `npx tsx scripts/conductor/check-types-baseline.ts --json` |
| Live gates | **3** | `npx tsx scripts/conductor/count-gates.ts` |
| Debt rows | **6** · open **2** | `npm run lint:debt-ledger:strict` |
| **Your numbers start at** | **#9** | `npx tsx scripts/conductor/wave-prompt.ts --next-number` |

## Step 3: 🟢 What already works (⛔ do not rebuild it)
- `store.load()` and `store.save()`: 41 tests green under `test:store`.
- `check-store-shape.ts`: refuses a notes file whose shape drifted. Wired as `test:store-shape`.
- Open debt #7 records the half-written file and requires a process-interruption test to close it.

## Step 4: The scope
**In:** `save()` writes to a temporary file in the same directory and renames it over the old file. The CLI reports success only after save completes. A process kill leaves either the old complete file or the new complete file. A note interrupted before completion may be absent.
**Out:** deliberate deferrals F1 encryption (trigger: first shared machine) and F2 a backup copy (trigger: first lost note in the field), both in PROGRESS/FUTURE_ENHANCEMENTS.md. Power-loss durability and network filesystems are not promised by this wave.

## Step 5: Batch order
1. `src/store.ts`: temp-file-and-rename; `src/cli.ts`: wait for save before reporting success. One commit.
2. `scripts/governance/check-save-atomic.ts`: kill the saving process during repeated writes and refuse any file that fails to parse. Register `test:save-atomic` in package.json. One commit.
3. Mark existing debt #7 closed with evidence. Propose decision #10 in the report; do not write DECISIONS.md. One commit.

Verification plan: run store and shape checks during the affected batches and prove the new atomic-save guard with a targeted mutation. The local hook runs the complete required suites on the final commit; do not duplicate that run manually. The Conductor runs task-specific checks, a different mutation and a separate CLI probe. Rerun affected checks after a fix or changed input.

Helper assignments: none. The Executor implements the storage change and the guard. No UI or print layout is affected, so no screenshots are required. If that scope changes, update the plan before acceptance.

## Step 6: Hard constraints (fixed)
- Language of everything the owner reads: plain English, no jargon.
- No new dependency.
- Types: the ceiling is 2 and the crash class is zero: neither moves up.

## Step 7: Exit gates
- [ ] `test:save-atomic` green, and a mutation replaces rename with a direct write: red, restored, green.
- [ ] `test:store` and `test:store-shape` still green.
- [ ] Types 2/2, crash class zero.
- [ ] Debt #7 marked closed with evidence for the Conductor to confirm; decision #10 proposed in the report.
- [ ] Tree clean, branch pushed.

## Step 8: Closing and handover
Report the branch and commit, delivery and omissions, changed numbers, guard and mutation, what could not be measured and why, and AI call cost. Include the proposed decision and a recommendation for the Owner.

## 🛑 The single stop gate
**Sensitivity rating: 🟡 medium.**
After finishing and pushing, print the report and stop. If blocked earlier, commit the work so far and report the blocker here as incomplete. Do not merge or start a next wave.
```

---

[Workflow example index](README.md) · [Next: 02 · Implementation report](02-the-report.md)
