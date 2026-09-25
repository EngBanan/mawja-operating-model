# 13 · Adoption checklist

Inspect the repository's files and run its configured checks before marking items complete. Use this checklist when adopting Mawja or reviewing an existing setup.

- [ ] The Conductor reviews independently and writes no production code.
- [ ] The task prompt contains the decisions, scope and constraints needed by a fresh conversation.
- [ ] Measurements are current and include the commands used to obtain them.
- [ ] The prompt identifies existing behavior that must be preserved.
- [ ] The task states when to report completion and when to stop for an Owner decision.
- [ ] The Conductor verifies the implementation branch and its behavior.
- [ ] The reviewer's mutation differs from the Executor's cases.
- [ ] Mutations test incorrect values as well as absence where relevant.
- [ ] The verification plan names targeted checks, final suites and their runner, with reasons for necessary reruns.
- [ ] Mutation selection covers new, modified and affected guards; repeats name the affected behavior, and unchanged guards considered in the task have a reason for no repeat.
- [ ] Visual evidence covers named affected surfaces, including shared-component effects; unmeasured behavior is declared.
- [ ] Helper tasks follow the closed allowlist, restrictions take precedence, and the Executor reviews every changed line.
- [ ] Background work has a completion or stall deadline and a fallback when notifications are unavailable.
- [ ] Known debt has numbered records; deliberate deferrals have documented triggers.
- [ ] Debt closure conditions are recorded when the item is discovered.
- [ ] Closure markers follow a fixed, machine-readable convention.
- [ ] Sensitivity is classified before implementation and reassessed when scope changes.

Use [file architecture](06-file-architecture.md) and [debt tracking](07-the-debt-ledger.md) to address missing records, then apply the [verification procedure](09-the-verification-protocol.md).

---

[Previous: 12 · Limitations](12-transparency.md) · [Documentation index](README.md) · [Next: 14 · Failure patterns](14-five-failure-patterns.md)
