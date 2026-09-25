#!/usr/bin/env tsx
/**
 * Generate task prompts and check their measurements.
 *
 * --new --slug=<slug> [--title="…"] writes WAVE_PROMPT_<SLUG>.md.
 * --check <file> remeasures repository state and reports drift or placeholders.
 * --next-number prints the next available debt/decision identifier.
 *
 * Generation and checking require committed measurement inputs, a branch
 * matching its advertised remote HEAD and a passing type check.
 * --force permits generation with blockers recorded in the prompt.
 * --overwrite separately replaces an existing prompt and retains a .bak copy.
 *
 * The Conductor fills the task decisions, scope, batches and acceptance criteria.
 * The generator measures repository state and leaves task content as placeholders.
 */
import { execFileSync, execSync } from "node:child_process"
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
/**
 * Shared ledger parser. Keep this file beside check-debt-ledger.ts.
 */
import { debtNumber, isDebtRow, splitCells, isClosed as isClosedCells } from "./check-debt-ledger"

// ══════════════════════════ CONFIG: edit this block ════════════════════════
/**
 * Repository-specific configuration. Paths resolve from the Git repository root.
 */

/** Where your code and its `package.json` live, relative to the repository root. `""` for a single-package repo. */
const CODE_ROOT = ""

/**
 * Type-check command, run from CODE_ROOT. Must print { ok, count, baseline }
 * as JSON. ok must be false for a global or per-file regression or a crash
 * diagnostic. crashClass lists configured categories; crashHits counts findings.
 * Both are needed to report the crash count. The JSON determines the verdict;
 * the command's exit status is not used.
 */
const TYPES_CMD = "npx tsx scripts/conductor/check-types-baseline.ts --json"

/**
 * Gate-count command, run from CODE_ROOT.
 * GATES_COUNT_RE must capture its reported count in group 1.
 */
const GATES_CMD = "npx tsx scripts/conductor/count-gates.ts"
const GATES_COUNT_RE = /\((\d+)\s+live gates/

/**
 * The files every wave prompt tells the Executor to read first, in order.
 * Section 6 of the document explains what each one answers.
 */
const FIXED_READS = "`CLAUDE.md` (project rules) · `_docs/CONSTITUTION.md` (the definition of \"done\") · `LESSONS_LEARNED.md`"

/** Your debt ledger and decision log, relative to the repository root. They share one numbering range. */
const DEBT_LEDGER = "PROGRESS/TECHNICAL_DEBT.md"
const DECISION_LOG = "DECISIONS.md"
/** Keep aligned with the type measurer: an untracked snapshot changes the measured ceiling. */
const BASELINE_FILE = "scripts/conductor/types-baseline.json"
/** The package manager used by the printed debt-ledger verification command. */
const RUN_GUARD = "npm run"
/** File endings read by your checker, including untracked inputs. Keep aligned with its configuration. */
const MEASURED_EXT = /\.(ts|tsx|mts|cts)$/
/** Checker name printed in the project constraints and exit gates. */
const TYPE_LABEL = "tsc"
// ════════════════════════════ END CONFIG ════════════════════════════════════

/**
 * Resolve the repository root through Git. HERE supports CommonJS and ESM.
 */
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url))
const ROOT = (() => {
  try { return execSync("git rev-parse --show-toplevel", { cwd: HERE, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() }
  catch {
    console.error(`\n⛔ CONFIG: this file is not inside a Git repository (looked from ${HERE})`)
    console.error(`   The toolkit reads the root from \`git rev-parse --show-toplevel\`. Copy it into the repository it should measure.\n`)
    process.exit(2)
  }
})()
const CODE = CODE_ROOT ? resolve(ROOT, CODE_ROOT) : ROOT
const DEBT = join(ROOT, DEBT_LEDGER)
const DECISIONS = join(ROOT, DECISION_LOG)

/**
 * Report missing configured paths as configuration errors (exit 2).
 */
function requireConfigured(path: string, label: string, setting: string): void {
  if (existsSync(path)) return
  console.error(`\n⛔ CONFIG: no ${label} at \`${path}\``)
  console.error(`   Set \`${setting}\` in the CONFIG block at the top of this file.`)
  console.error(`   The configured file must exist before measurement can run.\n`)
  process.exit(2)
}

const PLACEHOLDER = /⟪[^⟫]*⟫/g
/**
 * Use the ledger gate's closure rule.
 */
const isClosedRow = (row: string) => isClosedCells(splitCells(row))
const META_OPEN = "<!-- wave-prompt-meta"
const META_CLOSE = "-->"

type Meta = {
  generatedAt: string
  slug: string
  head: string
  branch: string
  tscCrashClass: string[] | null
  tscCrashHits: number | null
  tscCount: number
  tscBaseline: number
  tscOk: boolean
  gates: number
  debtRows: number
  debtOpen: number
  nextNumber: number
  forced?: string[]
}

const sh = (cmd: string, cwd = ROOT) =>
  execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()

/**
 * Capture configured command output, including on nonzero exit.
 * Callers validate the required output shape and report configuration errors.
 */
function runConfigured(cmd: string): string {
  try { return execSync(cmd, { cwd: CODE, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }
  catch (e: unknown) { const err = e as { stdout?: string; stderr?: string }; return (err.stdout ?? "") + (err.stderr ?? "") }
}
function refuseShape(setting: string, cmd: string, expected: string, out: string): never {
  console.error(`\n⛔ CONFIG: could not read ${expected} out of \`${cmd}\` (run from \`${CODE_ROOT || "."}\`)`)
  const shown = out.split("\n").filter((l) => l.trim()).slice(0, 5)
  console.error(shown.length ? shown.map((l) => `   │ ${l.slice(0, 120)}`).join("\n") : "   │ (no output)")
  console.error(`   Set \`${setting}\` in the CONFIG block at the top of this file.`)
  console.error(`   The command output must satisfy the configured measurement contract.\n`)
  process.exit(2)
}

// ── The measurements ────────────────────────────────────────────────────────

/**
 * Count ledger rows using the parser shared with check-debt-ledger.ts.
 * That gate validates marker positions: ✅ starts the description or priority
 * cell for a closed row; ✔︎ is reserved for emphasis.
 */
function measureDebt() {
  requireConfigured(DEBT, "debt ledger", "DEBT_LEDGER")
  const rows = readFileSync(DEBT, "utf8").split("\n").filter(isDebtRow)
  const closed = rows.filter((r) => isClosedRow(r)).length
  return { rows: rows.length, open: rows.length - closed }
}

/**
 * Debt and decisions share one number range.
 * Read both documents and reject malformed identifiers before selecting a number.
 */
function nextNumber(): number {
  requireConfigured(DEBT, "debt ledger", "DEBT_LEDGER")
  requireConfigured(DECISIONS, "decision log", "DECISION_LOG")
  const nums: number[] = []
  const malformed: string[] = []
  for (const row of readFileSync(DEBT, "utf8").split("\n")) {
    if (!isDebtRow(row)) continue
    const identity = debtNumber(row)
    if (identity === null) malformed.push(row)
    else nums.push(Number.parseInt(identity, 10))
  }
  for (const row of readFileSync(DECISIONS, "utf8").split("\n")) {
    if (!/^#{1,6}\s+DEC\s*#/.test(row)) continue
    const m = /^## DEC #(\d+)(?=\s|$)/.exec(row)
    if (!m) malformed.push(row)
    else nums.push(Number(m[1]))
  }
  if (malformed.length) {
    console.error(`\n⛔ CONFIG: malformed numbered entry in \`${DEBT_LEDGER}\` or \`${DECISION_LOG}\``)
    malformed.slice(0, 3).forEach((row) => console.error(`   ${row}`))
    console.error("   Refusing to guess the next number from an incomplete range.\n")
    process.exit(2)
  }
  return nums.length ? Math.max(...nums) + 1 : 1
}

function measureTsc() {
  const out = runConfigured(TYPES_CMD)
  let j: { count?: unknown; baseline?: unknown; crashClass?: unknown; crashHits?: unknown; ok?: unknown; kind?: unknown; filesOverBudget?: unknown; configurationFiles?: unknown }
  try { j = JSON.parse(out.slice(out.indexOf("{"))) } catch { refuseShape("TYPES_CMD", TYPES_CMD, "a JSON object `{ count, baseline, ok }`", out) }
  if (!j || typeof j !== "object" || !Number.isInteger(j.count) || Number(j.count) < 0 || !Number.isInteger(j.baseline) || Number(j.baseline) < 0 || typeof j.ok !== "boolean")
    refuseShape("TYPES_CMD", TYPES_CMD, "non-negative integer `count` and `baseline`, and boolean `ok`", out)
  if (j.crashClass !== undefined && (!Array.isArray(j.crashClass) || !j.crashClass.every((c) => typeof c === "string" && c.length > 0)))
    refuseShape("TYPES_CMD", TYPES_CMD, "`crashClass` as a list of guarded codes", out)
  if (j.crashHits !== undefined && (!Number.isInteger(j.crashHits) || Number(j.crashHits) < 0))
    refuseShape("TYPES_CMD", TYPES_CMD, "a non-negative integer `crashHits`", out)
  if (j.configurationFiles !== undefined && (!Array.isArray(j.configurationFiles) || !j.configurationFiles.length || !j.configurationFiles.every((p) => typeof p === "string" && p.length > 0)))
    refuseShape("TYPES_CMD", TYPES_CMD, "a non-empty list of checker configuration paths", out)
  if (j.configurationFiles === undefined)
    console.warn("⚠️ checker configuration provenance not measured: TYPES_CMD does not report configurationFiles")
  const crashClass = Array.isArray(j.crashClass) && j.crashClass.length ? j.crashClass as string[] : null
  const crashHits = typeof j.crashHits === "number" ? j.crashHits : null
  if (j.ok && (Number(j.count) > Number(j.baseline) || (crashHits !== null && crashHits > 0) || (Array.isArray(j.filesOverBudget) && j.filesOverBudget.length)))
    refuseShape("TYPES_CMD", TYPES_CMD, "an `ok` verdict consistent with its counts and file budgets", out)
  return { configurationFiles: (j.configurationFiles ?? []) as string[], count: Number(j.count), baseline: Number(j.baseline), crashClass, crashHits, ok: j.ok,
    kind: typeof j.kind === "string" ? j.kind : null,
    filesOverBudget: Array.isArray(j.filesOverBudget) ? j.filesOverBudget.map(String) : [] }
}

function measureGates(): number {
  const out = runConfigured(GATES_CMD)
  const m = out.match(GATES_COUNT_RE)
  if (!m) refuseShape("GATES_COUNT_RE or GATES_CMD", GATES_CMD, `a gate count matching \`${GATES_COUNT_RE}\``, out)
  return +m[1]
}

/**
 * Tracked modifications and untracked measurement inputs block generation.
 * Other untracked files produce a warning. MEASURED_EXT and MEASURED_FILE
 * must describe the project's measurement inputs.
 */
const gitPath = (path: string) => relative(ROOT, path).split(sep).join("/")
const esc = (p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const MEASURED_FILE = new RegExp(`^(${[DEBT_LEDGER, DECISION_LOG, BASELINE_FILE, gitPath(join(CODE, "package.json"))].map(esc).join("|")})$`)

function measureGit(configurationFiles: string[]) {
  // Measurement requires a committed HEAD; an empty repository exits 2.
  try { execSync("git rev-parse --verify HEAD", { cwd: ROOT, stdio: "ignore" }) }
  catch {
    console.error(`\n⛔ CONFIG: this repository has no commit yet (${ROOT})`)
    console.error(`   Every number here is measured at a commit. Make the first commit, then generate.\n`)
    process.exit(2)
  }
  const head = sh("git rev-parse --short HEAD")
  const branch = sh("git rev-parse --abbrev-ref HEAD")
  // Preserve porcelain status whitespace and NUL-delimited paths.
  // Do not trim the output before parsing.
  const entries = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: ROOT, encoding: "utf8" }).split("\0")
  const measuredConfiguration = new Set(configurationFiles.map((p) => gitPath(resolve(CODE, p))))
  const tracked: string[] = []
  const untrackedMeasured: string[] = []
  const untrackedInert: string[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry) continue
    const status = entry.slice(0, 2), path = entry.slice(3)
    if (status === "??") {
      if (MEASURED_EXT.test(path) || MEASURED_FILE.test(path) || measuredConfiguration.has(path)) untrackedMeasured.push(path)
      else untrackedInert.push(path)
    } else tracked.push(path)
    if (/[RC]/.test(status)) i++ // porcelain -z carries the source path after a rename/copy
  }
  // Compare with HEAD even when Git status hides a path. Accept EOL-only
  // differences only when Git hashes the current bytes to the committed blob.
  // Other clean-filter transformations cannot certify checker configuration.
  const configurationProblems: string[] = []
  for (const input of configurationFiles) {
    const path = resolve(CODE, input)
    try {
      for (const actual of new Set([path, realpathSync(path)])) {
        const rel = gitPath(actual)
        if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) throw new Error("outside repository")
        // Require a regular file in both HEAD and the worktree, not a symlink.
        const entry = execFileSync("git", ["--literal-pathspecs", "ls-tree", "-z", "HEAD", "--", rel], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
        const blob = /^(?:100644|100755) blob ([0-9a-f]+)\t([^\0]+)\0$/.exec(entry)
        if (!blob || blob[2] !== rel || !lstatSync(actual).isFile()) throw new Error("not a committed regular file")
        const bytes = execFileSync("git", ["cat-file", "blob", blob[1]], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] })
        const current = readFileSync(actual)
        if (!bytes.equals(current)) {
          const oid = execFileSync("git", ["hash-object", `--path=${rel}`, "--stdin"], { cwd: ROOT, input: current, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim()
          // latin1 preserves every byte; only CRLF pairs are normalized here.
          if (oid !== blob[1] || bytes.toString("latin1").replace(/\r\n/g, "\n") !== current.toString("latin1").replace(/\r\n/g, "\n"))
            throw new Error("differs from HEAD")
        }
      }
    } catch { configurationProblems.push(input) }
  }
  // Distinguish missing remote, missing upstream, divergence and unreadable remote.
  // Compare HEAD with the advertised remote ref.
  let hasRemote = false
  try { hasRemote = sh("git remote").length > 0 } catch { hasRemote = false }
  let sync: "in-sync" | "diverged" | "no-upstream" | "no-remote" | "remote-unreadable"
  let upstream = ""
  try {
    upstream = sh("git rev-parse --abbrev-ref @{u}")
    const remote = execFileSync("git", ["config", "--get", `branch.${branch}.remote`], { cwd: ROOT, encoding: "utf8" }).trim()
    const ref = execFileSync("git", ["config", "--get", `branch.${branch}.merge`], { cwd: ROOT, encoding: "utf8" }).trim()
    try {
      const advertised = execFileSync("git", ["ls-remote", "--exit-code", "--heads", remote, ref], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim().split(/\s+/)[0]
      sync = sh("git rev-parse HEAD") === advertised ? "in-sync" : "diverged"
    } catch { sync = "remote-unreadable" }
  } catch { sync = hasRemote ? "no-upstream" : "no-remote" }
  return { configurationProblems, head, branch, tracked, untrackedMeasured, untrackedInert, sync, upstream }
}

function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ── The template ────────────────────────────────────────────────────────────

const shellQuote = (s: string) => "'" + s.replace(/'/g, "'\\''") + "'"
const nextNumberCommand = () => `node --import tsx ${shellQuote(relative(ROOT, join(HERE, "wave-prompt.ts")))} --next-number`

function measuredTable(m: Meta): string {
  const crash = m.tscCrashClass && m.tscCrashHits !== null
    ? `crash class **${m.tscCrashHits === 0 ? "zero" : m.tscCrashHits}** (${m.tscCrashClass.length} guarded codes)`
    : "crash class **not measured**"

  return `| Measurement | Value | Verification command |
|---|---|---|
| \`${m.branch}\` HEAD | \`${m.head}\` | \`git rev-parse --short HEAD\` |
| Type errors / ceiling | **${m.tscCount} / ${m.tscBaseline}** · ${m.tscOk ? crash : `🔴 **not clean**: generated with --force · ${crash}`} | \`${TYPES_CMD}\` (from \`${CODE_ROOT || "."}\`) |
| Live gates | **${m.gates}** | \`${GATES_CMD}\` (from \`${CODE_ROOT || "."}\`) |
| Debt rows | **${m.debtRows}** · open **${m.debtOpen}** | \`${RUN_GUARD} lint:debt-ledger:strict\` (from \`${CODE_ROOT || "."}\`) |
| **Your numbers start at** | **#${m.nextNumber}** | \`${nextNumberCommand()}\` (from the repository root; prints the next free number) |`
}

function template(m: Meta, title: string): string {
  const forced = m.forced?.length
    ? `\n> 🔴 **This prompt was generated with \`--force\` despite**: ${m.forced.join(" · ")}. **The numbers below may not describe what the executor will see**: verify before issuing.\n`
    : ""

  return `${META_OPEN}
${JSON.stringify(m, null, 2)}
${META_CLOSE}

# Wave ${title}: Executor instructions

Your goal: ⟪TODO: the wave's goal in one sentence⟫

Address reliability, security, performance and accessibility within the defined scope.

**Mode:** resolve routine implementation choices within scope and document them. Commit after each batch. Report at the stop gate below when complete, or earlier if an Owner decision blocks progress.

> ⚠️ **Naming conventions in this project**: ⟪TODO: the visible project name, live domain if applicable, and exact path, container and database identifiers required by this task⟫. Use exact identifiers in commands and the current project name in text for the Owner.
${forced}
---

## Step 0: Read first (in this order, mandatory)

⟪TODO: list the required documents and files in reading order⟫

**Required project files:** ${FIXED_READS}.

**Required code reading:** ⟪TODO: the code files by name⟫

---

## Step 1: Owner decisions ⛔ do not reopen them

⟪TODO: the owner's decisions in their own words, numbered⟫

### ⛔ Out of scope by owner decision
⟪TODO: list each item the Owner has ruled out, one per line⟫

---

## Step 2: Repository measurements (measured **${m.generatedAt}**; verify before implementation)

> Rerun each measurement. Use the current result and report any difference from this prompt.

${measuredTable(m)}

> Debt and decisions share one number range across \`${DECISION_LOG}\` and \`${DEBT_LEDGER}\`.

### Task-specific measurements
⟪TODO: every number the conductor measured for this wave, each with its command and the environment it was measured in⟫

---

## Step 3: 🟢 What already works (⛔ **do not rebuild it**)

> Preserve and reuse these existing capabilities.

⟪TODO: name the existing capabilities this task relies on and record their check results⟫

---

## Step 4: The scope

### ✅ In scope
⟪TODO: what is explicitly delivered, including affected screens and visual outputs and indirect effects from shared components or styles⟫

### ⛔ Out of scope: debt and deferred work
⟪TODO: list debt identifiers and deferred work, including each deferral's record and condition for reconsideration⟫

---

## Step 5: Batch order

⟪TODO: logical batches in order, with one commit per batch⟫

**Verification plan:** ⟪TODO: targeted checks per batch; final required suites and who runs them; what the enforcing hook covers; affected guards and mutation cases; named visual evidence; the Conductor's independent checks⟫

**Helper assignments:** ⟪TODO: name each bounded helper task and its files, or state none; identify restricted parts, question routing and how you will review every changed line⟫

Helpers may implement UI components and presentation, printing and exports, user-facing text, and ordinary behavior tests. Everything outside this closed allowlist stays with the Executor unless the Owner expands it by name.

Restrictions take precedence: helpers must not implement money handling, any AI or paid-provider call, personal or sensitive data handling or isolation, schema changes or migrations, permissions or access decisions, security checks, governance gates, verification tools, enforcing hooks or mutations that prove guards. Classify the behavior, not the filename. Separate mixed work; if it cannot be separated, implement it yourself.

Review every helper change and record its scope and decisions. A helper pauses work that depends on an unapproved decision and raises the question with you; resolve it within your authority or ask the Owner. Helper work does not replace the Conductor's independent review.

For background work, use completion notifications when supported, with a completion or stall deadline. Use bounded status checks if the notification is unavailable, late or lost. Keep the Owner informed and respect dependencies before starting follow-up work.

---

## Step 6: Hard constraints (fixed)

| | |
|---|---|
| **Language** | ⟪TODO: specify the language and tone for user-facing text and reports to the Owner⟫ |
| **Numbers** | Every measurement includes its command and environment. Remeasure in the target environment; do not reuse a result from another environment. |
| **Limits** | Every operational limit must be configurable at runtime. Do not hard-code it in the source. Name the gate that enforces it: ⟪TODO: your operational-limits gate⟫ |
| **Isolation** | ⟪TODO: your data-access rule: which layer alone may reach the database, and what every function that reads a user's data takes as its first argument⟫ |
| **Money** | ⟪TODO: your single conversion point from raw cost to a charged amount, and the one module a monetary constant may live in⟫ |
| **The guard** | Prove new, modified or affected guards with targeted mutations, including effects through runners, configuration, discovery, fixtures, dependencies or protected code. Confirm the intended assertion fails and then passes after restoration. Include missing behavior and incorrect values where relevant, as specified in Section 9. Do not replay every historical mutation automatically; preserve the Conductor's different mutation. |
| **Checks** | Run targeted checks during work and complete required suites on the final commit using existing acceptance criteria. If the enforcing hook runs those suites, do not duplicate its successful run manually. Run missing suites explicitly. Run the verifier once per unchanged verification stage; fixes, changed inputs, incomplete evidence or a specific review concern require affected checks again. |
| **Evidence** | Record each result's command, commit, tree, environment, inputs, scope, acceptance criteria and complete output. Reuse between hook attempts requires a reviewed integration that verifies eligibility and inputs. The optional run-checks.mjs tool is disabled by default; copying it does not establish eligibility. An older success cannot override a later failed or unfinished check, even if reuse was disabled then. Keep gates blocking and never bypass them with git push --no-verify. |
| **Visual evidence** | Capture named affected surfaces, including shared-component effects. Add newly discovered impacts with a reason. Do not claim the hook covers unmeasured behavior. |
| **\`${TYPE_LABEL}\`** | Does not exceed **${m.tscCount}** · and the crash class is **zero** |
| **The tree** | Clean at handover. ⛔ No leftover temporary scripts |
| **Pushing** | Confirm required hook services are available. After a failure, collect independently measurable blockers before retrying; do not run stages with failed prerequisites. An out-of-memory event or timeout alone does not prove an environmental cause. Follow the hook's implemented behavior and keep governance gates blocking. |

---

## Step 7: Exit gates

| # | Item | ✅ |
|---|---|---|
| 1 | \`${TYPE_LABEL}\` ≤ **${m.tscCount}** and the crash class is zero | ☐ |
| 2 | Keep the **${m.gates}** inherited gates, run new, changed and affected checks, and report the final gate count | ☐ |
| 3 | No regressions in existing behavior | ☐ |
| 4 | Incremental commits: one per batch | ☐ |
| 5 | The tree is clean and the branch is pushed | ☐ |
| 6 | Required suites meet the acceptance criteria on the final commit; evidence and reasons for any reruns are recorded | ☐ |
| 7 | New, modified or affected guards have targeted mutation evidence and pass after restoration | ☐ |
| 8 | Named visual evidence is complete, with newly identified impacts and unmeasured behavior reported | ☐ |
| 9 | Helper work follows the allowlist and restrictions; every changed line was reviewed and decisions recorded | ☐ |
| ⟪…⟫ | ⟪TODO: this wave's specific gates, the behavior each guard checks, and the deliberate fault it must detect⟫ | ☐ |

---

## Step 8: Closing and handover

1. **The branch** \`⟪TODO: the branch name⟫\`: a commit per batch, then push it.
2. The Conductor merges to \`main\` and writes \`${DECISION_LOG}\` at merge time. Include proposed decisions in your report.
3. **Debt rows**: mark what was actually delivered closed with evidence; the Conductor checks and confirms closure at merge. Record new debt **starting at #${m.nextNumber}**. Deliberate deferrals go in their own file with a trigger.
4. **A structured final report** covering:
   - every number in Step 2 you re-measured: **matched / differed (with the new value)**
   - what was delivered · and what was not and why
   - new, modified or affected guards, why each was selected, the fault detected and the passing result after restoration
   - for existing guards considered in this task, what changed or why no repeated mutation was needed; group guards with the same reason
   - check commands, commit, environment, scope, complete output and reasons for any necessary reruns
   - named visual evidence and limits; helper assignments, decisions and your review of their changes
   - **what I could not measure and why** (required)
   - the cost of any AI call as a number · and the branch name and commit hash

---

## 🛑 The single stop gate

**Sensitivity rating: ⟪TODO: 🔴 high / 🟡 medium / 🟢 low⟫**: use the higher class when uncertain.

**After completing the required work and pushing the branch, deliver the full Step 8 report with its evidence. End the report with this status summary:**

\`\`\`
🛑 Wave ${title} is ready.
   Branch: ⟪TODO⟫   Commit: <hash>
   Report and evidence: <path or link to the complete Step 8 report and supporting output>
   Delivered: <a two-item summary>
   Measurements changed since task preparation: <the list or "none">
   Guard + mutation: <protected behavior · fault introduced · failure and restoration results>
   What I could not measure: <the list>
   AI call cost: <the number> <the currency>
   ⇒ For the owner: <one line in simple language; for medium sensitivity, include your recommendation on when to ship>
\`\`\`

**Then stop.** If a remaining step requires a decision outside your authority, commit the work so far, report the blocker and mark the wave incomplete. ⛔ Do not merge · do not start a next wave.
`
}

// ── Mode ①: generate ────────────────────────────────────────────────────────

function measurementBlockers(git: ReturnType<typeof measureGit>, tsc: ReturnType<typeof measureTsc>): string[] {
  const blockers: string[] = []
  if (git.configurationProblems.length)
    blockers.push(`checker configuration not committed: ${git.configurationProblems.join(" · ")}`)
  if (git.tracked.length)
    blockers.push(`${git.tracked.length} modified tracked file(s) (${git.tracked.slice(0, 3).join(" · ")}${git.tracked.length > 3 ? " …" : ""})`)
  if (git.untrackedMeasured.length)
    blockers.push(`${git.untrackedMeasured.length} untracked file(s) that **enter the measurement** (${git.untrackedMeasured.slice(0, 3).join(" · ")})`)
  if (git.sync === "no-remote")
    blockers.push(`this repository has no remote: the Executor cannot start from a remote HEAD (\`git remote add origin <url> && git push -u origin ${git.branch}\`)`)
  else if (git.sync === "no-upstream")
    blockers.push(`\`${git.branch}\` has no upstream branch, so it was never compared (\`git push -u origin ${git.branch}\`)`)
  else if (git.sync === "diverged")
    blockers.push(`\`${git.branch}\` differs from the advertised remote branch \`${git.upstream}\`: reconcile the branch before generating`)
  else if (git.sync === "remote-unreadable")
    blockers.push(`the remote branch \`${git.upstream}\` could not be read: verify connectivity and that the branch exists`)
  // A failed type verdict blocks generation. Report the supplied failure category.
  if (!tsc.ok)
    blockers.push(tsc.kind === "file-ratchet"
      ? `the per-file type ratchet failed (${tsc.filesOverBudget.join(" · ") || "a file exceeded its budget"})`
      : tsc.kind === "crash-class" || tsc.count <= tsc.baseline
      ? `the type check is not clean: a crash-class code, or a failure the command reported${tsc.kind ? ` (${tsc.kind})` : ""}`
      : `the type count is above the ceiling (${tsc.count}/${tsc.baseline})`)

  return blockers
}

function cmdNew(slug: string, title: string, force: boolean, overwrite: boolean) {
  requireConfigured(CODE, "code root", "CODE_ROOT")
  const tsc = measureTsc()
  const git = measureGit(tsc.configurationFiles)
  const blockers = measurementBlockers(git, tsc)

  if (blockers.length && !force) {
    console.error("\n⛔ **Prompt generation blocked:**")
    blockers.forEach((b) => console.error(`   🔴 ${b}`))
    console.error("\n   Resolve the blockers and retry. `--force` records them in a generated prompt.\n")
    process.exit(1)
  }

  if (git.untrackedInert.length)
    console.log(`\n⚠️ ${git.untrackedInert.length} untracked file(s) outside configured measurement inputs: not blocking (${git.untrackedInert.slice(0, 3).join(" · ")}${git.untrackedInert.length > 3 ? " …" : ""})`)

  const debt = measureDebt()
  const meta: Meta = {
    generatedAt: today(), slug,
    head: git.head, branch: git.branch, tscCrashClass: tsc.crashClass, tscCrashHits: tsc.crashHits,
    tscCount: tsc.count, tscBaseline: tsc.baseline, tscOk: tsc.ok,
    gates: measureGates(),
    debtRows: debt.rows, debtOpen: debt.open,
    nextNumber: nextNumber(),
    ...(blockers.length ? { forced: blockers } : {}),
  }

  const file = join(ROOT, `WAVE_PROMPT_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}.md`)
  if (existsSync(file) && !overwrite) {
    console.error(`\n⛔ Already exists: ${file}\n   Delete it, or pass \`--overwrite\` (the old file is kept as .bak). \`--force\` does not do this.\n`)
    process.exit(1)
  }
  if (existsSync(file)) {
    writeFileSync(`${file}.bak`, readFileSync(file, "utf8"), "utf8")
    console.log(`\n⚠️ Overwriting ${file}: the previous prompt is kept at ${file}.bak`)
  }
  const body = template(meta, title)
  writeFileSync(file, body, "utf8")

  const gaps = body.match(PLACEHOLDER)?.length ?? 0
  console.log(`\n✅ ${file}`)
  console.log(`   Measured: HEAD \`${meta.head}\` · types ${meta.tscCount}/${meta.tscBaseline} · gates ${meta.gates} · debt ${meta.debtRows}/${meta.debtOpen} open · your numbers from #${meta.nextNumber}`)
  console.log(`   🔴 **${gaps} ⟪…⟫ gap(s) for the Conductor to complete**: fill them all, then:`)
  console.log(`      npm run wave:check -- "${file}"\n`)
}

// ── Mode ②: freshness check ─────────────────────────────────────────────────

function cmdCheck(file: string) {
  const abs = resolve(file)
  if (!existsSync(abs)) { console.error(`⛔ CONFIG: not found: ${abs}`); process.exit(2) }
  const body = readFileSync(abs, "utf8")

  const i = body.indexOf(META_OPEN)
  if (i < 0) { console.error("⛔ CONFIG: no `wave-prompt-meta` block: this is not a generated prompt."); process.exit(2) }
  const j = body.indexOf(META_CLOSE, i)
  let old: Meta
  try {
    if (j < 0) throw new Error("missing closing marker")
    old = JSON.parse(body.slice(i + META_OPEN.length, j)) as Meta
    if (!old || typeof old !== "object" || typeof old.slug !== "string") throw new Error("missing slug")
  } catch {
    console.error("⛔ CONFIG: malformed wave-prompt metadata: use a generated prompt.")
    process.exit(2)
  }

  requireConfigured(CODE, "code root", "CODE_ROOT")
  const tsc = measureTsc(), git = measureGit(tsc.configurationFiles), debt = measureDebt()
  const now = { head: git.head, branch: git.branch, tscCrashClass: tsc.crashClass, tscCrashHits: tsc.crashHits, tscCount: tsc.count, tscBaseline: tsc.baseline, tscOk: tsc.ok, gates: measureGates(), debtRows: debt.rows, debtOpen: debt.open, nextNumber: nextNumber() }

  const labels: Record<string, string> = {
    head: "branch HEAD", branch: "branch", tscCrashClass: "guarded crash codes", tscCrashHits: "crash-class hits", tscCount: "type errors", tscBaseline: "the ceiling", tscOk: "type check clean",
    gates: "the gates", debtRows: "debt rows", debtOpen: "open", nextNumber: "next number",
  }
  const drift = (Object.keys(now) as (keyof typeof now)[])
    .filter((k) => String(now[k]) !== String((old as never)[k]))
    .map((k) => `${labels[k]}: ${(old as never)[k]} ⇒ **${now[k]}**`)

  const gaps = body.match(PLACEHOLDER) ?? []
  console.log(`\n🎼 Wave prompt check: ${old.slug}`)
  console.log(`   Generated: ${old.generatedAt}   Today: ${today()}`)
  if (old.forced?.length) console.log(`   ⚠️ Generated with --force despite: ${old.forced.join(" · ")}`)

  let bad = false
  const blockers = measurementBlockers(git, tsc)
  if (blockers.length) {
    bad = true
    console.log("\n🔴 The current repository state is not ready:")
    blockers.forEach((reason) => console.log(`   • ${reason}`))
  }
  const section = body.split(/^## Step 2(?: \u2014|:) (?:Repository measurements|The measured ground).*$/m)[1]?.split(/^### (?:Task-specific measurements|The wave's own numbers)/m)[0]
  const actualTable = section?.match(/^\| Measurement \| Value \| Verification command \|\n\|---\|---\|---\|\n(?:\|[^\n]*\n){5}/m)?.[0].trim()
  if (actualTable !== measuredTable({ ...old, ...now }).trim()) {
    bad = true
    console.log("\n🔴 The visible measured table differs from the current measurement. Regenerate the prompt with the original --slug and --overwrite, then complete its task sections again.")
  }
  if (gaps.length) {
    bad = true
    console.log(`\n🔴 **${gaps.length} gap(s) left unfilled**: complete the required task content:`)
    gaps.slice(0, 12).forEach((g) => console.log(`   ⟪ ${g.slice(1, -1).slice(0, 88)}`))
    if (gaps.length > 12) console.log(`   … and ${gaps.length - 12} more`)
  } else console.log(`\n✅ Zero gaps`)

  if (drift.length) {
    bad = true
    console.log(`\n🔴 **${drift.length} number(s) drifted since generation**:`)
    drift.forEach((d) => console.log(`   • ${d}`))
    console.log(`   ⇒ Regenerate the prompt with its original --slug and --overwrite, then complete the task sections again.`)
  } else console.log(`✅ Every recorded measurement matches the current result`)

  if (git.tracked.length || git.untrackedMeasured.length) {
    bad = true
    console.log(`\n🔴 Uncommitted measurement inputs: review and commit the listed changes, or restore deliberate test changes, before generating a new prompt`)
    ;[...git.tracked, ...git.untrackedMeasured].slice(0, 6).forEach((f) => console.log(`   • ${f}`))
  } else if (git.untrackedInert.length) {
    console.log(`\n⚠️ ${git.untrackedInert.length} untracked file(s) outside configured measurement inputs: not blocking`)
  }

  console.log(bad ? `\n⛔ **Not ready to issue.**\n` : `\n✅ **Ready to issue.**\n`)
  process.exit(bad ? 1 : 0)
}

// ── main ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const arg = (n: string) => argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=")
const force = argv.includes("--force")
const overwrite = argv.includes("--overwrite")

if (argv.includes("--next-number")) {
  console.log(nextNumber())
} else if (argv.includes("--check")) {
  const f = argv[argv.indexOf("--check") + 1] ?? arg("check")
  if (!f) { console.error("Usage: --check <file>"); process.exit(2) }
  cmdCheck(f)
} else if (argv.includes("--new")) {
  const slug = arg("slug")
  if (!slug) { console.error("Usage: --new --slug=<slug> [--title=\"…\"]"); process.exit(2) }
  cmdNew(slug, arg("title") ?? slug, force, overwrite)
} else {
  console.log(`
🎼 The wave-prompt generator and its freshness checker

  npm run wave:new   -- --slug=w1-first-wave --title="W1: The First Wave"
  npm run wave:check -- WAVE_PROMPT_W1_FIRST_WAVE.md

  --force      generates despite measurement blockers and records them in the prompt; --check still reports unresolved blockers
  --overwrite  replaces an existing prompt file and saves the previous content as .bak
`)
}

export { PLACEHOLDER, measureDebt, nextNumber }
