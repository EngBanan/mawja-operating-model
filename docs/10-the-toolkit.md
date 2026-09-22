# 10 · The Toolkit

The toolkit automates repository measurements and branch checks. Start with the [examples](../examples/README.md), then use the [installation guide](../scripts/README.md) for an existing project.

| Command | Behavior |
|---|---|
| `wave:new` | Generates the required prompt sections and measures Git state, type errors, ceilings, crash diagnostics, guard counts, debt and the next identifier; leaves marked fields for the task's requirements |
| `wave:check` | Checks that required fields are complete and recorded measurements match the current state |
| `wave:verify` | Checks the selected commit and clean tree, runs type measurement and added or changed guard commands, checks whether the change has the required guards and runs the supplied claim command |
| `lint:debt-ledger:strict` | Validates ledger identifiers, closure markers and minimum row counts |

The supplied type checkers and guard counter implement the [measurement contract](appendix.md#d--measurement-output). Another checker must satisfy that contract and be verified in its target environment.

## Automation and review

The verifier requests mutation evidence but does not perform the reviewer's independent mutation. Rerunning known fault cases helps detect regressions. The reviewer must also choose a different fault, as required by [Section 9](09-the-verification-protocol.md).

An automated pass covers the checks that ran. The reviewer remains responsible for the central claim, relevant inherited checks and any unmeasured behavior.

## Keep check logic testable

Place check-selection and validation logic in files that the runner calls. This allows direct tests of routing, failure handling and reported outcomes.

Run verification through the same commands and environment that will enforce it. Preserve complete logs so the failure cause remains reviewable.

---

[Previous: 9 · The Verification Protocol](09-the-verification-protocol.md) · [Documentation index](README.md) · [Next: 11 · Engineering foundations](11-what-this-framework-is-built-on.md)
