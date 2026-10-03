# 6 · File Architecture

Give each document a defined purpose and keep one authoritative source for shared rules. Use existing repository naming conventions when adopting this structure.

| File or folder | Purpose |
|---|---|
| Authoritative agent rules file, reached from each tool entry point | Project rules loaded at the start of work |
| Working agreement | Owner decisions, scope, authorization and communication preferences |
| DECISIONS.md | Numbered architectural decisions and their rationale |
| LESSONS_LEARNED.md | Reusable technical findings and prevention steps |
| DEPLOYMENT_NOTES.md | Deployment configuration, migrations, environment variables, scheduled work, operational steps and server settings outside Git |
| PROGRESS/TECHNICAL_DEBT.md | Numbered known defects and missing requirements |
| PROGRESS/FUTURE_ENHANCEMENTS.md | Deferred work and the conditions for reconsidering it |
| _docs/CONSTITUTION.md | Definition of done and required gates |
| _docs/Architecture/ | Component designs maintained with architectural changes |
| _rd/reports/ | Dated task reports and raw evidence |

## Separate records by purpose

**Architecture and progress.** Update architecture when the design changes. Keep current task status in progress records.

**Debt and deliberate deferral.** Debt records a known problem. A deliberate deferral records an accepted choice and the condition for reconsidering it.

**Decisions and lessons.** A decision records what was chosen and why. A lesson records a finding that should influence future work.

**Reports and system documentation.** Keep reports as records of what was observed at the time. Add a dated correction to an inaccurate report and preserve the original. Keep system documentation up to date.

## Find the records for your project

Ask the Conductor for links to the project's rules, decisions, [debt ledger](00-terms.md#debt-ledger) and latest report. Use those locations when reviewing a task or handing it to another agent.

Confirm that each [task prompt](05-the-wave-prompt.md) names the files needed for the work. Record accepted decisions in the project's decision log and keep supporting [evidence](00-terms.md#test-evidence) with the report, so the next conversation can find them.

## Keep rules current

Store each durable working rule independently with its date, scope, the Owner's exact words when available, rationale and required procedure. Separate an external engineering principle and its source from a project's chosen customization. Do not label a local preference an industry standard. Link from the main instructions rather than exceeding the tool's reading limit.

Use command references for changing counts and keep live state in its authoritative record. If a count must appear in documentation, generate it or enforce parity with its source. Conflicting procedures need a single corrected source and a measured remedy, not a choice of whichever document is convenient.

Shared-state ownership also applies to code; see [build quality](15-build-quality.md#preserve-decisions-and-capabilities). Use the [Conductor handover](17-conductor-handover.md) to transfer method and evidence across conversations.

---

[Previous: 5 · The Wave Prompt](05-the-wave-prompt.md) · [Documentation index](README.md) · [Next: 7 · The Debt Ledger](07-the-debt-ledger.md)
