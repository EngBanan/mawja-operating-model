# 8 · Sensitivity Classification

Classify the task before implementation. The classification determines review and merge requirements.

| Class | Typical scope | Review requirement |
|---|---|---|
| **High** | Security, billing, authorization, tenant isolation, destructive migrations or core logic used by several screens, API endpoints or jobs | Owner review before merge and isolation by default; independent faults from two relevant failure classes |
| **Medium** | Refactoring or consolidation across several tested components | The Conductor verifies and merges, then includes a release recommendation for the Owner |
| **Low** | Documentation, additional tests or a mechanically verifiable change | Review likely failure cases and complete Conductor verification; no separate Owner review before merge |

The Owner controls release in every class. A medium-sensitivity recommendation can lead the Owner to hold release after merge.

When uncertain, use the higher class. Reassess if the scope changes.

If sensitivity requires an additional full suite on the Executor branch, name the concrete risk and why the critical and change-specific checks are insufficient. A class label alone does not justify it. The full suite at code integration into `main` and reruns after fixes still follow the [verification schedule](09-the-verification-protocol.md#schedule-checks).

## Explicit project options

An Owner may delegate acceptance of high-sensitivity work to the Conductor through a recorded policy. Name the scope, duration, authority and accepted loss of an additional Owner review. Retain independent adversarial reading, branch verification and two Conductor-selected mutations from different relevant failure classes. These controls do not establish equivalence to an external reviewer. Deployment remains a separate authorization.

Parallel high-sensitivity waves require the separate exception conditions in [scope and dependencies](04-the-wave-cycle.md#scope-and-dependencies); delegated acceptance alone does not permit concurrency. These are project options, not the default.

For schema changes, review the [compatible rollout and recovery sequence](16-safe-execution-and-delivery.md#schema-changes). For paid background work, require a stated trigger, spend authority, budget controls and usage evidence. A project can prohibit autonomous paid calls by default, but this is an explicit product policy.

---

[Previous: 7 · The Debt Ledger](07-the-debt-ledger.md) · [Documentation index](README.md) · [Next: 9 · The Verification Protocol](09-the-verification-protocol.md)
