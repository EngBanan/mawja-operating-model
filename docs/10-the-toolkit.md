# 10 · The Toolkit

The toolkit automates repository measurements and branch checks. Start with the [examples](../examples/README.md), then use the [installation guide](../scripts/README.md) for an existing project.

| Command | Behavior |
|---|---|
| `wave:new` | Generates the required prompt sections and measures Git state, type errors, ceilings, crash diagnostics, guard counts, debt and the next identifier; leaves marked fields for the task's requirements |
| `wave:check` | Checks that required fields are complete and recorded measurements match the current state |
| `wave:verify` | Checks the selected commit and clean tree, runs type measurement and added or changed guard commands, checks whether the change has the required guards and runs the supplied claim command |
| `lint:debt-ledger:strict` | Validates ledger identifiers, closure markers and minimum row counts |

The optional [check runner](../scripts/CHECK_REUSE.md) runs named local checks and can reuse verified results when their reviewed inputs remain unchanged. Its calculator exercise is included in each language example.

The supplied type checkers and guard counter implement the [measurement contract](appendix.md#d--measurement-output). Another checker must satisfy that contract and be verified in its target environment.

## Automation and review

The verifier requests mutation evidence but does not perform the reviewer's independent mutation. Select fault cases for new, modified or affected guards; do not replay an entire historical matrix automatically. The reviewer also chooses a different fault, as required by [Section 9](09-the-verification-protocol.md#select-mutation-evidence).

A claim command can include a guard that the verifier also runs automatically. The supplied verifier does not deduplicate those commands; choose the claim for the behavior it must establish.

An automated pass covers the checks that ran. The reviewer remains responsible for the central claim, relevant inherited checks and any unmeasured behavior.

## Keep check logic testable

Place check-selection and validation logic in files that the runner calls. This allows direct tests of routing, failure handling and reported outcomes.

Use the enforcing runner's actual commands and environment for the final required checks, following the [verification schedule](09-the-verification-protocol.md#schedule-checks). Preserve complete logs so the failure cause remains reviewable. The supplied toolkit does not schedule agents or enforce helper ownership. The optional [check runner](../scripts/CHECK_REUSE.md) supports reviewed local check-result reuse with explicit eligibility requirements and reuse disabled by default.

---

[Previous: 9 · The Verification Protocol](09-the-verification-protocol.md) · [Documentation index](README.md) · [Next: 11 · Engineering foundations](11-what-this-framework-is-built-on.md)
