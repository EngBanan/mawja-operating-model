# Language support

Choose the example that matches your project.

| Project | Example | Type checking | Application runtime |
|---|---|---|---|
| TypeScript | [TypeScript](../examples/typescript/) | TypeScript with strict checking | Node.js with tsx |
| JavaScript | [JavaScript](../examples/javascript/) | TypeScript with `allowJs`, `checkJs` and JSDoc | Node.js |
| Python | [Python](../examples/python/) | mypy with strict checking and a Python syntax check | Python |

Each example includes application code, tests, behavior guards and project configuration. TypeScript and JavaScript use ECMAScript modules. Python uses type annotations and unittest.

## Get started

Follow the [TypeScript/JavaScript setup](../examples/README.md) or [Python setup](../docs/tutorials/python.md). For an existing repository, see [toolkit installation](README.md#installation) and [configuration](CONFIGURATION.md).

Mawja's shared prompt, verification and ledger tools run on Node.js with tsx. All three examples therefore require Node.js and npm. JavaScript installs TypeScript to check its source. Python installs mypy in a virtual environment and runs its application and tests with Python.

## Compatibility

The examples pin tsx 4.21.0. TypeScript and JavaScript pin TypeScript 5.9.3; Python pins mypy 1.18.2 and its dependencies in requirements-dev.txt.

The documented checks are verified on Linux/WSL2 with Node.js 20.19.5, npm 10.8.2, Git 2.34.1 and, for Python, CPython 3.10.12. The Python source requires Python 3.10 or later. Verify other runtime versions and platforms in your environment.

The JavaScript example covers `.js` files with ECMAScript modules. JSX, `.mjs`/`.cjs`, project references and monorepo configurations need additional configuration and verification.

The Python example covers `.py` files in app, scripts/governance and tests, with one explicit mypy.ini. Custom mypy plugins, extra stub packages and other source layouts need integration checks. Activate the project's virtual environment before running its npm commands.

## Check scope

Application code, guards and tests must all be in the checking scope. The baseline checkers reject configured crash diagnostics and syntax errors, enforce per-file budgets and check the total error ceiling.

Python's configured crash categories include syntax errors, undefined names, names used before definition, missing imports and unresolved or unexported symbols in `from ... import ...` statements. Other attribute errors remain ordinary type debt. This classification covers reported static diagnostics; suppressions, dynamic imports and unexecuted paths still require behavior tests.

Prompt generation and readiness verify that the reported checker configuration matches committed Git content. Older custom measurers can omit this information with a warning; see [the checker contract](../docs/appendix.md#d--measurement-output).

## Additional languages

You can adopt Mawja's workflow in projects that use other programming languages, using the build, test and static analysis tools appropriate for your project. To integrate those tools with Mawja's toolkit, you may need to configure or modify the included scripts, or add scripts for your language.

An integration needs a checker implementing the [measurement contract](../docs/appendix.md#d--measurement-output), behavior test commands, and matching file discovery. Validate each integration with [deliberate faults and restoration](VALIDATION.md).

## Technical references

- [TypeScript: checking JavaScript files](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html)
- [TypeScript: checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html)
- [Python: virtual environments](https://docs.python.org/3/library/venv.html)
- [mypy: command-line use](https://mypy.readthedocs.io/en/stable/command_line.html)
- [mypy: configuration](https://mypy.readthedocs.io/en/stable/config_file.html)
- [tsx: direct Node execution](https://github.com/privatenumber/tsx/blob/master/docs/dev-api/node-cli.md)

## Further reading

- [TypeScript/JavaScript walkthrough](../docs/tutorials/typescript-javascript.md)
- [Python walkthrough](../docs/tutorials/python.md)
- [Configuration reference](CONFIGURATION.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Integration validation](VALIDATION.md)
