# Toolkit tests

These tests validate Mawja tools. Tests inside [examples/](../examples/README.md) validate the example applications.

## Example creator

From the Mawja checkout, run:

```bash
node --test tests/test_example_creator.mjs
```

The suite checks license distribution for all three languages and verifies that missing license inputs or an existing destination are rejected without changing the destination. It uses Node.js and Git without installing dependencies. Fixtures are removed after each test; set TMPDIR to choose their parent directory.

## Python baseline checker

Use Python 3.10 or later with the pinned mypy dependencies installed in an active virtual environment. From the Mawja checkout:

```bash
python -m pip install -r examples/python/requirements-dev.txt
python -B -m unittest discover -s tests -v
```

The suite creates isolated Git repositories and checks real mypy diagnostics, syntax failures, snapshot protection, per-file budgets, missing inputs and configuration errors. Controlled subprocess output is used only for parser failure cases. Fixtures are removed after each test; set TMPDIR to choose their parent directory.

For a complete project workflow, follow the [Python walkthrough](../docs/tutorials/python.md) and [integration validation](../scripts/VALIDATION.md).
