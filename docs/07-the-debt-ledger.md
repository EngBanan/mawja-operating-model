# 7 · The Debt Ledger

Keep one row per debt item. Record deliberate deferrals separately with a condition for reconsideration.

## Required fields

| Field | Content |
|---|---|
| **Identity** | A unique number referenced by commits, decisions and prompts |
| **Evidence** | The observed problem, affected location, measurement command and date |
| **Priority** | Severity and its reason |
| **Closure condition** | The result and evidence required to close the item, including unacceptable shortcuts |

Use a defined priority scale: **P1** blocks the wave, **P2** must be resolved before the next release, and **P3** can be scheduled later. Include the reason alongside the priority.

## Status and counting

Use the [debt-row format](appendix.md#b--debt-and-decision-format). A checkmark elsewhere in a row does not establish closure.

The counter reads whether each row is marked open or closed. A reviewer still needs to verify that the work is complete.

## Closure review

The Executor marks a delivered item closed and supplies evidence. The Conductor checks that evidence during independent review and confirms closure at merge.

## Identifiers

Debt and decisions share one number range. From the project root, run:

```bash
npm run wave:number
```

This command is registered by the runnable examples and reads both documents. In a manually configured project, run:

```bash
node --import tsx scripts/conductor/wave-prompt.ts --next-number
```

Use the returned number for the next debt item or decision.

---

[Previous: 6 · File Architecture](06-file-architecture.md) · [Documentation index](README.md) · [Next: 8 · Sensitivity Classification](08-sensitivity-classification.md)
