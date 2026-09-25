# 3 · Why a Separate Conversation

A fresh implementation conversation separates the Executor's work from the Conductor's review. It receives the task prompt, repository instructions and relevant evidence explicitly.

## Interaction and scope

Agent platforms differ in how they share context, expose tools and allow questions. Verify those capabilities before assigning work. A new conversation does not automatically contain project history or grant additional permissions.

Mawja assigns each wave to a separate implementation conversation where the Executor can raise questions with the Owner. The Conductor does not delegate the wave's implementation to a subagent. The Executor may assign bounded helper work under the rules below and remains responsible for the delivered code and evidence. When a blocking decision belongs to the Owner, the Executor records it and reaches the task's reporting point early.

## Bounded delegation

Subagents can perform bounded measurement tasks, such as counting matching files or collecting command output. The Conductor remains responsible for interpreting the results and checking their source.

Specialist agents follow the same boundary. A security or database role can collect evidence, but the title alone does not establish independent review or authorize decisions.

### Helper implementation

A helper is a subagent assigned work by the Executor. Use a closed allowlist: anything not explicitly allowed stays with the Executor. A project may narrow the list; only the Owner may expand it by naming the additional work.

| Category | Rule |
|---|---|
| Allowed | User-interface components, layout and presentation; printing and exports; user-facing text; ordinary behavior tests |
| Restricted | Money; every AI or paid-provider call; personal or sensitive data handling and isolation; schema changes and migrations; permissions and access decisions; security checks, governance gates, verification tools, enforcing hooks and mutations that prove guards |
| Precedence | Restrictions override an allowed category. A screen, export or test does not authorize restricted behavior |
| Mixed tasks | Separate the allowed part from the restricted part. If they cannot be separated, the Executor implements the whole task |
| Review | The Executor reviews every changed line and records the helper's scope and decisions in the report |

Name each helper task in the prompt. When a question requires an unapproved decision, the helper pauses the dependent work and raises it with the Executor. The Executor resolves it within the authorized scope or asks the Owner. Platform differences in question routing do not authorize guessing.

The Conductor's independent review remains separate from the people or agents that wrote the implementation. An implementation helper cannot provide the independent review of its own work. These delegation rules rely on task assignment, Executor review and the Conductor's assessment; the supplied toolkit does not determine who wrote each line.

---

[Previous: 2 · The Three Roles](02-the-three-roles.md) · [Documentation index](README.md) · [Next: 4 · The Wave Cycle](04-the-wave-cycle.md)
