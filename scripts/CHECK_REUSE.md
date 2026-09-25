# Reuse a verified check result

Use `run-checks.mjs` when a reviewed local check is expensive enough to justify checking its inputs instead of repeating it. Reuse is off by default. A normal run executes every configured check.

Start with the [calculator exercise](#try-the-calculator-example). For adoption in a real project, complete the [eligibility review](#eligibility-review) first. Independent review of the implementation remains required.

## When this helps

A push can fail after its checks have finished, for example because the connection closes. On a retry with the same inputs, the runner can validate a previous result for an eligible check. It prints `previous verified result` and links to the original evidence.

A new commit, changed dependency, changed environment or changed input causes a fresh run. The tool does not promise a speedup: hashing a large dependency directory can cost more than running a small check. The calculator demonstrates the behavior, not a performance benefit.

## Eligibility review

Before enabling reuse, the project reviewer must establish all of these conditions:

- The check is deterministic and read-only. It uses only the captured project files, runtime and declared external files. Review the command, imports and wrappers, not just its name.
- The workspace has no other writer during the attempt. Runtime installations and declared external dependencies stay unchanged throughout it. Use an isolated worktree or an isolated CI job and coordinate processes that share dependencies.
- The check has no mutable service, database, browser, clock, random input, network dependency or generated artifact needed by later work. Such checks must use `reuse: "never"` or remain in the existing enforcing runner.
- Every execution of an eligible check goes through this runner. If someone ran it directly or the intervening history is unknown, run once without `--reuse` before considering reuse again.
- The result adapter reports the actual expected cases. Independently introduce faults to prove the assertions and the adapter reject them.

These are adoption requirements. The runner is not a sandbox and does not discover undeclared dependencies, prevent another process from writing, or prove that an assertion executed. Boundary fingerprints and filesystem change metadata detect input drift; they do not by themselves prove continuous isolation. If these conditions cannot be established, keep reuse disabled.

## Try the calculator example

Create and finish the initial setup of a [TypeScript, JavaScript or Python example](../examples/README.md), including its initial commit. Work from the generated project's root. The creator includes the runner, `scripts/checks/checks.json` and a calculator check in the project's language.

Run the check with reuse disabled:

```bash
npm run checks:run
```

Expected: the four addition cases pass, `Executed: 1` and `previous verified results: 0`. This command checks the calculator only; continue to use `npm run check` for the example's complete checks.

In `scripts/checks/checks.json`, change `allowReuse` from `false` to `true`. Review and commit that configuration:

```bash
git add scripts/checks/checks.json
git commit -m "Enable reuse for the reviewed calculator check"
npm run checks:run
npm run checks:run -- --reuse
```

Expected: the first run executes the check. The second prints `previous verified result` with its original time and evidence directory. It finishes with `Executed: 0` and `previous verified results: 1`.

To verify rejection, change the calculator's `return a + b` to `return a - b`, then run:

```bash
npm run checks:run -- --reuse
```

Expected: it executes and fails. Restore the addition operation and repeat the command. It must execute successfully again; the failed attempt cannot revive the earlier success. Leave the example restored and finish with `npm run check`.

To disable reuse, set `allowReuse` back to `false` and commit it. Omitting `--reuse` also forces a fresh run even while the configuration permits reuse.

## Configure a project

Copy [run-checks.mjs](run-checks.mjs) and Mawja's [MIT license](../LICENSE) into `scripts/conductor/`. Commit a configuration like the [JavaScript example](../examples/javascript/scripts/checks/checks.json). Use the [TypeScript](../examples/typescript/scripts/checks/checks.json) or [Python](../examples/python/scripts/checks/checks.json) command for those runtimes.

| Field | Meaning |
|---|---|
| `version` | Configuration format, currently `1` |
| `allowReuse` | Tracked off switch; examples start with `false` |
| `maxAgeSeconds` | Maximum age from the original execution start, from 1 to 21600 seconds |
| `scope` | What is being checked and the acceptance criteria |
| `externalInputs` | Additional file or directory paths, relative to the project root or absolute |
| `checks[].id` | Unique check name |
| `checks[].command` | Executable and arguments as an array; no shell interpolation |
| `checks[].timeoutSeconds` | Execution limit, from 1 to 7200 seconds |
| `checks[].reuse` | `local-read-only` after eligibility review, otherwise `never` |
| `checks[].cases` | Exact, nonempty list of case identifiers that must all pass |

Run from the project root:

```bash
node scripts/conductor/run-checks.mjs scripts/checks/checks.json
node scripts/conductor/run-checks.mjs scripts/checks/checks.json --reuse
```

The configuration must match its committed content. Use direct executables, such as `node` or `python`, rather than npm, shell scripts or Windows `.cmd` wrappers. `node` resolves to the runtime running the tool. Other executables resolve through PATH. Review any runtime flags and subprocess behavior before adoption. Eligible checks must finish their work before returning and must not start detached or background processes.

The runner executes checks sequentially and stops at the first failure. It returns `0` only after all required checks and the final input measurement pass; configuration errors, failed checks and incomplete measurements return `1`.

## Result adapter

The runner passes two environment variables to each command:

- `MAWJA_CHECK_REPORT`: a new path outside the project tree.
- `MAWJA_CHECK_TOKEN`: a new invocation token.

The command writes this JSON shape to the report path and exits with code zero only when the check passes:

```json
{
  "version": 1,
  "token": "the supplied MAWJA_CHECK_TOKEN",
  "cases": [
    { "id": "addition", "status": "passed" }
  ]
}
```

The IDs must match the configuration exactly. Missing, extra, duplicate, failed or skipped cases are rejected, as are a missing report, wrong token, malformed JSON and nonzero process exit. The adapter must preserve its test runner's discovery and failure behavior; reporting success merely because a wrapper exited zero is insufficient. This format does not support accepted-failure baselines. Keep checks with existing reviewed failure budgets in their current runner.

See the small [Node adapter](../examples/javascript/scripts/checks/calculator.mjs) and [Python adapter](../examples/python/scripts/checks/calculator.py). They execute each named addition case and report its result. The TypeScript example loads its application through tsx. The runner disables tsx's transform cache for these executions.

## What is measured

The fingerprint covers the commit, index entries and flags, local refs, Git configuration, runner bytes, command and configuration, project files including ignored and untracked files, executable bytes, Node version, platform, environment and declared external inputs. File change metadata also invalidates reuse after a write and restoration. Environment values are represented by a local HMAC, not written into receipt metadata.

Git administration and the runner's own evidence are outside the project-file scan. A check that reads extra Git metadata or other files outside the captured inputs needs an eligibility review and additional declared inputs. Submodules are rejected. Symlinks are accepted only when their targets are inside captured project inputs, declared external inputs or a captured runtime executable. Missing or unreadable inputs block acceptance.

Native runtime libraries and operating-system state must remain fixed by the execution environment; hashing an executable does not capture its entire installation. Add external runtime packages and configuration to `externalInputs` where necessary. A path or version string is not proof that all external state is unchanged.

Checks must not write into the captured input tree, including ignored caches. Put result reports at the supplied path. Use appropriate runtime options, such as Python's `-B`, to prevent incidental writes. Leave builds, output-restoration tasks and stateful checks in the project's existing runner.

## Evidence and recovery

The private local store is `mawja-checks` under this worktree's Git directory. Find it with:

```bash
git rev-parse --absolute-git-dir
```

Each attempt retains complete stdout, stderr and the case report. The terminal summary distinguishes fresh execution from reuse and identifies the original evidence. Command output can contain whatever the check prints; keep sensitive application data out of check logs.

Only the last fully successful attempt is eligible. A new attempt first records `running`, including when reuse is disabled. A failure, interruption or setup error prevents fallback to older successes. A later failure in an always-run check rejects the whole attempt, including any earlier reused results. Missing or changed evidence forces a fresh execution. Reuse retains the original age; it does not extend it.

A lock prevents two runner attempts from overlapping. If the process is forcibly terminated, the lock can remain. Stop and verify that all processes from that attempt have ended, then remove the `mawja-checks` store and run fresh. Do not remove a live lock. This deliberately discards reuse history. Evidence is local and is not a signed attestation or protection against someone who can edit the store.

## Integrate with a hook

Add the runner as a blocking step in the existing hook after its prerequisites. Preserve all other required stages and their exit status. The runner does not install a hook, manage SSH connections or replace branch verification. Keep reuse off while validating the integration, then complete an isolated enabled attempt, including a failed required stage and recovery. Follow the [governance requirements](../AGENT_GOVERNANCE_KIT.md#optional-hook-result-reuse).

For the implementation checks and platform scope, see [toolkit tests](../tests/README.md#optional-check-runner) and [compatibility](LANGUAGES.md#compatibility).

## Design references

- [Turborepo caching](https://turborepo.dev/docs/crafting-your-repository/caching): caching requires deterministic tasks and accounted inputs and outputs.
- [Turborepo environment variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables): environment-dependent results need corresponding cache inputs.
- [Node.js child processes](https://nodejs.org/api/child_process.html): direct executable arguments, process completion and platform behavior.
