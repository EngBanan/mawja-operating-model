# Runnable examples

Create a standalone calculator project to try Mawja's tools. Each example includes source files, behavior checks, a type-check configuration and a dependency lockfile.

| Language | Source and setup | Tutorial |
|---|---|---|
| TypeScript | [typescript/](typescript/README.md): `.ts` application and tests | [TypeScript and JavaScript](../docs/tutorials/typescript-javascript.md) |
| JavaScript | [javascript/](javascript/README.md): `.js` application and tests | [TypeScript and JavaScript](../docs/tutorials/typescript-javascript.md) |
| Python | [python/](python/README.md): `.py` application and tests | [Python](../docs/tutorials/python.md) |

For the reading path and role responsibilities, see [Start here](../docs/00-foreword.md). Use [Terms](../docs/00-terms.md) to look up the testing vocabulary.

## Requirements

- Git, npm and Node.js with support for `--import`.
- Access to the npm registry and, for Python, PyPI for the first dependency installation.
- A new destination outside existing Git repositories. Its parent directory must exist.

See [language support](../scripts/LANGUAGES.md#compatibility) for the tested environment and scope.

Python also needs Python 3.10 or later and pip. Follow the [Python setup and first-wave walkthrough](../docs/tutorials/python.md) to create its virtual environment and install mypy.

## Create and run an example

Run one setup block from the Mawja directory. Each command creates a new project beside the checkout.

### TypeScript

<!-- run:create-typescript -->
```bash
node examples/create.mjs typescript ../mawja-typescript
cd ../mawja-typescript
git init -b main
npm ci
npm run types:init
npm run check
```

### JavaScript

<!-- run:create-javascript -->
```bash
node examples/create.mjs javascript ../mawja-javascript
cd ../mawja-javascript
git init -b main
npm ci
npm run types:init
npm run check
```

### Python

Follow the [Python setup](../docs/tutorials/python.md#create-the-project) for the complete commands, including virtual environment creation and dependency installation.

Expected: the addition guard, calculator tests and debt-ledger check pass. The type check reports `ok: true`, `count: 0`, `baseline: 0` and `crashHits: 0`.

The creator copies the selected application files and configures the shared tools in the new project. Python projects also receive the Python baseline checker. The remaining setup commands initialize Git, install dependencies, create the first type snapshot and run the checks.

Initialize the type baseline once. Commit `scripts/conductor/types-baseline.json` and `package-lock.json` with the project. Use `npm run types:update` when accepted type debt decreases.

## Project contents

| Location | Purpose |
|---|---|
| `app/` | Calculator implementation |
| `tests/` | Calculator behavior tests |
| `scripts/governance/` | Named behavior guards |
| `scripts/conductor/` | Project-local Mawja tools and their MIT license |
| `LICENSE` | MIT license for the generated example |
| `PROJECT.md` | Rules for this example |
| `PROGRESS/TECHNICAL_DEBT.md` | Open work and closure criteria |
| `DECISIONS.md` | Decision log |

Keep the copyright and permission notices when reusing example code or tools. Dependencies retain their own licenses.

The language directories are project templates. The creator combines the selected language with [shared project files](shared/README.md) and the toolkit from [scripts/](../scripts/README.md). Use the creation command to obtain a complete project.

The `tests/` directories inside these examples test calculator behavior. The [top-level test suite](../tests/README.md) checks the toolkit itself.

## Optional check-result reuse

Each generated project also includes a calculator check with explicit case results and reuse disabled by default. Follow the [check-result reuse exercise](../scripts/CHECK_REUSE.md#try-the-calculator-example) after saving the initial project. It demonstrates fresh execution, verified reuse and rejection after a fault.

## Next steps

Follow the [TypeScript/JavaScript walkthrough](../docs/tutorials/typescript-javascript.md#save-the-initial-project) or [Python walkthrough](../docs/tutorials/python.md#save-the-initial-project) to commit the project, connect a local remote, prepare a task and verify a change. Use [integration validation](../scripts/VALIDATION.md) when checking a customized setup.

To add Mawja to an existing project, use the [installation guide](../scripts/README.md#installation). Project copies are updated explicitly; changing the Mawja checkout does not update them automatically.
