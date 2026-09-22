# 3 · Why a Separate Conversation

A fresh implementation conversation separates the Executor's work from the Conductor's review. It receives the task prompt, repository instructions and relevant evidence explicitly.

## Interaction and scope

Agent platforms differ in how they share context, expose tools and allow questions. Verify those capabilities before assigning work. A new conversation does not automatically contain project history or grant additional permissions.

Mawja assigns work involving design, code, product decisions or money to a separate implementation conversation where the Owner can respond to questions. When a blocking decision belongs to the Owner, the Executor records it and reaches the task's reporting point early.

## Bounded delegation

Subagents can perform bounded measurement tasks, such as counting matching files or collecting command output. The Conductor remains responsible for interpreting the results and checking their source.

Specialist agents follow the same boundary. A security or database role can collect evidence, but the title alone does not establish independent review or authorize decisions.

---

[Previous: 2 · The Three Roles](02-the-three-roles.md) · [Documentation index](README.md) · [Next: 4 · The Wave Cycle](04-the-wave-cycle.md)
