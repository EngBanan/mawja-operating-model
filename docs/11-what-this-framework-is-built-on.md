# 11 · Engineering foundations

Mawja combines specification-led task planning with established testing and version-control practices. Its roles, task format and review requirements are project conventions, not an industry standard.

| Practice | Application in Mawja |
|---|---|
| **Mutation testing** | Introduce deliberate faults to evaluate whether guards detect the intended failures |
| **Non-vacuous checking** | Require a minimum number of relevant items so an empty scan cannot pass |
| **Quality gates** | Stop progression when a required check fails or cannot be measured |
| **Technical debt tracking** | Record known problems with evidence, priority and closure conditions |
| **Ratcheting** | Prevent measured regressions while allowing improvements |
| **Baselines** | Compare current measurements with committed snapshots |

The minimum scan count prevents an empty scan from passing. It does not perform the formal vacuity analysis described in the [references](references.md).

## Mawja-specific requirements

Mawja requires a separate implementation conversation, a reviewer-selected mutation, explicit debt closure conditions and a report field for unmeasured behavior.

See [references](references.md) for related workflows and the engineering practices used here.

---

[Previous: 10 · The Toolkit](10-the-toolkit.md) · [Documentation index](README.md) · [Next: 12 · Limitations](12-transparency.md)
