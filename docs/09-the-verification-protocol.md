# 9 · The Verification Protocol

The Conductor reviews every wave independently before merging. For code changes, complete the steps below. For documentation-only work, independently check the changed content, links, examples and consistency with the project rules; record why code-specific steps do not apply. An executable example, configuration change or altered check behavior is not documentation-only just because it appears in a documentation directory.

The toolkit can automate checks, type measurement and Git-state inspection; independent mutations and judgment remain review responsibilities. Installed tools and hooks may still require additional checks; follow the [implementation boundary](#policy-and-hook-support).

| Step | Required evidence |
|---|---|
| **1. Run the task's guards** | Passing results from the reviewer’s environment |
| **2. Introduce an independent fault** | A mutation different from the Executor's cases; the intended guard fails, then passes after restoration |
| **3. Measure type budgets** | No per-file or total regression; configured crash diagnostics remain zero |
| **4. Check the central claim independently** | A reviewer-chosen command or observation that demonstrates the requested behavior |
| **5. Confirm restoration** | A clean working tree after mutations and automated checks |

Run the existing checks for behavior the change could affect, even if their command definitions did not change. The verifier discovers newly added or changed manifest commands; it cannot infer every affected behavior.

## Schedule checks

Choose the check scope from the actual change and delivery stage. Record the exact commands, acceptance criteria, responsible role and evidence location in the task prompt.

| Scope or stage | Required checks |
|---|---|
| Documentation only | Documentation checks and consistency review, including changed links, instructions and diagrams. This also applies to a documentation-only merge |
| Executor's code branch | The project's critical checks, tests for changed and affected behavior, and required targeted mutations |
| Code integration into `main` | The full project suite against the exact integrated revision, before publishing that revision or deploying it. The Conductor confirms the evidence |

Run targeted checks during implementation. On the final Executor commit, complete the branch checks above. An additional full suite on that branch requires a recorded, concrete sensitivity reason: name the risk, the affected behavior and why targeted checks are insufficient. For example, a change to shared authorization or test-selection logic may require broader validation. The task's sensitivity label alone is not the reason. A branch full run does not remove the full check at code integration into `main`.

The full suite uses the project's existing acceptance criteria; it is not a claim that every possible behavior is covered. A failed full check blocks publication. After a correction, rerun affected checks and dependencies and establish the required full-suite evidence for the corrected integrated revision. Owner approval to release does not replace these checks.

Use the enforcing hook's actual commands and environment for the required stage. If it runs those checks, do not duplicate an identical successful run manually immediately before it. Run required checks that the hook does not cover explicitly. The hook still runs and remains blocking.

A result applies to its commit, working tree, command, scope, acceptance criteria, tool versions, environment and relevant external state. Record these with the complete output. Do not repeat an accepted result with identical inputs without a reason. After a fix, changed input, missing evidence or a specific review concern, rerun the affected checks and their dependents. Record the reason; there is no fixed limit on necessary retries.

When existing acceptance criteria allow an error budget or a reviewed failure baseline, record that criterion and the remaining failures. An accepted gate result does not mean every underlying test passed.

The Conductor inspects the suite evidence and still runs the task-specific checks in the table above. Reading the Executor's report alone is not independent verification. Different environments require their own evidence.

When a hook fails, collect other independently measurable blockers and address them before retrying. Do not run a stage whose prerequisite failed. Follow the hook's implemented retry behavior; documentation or a saved log cannot authorize bypassing it. The optional [check runner](../scripts/CHECK_REUSE.md) provides a default-off reuse path for eligible local checks. Its [adoption requirements](../AGENT_GOVERNANCE_KIT.md#optional-hook-result-reuse) still apply; it does not make stateful checks eligible or replace the enforcing hook.

## Policy and hook support

The schedule above is a workflow requirement, not evidence that a project's hook implements stage selection. Inspect the effective hook, its called commands and recorded runs. State separately which routes are implemented, which checks currently run and which capabilities need maintenance.

If the hook still runs the full suite on every branch, keep that behavior until a reviewed maintenance change implements the lighter branch route. Record the extra run as an existing enforcement requirement, not an invented sensitivity reason. Missing documentation routing or a full `main` check also requires maintenance; run uncovered required checks explicitly in the meantime. Do not skip stages, disable the hook or use `--no-verify` to imitate an unimplemented route.

The supplied prompt generator records the plan but does not select hook stages. `wave:new` and `wave:check` still require their configured type measurement, including for documentation tasks. `wave:verify` also runs its configured type check and has no documentation-only mode. `run-checks.mjs` runs its configured checks; it does not choose documentation, branch or `main` routes or enforce a full suite at merge. Keep these checks when the installed tools require them. Any change to their enforcement needs separate maintenance and validation.

Before adopting routing maintenance, prove that the intended documentation and code-branch paths run their required checks, code integration into `main` cannot select the lighter route, and a failed required check still blocks delivery. Until then, report the policy as adopted and the missing capability as pending.

## Select mutation evidence

Prove new or modified guards and existing guards whose execution or coverage is affected. Review changes to runners, configuration, discovery, helpers, fixtures, dependencies and protected behavior, even when the guard file is unchanged. Choose mutations that address the affected failure cases; do not automatically replay every historical mutation.

When repeating a previously accepted mutation, name the change in execution or coverage, missing evidence or specific review concern that requires it. For existing guards considered in the task whose execution and coverage remain unchanged, record why their mutations were not repeated; group guards that share the same reason. This does not require listing unrelated guards.

Keep relevant behavior tests and the Conductor's different, independently chosen mutation. One mutation does not establish coverage of every affected case. Preserve failure from the intended assertion and a passing result after restoration.

## Limit visual evidence to affected surfaces

Name the screens, print layouts and other visual outputs affected by the task, including indirect effects from shared components or styles. Capture evidence for those surfaces. If another affected surface is discovered, add it to the plan with the reason. Avoid unrelated screenshot rounds.

This scopes visual evidence, not functional coverage. Claim automated coverage only for behavior that actual checks exercise, and record what remains unmeasured.

## Check adjacent behavior

A guard may test one route while missing another that uses the same code. Identify the affected screens, routes and API endpoints, and test each relevant entry point.

Record any missing checks. A passing test for one entry point does not verify the others.

## Test incorrect values as well as absence

A function can run and still return the wrong result. Where relevant, test both a missing implementation and one that produces incorrect values.

For example, a subtraction guard should detect a function that returns addition and one that incorrectly removes the sign of a negative result. Confirm that failure comes from the behavior assertion rather than an unrelated setup error.

Preserve the command, exit status and complete output for the fault and restored state.

## Choose checks for the requirement

[Black-box testing](00-terms.md#black-box-testing) uses the required behavior to choose inputs and expected results. For a notes app, save a note through the interface, reopen it and compare the text. The test can be manual or automated.

[White-box testing](00-terms.md#white-box-testing) uses the implementation to select what to exercise. A reviewer might identify the save function's error branch, cause a write failure and check its result. Reading the code alone is code review; the test exercises the selected behavior.

Choose checks that address the task's risks and [acceptance criteria](00-terms.md#acceptance-criteria). See [testing examples](00-terms.md#testing-examples) for the relationship to regression and mutation testing.

## Include the Owner's observations

For user-visible work, the Executor can provide reproducible test steps, and the Conductor can check their coverage against the requirements. The Owner can then perform the agreed tasks and record expected and actual results, including failures. This supports [user acceptance testing](00-terms.md#user-acceptance-testing).

The Conductor still completes the verification steps above. The Owner's ability to read code does not change those requirements. Keep [test evidence](00-terms.md#test-evidence) and unverified behavior in the report.

---

[Previous: 8 · Sensitivity Classification](08-sensitivity-classification.md) · [Documentation index](README.md) · [Next: 10 · The Toolkit](10-the-toolkit.md)
