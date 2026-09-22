# Toolkit configuration

Edit the CONFIG block at the top of each copied script. Paths are relative to the target repository's Git root unless described otherwise.

## Shared settings

| Setting | Purpose |
|---|---|
| `CODE_ROOT` | Directory containing application code and its package manifest; use an empty string for a single-package repository |
| `TYPES_CMD` | Type measurement command, run from CODE_ROOT; used by the generator and verifier |
| `RUN_GUARD` | Package-manager command used to run a named guard, such as `npm run` |
| `BASELINE_FILE` | Committed type snapshot; keep generator and measurer values aligned |
| `DEBT_LEDGER` / `DECISION_LOG` | Documents sharing the task and decision number range |

For the TypeScript and JavaScript examples, set these values:

```typescript
const TYPES_CMD = "node --import tsx scripts/conductor/check-types-baseline.ts --json"
const GATES_CMD = "node --import tsx scripts/conductor/count-gates.ts"
```

Set `TYPES_CMD` in `wave-prompt.ts` and `verify-wave.ts`. Set `GATES_CMD` in `wave-prompt.ts`. Python uses a different `TYPES_CMD`, shown in the [Python section](#python). Direct execution uses the [documented tsx Node entry point](https://github.com/privatenumber/tsx/blob/master/docs/dev-api/node-cli.md).

## Prompt generator

- Set `FIXED_READS` to the rules and project documents an implementer must read.
- Keep `MEASURED_EXT` aligned with the language's source files. Include TypeScript extensions because the copied toolkit is TypeScript.
- Set `TYPE_LABEL` to the checker name presented in the prompt.
- Keep `GATES_COUNT_RE` aligned with the gate counter's output.
- Fill the project-specific naming and hard-constraint placeholders in the template. Mark an inapplicable constraint explicitly.

Generation requires committed measurement inputs and a branch matching its remote's advertised head. The generator uses `git ls-remote` for that comparison.

`--force` writes a draft with unresolved requirements. It does not make the prompt ready. `--overwrite` replaces an existing prompt and keeps a backup. Readiness checks compare the visible measured table and embedded metadata.

## Type measurer

`TSC_CMD` and `TSC_PROJECT` must select the same project. For example:

```typescript
const TSC_CMD = "npx tsc --project tsconfig.check.json --noEmit --pretty false"
const TSC_PROJECT = "tsconfig.check.json"
```

The CLI counts diagnostics; the compiler API reads configuration and collects syntax diagnostics. CLI overrides are not automatically transferred to the API. Build mode and project references are outside the supplied examples.

The TypeScript example checks application code, guards and tests. The JavaScript example additionally enables `allowJs` and `checkJs` and uses JSDoc for type information.

Syntax diagnostics and configured crash codes cannot enter the error budget. Both snapshot-writing operations reject them. Ordinary errors must remain within each file's budget and the total ceiling. An unlisted file has a zero budget.

## File discovery and guard commands

Set the verifier's `CODE_DIRS`, `GUARD_DIRS` and `TEST_DIRS` to match the project. Set `CODE_END`, `GUARD_END` and `TEST_END` to regular-expression strings matching those files. For example, `const CODE_END = "\\.js"` matches JavaScript source files.

Keep `GUARD_SCRIPT_PREFIXES` aligned between the verifier and counter. The default prefixes are `lint:` and `test:`.

The verifier automatically runs added or changed manifest commands under those prefixes. It lists changed guard files but does not map every file to its command. Run a changed existing guard separately when its command has not changed.

`--no-guard-ok="<reason>"` records a deliberate change without a new guard. It only applies to missing-guard checks; other verification failures remain blocking.

## Ledger configuration

The ledger and decision log use one number range and the [documented row format](../docs/appendix.md#b--debt-and-decision-format). From the project root, run `node --import tsx scripts/conductor/wave-prompt.ts --next-number` to obtain the next number.

Set `FLOOR_ROWS` and `FLOOR_CLOSED` for the repository. The examples require one debt row and allow zero closed rows. A closure marker records an item's status. The reviewer must still check the evidence that it is complete.

Sub-number identifiers support Latin and Arabic letters. Preserve that range when adapting the ledger parser.

## Checker configuration contract

The TypeScript checker reports `configurationFiles`, including inherited TypeScript configuration. The Python checker reports its selected mypy.ini. Generation and readiness compare the resolved paths and file bytes with committed Git content. Untracked, ignored, modified or outside-repository configuration blocks readiness.

A custom measurer can omit this field under the compatibility contract; the generator then reports that checker configuration was not verified against Git. An empty or malformed list is a configuration error.

This check covers the files reported by the checker. It does not discover every plugin, environment variable or runtime input, and it is not independently repeated by the branch verifier. See the [full output contract](../docs/appendix.md#d--measurement-output).

## Python

The [Python creator](../docs/tutorials/python.md#create-the-project) applies the settings below automatically. For an existing Python project, copy the five shared TypeScript tools and `check-python-baseline.py` into `scripts/conductor/`, together with the Mawja root `LICENSE` file. Install tsx with the project's Node package manager and mypy in its Python virtual environment.

Set this command in **both** `wave-prompt.ts` and `verify-wave.ts`:

```typescript
const TYPES_CMD = "python -B scripts/conductor/check-python-baseline.py --json"
```

In **wave-prompt.ts**, set:

```typescript
const GATES_CMD = "node --import tsx scripts/conductor/count-gates.ts"
const MEASURED_EXT = /\.(ts|tsx|mts|cts|py)$/
const TYPE_LABEL = "mypy + Python syntax"
```

For the example's layout, set these values in **verify-wave.ts**:

```typescript
const CODE_DIRS = ["app"]
const GUARD_DIRS = ["scripts/governance"]
const TEST_DIRS = ["tests"]
const CODE_END = "\\.py"
const GUARD_END = "\\.py"
const TEST_END = "\\.py"
```

In **check-python-baseline.py**, set:

```python
SOURCE_DIRS = ['app', 'scripts/governance', 'tests']
MYPY_CONFIG = 'mypy.ini'
BASELINE_FILE = 'scripts/conductor/types-baseline.json'
```

If your directories differ, change the verifier's directory lists and the checker's `SOURCE_DIRS` together. Every source directory must exist and contain Python files.

Use the example's [mypy.ini](../examples/python/mypy.ini) and [command entries](../examples/python/package.json) as the starting configuration. Add the command entries to the existing package manifest. Commit the checker configuration and generated baseline with the project.

The Python checker locates the Git root containing its script and runs mypy with the same Python interpreter. Activate the virtual environment before running npm commands:

```bash
. .venv/bin/activate
npm run types:check
npm test
```

After changing the setup, run [integration validation](VALIDATION.md). Review intentional exclusions or diagnostic suppressions before accepting the configuration.
