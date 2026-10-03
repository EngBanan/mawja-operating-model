# 17 · Conductor handover

Use one repository-owned handover protocol across agent tools. Its purpose is to let a fresh Conductor establish the current state, recover the method and continue within the Owner's authorization.

## Prepare the record

First preserve lasting decisions, working rules and lessons in their authoritative repository locations. A task prompt or private memory must not be their only copy. Keep a concise progress record outside the conversation with the evidence, current judgment, pending decisions and next action.

Identify what is being handed over: a multi-wave program, ongoing implementation, a bounded correction, or planning with no code changes. Do not apply a release checklist to a conversation that has not produced code.

Remeasure current claims. Attach commands, dates, working directories and evidence references. Label older results as historical instead of presenting them as fresh measurements. Distinguish observation, the Owner's quoted decision and inference. Do not invent numbers, decisions or doubts to complete a template.

## Required contents

| Section | Contents |
|---|---|
| Role and authority | Current task, allowed actions, boundaries and relevant standing authorization |
| Measured state | Repository/workspace, branch and commit, dirty files, active processes, check results and their commands |
| Plan | Completed work, remaining steps in order, dependencies and reserved identifier ranges |
| Decisions | Accepted choices, rejected alternatives, deliberate deferrals and their reconsideration triggers |
| Method | The applicable verification procedure, why it applies, Owner corrections and lessons from failed approaches |
| Review evidence | Findings, mutation cases and intended failures, restoration, structure delta and unresolved limits |
| Recovery | Evidence and artifact paths, what is not yet saved, and how to resume safely |
| Reading route | Authoritative instructions and specific supporting sections in order |
| First actions | What the successor must read and verify, questions requiring source inspection and any actual unresolved decision |

Use **None** or **Not applicable with a reason** for empty sections. Add deployment state, server changes outside Git, manual recovery steps or competing decision options only when relevant. Record the actual mistakes and their corrections where they help prevent recurrence; these belong in project evidence, not public framework stories.

## Transfer and resume

Keep the handover snapshot on a durable path under the project's retention policy. If it is a transient untracked file, exclude it from Git and remove it only after receipt and preservation of its durable knowledge and evidence. Tracked project handovers are also valid when the project maintains them as current records. Do not delete an artifact solely because a conversation ended.

Read the handover as its intended recipient. Validate safe commands in their stated directories. Destructive actions, pushes, migrations and deployments must not be executed merely to test instructions; confirm their prerequisites and approval boundaries instead. Give the Owner the exact handover path and identify superseded copies.

The new Conductor reads the authoritative files, compares current state with the snapshot and reports mismatches, unresolved questions and the next action. Questions should test actual understanding of the task, not require a fixed count. Continue work already authorized by the Owner; stop dependent work when authority or a required decision is missing. A new conversation does not cancel standing authorization or create additional permissions.

---

[Previous: 16 · Safe execution and delivery](16-safe-execution-and-delivery.md) · [Documentation index](README.md) · [Next: Appendix: technical contracts](appendix.md)
