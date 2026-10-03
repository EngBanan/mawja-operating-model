# 4 · The Wave Cycle

A wave is one task with a defined scope, one Git branch and a checklist of required results. The Conductor prepares it, the Executor implements it, and the Conductor verifies it before merge.

| Step | Action | Requirement |
|---|---|---|
| 1 | Measure current state | Run current checks; record commands and results |
| 2 | Plan batches | Use small logical batches with one commit per batch |
| 3 | Implement | For documentation-only work, check documentation and consistency. For code, run critical checks, tests of the change and required mutations on the Executor branch |
| 4 | Verify independently | Review and measure the implementation branch |
| 5 | Review failure cases and structure | Challenge the actual diff, inspect the structure delta and apply the review requirements for the sensitivity class |
| 6 | Resolve findings | Fix acceptance blockers with their regression guards; record unrelated findings as numbered debt with a closure condition |
| 7 | Merge and document | The Conductor merges reviewed work, records the result and confirms evidence for debt closure. Code integration into `main` requires the full suite on the integrated revision before publication |

Shipping remains an Owner decision. Merge completion does not authorize deployment. Record the revision and environment covered by the applicable authorization, and follow [safe delivery and deployment verification](16-safe-execution-and-delivery.md).

## When a merged wave turns out wrong

The Owner chooses whether to revert the merge while preparing a correction or retain it and apply a bounded fix. The Conductor performs the revert when selected.

The Executor implements the correction on a new branch. If the original merge was reverted, reapply its intended changes before fixing the defect; a fix alone may not restore the removed implementation. The Conductor verifies and merges the correction. Do not fix directly on the main branch.

## Verification at both stages

The Executor verifies the implementation before reporting. The Conductor then runs independent verification on the branch. The two stages have separate evidence and responsibilities. For code, the Conductor reviews existing suite evidence and performs the task-specific guard checks, independent mutation and claim check. For documentation-only work, the Conductor checks content and consistency independently. Neither requires replaying every successful full suite without a reason.

## Plan verification

Name the documentation-only or code-branch checks, the full suite at code integration into `main`, who runs them and the Conductor's independent checks. Include affected guards and visual surfaces. An additional full suite on the Executor branch needs a concrete sensitivity reason. Separate the required schedule from what the current hook implements; missing routing requires maintenance, not bypasses. Use [Section 9](09-the-verification-protocol.md#schedule-checks) for the schedule, reruns and [hook support](09-the-verification-protocol.md#policy-and-hook-support).

Run the verifier once per unchanged verification stage. A fix, changed input, incomplete evidence or a specific review concern requires the affected checks again. Keep every required gate blocking; a failed run is not the completed verification for that stage.

## Background work

Start monitoring when work starts and use completion notifications when the tool supports them. Set a completion or stall deadline and keep the Owner informed. If a notification is unavailable, late or lost, use bounded status checks to establish the result. Start ready follow-up work together only when its dependencies and file ownership allow it.

## Scope and dependencies

- Classify sensitivity before implementation. High-sensitivity work requires Owner review before merge unless the Owner explicitly selects the documented [delegated acceptance option](08-sensitivity-classification.md#explicit-project-options).
- Complete dependencies before work that relies on them.
- Keep each task small enough to review with its requirements and evidence in context.
- Low- or medium-sensitivity tasks may run in parallel when their product files and outputs are independent, each on its own branch. Reserve disjoint identifier ranges; reconcile shared ledgers sequentially with no lost entries. Record baseline deltas relative to the starting revision.
- Run high-sensitivity work in isolation by default. Any exception needs an explicit Owner decision, separate product-file ownership, sequential Conductor verification, a recorded merge order, refreshed integrated baselines and coordinated heavy runs. Record the added integration risk.

Measurement and the Executor's helper assignments follow [the boundaries in Section 3](03-why-a-separate-conversation.md). The Executor remains responsible for implementation; the Conductor remains responsible for independent review.

## Correction rounds

Before issuing a correction, agree a closed finding list, observable negative cases, valid controls, allowed files, frozen interfaces and accepted limitations. Judge the round against that contract and regressions it introduces, including structural deterioration. Retain review probes and rerun the affected ones on the corrected revision.

Record unrelated discoveries as debt instead of silently expanding the contract. Escalate newly measured critical harm, such as a security exposure, data loss or incorrect charging; bounded scope never authorizes shipping a known critical defect. Do not defer the regression protection needed to establish the fix. A limitation inherited from an intermediate correction must name that revision and be assessed against the original closure requirement.

## Plan a program and its maintenance

For a program spanning several waves, establish a proportionate scope, target architecture, dependency order, sensitivity and exit criteria before implementation. Measure the starting state and obtain the required decisions. The Conductor can help prepare this plan; Mawja does not require a fully designed program before any useful work can begin.

A conversation reaching its context limit is a handover event, not an automatic change of scope. Preserve the wave's acceptance contract across conversations. Combine small tasks only through explicit planning, keeping their branches and acceptance evidence distinct or formally defining one combined wave.

Use parallelism when it reduces waiting and the resources support it. Observe the first concurrent run; return affected checks to serial execution while investigating unexplained failures. Scheduling a check in parallel must preserve its execution, result and required failure propagation.

Schedule dependency maintenance explicitly. Triage reachable production vulnerabilities promptly; use the smallest safe update, the existing package manager and a tool-generated lockfile. Choose routine update cadence for the project. Isolate major migrations so regressions remain attributable and read the vendor's migration guidance. An unavailable vulnerability audit is not a clean result. Pre-release dependencies need an explicit stability decision.

---

[Previous: 3 · Why a Separate Conversation](03-why-a-separate-conversation.md) · [Documentation index](README.md) · [Next: 5 · The Wave Prompt](05-the-wave-prompt.md)
