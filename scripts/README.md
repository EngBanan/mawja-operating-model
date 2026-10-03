# Mawja toolkit

These tools prepare task prompts, verify implementation branches, track type-error budgets and check a debt ledger. They run inside the repository being measured.

For a first run, use the [runnable TypeScript, JavaScript and Python examples](../examples/README.md). For the workflow and role definitions, read [Start here](../docs/00-foreword.md). Use [Terms](../docs/00-terms.md) to interpret prompts and check results.

## Commands

| Command | Purpose |
|---|---|
| `wave:new` | Generate a prompt with current Git, type, guard and debt measurements |
| `wave:number` | Read the next available debt/decision identifier; it does not reserve a range |
| `wave:check` | Validate a completed prompt and detect changed measurements |
| `wave:verify` | Check an implementation branch and run its added or changed guard commands |
| `types:check` | Enforce configured crash diagnostics, per-file budgets and the total ceiling |
| `types:init` / `types:update` | Create a type snapshot, or lower an existing snapshot |
| `lint:debt-ledger:strict` | Validate debt numbers and closure markers |
| `gates:count` | Count registered guard commands |
| `checks:run` | Run explicit local checks, with optional verified-result reuse |

The examples define these commands in their package manifests. `checks:run` is optional; follow the [check-result reuse guide](CHECK_REUSE.md) to configure it. See [language support](LANGUAGES.md) for requirements and scope.

## Installation

The steps below configure TypeScript or JavaScript. For Python, use the [Python example](../docs/tutorials/python.md) as the starting configuration: it adds `check-python-baseline.py`, mypy and Python test commands while retaining the shared Node.js tools. See [Python configuration](CONFIGURATION.md#python).

The commands below assume an npm project named `my-project` beside the Mawja checkout:

```text
parent-directory/
  mawja-operating-model/
  my-project/
```

If the project already has Mawja tools, follow [Update project copies](#update-project-copies).

For an initial installation, run these commands from `my-project`:

<!-- run:install-typescript-tools -->
```bash
mkdir -p scripts/conductor
cp ../mawja-operating-model/scripts/*.ts scripts/conductor/
cp ../mawja-operating-model/LICENSE scripts/conductor/LICENSE
npm install --save-dev --save-exact tsx@4.21.0 typescript@5.9.3
```

Keep `scripts/conductor/LICENSE` with the copied tools. It applies to Mawja's tools; choose your project's license separately.

For a pnpm or Yarn project, use that project's package manager and preserve its existing lockfile.

Configure the copied tools:

1. Open their CONFIG blocks and set the source directories, checker commands and ledger paths for this project. Use the [configuration reference](CONFIGURATION.md).
2. Include application code, guards and tests in tsconfig.json. JavaScript also needs `allowJs` and `checkJs`; see the [JavaScript configuration](../examples/javascript/tsconfig.json).
3. Create or locate the debt ledger and decision log using the [documented formats](../docs/appendix.md#b--debt-and-decision-format). Record actual known work; the ledger check rejects an empty scan.
4. Add the command entries below to the existing package manifest.

For an npm project, the command entries are:

```json
{
  "scripts": {
    "wave:new": "node --import tsx scripts/conductor/wave-prompt.ts --new",
    "wave:number": "node --import tsx scripts/conductor/wave-prompt.ts --next-number",
    "wave:check": "node --import tsx scripts/conductor/wave-prompt.ts --check",
    "wave:verify": "node --import tsx scripts/conductor/verify-wave.ts",
    "types:init": "node --import tsx scripts/conductor/check-types-baseline.ts --init",
    "types:update": "node --import tsx scripts/conductor/check-types-baseline.ts --update",
    "types:check": "node --import tsx scripts/conductor/check-types-baseline.ts --json",
    "lint:debt-ledger:strict": "node --import tsx scripts/conductor/check-debt-ledger.ts --strict",
    "gates:count": "node --import tsx scripts/conductor/count-gates.ts"
  }
}
```

Add these entries inside the existing `scripts` object; preserve the project's other commands. Set `TYPES_CMD` in wave-prompt.ts and verify-wave.ts, and `GATES_CMD` in wave-prompt.ts, using the [shared settings](CONFIGURATION.md#shared-settings).

From the target project root, initialize and check the setup:

<!-- run:check-installation -->
```bash
npm run types:init
npm run types:check
npm run lint:debt-ledger:strict
npm run gates:count
```

Run the project's behavior tests too. Commit the tools, configuration, snapshot and dependency changes, then push the branch to its upstream before generating a task. Use [troubleshooting](TROUBLESHOOTING.md) if any command fails.

The tools inspect the Git repository containing their own files. Copy them into each adopting project; a central Mawja checkout does not automatically inspect another project.

## Prepare a task

```bash
npm run wave:new -- --slug=my-change --title="Describe the change"
```

Open `WAVE_PROMPT_MY_CHANGE.md` and replace every `⟪…⟫` placeholder with this task's requirements. Then run:

```bash
npm run wave:check -- WAVE_PROMPT_MY_CHANGE.md
```

Expected: `Ready to issue`. Keep the measured table unchanged; place additional observations in the task's own section. Complete the verification plan and named helper assignments using [the prompt guide](../docs/05-the-wave-prompt.md#verification-and-helper-assignments). Readiness checks fields, measurements and any configured authoritative rule excerpts, not whether the plan is sufficient. See [RULE_SOURCES](CONFIGURATION.md#authoritative-rule-excerpts).

## Verify a branch

Switch to the implementation branch, then run its verifier. For a branch named `wave/my-change`:

```bash
git switch wave/my-change
npm run wave:verify -- --base=main --branch=wave/my-change --claim="npm test"
```

The verifier checks Git state, type budgets, newly registered or changed guard commands, and the supplied claim command. Pin `--base` to the reviewed preparation commit for reproducible comparisons. `--claim` runs from the repository root by default; set `--claim-cwd=frontend` for a package under `frontend/`. Guard commands and type checks continue to run from `CODE_ROOT`. Include affected inherited checks in the verification plan even when their commands are unchanged. Use critical and change-specific checks on the Executor branch, with required mutations; run the full suite at code integration into `main` before publication. An extra full suite on the branch requires a concrete sensitivity reason. Documentation-only work uses documentation and consistency checks. Retain the Conductor's independent review; see the [verification schedule](../docs/09-the-verification-protocol.md#schedule-checks). Complete the independent verification procedure before accepting the change. For an eligible local check, the optional [check runner](CHECK_REUSE.md) can reuse a verified result after adoption review. It is disabled by default and does not replace this independent review.

Choose `--claim` for the task's actual behavior; `npm test` is appropriate only when its scope matches the required checks. The supplied tools still run configured type measurements and do not route hooks by stage. Record current hook behavior and missing routing as maintenance; do not bypass existing gates to apply the schedule. See [policy and hook support](../docs/09-the-verification-protocol.md#policy-and-hook-support).

## Update project copies

1. Review the release in [VERSION](../VERSION) and the [change history](../docs/CHANGELOG.md), then pin the exact Mawja commit to adopt.
2. Apply the relevant changes to the tools in the project's `scripts/conductor/` directory, retaining their license and copyright notices.
3. Preserve project-specific paths, commands and task constraints while applying required configuration migrations. For the 1.2.0 guard-count label, update `GATES_COUNT_RE` as described below; keeping the old expression with the new counter fails measurement.
4. Run type checks, behavior tests and [integration validation](VALIDATION.md).
5. Record the adopted release and commit, local deviations and controls still awaiting implementation. Commit the reviewed update in the adopting project. Do not infer another project's update from the central checkout.

When adopting 1.2.0, set the prompt generator's counter expression to:

```typescript
const GATES_COUNT_RE = /\((\d+)\s+(?:registered guard commands|live gates)/
```

This accepts both the current and legacy counter labels. The current counter deliberately does not claim hook execution. Regenerate existing prompts after upgrading: the measured-table labels and required task fields changed. Configure `RULE_SOURCES` only if adopting authoritative excerpts; an empty list preserves projects without them. `--claim-cwd` is optional and leaves the existing root working directory unchanged.

Updating the Mawja checkout alone does not update project copies.

## Exit codes

The optional check runner returns `0` for acceptance and `1` for any blocking failure. The other toolkit commands use these codes:

| Code | Meaning |
|---|---|
| `0` | The requested operation passed |
| `1` | A project check or readiness requirement failed |
| `2` | The configuration or measurement could not be read |

When building custom Node.js measurers, reserve stdout for machine-readable output and let it drain before exit, for example by setting `process.exitCode`; [Node.js documents the truncation risk of forced exit](https://nodejs.org/api/process.html#processexitcode). Report what the verdict does not establish.

Use [troubleshooting](TROUBLESHOOTING.md) for common failures and [integration validation](VALIDATION.md) to test a customized configuration.
