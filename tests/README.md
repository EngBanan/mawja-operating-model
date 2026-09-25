# Toolkit tests

These tests validate Mawja tools. Tests inside [examples/](../examples/README.md) validate the example applications.

## Example creator

From the Mawja checkout, run:

```bash
node --test tests/test_example_creator.mjs
```

The suite checks license distribution and the tutorial save commands for all three languages, and verifies that missing license inputs or an existing destination are rejected without changing the destination. It uses Node.js and Git without installing dependencies. Fixtures are removed after each test; set TMPDIR to choose their parent directory.

## Prompt configuration

Create a TypeScript example outside the Mawja checkout and install its pinned dependencies:

```bash
node examples/create.mjs typescript ../mawja-test-runtime
npm ci --prefix ../mawja-test-runtime
node tests/test_prompt_configuration.mjs ../mawja-test-runtime
```

The suite runs the generated prompt tool and real TypeScript checker in isolated Git repositories. It covers Git line-ending conversion, nested configuration paths, uncommitted and ignored configuration, index flags that hide changes, and clean filters that could conceal different configuration content. File-symlink checks run where creating symlinks does not require Windows privileges. Fixtures are removed after each test; set TMPDIR (TEMP on Windows) to choose their parent directory.

## Python baseline checker

Use Python 3.10 or later with the pinned mypy dependencies installed in an active virtual environment. From the Mawja checkout:

```bash
python -m pip install -r examples/python/requirements-dev.txt
python -B -m unittest discover -s tests -v
```

The suite creates isolated Git repositories and checks real mypy diagnostics, syntax failures, snapshot protection, per-file budgets, missing inputs and configuration errors. Controlled subprocess output is used only for parser failure cases. Fixtures are removed after each test; set TMPDIR to choose their parent directory.

For a complete project workflow, follow the [Python walkthrough](../docs/tutorials/python.md) and [integration validation](../scripts/VALIDATION.md).

## Optional check runner

From the Mawja checkout, run:

```bash
node --test tests/test_check_runner.mjs
```

The suite uses real Git repositories and subprocesses to exercise fresh execution, explicit reuse, the off switch, changed inputs, incomplete reports, expired evidence, failure history with reuse disabled, interrupted attempts and required later-stage failures. It also checks environment-value redaction in metadata. Fixtures use TMPDIR (TEMP on Windows) and are removed after each test.

For a real application exercise in all three languages, follow [check-result reuse](../scripts/CHECK_REUSE.md#try-the-calculator-example). Introduce an incorrect calculator operation, confirm the check fails, restore it and confirm a fresh success. To validate a customized integration, also exercise the entire enforcing hook with reuse disabled and enabled.
