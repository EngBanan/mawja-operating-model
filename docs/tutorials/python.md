# Python tutorial

Create a Python calculator project, run its checks and verify a subtraction change. The application, guards, tests and type checker use Python. Shared Mawja tools require Node.js and npm.

If your project is set up and `npm run check` passes, continue with [Save the initial project](#save-the-initial-project).

## Create the project

From the Mawja checkout, choose a new destination outside existing Git repositories:

<!-- run:create -->
```bash
node examples/create.mjs python ../mawja-python
cd ../mawja-python
```

From the new `mawja-python` directory, create the environment and run the checks:

<!-- run:setup -->
```bash
git init -b main
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
npm ci
npm run types:init
npm run check
```

Expected: the type checker reports zero errors, and the addition guard, unittest suite and debt check pass. Keep the environment active for the rest of this walkthrough.

If environment creation fails, use [Python setup troubleshooting](../../scripts/TROUBLESHOOTING.md#python-or-mypy-is-unavailable). See [tested versions](../../scripts/LANGUAGES.md#compatibility).

## Save the initial project

Run these commands from the generated Python project after `npm run check` passes, with its virtual environment active. Git needs your usual author name and email configured.

<!-- run:save -->
```bash
git add .gitignore LICENSE README.md PROJECT.md DECISIONS.md PROGRESS app scripts tests package.json package-lock.json mypy.ini requirements-dev.txt
git commit -m "Set up Python calculator"
```

Create a local remote at `../mawja-python-remote.git`. That path must not already exist. Stop if the first command fails:

<!-- run:remote -->
```bash
test ! -e ../mawja-python-remote.git
git init --bare ../mawja-python-remote.git
git remote add origin ../mawja-python-remote.git
git push -u origin main
```

Stop if a command fails. In an existing project, use its configured remote.

## Prepare the task

The [acceptance criteria](../00-terms.md#acceptance-criteria) include `5 - 2 = 3` and `2 - 5 = -3`. Rerunning addition checks provides [regression testing](../00-terms.md#regression-testing). Confirm these expected results before implementing the change.

<!-- run:generate -->
```bash
npm run wave:new -- --slug=subtract --title="Add calculator subtraction"
```

Complete every `⟪…⟫` placeholder in `WAVE_PROMPT_SUBTRACT.md`:

| Field | Content for this project |
|---|---|
| Goal and scope | Add subtraction; preserve addition and signed-number results |
| Required reading | PROJECT.md, app/calc.py, scripts/governance/check_add.py and tests/test_calc.py |
| Owner decisions | Work only in this example and its local remote; no merge or deployment |
| Existing behavior | Addition passes test:add and test:calc |
| Batch | Calculator function, subtraction guard, test and command registration in one commit |
| Debt | Keep item #1 open until independent review confirms closure |
| Constraints | English documentation; no external services, database or billing |
| Exit checks | Type checking, all tests, deliberate fault and restoration |
| Branch and sensitivity | `wave/subtract`; low sensitivity |
| Measurements | Keep the generated table and commands unchanged |

Write `Not applicable` with a reason for constraints that do not apply.

<!-- run:ready -->
```bash
npm run wave:check -- WAVE_PROMPT_SUBTRACT.md
git switch -c wave/subtract
```

Expect `Ready to issue`. Unfilled prompts fail.

## Implement subtraction

Append to app/calc.py:

<!-- code:subtract -->
```python
def subtract(a: int, b: int) -> int:
    return a - b
```

Create scripts/governance/check_subtract.py:

<!-- code:guard -->
```python
from app.calc import subtract

if subtract(5, 2) != 3:
    raise AssertionError("subtraction behavior")
if subtract(2, 5) != -3:
    raise AssertionError("signed subtraction behavior")
```

Create tests/test_subtract.py:

<!-- code:test -->
```python
import unittest
from app.calc import subtract


class SubtractionTests(unittest.TestCase):
    def test_subtract(self) -> None:
        for a, b, expected in [(5, 2, 3), (2, 5, -3), (-2, -3, 1), (0, 0, 0)]:
            with self.subTest(a=a, b=b):
                self.assertEqual(subtract(a, b), expected)


if __name__ == "__main__":
    unittest.main()
```

From the Python project directory, register the guard, run the checks and commit:

<!-- run:implement -->
```bash
npm pkg set 'scripts.test:subtract=python -B -m scripts.governance.check_subtract'
npm pkg set 'scripts.test=npm run test:add && npm run test:calc && npm run test:subtract'
npm run check
git add app/calc.py scripts/governance/check_subtract.py tests/test_subtract.py package.json
git commit -m "Add calculator subtraction"
```

The `test:calc` command discovers both `tests/test_calc.py` and `tests/test_subtract.py`.

## Verify the result

Record the commands, exit status and output as [test evidence](../00-terms.md#test-evidence). Distinguish the cases that passed from behavior you did not test.

<!-- run:verify -->
```bash
npm run wave:verify -- --base=main --branch=wave/subtract --claim="npm test"
git status --short
```

The verifier should pass and run `test:subtract`. The final `git status --short` command should print nothing. The claim command also runs the inherited addition checks.

Exercise the [deliberate faults and restoration checks](../../scripts/VALIDATION.md) in this disposable project. A reviewer follows the [independent verification procedure](../09-the-verification-protocol.md), including a different deliberate fault and a separate check of the task's central claim.

This walkthrough ends before merge. Return the implementation report and evidence to the reviewer; the Owner controls release.

---

[Start here](../00-foreword.md) · [Terms](../00-terms.md) · [Tutorials](README.md) · [Documentation index](../README.md)
