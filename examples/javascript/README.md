# JavaScript calculator example

This project uses JavaScript for its application, tests and behavior guards. Node.js runs the application; TypeScript checks its JSDoc types. Mawja tools use Node.js with tsx.

## Setup

Requirements: Git, npm and Node.js with support for `--import`. The supplied dependency versions are tsx 4.21.0 and TypeScript 5.9.3.

For project creation, see the [setup instructions](https://github.com/EngBanan/mawja-operating-model/blob/main/examples/README.md#javascript). Run these commands from the generated project:

```bash
git init -b main
npm ci
npm run types:init
npm run check
```

Expected: addition tests and the debt-ledger check pass; the type check reports zero errors.
Initialize the baseline once. After reducing existing type errors, use `npm run types:update`.

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Run the addition guard and calculator tests |
| `npm run types:check` | Check whether type errors exceed the saved limits |
| `npm run check` | Run type, behavior and ledger checks |
| `npm run wave:new -- --slug=subtract` | Generate a task prompt after committing the setup and pushing the branch to its upstream |
| `npm run wave:check -- WAVE_PROMPT_SUBTRACT.md` | Check a completed prompt |
| `npm run wave:verify -- --base=main --branch=wave/subtract` | Verify an implementation branch |

Read PROJECT.md for project rules. Commit the setup and configure an upstream remote before generating a prompt.
Follow the [first-wave walkthrough](https://github.com/EngBanan/mawja-operating-model/blob/main/docs/tutorials/typescript-javascript.md#save-the-initial-project) to prepare a task, implement subtraction and verify the branch.

The tools in `scripts/conductor/` are copies used by this project. To update them, follow [Update project copies](https://github.com/EngBanan/mawja-operating-model/blob/main/scripts/README.md#update-project-copies), preserve this project's configuration and rerun its checks.
