# Multi-tool governance

**Version 1.0** · An extension to Mawja for repositories using more than one agent tool.

Reference this file from the repository's rules. If linking is impractical, keep one copy in the repository root. Maintain one authoritative source.

To apply the kit, start a fresh conversation with:

> Read AGENT_GOVERNANCE_KIT.md and apply it in full to this repository.

## Prerequisites

Read the [Mawja documentation](docs/README.md) in full before applying the kit. If it is unavailable, stop and ask the Owner for a copy before making changes.

Mawja defines the roles, task cycle and verification procedure. This kit extends those requirements to multiple tools. It does not change the framework's rules.

## 0 · Scope

| Area | Requirement |
|---|---|
| Instructions | Every tool can reach the same project rules |
| Knowledge | Durable findings are recorded in the repository and available for review |
| Attribution | Commits identify the tool that wrote them |
| Handover | Every tool uses the same repository-owned protocol |

## 1 · Inspect before editing

Inspect the existing instruction files, skill locations, framework references, hooks, instruction-file sizes and commit-attribution convention.

```bash
# Instruction files and tool configuration
ls -la CLAUDE.md AGENTS.md .cursorrules 2>/dev/null
ls -d .claude .codex .cursor 2>/dev/null

# Hook configuration and location
git config core.hooksPath
git rev-parse --git-path hooks

# Instruction-file sizes
wc -c CLAUDE.md AGENTS.md 2>/dev/null

# Recent commit attribution
git log -20 --format='%b'
```

Read the framework references in the instruction files and inspect the effective hook directory. A configured hook path alone does not establish that the required gates run.

Classify the setup:

| State | Action |
|---|---|
| One tool | Establish layers 2–6; add another instruction entry point when a second tool is introduced |
| Multiple tools with duplicated rules | Choose one authoritative rules file and replace duplicated content with references |
| Shared rules without enforcement | Complete the gates in layer 5 |

Report the observations and classification in the first response, before editing.

## 2 · Required layers

### 1. Shared instructions

Use one primary rules file. AGENTS.md references it without duplicating shared rules and includes the instructions needed by tools that read that entry point.

Include:

- A direct reference to the framework document, without an intermediate document.
- A routing table naming the repository's skills.
- Prohibitions and the reason for each.
- The applicable commit-attribution format.

Measure instruction-file size before adding content. Keep it within the configured tool's reading limit. Put additional detail in the framework document and reference it from the entry point.

### 2. Repository knowledge

Before the session ends, commit findings that will be useful in future work: decisions, lessons and working rules. Use the destinations defined in [file architecture](docs/06-file-architecture.md) and the repository's existing conventions.

Tool-local memory may index those records. It must not be the only location for durable knowledge.

### 3. Commit attribution

Choose a fixed starting point for enforcement. Every commit after that point, including merge commits, must identify the tool that wrote it:

```text
Co-Authored-By: <tool> <model> <email>
```

The gate checks for a recognized tool. Model names remain unrestricted.

Do not rewrite existing history or move the starting point backwards. Provide an explicit merge message when necessary to include the trailer.

### 4. Shared handover

Keep one handover protocol in the repository and reference it from every tool. Tool-specific shortcuts must invoke that protocol without maintaining a separate copy.

### 5. Enforcement

Implement two gates and connect them to the repository's enforcing hook.

**Gate A: knowledge architecture**

| Rule | Requirement |
|---|---|
| R1 | Every skill has an entry in the routing table |
| R2 | No parallel skills directory is created for another tool |
| R3 | Each declared skill name matches its directory |
| R4 | Each description provides enough information for task matching |
| R5 | The secondary instruction entry point exists and references the primary source |
| R6 | Instruction files remain within the configured tool's reading limit |

**Gate B: commit attribution**

| Rule | Requirement |
|---|---|
| R1 | Every commit after the fixed starting point includes an attribution trailer |
| R2 | The trailer identifies a recognized tool |

Both gates require a non-vacuity floor and mutation proof. Discover the governed files from the repository; see [toolkit discovery](docs/10-the-toolkit.md).

Do not implement a gate without a way to introduce a fault that it should detect. Confirm that the intended check fails, restore the original state and confirm that it passes.

### 6. Durable isolation

Use an isolated worktree when work runs in parallel or files may conflict.

| Area | Requirement |
|---|---|
| Location | Use git worktree on a durable path. Do not use a temporary directory |
| Fallback | If a durable worktree is unavailable, push the branch after the first commit and every subsequent commit |
| Local cleanup | After merge, remove the completed worktree and local branch once all work is confirmed preserved |
| Remote cleanup | Follow the Owner's standing repository policy; do not request the same decision for every task |
| Cleanup integration | Connect the cleanup sweep to task-prompt generation, rather than a push gate |
| Documentation | Record the isolation and cleanup rules in both the primary rules file and AGENTS.md |

Before deleting an isolated copy, inspect all branch refs, stash, HEAD and uncommitted changes. Preserving HEAD alone does not establish that every change is saved.

To recover `wave/my-change` from a copy at `../task-worktree`, run the following command in the receiving repository. Use the actual copy path and branch name. The command does not modify the source copy.

```bash
git fetch ../task-worktree wave/my-change:wave/my-change
```

This kit has no gate that checks whether repository knowledge is complete, handovers are consistent, or worktrees use durable paths. State these limits when reporting adoption results.

## 3 · Verification practices

- Extend the existing rules and skill structure instead of creating a parallel system.
- Keep shared rules in the primary source and tool-specific instructions in the relevant entry point.
- Reference the framework directly from each entry point.
- Measure instruction-file size before adding content.
- Cite document headings when reporting evidence.
- Test each gate condition independently so one condition does not mask another.
- If a guard's own compliance change invalidates its check, document the cycle in the affected item's record. Do not suppress it with an exception.
- Preserve complete command output, including the failure cause.
- Verify committed content rather than relying on the current working-tree copy.
- Run the exact command and environment used by the enforcing hook.
- Investigate the original error before attributing a passing serial rerun to contention.

## 4 · Completion checklist

- [ ] Mawja has been read in full.
- [ ] The repository's state and classification were reported in the first response.
- [ ] Each required tool entry point exists and references the shared rules.
- [ ] Every entry point directly references the framework.
- [ ] Instruction-file sizes are measured and within the configured tool's limit.
- [ ] Durable findings have the repository destinations defined by Mawja.
- [ ] A command confirms that every skill appears in the routing table.
- [ ] Every tool references the same repository-owned handover protocol.
- [ ] Both gates run in the enforcing hook, not only in the command manifest.
- [ ] Every gate has mutation evidence, a non-vacuity floor and documented limits.
- [ ] Each new gate is registered in its script, command runner, enforcing hook and any documentation that reports the gate count.

For a repository using one tool, add the second entry point when that tool is introduced, as specified in the setup classification.

## 5 · Adoption boundaries

Apply this kit with Mawja's framework. Keep framework content in its authoritative source instead of duplicating it here.

Follow the repository's naming conventions. AGENTS.md retains its name for tools that discover it by that name. Do not treat a gate without mutation evidence as completed enforcement.

When using a local copy, synchronize it from this source instead of maintaining independent edits in both places. Keep the Mawja documentation available alongside the kit.

## 6 · Version history

| Version | Change |
|---|---|
| 1.0 | First published edition |
