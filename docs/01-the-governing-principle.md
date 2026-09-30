# 1 · The Governing Principle

Accept a change based on observed behavior and independent verification. A passing test result is evidence for the cases it covers; it does not establish that every requirement was tested.

## What this means in practice

1. **Measure the current state.** Run the relevant command and record its inputs, output and environment. Treat older reports as historical evidence.
2. **Verify the implementation branch.** The Executor's report guides review; the Conductor checks its claims against the requirements, changed content and observed behavior.
3. **Test new, changed or affected guards.** Introduce a relevant fault, confirm that the intended check fails, restore the change and confirm that it passes again.

Documentation-only work uses documentation and consistency checks. Code-branch and main-integration checks follow the [verification schedule](09-the-verification-protocol.md#schedule-checks). Independent review remains required for both.

## Working with a small team

When an individual relies on agents for implementation and review, explicit acceptance criteria and separate verification reduce dependence on the implementer's assumptions. They complement technical judgment; they do not guarantee correctness.

---

[Previous: Terms](00-terms.md) · [Documentation index](README.md) · [Next: 2 · The Three Roles](02-the-three-roles.md)
