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

If review finds a defect, return it to the Executor for correction. The Conductor verifies the corrected branch before merging. For code integration into `main`, the Conductor also confirms the full-suite evidence on the integrated revision before publication, following the [verification schedule](09-the-verification-protocol.md#schedule-checks).

## Review the delivery

As the Owner, you do not need to write code to define the required behavior or assess whether the result meets your needs. Ask the Conductor to explain technical findings and propose [test cases](00-terms.md#test-case) with clear steps and expected results. Confirm that those expectations match your request.

Use the report to answer:

- What changed, and which [acceptance criteria](00-terms.md#acceptance-criteria) does it meet?
- What [evidence](00-terms.md#test-evidence) supports each result?
- What could not be measured, and how does that affect acceptance?
- What decision or follow-up is needed?

For user-facing work, you can run the agreed tasks and record your observations as part of [user acceptance testing](00-terms.md#user-acceptance-testing). An Owner with programming experience may also inspect the code. Both activities complement the Conductor's required independent technical verification.

See the [sample report](workflow-example/02-the-report.md) and [independent review](workflow-example/03-the-verification.md).

## Authority and communication

Interpret the Owner's request in context. A request for explanation or advice alone does not authorize implementation. An instruction to perform work authorizes the necessary actions within its scope; honor standing authorization without repeatedly asking for the same decision. Do not extend approval to another repository, destructive action or release target. If an action was rejected, do not try another route to perform it. Report accidental changes and follow the agreed recovery policy.

Explain the result first, then the recommendation and any actual decision needed. Use plain language while retaining useful technical terms, with a brief explanation where needed. The Owner may want to understand Push, Merge, Review and Deploy without writing code. Product interface text follows its own audience and wording requirements.

A standing policy may authorize ordinary pushes after completed work; it does not authorize forced pushes, deletion or deployment. An explicitly chosen local handoff changes that task's delivery route.

Record communication preferences in the working agreement. A compact status table, a file path instead of a pasted prompt, or fewer reminders about accepted deferrals are options. Keep deferred work discoverable with its trigger; new material risk still needs reporting. Current measurements need a dated command or evidence reference. Label earlier results and inference honestly.

## Independent ownership

Begin acceptance review after an explicit handoff of a fixed commit. Observing an active Executor branch is not delivery. The Conductor reviews the actual diff, challenges failure cases and verifies significant findings with a reproducer or precise code evidence. Read the implementation as well as mutation results; either can expose defects the other misses.

An additional reviewer can address a named risk, but repeating the same review with more agents is not a guarantee. No author accepts their own correction independently, including a Conductor's test-fixture edit. See [integration responsibilities](16-safe-execution-and-delivery.md#conductor-intake-and-integration) and [correction rounds](04-the-wave-cycle.md#correction-rounds).

---

[Previous: 1 · The Governing Principle](01-the-governing-principle.md) · [Documentation index](README.md) · [Next: 3 · Why a Separate Conversation](03-why-a-separate-conversation.md)
