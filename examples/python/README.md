# Python calculator example

This project includes Python application code, unittest tests, behavior guards and a mypy baseline checker. Mawja's shared tools use Node.js with tsx.

## Setup

Requirements: Git, Node.js with `--import` support, npm, Python 3.10 or later and pip. Run these commands from the generated project:

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

Keep the virtual environment active when running npm commands. On Windows, use the activation command for your shell from the [Python documentation](https://docs.python.org/3/library/venv.html#how-venvs-work). The examples are verified on Linux/WSL2.

If Python cannot create the environment because ensurepip is unavailable, install your distribution's Python venv package or use `python3 -m virtualenv .venv` with [virtualenv](https://virtualenv.pypa.io/en/latest/how-to/install.html) installed. Then continue with activation and dependency installation.

Expected: the type checker reports `ok: true` and zero errors; the addition guard, unittest suite and debt check pass. Initialize the snapshot once. Commit it with the project; use `npm run types:update` after reducing accepted type debt.

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Run Python behavior checks |
| `npm run types:check` | Check Python syntax and mypy diagnostics against the snapshot |
| `npm run check` | Run type, behavior and ledger checks |
| `npm run wave:new -- --slug=subtract` | Generate a task prompt after committing the setup and pushing the branch to its upstream |
| `npm run wave:check -- WAVE_PROMPT_SUBTRACT.md` | Check a completed prompt |
| `npm run wave:verify -- --base=main --branch=wave/subtract` | Verify an implementation branch |

Read PROJECT.md for project rules. Follow the [Python first-wave walkthrough](https://github.com/EngBanan/mawja-operating-model/blob/main/docs/tutorials/python.md#save-the-initial-project) to commit the setup, configure a local remote and implement subtraction.

The tools in `scripts/conductor/` are copies used by this project. To update them, follow [Update project copies](https://github.com/EngBanan/mawja-operating-model/blob/main/scripts/README.md#update-project-copies), preserve this project's configuration and rerun its checks.
