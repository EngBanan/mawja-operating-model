# Validate an integration

Use this procedure after configuring the toolkit for a project. Run deliberate faults in a disposable repository created from the [examples](../examples/README.md), after completing the [TypeScript/JavaScript walkthrough](../docs/tutorials/typescript-javascript.md) or [Python walkthrough](../docs/tutorials/python.md).

Keep production repositories and data outside these tests.

## Establish the passing state

From the generated project on `wave/subtract`, run:

```bash
npm run check
npm run wave:verify -- --base=main --branch=wave/subtract --claim="npm test"
git status --short
```

Both commands must pass and the working tree must be clean. Save each command, its exit code and complete output.

## Exercise failures

Test one fault at a time. Commit the source fault before running the verifier so the dirty-tree check does not mask the intended failure. After each case, restore the original file, commit the restoration and repeat the passing checks.

| Fault | Change | Required result |
|---|---|---|
| Type mismatch | Append the language-specific type mismatch shown below to the calculator | `types:check` reports `file-ratchet`; the verifier fails on type measurement |
| Incorrect result | Change subtraction to addition | Type checking passes; `test:subtract` and the verifier fail on subtraction behavior |
| Invalid syntax | Append `export const broken = ;`, or `def broken(:` in Python | Type checking reports `crash-class` with syntax details; the verifier fails |
| Uncommitted checker configuration | Append whitespace to tsconfig.json or, for Python, mypy.ini without committing it | Prompt generation and readiness fail with `checker configuration not committed`, even though type counts remain unchanged |

Use the exact type-mismatch declaration for the project's calculator file:

| Language | File | Declaration |
|---|---|---|
| TypeScript | `app/calc.ts` | `const value: number = "wrong";` |
| JavaScript | `app/calc.js` | `/** @type {number} */ const value = "wrong";` |
| Python | `app/calc.py` | `value: int = "wrong"` |

For the configuration case, first push the passing branch to the tutorial's local remote:

```bash
git push -u origin HEAD
```

This keeps an unrelated upstream mismatch from masking the configuration check. Test both normal generation and a forced draft; filling the draft's placeholders must not make it ready while its configuration is uncommitted. Restore the configuration and confirm readiness passes again.

For Python, also add `from app.calc import missing_function`. The checker must report a crash diagnostic and refuse snapshot initialization or update. Restore the source and repeat the passing checks.

## Check snapshot protection

While the syntax fault is present:

- Save the existing snapshot bytes, then run `npm run types:update`. It must refuse and preserve the file.
- In the disposable project, temporarily move the snapshot aside and run `npm run types:init`. It must refuse without writing a new snapshot.
- Restore the saved snapshot and calculator, then repeat the passing checks.

Snapshot protection is separate from the verifier's exit status. Check the file itself.

## Validate the project creator

The [example creator](../examples/create.mjs) must refuse an existing destination, a destination inside another Git repository, or one inside the Mawja checkout. An existing file or directory must remain unchanged after refusal.

Try a new path containing spaces as well as your normal development path. Run the complete [TypeScript/JavaScript setup](../examples/README.md#create-and-run-an-example) or [Python setup](../docs/tutorials/python.md#create-the-project) in each created project, including the Python dependency installation when applicable.

## Record the scope

Record the tested commit, Node/npm/Git versions, Python/mypy versions when applicable, platform, dependency versions, project paths and failures observed. Passing on one environment does not establish support for other platforms, extensions or monorepo layouts.

These cases check the listed failure conditions. Independent review also requires a different deliberate fault and a separate check of the requested behavior.
