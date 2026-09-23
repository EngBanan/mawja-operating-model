# TypeScript and JavaScript tutorial

This walkthrough covers TypeScript and JavaScript. For Python, use the [Python walkthrough](python.md).

Start with a project created by the [example setup](../../examples/README.md). This walkthrough adds subtraction while preserving addition. It uses a local Git remote so you can exercise the workflow without publishing anything.

## Save the initial project

Run these commands from the generated project after `npm run check` passes. Git needs your usual author name and email configured.

<!-- run:save -->
```bash
git add .gitignore LICENSE README.md PROJECT.md DECISIONS.md PROGRESS app scripts tests package.json package-lock.json tsconfig.json
git commit -m "Set up calculator example"
```

The following block creates a local remote at `../mawja-example-remote.git`. That path must not already exist. The first command checks this; stop if it fails:

<!-- run:remote -->
```bash
test ! -e ../mawja-example-remote.git
git init --bare ../mawja-example-remote.git
git remote add origin ../mawja-example-remote.git
git push -u origin main
```

Stop if a command fails. These commands are for the new example project. An existing project should keep its own remote configuration.

## Prepare the task

The [acceptance criteria](../00-terms.md#acceptance-criteria) include `5 - 2 = 3` and `2 - 5 = -3`. Rerunning addition checks provides [regression testing](../00-terms.md#regression-testing). Confirm these expected results before implementing the change.

<!-- run:generate -->
```bash
npm run wave:new -- --slug=subtract --title="Add calculator subtraction"
```

Open `WAVE_PROMPT_SUBTRACT.md` and complete every placeholder:

| Field | Content for this example |
|---|---|
| Goal and scope | Add subtraction; preserve addition and signed-number results |
| Required reading | PROJECT.md, the calculator, its guards and tests |
| Owner decisions | Work only in this example; no merge or deployment |
| Existing behavior | Addition passes its guard and tests |
| Batch | Calculator function, subtraction guard, test and command registration |
| Debt | Item #1; leave it open until independent review confirms closure |
| Constraints | English documentation; no external services, database or billing |
| Exit checks | Type checking, all tests, deliberate fault and restoration |
| Branch and sensitivity | `wave/subtract`; low sensitivity |
| Measurements | Preserve the generated table and commands |

Write `Not applicable` with a reason for constraints that do not apply. Name the project files explicitly: `app/calc.ts` for TypeScript or `app/calc.js` for JavaScript, plus the corresponding guards and tests. Keep the generated measurements unchanged.

<!-- run:ready -->
```bash
npm run wave:check -- WAVE_PROMPT_SUBTRACT.md
git switch -c wave/subtract
```

The check should print `Ready to issue`. Unfilled prompts fail.

## Implement subtraction

Choose the subsection for your project language.

### TypeScript function

Append this function to `app/calc.ts`:

<!-- code:subtract-typescript -->
```typescript
export function subtract(a: number, b: number): number {
  return a - b;
}
```

### JavaScript function

Append this function to `app/calc.js`:

<!-- code:subtract-javascript -->
```javascript
/** @param {number} a @param {number} b @returns {number} */
export function subtract(a, b) {
  return a - b;
}
```

### Subtraction guard and test

Use the filenames for your language:

| File | TypeScript | JavaScript |
|---|---|---|
| Guard | `scripts/governance/check-subtract.ts` | `scripts/governance/check-subtract.js` |
| Test | `tests/subtract.test.ts` | `tests/subtract.test.js` |

Copy this code into the **guard** file. Keep the `.js` import path for both languages; tsx resolves it in the TypeScript example:

<!-- code:guard -->
```javascript
import { subtract } from '../../app/calc.js';

if (subtract(5, 2) !== 3) throw new Error('subtraction behavior');
if (subtract(2, 5) !== -3) throw new Error('signed subtraction behavior');
```

Copy this code into the **test** file:

<!-- code:test -->
```javascript
import { subtract } from '../app/calc.js';

for (const [a, b, expected] of [[5, 2, 3], [2, 5, -3], [-2, -3, 1], [0, 0, 0]]) {
  if (subtract(a, b) !== expected) throw new Error('calculator subtraction result');
}
```

### Register and commit: TypeScript

Run this block from the generated TypeScript project:

<!-- run:implement-typescript -->
```bash
npm pkg set 'scripts.test:subtract=node --import tsx scripts/governance/check-subtract.ts && node --import tsx tests/subtract.test.ts'
npm pkg set 'scripts.test=npm run test:add && npm run test:calc && npm run test:subtract'
npm run check
git add app/calc.ts scripts/governance/check-subtract.ts tests/subtract.test.ts package.json
git commit -m "Add calculator subtraction"
```

### Register and commit: JavaScript

Run this block from the generated JavaScript project:

<!-- run:implement-javascript -->
```bash
npm pkg set 'scripts.test:subtract=node scripts/governance/check-subtract.js && node tests/subtract.test.js'
npm pkg set 'scripts.test=npm run test:add && npm run test:calc && npm run test:subtract'
npm run check
git add app/calc.js scripts/governance/check-subtract.js tests/subtract.test.js package.json
git commit -m "Add calculator subtraction"
```

## Verify the result

Record the commands, exit status and output as [test evidence](../00-terms.md#test-evidence). Distinguish the cases that passed from behavior you did not test.

<!-- run:verify -->
```bash
npm run wave:verify -- --base=main --branch=wave/subtract --claim="npm test"
git status --short
```

The verifier should pass and Git should print no changes. It discovers the newly registered subtraction command. The claim command also runs the inherited addition tests.

Exercise the [deliberate faults and restoration checks](../../scripts/VALIDATION.md) on this disposable example. A reviewer then follows the [independent verification procedure](../09-the-verification-protocol.md), including a different mutation and their own check of the central claim.

This walkthrough ends before merge. For a real task, return the implementation report and evidence to the reviewer. The Owner controls release.

---

[Start here](../00-foreword.md) · [Terms](../00-terms.md) · [Tutorials](README.md) · [Documentation index](../README.md)
