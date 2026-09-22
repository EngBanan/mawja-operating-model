# 2 · The Three Roles

Mawja separates implementation, verification and product decisions. The Conductor and Executor use separate conversations.

| Role | Responsibilities | Boundary |
|---|---|---|
| **Owner** | Sets priorities, resolves product questions, approves spending and decides when to ship | Receives decisions in plain language; technical investigation belongs to the agents |
| **Conductor** | Measures current state, prepares the task, verifies the branch, merges and documents | Does not write production code |
| **Executor** | Implements on a branch, runs checks and returns the required report | Does not merge to the main branch |

The Conductor writes the task prompt. The Owner passes it to a fresh implementation conversation and returns the report for review. The prompt must contain the information needed to work without the previous conversation.

## Preserve independent review

The reviewer should assess the implementation against the requirements without depending on the author's reasoning. Keeping implementation in a separate conversation also limits the review context to the task, result and evidence.

If review finds a defect, return it to the Executor for correction. The Conductor verifies the corrected branch before merging.

## Review the delivery

As the Owner, you do not need to write code to define the required behavior or assess whether the result meets your needs. Ask the Conductor to explain technical findings and propose [test cases](00-terms.md#test-case) with clear steps and expected results. Confirm that those expectations match your request.

Use the report to answer:

- What changed, and which [acceptance criteria](00-terms.md#acceptance-criteria) does it meet?
- What [evidence](00-terms.md#test-evidence) supports each result?
- What could not be measured, and how does that affect acceptance?
- What decision or follow-up is needed?

For user-facing work, you can run the agreed tasks and record your observations as part of [user acceptance testing](00-terms.md#user-acceptance-testing). An Owner with programming experience may also inspect the code. Both activities complement the Conductor's required independent technical verification.

See the [sample report](workflow-example/02-the-report.md) and [independent review](workflow-example/03-the-verification.md).

---

[Previous: 1 · The Governing Principle](01-the-governing-principle.md) · [Documentation index](README.md) · [Next: 3 · Why a Separate Conversation](03-why-a-separate-conversation.md)
