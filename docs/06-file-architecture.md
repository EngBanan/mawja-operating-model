# 6 · File Architecture

Give each document a defined purpose and keep one authoritative source for shared rules. Use existing repository naming conventions when adopting this structure.

| File or folder | Purpose |
|---|---|
| Agent rules file, such as CLAUDE.md | Project rules loaded at the start of work |
| DECISIONS.md | Numbered architectural decisions and their rationale |
| LESSONS_LEARNED.md | Reusable technical findings and prevention steps |
| DEPLOYMENT_NOTES.md | Deployment configuration, migrations and operational steps |
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

---

[Previous: 5 · The Wave Prompt](05-the-wave-prompt.md) · [Documentation index](README.md) · [Next: 7 · The Debt Ledger](07-the-debt-ledger.md)
