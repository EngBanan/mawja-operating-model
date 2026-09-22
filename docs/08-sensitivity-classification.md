# 8 · Sensitivity Classification

Classify the task before implementation. The classification determines review and merge requirements.

| Class | Typical scope | Review requirement |
|---|---|---|
| **High** | Security, billing, authorization, tenant isolation, destructive migrations or core logic used by several screens, API endpoints or jobs | Owner review before merge; run the wave in isolation |
| **Medium** | Refactoring or consolidation across several tested components | The Conductor verifies and merges, then includes a release recommendation for the Owner |
| **Low** | Documentation, additional tests or a mechanically verifiable change | Review likely failure cases and complete Conductor verification; no separate Owner review before merge |

The Owner controls release in every class. A medium-sensitivity recommendation can lead the Owner to hold release after merge.

When uncertain, use the higher class. Reassess if the scope changes.

---

[Previous: 7 · The Debt Ledger](07-the-debt-ledger.md) · [Documentation index](README.md) · [Next: 9 · The Verification Protocol](09-the-verification-protocol.md)
