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

Preparing complete tasks and running independent verification takes time and compute. The cost depends on scope, environment and check duration.

## Check execution

A script must be connected to the project's runner, CI or hook to enforce a rule. Documentation alone cannot ensure that connection exists or runs.

## Handover and recovery

The Owner passes prompts and reports between conversations. Mawja does not coordinate those conversations or recover lost ones automatically.

If an implementation conversation is lost, preserve the branch commits. Start a fresh Executor with the task prompt and a record of completed work, then repeat verification in full.

## Check routing

Route checks according to the affected paths and their dependencies. Keep required gates blocking. Avoid global skip switches that bypass relevant checks, and distinguish intentional routing from environment failure.

---

[Previous: 11 · Engineering foundations](11-what-this-framework-is-built-on.md) · [Documentation index](README.md) · [Next: 13 · Adoption checklist](13-audit-your-structure.md)
