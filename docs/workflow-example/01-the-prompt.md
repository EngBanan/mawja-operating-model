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
| Type errors / ceiling | **2 / 2** · crash class **zero** | `node --import tsx scripts/conductor/check-types-baseline.ts --json` |
| Registered guard commands | **3** | `node --import tsx scripts/conductor/count-gates.ts` |
| Debt rows | **6** · open **2** | `npm run lint:debt-ledger:strict` |
| **Next available identifier** | **#9** | `node --import tsx scripts/conductor/wave-prompt.ts --next-number` |

Reserved identifiers: #9 for Executor findings; #10 for the Conductor's merge decision. The next-number measurement does not allocate these reservations.

## Step 3: 🟢 What already works (⛔ do not rebuild it)
- `store.load()` and `store.save()`: 41 tests green under `test:store`.
- `check-store-shape.ts`: refuses a notes file whose shape drifted. Wired as `test:store-shape`.
- Open debt #7 records the half-written file and requires a process-interruption test to close it.

## Step 4: The scope
**In:** `save()` writes to a temporary file in the same directory and renames it over the old file. The CLI reports success only after save completes. A process kill leaves either the old complete file or the new complete file. A note interrupted before completion may be absent.
**Out:** deliberate deferrals F1 encryption (trigger: first shared machine) and F2 a backup copy (trigger: first lost note in the field), both in PROGRESS/FUTURE_ENHANCEMENTS.md. Power-loss durability and network filesystems are not promised by this wave.

Owned files: src/store.ts, src/cli.ts, the new save guard, package.json and the debt ledger. Preserve the public load/save signatures and notes-file format. No broad refactoring is authorized; request a bounded extraction if needed.

Design: the notes file is the authoritative persisted state. A completed rename changes it atomically within the supported filesystem; an interrupted operation may leave the prior complete value. Review error reporting and temporary-file cleanup separately from the atomicity claim.

## Step 5: Batch order
1. `src/store.ts`: temp-file-and-rename; `src/cli.ts`: wait for save before reporting success. One commit.
2. `scripts/governance/check-save-atomic.ts`: kill the saving process during repeated writes and refuse any file that fails to parse. Register `test:save-atomic` in package.json. One commit.
3. Mark existing debt #7 closed with evidence. Propose decision #10 in the report; do not write DECISIONS.md. One commit.

Build quality: reuse the store interface, preserve all existing note operations, separate any preparatory refactoring from the save change, and report the structure delta for the changed save path. Independent review challenges the actual diff as well as its test evidence.

Delivery mode: remote branch delivery through the project hook. Record the advertised branch commit after pushing. Comparison base: the measured preparation commit 3f9c2a1. Run safe commands from the repository root after establishing the owned test environment; validate commands before issuing the actual task.

Verification plan:

- Documentation-only work uses documentation and consistency checks; this wave changes code.
- Executor branch: critical type/debt checks, `test:store`, `test:store-shape` and `test:save-atomic`, with a targeted mutation for the new guard. Run affected checks during batches and complete branch evidence on the final commit.
- Code integration into main: the Conductor confirms full `npm run check` evidence for the integrated revision before publication. This is not part of the Executor's completed branch checks.
- No additional full suite on the branch: the listed checks cover the affected storage and CLI behavior. Record a concrete sensitivity reason if broader coverage becomes necessary.
- The Conductor runs task-specific checks, a different mutation and a separate CLI probe. Rerun affected checks and dependencies after a fix or changed input.

Hook support: in this fictional app, a project-specific hook runs the branch checks above and the full suite for code integration into main. Mawja does not install that routing. In an adopting project, inspect actual hook behavior and record missing routes as maintenance; retain existing mandatory checks without bypasses until maintenance is complete.

Helper assignments: none. The Executor implements the storage change and the guard. No UI or print layout is affected, so no screenshots are required. If that scope changes, update the plan before acceptance.

## Step 6: Hard constraints (fixed)
- Language of everything the owner reads: plain English; explain technical terms when needed.
- No new dependency. Use an owned dependency installation and an isolated HOME for every CLI test.
- Security and data: synthetic notes only; preserve existing access behavior and never write test notes into the Owner's home.
- Release: the Conductor records build/full-suite evidence before publication. The Owner selects the deployment; external save/reopen verification and rollback remain release work.
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
