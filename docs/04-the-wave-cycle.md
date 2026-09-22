# 4 · The Wave Cycle

A wave is one task with a defined scope, one Git branch and a checklist of required results. The Conductor prepares it, the Executor implements it, and the Conductor verifies it before merge.

| Step | Action | Requirement |
|---|---|---|
| 1 | Measure current state | Run current checks; record commands and results |
| 2 | Plan batches | Use small logical batches with one commit per batch |
| 3 | Implement | Run the relevant checks after each batch and each new behavior check after adding it. Run the full required suites when implementation is complete; the push hook runs configured environment checks |
| 4 | Verify independently | Review and measure the implementation branch |
| 5 | Review failure cases | Apply the review requirements for the sensitivity class |
| 6 | Resolve findings | Fix defects or record numbered debt with a closure condition |
| 7 | Merge and document | The Conductor merges, records the result and confirms evidence for debt closure |

Shipping remains an Owner decision. Merge completion does not authorize deployment.

## When a merged wave turns out wrong

The Owner chooses whether to revert the merge while preparing a correction or retain it and apply a bounded fix. The Conductor performs the revert when selected.

The Executor implements the correction on a new branch. If the original merge was reverted, reapply its intended changes before fixing the defect; a fix alone may not restore the removed implementation. The Conductor verifies and merges the correction. Do not fix directly on the main branch.

## Verification at both stages

The Executor verifies the implementation before reporting. The Conductor then runs independent verification on the branch. The two stages have separate evidence and responsibilities.

## Scope and dependencies

- Classify sensitivity before implementation. High-sensitivity work requires Owner review before merge.
- Complete dependencies before work that relies on them.
- Keep each task small enough to review with its requirements and evidence in context.
- Low- or medium-sensitivity tasks may run in parallel when their files and outputs are independent, each on its own branch.
- Run high-sensitivity work in isolation, without another wave in parallel.

Measurement may be delegated within [the boundaries in Section 3](03-why-a-separate-conversation.md). Implementation remains in its assigned conversation.

---

[Previous: 3 · Why a Separate Conversation](03-why-a-separate-conversation.md) · [Documentation index](README.md) · [Next: 5 · The Wave Prompt](05-the-wave-prompt.md)
