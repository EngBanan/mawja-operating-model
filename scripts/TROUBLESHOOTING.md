# Troubleshooting

Run the commands from the target project's root directory. For a generated example, this is the directory created by `examples/create.mjs`.

## The tool cannot find the Git repository

Check whether the project is already in Git:

```bash
git rev-parse --show-toplevel
```

For a new project that has not been initialized, run:

```bash
git init -b main
```

Keep the copied tools inside the project. They locate Git from their own files.

## A sibling module cannot be found

Confirm that `scripts/conductor/` contains wave-prompt.ts, verify-wave.ts, check-types-baseline.ts, check-debt-ledger.ts and count-gates.ts. Python projects also need check-python-baseline.py.

The generator imports check-debt-ledger.ts from the same directory. Restore any missing file from the [toolkit source](README.md#installation), preserving the project's CONFIG settings.

## No upstream, unreadable remote or different remote head

Inspect the current branch and remotes:

```bash
git status -sb
git remote -v
```

If `origin` is the intended remote and this branch has no upstream, publish the current branch and record its upstream:

```bash
git push -u origin HEAD
```

If the remote is unreadable, check its URL, credentials and connectivity. If the histories differ, inspect the commits and resolve the difference using the project's normal Git workflow.

For a new example with no remote, follow the local-remote setup for [TypeScript/JavaScript](../docs/tutorials/typescript-javascript.md#save-the-initial-project) or [Python](../docs/tutorials/python.md#save-the-initial-project). A forced draft still needs its synchronization problems resolved before readiness can pass.

## Checker configuration is not committed

Inspect the configuration changes:

```bash
git status --short
git diff
git diff --cached
```

Review and commit the checker configuration: tsconfig.json and inherited configuration files for TypeScript/JavaScript, or mypy.ini for the Python example. Configuration must be inside the repository, including symlink targets.

A dependency lockfile does not commit an ignored configuration file loaded from node_modules. See [configuration requirements](CONFIGURATION.md#checker-configuration-contract).

## The prompt has gaps or changed measurements

For a prompt created with `--slug=my-change`:

1. Open `WAVE_PROMPT_MY_CHANGE.md`.
2. Replace every `⟪…⟫` placeholder with the task's requirements.
3. Run `npm run wave:check -- WAVE_PROMPT_MY_CHANGE.md`.

If the measured state changed, regenerate the prompt and complete its task sections again:

```bash
npm run wave:new -- --slug=my-change --title="Describe the change" --overwrite
```

Complete the placeholders in the regenerated file, then run:

```bash
npm run wave:check -- WAVE_PROMPT_MY_CHANGE.md
```

The check must report `Ready to issue` before the prompt is sent. Use the original slug when regenerating another task. The previous prompt is saved as a .bak file.

Keep the generated measurement table unchanged. Put additional task measurements in the task-specific measurement section.

## The type snapshot is missing or already exists

Create a missing snapshot during initial setup:

```bash
npm run types:init
```

For an existing snapshot, check the current result:

```bash
npm run types:check
```

After fixing existing type errors, save the lower limits:

```bash
npm run types:update
```

Commit the updated snapshot with the fixes. Initialization refuses to overwrite a snapshot; both writing commands reject configured crash diagnostics and syntax errors.

## Verification reports a different checked-out commit

For an implementation branch named `wave/my-change`, run:

```bash
git switch wave/my-change
npm run wave:verify -- --base=main --branch=wave/my-change --claim="npm test"
```

Use the branch named in the implementation report. The requested branch and checked-out HEAD must identify the same commit.

## Verification leaves a dirty tree

Inspect the changes left by the commands:

```bash
git status --short
git diff
git diff --cached
```

Restore the deliberate test faults from their saved originals. Review other changes and commit only intended project output. Rerun verification, then run `git status --short` again. It should print nothing.

## A tsx command reports an IPC path error

Use Node's `--import` entry point:

```bash
node --import tsx scripts/conductor/wave-prompt.ts --next-number
```

Set the package scripts, TYPES_CMD and GATES_CMD to the forms shown in [installation](README.md#installation) and [configuration](CONFIGURATION.md#shared-settings). The supplied examples already use them.

The [tsx Node entry point](https://github.com/privatenumber/tsx/blob/master/docs/dev-api/node-cli.md) avoids the CLI IPC endpoint, whose path is subject to [Node's platform limits](https://nodejs.org/download/release/v20.19.5/docs/api/net.html#identifying-paths-for-ipc-connections).

## Automatic checks pass but review is incomplete

Before accepting the change:

1. Run the relevant existing guard commands, including commands unchanged by the task.
2. Introduce a reviewer-selected fault, confirm the intended check fails, restore the source and rerun the check.
3. Verify the task's requested behavior with a separate command or observation.
4. Confirm that the working tree is clean.

See the [verification protocol](../docs/09-the-verification-protocol.md) for the evidence to record.

## Python or mypy is unavailable

If the project's `.venv` directory does not exist, create it:

```bash
python3 -m venv .venv
```

Activate the environment, install the pinned dependencies and rerun the checks:

```bash
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m mypy --version
npm run check
```

If environment creation reports that ensurepip is unavailable, install your distribution's venv package. Alternatively, with [virtualenv installed](https://virtualenv.pypa.io/en/latest/how-to/install.html), create the environment with:

```bash
python3 -m virtualenv .venv
```

Then run the activation and dependency-installation block above. Recreate virtual environments after moving a project.

A missing mypy module or incomplete mypy output is a configuration failure. Fix it before initializing or updating a snapshot.

## Python files are missing from the checks

Open check-python-baseline.py and inspect `SOURCE_DIRS`. Each listed directory must exist and contain Python files.

Check the matching directory lists and file patterns in verify-wave.ts and wave-prompt.ts. Use the [Python configuration](CONFIGURATION.md#python) to keep these settings aligned, then run `npm run types:check`.
