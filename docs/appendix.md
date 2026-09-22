# Appendix: technical contracts

This reference specifies the toolkit prerequisites, ledger format and measurement output. Start with the [examples](../examples/README.md) for a runnable project.

<a id="a--what-the-four-commands-assume"></a>

## A · Toolkit requirements

Configure the toolkit for the adopting repository. Its commands depend on these inputs:

| Requirement | Why it's a precondition |
|---|---|
| **One numbering range, shared by the debt ledger and the decision log** | The next identifier is derived from both documents |
| **A defined ledger-row format** | [Appendix B](#b--debt-and-decision-format) defines the accepted marker positions |
| **A gates manifest with a command per guard, using the configured name prefixes** | The verifier runs added or changed manifest scripts under the configured prefixes (`lint:` and `test:` by default). It reports excluded commands. Run other relevant checks separately |
| **A type check with a committed ceiling** | Step 3 of the verification protocol compares against it. [Appendix C](#c--crash-diagnostics-and-error-budgets) |
| **Version control, with a remote the branch tracks** | Verification reads the branch diff. Generation requires HEAD to match the advertised upstream branch; missing remotes, missing upstreams, divergence and unreadable remotes block it |
| **A script runner (`tsx` in the reference)** | The project runner must execute the configured checks |

<a id="b--the-closure-marker-to-the-character"></a>

## B · Debt and decision format

The supplied ledger checker recognizes the following positions:

| State | The marker |
|---|---|
| **Closed** | ✅ at the **start of the description cell** or the **start of the priority cell** |
| **Open** | Absent from both positions |
| **Red gate** | Present anywhere else. For prose emphasis use ✔︎: a different mark that carries no closure meaning |

<a id="the-row-and-the-heading-literally"></a>

### Row and decision-heading format

A ledger row starts with the number in bold; the second cell is the description, the third the priority. Example rows:

```markdown
| # | Item | Priority | Evidence · how it closes |
|---|---|---|---|
| **#12** | Retry on a dropped upload | 🟡 P2: interruptions lose an upload | measured 2026-05-03 · close when the interruption test proves a retry succeeds without a duplicate |
| **#11** | ✅ Nightly backup restore never run | 🔴 P1: recovery unproven | closed 2026-05-01 · restored backup and compared the recovered records |
```

A decision in the log is a level-two heading with the same number range:

```markdown
## DEC #13 Uploads retry three times, then stop
```

The ledger and the log share one range: #13 follows #12 wherever it lands. A fresh pair with no numbered entries starts at #1; titles and an empty table header are allowed. Sub-items such as `#12-a` use the same base number, so they reserve #12 too. A malformed numbered entry is an error, not a fresh ledger.

---

<a id="c--the-crash-class-and-the-ceiling"></a>

## C · Crash diagnostics and error budgets

The crash class contains explicitly configured diagnostic categories that cannot enter the error budget. The TypeScript/JavaScript checker includes selected TypeScript diagnostics and compiler syntax diagnostics. The Python checker includes the categories listed in [language support](../scripts/LANGUAGES.md#check-scope).

The checker applies three constraints:

**1 · The crash class: absolute zero.**
No configured crash diagnostic may be accepted into a per-file budget or total ceiling.

**2 · A per-file ratchet.**
Each file must stay at or below its saved error count. A file absent from the snapshot has a budget of zero.

**3 · A global ceiling.**
The total count must remain at or below the committed ceiling, in addition to each file staying within budget.

The examples register these commands:

- `npm run types:init` creates the first snapshot.
- `npm run types:check` compares current errors with the saved limits.
- `npm run types:update` saves lower limits after errors are fixed.

Commit the snapshot with the corresponding change. Do not increase its values manually.

### Reference checker: syntax and static limits

The TypeScript-based reference measurer applies its configured crash codes and the installed compiler API's syntactic diagnostics. Syntax errors are never ordinary debt: measurement reports `kind: "crash-class"`, and both `--init` and `--update` refuse to record them, even when the total fits the ceiling and every file fits its budget. The JSON `crashClass` list contains the category `"syntax"` alongside the configured codes; `syntaxDiagnostics` explains individual syntax findings.

Static checks do not verify that every runtime path starts or behaves correctly. Suppressions, unchecked files, dynamic imports, runtime dependencies and environment inputs can leave defects outside it. Behavior guards and independent verification remain necessary. JavaScript coverage depends on `allowJs`, `checkJs`, the configured file scope and useful type information such as JSDoc.

`TSC_PROJECT` must match the project selected by `TSC_CMD`. The CLI and API inspect it separately; arbitrary CLI overrides, `--build`, project references and other compiler versions are outside the tested configuration. Configuration loading errors are CONFIG failures, not countable debt. See [the language guide](../scripts/LANGUAGES.md).

### Snapshot scope

Check the complete configured file set against the snapshot. A changed dependency can cause errors in files outside the source diff. Per-file budgets prevent improvements elsewhere from hiding a local regression.

<a id="d--the-seven-numbers-and-where-each-comes-from"></a>

## D · Measurement output

The prompt generator records these measurements and their sources:

| Number | Source | How it's measured |
|---|---|---|
| `Branch head` | Version control | The command that shows the branch's latest commit |
| `Type-error count` | **Your type checker** | Run it in check-only mode without writing output files, then count the errors |
| `The ceiling` | A snapshot file in the repository | Read the committed value |
| `Crash class` | The same checker, filtered to named kinds | Count matches. Expected: zero |
| `Gate count` | The gates manifest | Count live entries |
| `Debt counters` | The debt ledger | The counting gate itself ([Appendix B](#b--debt-and-decision-format)) |
| `Next free number` | The ledger and the decision log **together** | Scan both, take the maximum + 1 |

The workflow allows different language-specific measurers. The reference toolkit provides `check-types-baseline.ts` for TypeScript and JavaScript, `check-python-baseline.py` for Python, and `count-gates.ts` for the guard count. See [language support](../scripts/LANGUAGES.md). Other language integrations must implement and verify the contract below.

Example output consumed by the generator and verifier:

```jsonc
// Type measurement: the consumers use this JSON to determine the verdict.
{ "ok": true,            // false when the crash class is above zero, a file is above its budget, or the total is above the ceiling
  "count": 41,           // errors right now
  "baseline": 44,        // the committed ceiling
  "crashClass": ["TS2304", "TS2552", "TS1308", "syntax"],   // guarded codes and categories: a list, not a count
  "crashHits": 0,        // diagnostic count; the generator also displays it
  "kind": null,          // null, "crash-class", "file-ratchet", or "regression"; a failed setup reports "config"
  "filesOverBudget": [], // diagnostic descriptions, e.g. "app/store.ts: 2 > 1"
  "configurationFiles": ["tsconfig.json"], // checker inputs; reference output uses absolute paths
  "syntaxDiagnostics": [] } // reference checker details, not a replacement for crashHits

// the gate count · anywhere in the output
(12 live gates
```

`ok`, `count` and `baseline` are required. `ok` is the blocking verdict; `kind` and `filesOverBudget` explain a failure. `crashClass` and `crashHits` describe what was checked and what fired: without both, the tools report the crash class as **not measured**, not zero.

### Checker configuration provenance

The TypeScript measurer produces `configurationFiles`: a nonempty list of the configuration paths read by TypeScript's config parser, including inherited configurations. The generator resolves relative entries from `CODE_ROOT` (absolute entries are accepted), checks both their lexical and real paths against the repository, and compares current file bytes with HEAD. Uncommitted, ignored, hidden modified, outside-repository or unsuitable symlink configuration blocks both generation and readiness with `checker configuration not committed`. An unrelated JSON file does not become a checker input merely by existing.

The Python measurer reports its explicitly selected `mypy.ini` in `configurationFiles` and follows the same verification path. It compiles the configured Python files without executing them, then parses a complete mypy result. Missing inputs, unreadable results and interrupted checks fail as configuration errors. Python syntax errors and configured crash diagnostics cannot enter a snapshot.

For backward compatibility, an older custom measurer **may omit** `configurationFiles`. The generator then warns `checker configuration provenance not measured: TYPES_CMD does not report configurationFiles` and preserves its earlier behavior. The checker configuration has not been verified against committed Git content. Supplying an empty list, a non-list value, or a non-string or empty-string entry is a CONFIG error. Custom measurers that need configuration verification must report the field.

The byte check belongs to `wave-prompt --new` and `--check`; `verify-wave` does not independently apply it. It covers reported files, not every possible plugin, environment variable, package input or compiler option. Keep `TSC_PROJECT` aligned with `TSC_CMD`; a lockfile alone does not make uncommitted inherited configuration pass. Updating Mawja's central source does not update the copies inside adopting projects.

Record the configured commands in the project's documentation.

---

<a id="e--the-non-vacuity-floor"></a>

## E · Minimum scan counts

A gate declares the minimum number of relevant items it must examine. It fails when it finds fewer items than that minimum.

This catches empty scans caused by incorrect paths, unmatched patterns or unsupported formats. Report how many items were checked alongside any violations.

Set floors for the adopting repository. The supplied example ledger requires one row and allows zero closed rows.

## Adoption

Use the [adoption checklist](13-audit-your-structure.md), establish [repository records](06-file-architecture.md) and [debt tracking](07-the-debt-ledger.md), then configure the [toolkit](../scripts/README.md).

---

[Previous: 14 · Failure patterns](14-five-failure-patterns.md) · [Documentation index](README.md) · [Next: References](references.md)
