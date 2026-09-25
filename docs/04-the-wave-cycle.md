# 4 · The Wave Cycle

A wave is one task with a defined scope, one Git branch and a checklist of required results. The Conductor prepares it, the Executor implements it, and the Conductor verifies it before merge.

| Step | Action | Requirement |
|---|---|---|
| 1 | Measure current state | Run current checks; record commands and results |
| 2 | Plan batches | Use small logical batches with one commit per batch |
| 3 | Implement | Run targeted checks during each batch. Complete the required suites on the final commit through the enforcing hook, or manually if the hook does not run them. Avoid a duplicate successful run with unchanged inputs |
| 4 | Verify independently | Review and measure the implementation branch |
| 5 | Review failure cases | Apply the review requirements for the sensitivity class |
| 6 | Resolve findings | Fix defects or record numbered debt with a closure condition |
| 7 | Merge and document | The Conductor merges, records the result and confirms evidence for debt closure |

Shipping remains an Owner decision. Merge completion does not authorize deployment.

## When a merged wave turns out wrong

The Owner chooses whether to revert the merge while preparing a correction or retain it and apply a bounded fix. The Conductor performs the revert when selected.

The Executor implements the correction on a new branch. If the original merge was reverted, reapply its intended changes before fixing the defect; a fix alone may not restore the removed implementation. The Conductor verifies and merges the correction. Do not fix directly on the main branch.

## Verification at both stages

The Executor verifies the implementation before reporting. The Conductor then runs independent verification on the branch. The two stages have separate evidence and responsibilities. The Conductor reviews existing suite evidence and performs the task-specific guard checks, independent mutation and claim check; independent review does not require replaying every successful full suite without a reason.

## Plan verification

Name the targeted checks for each batch, the final required suites, who runs them and the Conductor's independent checks. Include affected guards and visual surfaces. Use [Section 9](09-the-verification-protocol.md#schedule-checks) to decide when results remain applicable and when a rerun is required.

Run the verifier once per unchanged verification stage. A fix, changed input, incomplete evidence or a specific review concern requires the affected checks again. Keep every required gate blocking; a failed run is not the completed verification for that stage.

## Background work

Use completion notifications when the tool supports them. Set a completion or stall deadline and keep the Owner informed. If a notification is unavailable, late or lost, use bounded status checks to establish the result. Start ready follow-up work together only when its dependencies and file ownership allow it.

## Scope and dependencies

- Classify sensitivity before implementation. High-sensitivity work requires Owner review before merge.
- Complete dependencies before work that relies on them.
- Keep each task small enough to review with its requirements and evidence in context.
- Low- or medium-sensitivity tasks may run in parallel when their files and outputs are independent, each on its own branch.
- Run high-sensitivity work in isolation, without another wave in parallel.

Measurement and the Executor's helper assignments follow [the boundaries in Section 3](03-why-a-separate-conversation.md). The Executor remains responsible for implementation; the Conductor remains responsible for independent review.

---

[Previous: 3 · Why a Separate Conversation](03-why-a-separate-conversation.md) · [Documentation index](README.md) · [Next: 5 · The Wave Prompt](05-the-wave-prompt.md)
