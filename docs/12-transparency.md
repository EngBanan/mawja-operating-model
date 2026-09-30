# 12 · Limitations

## Model capability

The workflow organizes evidence and review. It does not increase a model's reasoning ability or guarantee correct implementation.

## Technical review

The Conductor must understand the system and its measurements. An independent mutation often requires reading code and distinguishing an intended assertion failure from an environment error.

## Incomplete coverage

Checks can expose defects in the behavior they cover. Untested paths, incorrect requirements and unknown failure modes can remain.

## Team fit

The workflow is designed for an individual working with agents. Larger teams should map its responsibilities to their existing peer review, QA and release processes.

## Cost

Preparing complete tasks and running independent verification takes time and compute. The cost depends on scope, environment and check duration. Use a [verification plan](04-the-wave-cycle.md#plan-verification) to avoid duplicate successful runs and unrelated visual work. Reduced repetition does not establish that coverage is complete.

## Check execution

A script must be connected to the project's runner, CI or hook to enforce a rule. Documentation alone cannot ensure that connection exists or runs.

## Handover and recovery

The Owner passes prompts and reports between conversations. Mawja does not coordinate those conversations or recover lost ones automatically.

If an implementation conversation is lost, preserve the branch commits and check evidence. Start a fresh Executor with the task prompt and a record of completed work. Establish the current state, rerun missing or inapplicable checks and complete independent review. A result from a different environment or an unverifiable state cannot stand in for a current measurement.

## Check routing

Follow the [verification schedule](09-the-verification-protocol.md#schedule-checks): documentation and consistency checks for documentation-only work; critical checks, change-specific tests and required mutations on the Executor branch; the full suite at code integration into `main` before publication. Select checks by behavior and dependencies, not only file extensions.

A written routing rule does not implement it. The supplied toolkit does not select hook stages. Record missing project-hook capabilities as maintenance and retain currently enforced checks until reviewed maintenance is complete. Avoid global skip switches that bypass relevant checks, and distinguish intentional routing from environment failure.

---

[Previous: 11 · Engineering foundations](11-what-this-framework-is-built-on.md) · [Documentation index](README.md) · [Next: 13 · Adoption checklist](13-audit-your-structure.md)
