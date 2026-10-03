# 16 · Safe execution and delivery

Use these procedures with the project's actual commands, environments and authorization policy. The supplied toolkit does not provision isolation, route pushes, deploy applications or verify their operation after deployment.

## Own the test environment

Name the repository, test database, queue, cache, ports and test accounts before starting. The Owner's working checkout, browser session, data and running services are live resources. Use separately owned resources unless their use is explicitly authorized. Never fall back to a live service when a test service is missing.

Install dependencies from the project's lockfile in each implementation, review and integration workspace. A separate directory is insufficient if a dependency link leads back to the Owner's writable files. Inspect link targets and keep caches, generated files and command outputs within owned locations. Use the repository's package manager and stage files by name.

Before a long check, run short probes for the required services, generated clients and test-account identity. After relevant code or schema changes, regenerate clients and restart owned long-running processes. A running process may still contain old code. Keep required services available until the last dependent check and delivery verification finishes.

Coordinate expensive runs on a shared machine. Run one resource-intensive hook at a time unless resource isolation and separate outputs have been demonstrated. A preflight that finds a blocking condition must stop with a failure status. Do not edit files or verification scripts while a check is measuring them.

### Data and network access

Use synthetic accounts and mark created records with a queryable run identifier. Clean up only records created by that run, then query for remaining marked records, including after interruption. Restore a borrowed setting to its measured previous value, never an assumed default.

For a data correction, inspect affected rows and existing values first. Use a dry run, verified backup and explicit authorization for destructive or irreversible operations. A backfill can destroy valid data even without a DELETE statement. Do not use a broad cleanup predicate or reset the Owner's database to make a test pass.

Prevent unintended paid or live calls from tests and development servers. Use unusable provider credentials with mocks and, where available, an independently verified network boundary allowing only owned endpoints. Include the server process, not just the test runner. Review blocked requests and fallbacks. Mawja supplies no network sandbox; if containment cannot be established, do not claim isolated execution.

### Processes and evidence

Identify owned processes by PID, command, listener and start time before stopping them. Avoid broad process-name kills. A launcher PID or a successful exit does not prove that the intended service started or stopped. Verify the resulting state.

Start monitoring with background work, set a stall deadline and retain durable logs and a final status. For remote work that must survive a disconnected terminal, use an appropriate job supervisor. Do not infer successful delivery from a finished process.

Store each required run in a distinct evidence location with command, working directory, commit, relevant environment identity, exit status and full output. Do not overwrite a prior receipt. Redact credentials and sensitive data; environment evidence must not expose secrets.

## Choose a delivery mode

**Remote branch delivery is the default.** Commit the completed work, run the required branch checks and push through the installed hook. Any push, including branch deletion, can invoke substantial checks. Inspect actual ref destinations and the hook's selection; intent or an empty working-tree diff does not establish a documentation route.

**Local handoff is an explicit project option.** The Owner may authorize a durable local branch plus a verified Git bundle when remote branch delivery is unsuitable. Record the choice in the task, its rationale and its expiry or reconsideration condition. Complete the checks for the actual scope: documentation and consistency for documentation-only work; critical and affected checks, required mutations and the production build where applicable for code. Complete any task-required pre-handoff review; Conductor acceptance follows the fixed-commit handoff. Run final branch verification and report that no branch push or pre-push hook occurred. Do not cancel an active check merely to fit the new delivery mode.

Create a bundle of the named branch in an unused, durable evidence path. From the receiving repository, check it with `git bundle verify` and `git bundle list-heads`, and compare its SHA-256 and branch commit with the sender's report. Check required prerequisite commits for an incremental bundle. A checksum detects changed bytes; it does not establish the sender's identity. Use a trusted handoff channel. [Git's bundle documentation](https://git-scm.com/docs/git-bundle) describes creation, verification and import.

A local bundle on the same device is not an off-device backup. Declare that loss exposure and any checks delayed until integration. Local delivery does not weaken the full-main requirement, exempt a later push from hooks or claim support from an unimplemented lightweight hook route. The generator still requires a synchronized preparation branch; local handoff applies to the subsequent Executor branch.

## Conductor intake and integration

1. Begin acceptance review after the Executor explicitly hands over a fixed commit and report. Check the supplied commit, evidence and delivery mode. For local delivery, verify the bundle in the receiving repository and confirm the commit can be resolved there before relying on it.
2. Review independently against the pinned task base and acceptance criteria. Inspect the actual diff and the [structure delta](15-build-quality.md#review-the-structure-delta), not only the report. Keep reviewer implementation changes out of its own acceptance verdict.
3. Integrate in a clean, isolated workspace with owned dependencies. Inspect files changed on both sides since the merge base. Resolve overlap explicitly; absence of a textual conflict does not prove compatible behavior. Reconcile shared records without silently dropping entries. Use the project's recorded merge strategy.
4. For code integration, establish the production build where applicable and the full suite on the exact integrated revision before publication. A type check is not a production build. Use the existing enforcing hook and run any uncovered required checks explicitly. Do not repeat an identical successful build immediately before a hook that performs it on the same inputs.
   Documentation-only integration follows the [documentation and consistency schedule](09-the-verification-protocol.md#schedule-checks).
5. A failed integration check blocks publication. Return product fixes to the Executor. If the Conductor implements a test-fixture correction, it becomes an author of that correction: another independent reviewer must accept it, with applicable tests and mutations. The default remains returning corrections to the Executor.
6. After an authorized push, ask the remote for its branch head using `git ls-remote` and compare the exact commit. A local tracking ref is not confirmation of receipt. If the Owner's checkout also needs updating, inspect it and fast-forward only when safe; do not discard concurrent work.

Record **accepted**, **merged**, **pushed** and **deployed** separately, with the applicable commits. Accepted work can remain undeployed. Publication and deployment follow the Owner's authorization scope; approval for one environment or revision does not implicitly cover another.

## Deployment verification

Before a deployment, read the complete deployment notes and identify the target revision, environment, operator, required checks, authorization and rollback plan. Maintain the notes during the wave whenever a migration, environment variable, scheduled task or operational dependency changes.

| Stage | Evidence |
|---|---|
| Recoverability | A readable backup and a restore exercise appropriate to the change; compare actual records or checksums, not database row estimates alone |
| Compatibility | Reviewed schema and configuration changes; old and new application/worker versions can coexist during rollout |
| Build | A clean build from the intended source and lockfile before replacing the serving application |
| Work in flight | A plan to drain, pause or safely transfer active work; identify which worker version may consume each job |
| External operation | Requests through the actual consumer path, expected identity and permissions, correct external account and end-to-end behavior |
| Remaining limits | What was not measured and how it affects the release decision |

Verify critical claims through their real boundary: inspect exposure from outside the host, exercise native dependencies, confirm configuration reached the running process, and use the feature to read and write data. Test with ordinary users as well as privileged roles. Never expose secret values in evidence.

For application workers, confirm that controlled work completes and examine errors and unexpected restarts over a stated observation window. An `active` process alone cannot rule out a crash loop. Coordinate any reboot or disruptive recovery exercise separately; configuration inspection alone cannot establish behavior after a reboot.

### Schema changes

Plan compatible expansion, application/data migration, then removal of obsolete schema after its consumers are gone. The exact rollout depends on the database and deployment model. Test restartability and recovery of each migration. Do not perform an irreversible schema change before establishing that the corresponding application can build and run. See the [expand-and-contract example](https://www.prisma.io/docs/guides/database/data-migration).

### Restore the whole release

Rollback must restore compatible source, dependencies, generated artifacts, configuration and worker processes. Reverting Git alone is insufficient. Keep the previous runnable release available until the replacement is verified, and address data/schema compatibility before rollback.

Record security-relevant server settings that Git cannot restore, with a reproducible installation or recovery method. Verify deployed scripts against their repository source. Keep test bypasses out of serving environments and remove temporary workarounds when their cause is resolved.

---

[Previous: 15 · Build quality](15-build-quality.md) · [Documentation index](README.md) · [Next: 17 · Conductor handover](17-conductor-handover.md)
