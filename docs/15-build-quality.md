# 15 · Build quality

The Executor owns the quality of the implementation. Checks and independent review provide additional controls. A passing test does not establish that a change is maintainable.

Apply this procedure to significant changes to state, permissions, money, concurrency, recovery or shared components. Scale it to the task; a text edit does not need an architecture exercise.

## Before implementation

Write a short design note naming the affected entry points, the owner of each fact, valid state transitions and states that must remain impossible. Read existing public interfaces and trace their consumers before adding an alternative implementation.

| Question | Action |
|---|---|
| Does the same rule already exist, with the same reason to change? | Reuse its public interface |
| Can the owning module support the new requirement coherently? | Extend that interface with an explicit operation or clear options |
| Is the resemblance only syntactic, with different responsibilities? | Keep the implementations separate |
| Is repeated policy diverging across consumers? | Consider a shared implementation, preserving the differences that matter |

Use explicit module boundaries. Other modules should call the public interface rather than reach into internals. Record how a boundary map can be changed and who approves it. Mawja does not prescribe one deployment, one database or a microservice architecture; justify that choice from the project's constraints.

## Change behavior and structure separately

Separate behavior-preserving refactoring from a behavior change in reviewable commits. First capture the relevant existing behavior with characterization tests. When a small extraction is needed to make a fix safe, name it in scope and verify preservation before changing behavior. Schedule a separate preparatory wave when the refactoring is too large for the current task.

A bounded task should state whether preparatory refactoring is authorized. If its constraints force a fragile workaround or require files outside the agreed ownership, stop the dependent work and report the concrete conflict. Resolving the root cause does not authorize a rewrite.

## Preserve decisions and capabilities

Keep one authoritative owner for each fact or decision. Reuse it instead of adding independently writable flags, rules or caches that can disagree. A derived cache needs an explicit consistency and invalidation contract.

Search for all consumers reached by the defect's cause. Fix shared policy at its owning boundary and report the affected entry points. Before consolidating implementations, capture their observable results and edge cases. Preserve all required capabilities, including retries, fallbacks and recovery, rather than retaining only the intersection of the implementations.

For a replacement, write a small capability table: old surfaces, required behavior and replacement evidence. An intentional removal needs an accepted scope decision. Line-count reduction alone is not a reason to remove a capability. Name modules for their responsibility; a temporary campaign or event normally belongs in data.

Prefer behavior tests through public interfaces. Use implementation-level tests when they address a specific internal invariant. After an interface change, inspect its callers and fixtures so an already broken test does not become mutation evidence.

## Review the structure delta

For significant changed functions and modules, record a before/after comparison and its measurement method. Useful signals include size, complexity, nested responsibilities, state variables, duplicated policy, import cycles and dead code. Select relevant signals; a line count alone is not a quality verdict.

The independent review answers:

- Does the change address the cause at the responsible boundary?
- Does each fact still have one authoritative owner?
- Which capabilities and edge cases were preserved?
- Did the changed structure improve, stay comparable or worsen, and why?

Unexplained deterioration or contradictory state blocks acceptance. A justified exception records its scope, consequence, approving role and follow-up. Apply checks to new and changed code without treating existing debt as permission for a new regression.

The supplied toolkit does not measure complexity, enforce module boundaries or determine maintainability. Report any project's warning-only analysis as a warning, not as blocking enforcement. See [gate design](appendix.md#f--gate-design-and-baselines).

---

[Previous: 14 · Failure patterns](14-five-failure-patterns.md) · [Documentation index](README.md) · [Next: 16 · Safe execution and delivery](16-safe-execution-and-delivery.md)
