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
const TYPES_CMD = "node --import tsx scripts/conductor/check-types-baseline.ts --json"

/**
 * Gate-count command, run from CODE_ROOT.
 * GATES_COUNT_RE must capture its reported count in group 1.
 */
const GATES_CMD = "node --import tsx scripts/conductor/count-gates.ts"
const GATES_COUNT_RE = /\((\d+)\s+(?:registered guard commands|live gates)/

/**
 * The files every wave prompt tells the Executor to read first, in order.
 * Section 6 of the document explains what each one answers.
 */
const FIXED_READS = "⟪TODO: authoritative project rules, definition of done and relevant lessons⟫"

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
/** Optional root-relative files with one mawja:rules:start/end block each. */
const RULE_SOURCES: readonly string[] = []
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
| Registered guard commands | **${m.gates}** | \`${GATES_CMD}\` (from \`${CODE_ROOT || "."}\`) |
| Debt rows | **${m.debtRows}** · open **${m.debtOpen}** | \`${RUN_GUARD} lint:debt-ledger:strict\` (from \`${CODE_ROOT || "."}\`) |
| **Next available identifier** | **#${m.nextNumber}** | \`${nextNumberCommand()}\` (from the repository root; prints the next free number) |`
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

Address maintainability, reliability, security, performance and accessibility within the defined scope.

**Mode:** resolve routine implementation choices within scope and document them. Commit after each batch. Report at the stop gate below when complete, or earlier if an unapproved decision or a structural conflict blocks progress. A question asking for advice is not authorization to change files; continue actions already authorized within their scope.

> ⚠️ **Naming conventions in this project**: ⟪TODO: the visible project name, live domain if applicable, and exact path, container and database identifiers required by this task⟫. Use exact identifiers in commands and the current project name in text for the Owner.
${forced}
---

## Step 0: Read first (in this order, mandatory)

⟪TODO: list the required documents and files in reading order⟫

**Required project files:** ${FIXED_READS}.

**Required code reading:** ⟪TODO: the code files by name, or Not applicable with a reason for documentation-only work⟫

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

**Reserved identifiers:** ⟪TODO: closed range assigned to this wave and its corrections, or None needed; identify separate Conductor reservations⟫. The measured next number is not a reservation. Stop before exceeding the assigned range.

### Task-specific measurements
⟪TODO: every number the conductor measured for this wave, each with its command and the environment it was measured in⟫

---

## Step 3: 🟢 What already works (⛔ **do not rebuild it**)

> Preserve and reuse these existing capabilities. For consolidation or replacement, record the capabilities of each source, the required union and evidence for retained behavior; removals need an accepted scope decision.

⟪TODO: name the existing capabilities this task relies on and record their check results⟫

---

## Step 4: The scope

### ✅ In scope
⟪TODO: what is explicitly delivered, including affected screens and visual outputs and indirect effects from shared components or styles⟫

### ⛔ Out of scope: debt and deferred work
⟪TODO: list debt identifiers and deferred work, including each deferral's record and condition for reconsideration⟫

---

### Ownership and acceptance

**Owned files and frozen interfaces:** ⟪TODO: permitted files/modules, stable interfaces and accepted limitations⟫
**Correction contract:** ⟪TODO: for a correction, the closed finding list, negative cases, valid controls and acceptable conservative rejection; otherwise Not applicable⟫
**Preparatory refactoring:** ⟪TODO: authorized extraction and preservation tests, a separate preparatory task, or None needed⟫
**Design note:** ⟪TODO: for significant code changes, entry points, authoritative state owners, transitions and impossible states; otherwise Not applicable with reason⟫

## Step 5: Batch order

⟪TODO: logical batches in order, with one commit per batch⟫

### Build quality

For code changes, read existing public interfaces before adding a function. Reuse a rule with the same responsibility; keep unrelated behavior separate. Keep one authoritative owner per fact and justify any derived cache's consistency contract. Separate behavior-preserving refactoring from behavior changes in distinct commits with preservation evidence. Find all affected consumers and fix policy at its shared boundary. Preserve existing capabilities and edge cases when consolidating implementations. Prefer tests through public entry points. Report the relevant structure delta for significant changes. You own implementation quality; stop and report if scope would force a fragile workaround. For documentation-only work, record why this section is not applicable.

${renderProjectRules()}

**Verification plan:** ⟪TODO: classify the actual change; name documentation-only checks or critical and change-specific branch checks; required mutations and visual evidence; full-suite command and responsible role for code integration into main; the Conductor's independent checks; give a concrete sensitivity reason for any extra full suite on the Executor branch, or state none⟫

| Scope or stage | Required checks |
|---|---|
| Documentation only | Documentation checks and consistency review, including changed links, instructions and diagrams; also applies to a documentation-only merge |
| Executor's code branch | The project's critical checks, tests for changed and affected behavior, and required targeted mutations |
| Code integration into main | The full project suite on the exact integrated revision before publication or deployment; the Conductor confirms the evidence |

Run targeted checks during each batch. An extra full suite on the Executor branch needs a concrete sensitivity reason naming the risk and why targeted checks are insufficient. A branch full run does not remove the full check at code integration into main. After a fix, rerun affected checks and dependencies; for code integration, establish full-suite evidence for the corrected integrated revision before publication.

**Command preflight:** ⟪TODO: pinned comparison-base commit; commands with working directories, prerequisites and safe validation results; list actions that must await authorization⟫

**Delivery mode:** ⟪TODO: remote branch delivery, or Owner-authorized local handoff with decision, planned durable branch/bundle path, required checksum/commit evidence at delivery and declared loss exposure⟫

**Independent review:** ⟪TODO: reviewer, actual diff and failure cases to challenge, structure review and evidence; an author cannot independently approve their own change⟫

**Hook support:** ⟪TODO: record the effective hook's actual routes, commands and evidence; name missing capabilities and their maintenance record, or state none; distinguish currently mandatory extra checks from sensitivity-driven checks⟫

The schedule does not change installed enforcement. For a branch push, keep the installed hook requirements until reviewed routing maintenance is complete. An explicitly authorized local handoff performs no push; report its unrun hook and retained checks honestly. Code integration into main still requires the full suite. Run uncovered required checks explicitly. Do not disable or skip the hook to imitate a missing route. The supplied generator, prompt checker and branch verifier still run their configured type measurements, including for documentation tasks; the optional check runner does not select stages.

**Helper assignments:** ⟪TODO: name each bounded helper task and its files, or state none; identify restricted parts, question routing and how you will review every changed line⟫

Helpers may implement UI components and presentation, printing and exports, user-facing text, and ordinary behavior tests. Everything outside this closed allowlist stays with the Executor unless the Owner expands it by name.

Restrictions take precedence: helpers must not implement money handling, any AI or paid-provider call, personal or sensitive data handling or isolation, schema changes or migrations, permissions or access decisions, security checks, governance gates, verification tools, enforcing hooks or mutations that prove guards. Classify the behavior, not the filename. Separate mixed work; if it cannot be separated, implement it yourself.

Review every helper change and record its scope and decisions. A helper pauses work that depends on an unapproved decision and raises the question with you; resolve it within your authority or ask the Owner. Helper work does not replace the Conductor's independent review.

For background work, use completion notifications when supported, with a completion or stall deadline. Use bounded status checks if the notification is unavailable, late or lost. Keep the Owner informed and respect dependencies before starting follow-up work.

---

## Step 6: Hard constraints (fixed)

For documentation-only work that does not change executable behavior, record code-specific constraints, mutation gates and mutation report fields as Not applicable with a reason. Keep content, link and consistency checks, independent Conductor review, and measurements required by installed tools. Changes to executable examples, configuration or check behavior are not documentation-only.

| | |
|---|---|
| **Language** | ⟪TODO: specify the language and tone for user-facing text and reports to the Owner⟫ |
| **Numbers** | Every current measurement includes its command, filter, date and environment. Confirm a positive control for absence claims; label historical evidence and unmeasured values explicitly. |
| **Limits** | Every operational limit must be configurable at runtime. Do not hard-code it in the source. Name the gate that enforces it: ⟪TODO: your operational-limits gate⟫ |
| **Isolation** | ⟪TODO: your data-access rule: which layer alone may reach the database, and what every function that reads a user's data takes as its first argument⟫ |
| **Money** | ⟪TODO: your single conversion point from raw cost to a charged amount, and the one module a monetary constant may live in⟫ |
| **Security** | ⟪TODO: access boundaries, ordinary-user and denied-user cases, sensitive outputs and named security checks; or Not applicable with reason⟫ |
| **Environment** | ⟪TODO: owned workspace/dependencies, database, queue, accounts, ports, network restrictions and short readiness probes; or Not applicable⟫. Do not borrow or stop the Owner's live resources without authorization. Serialize heavy checks on shared resources; keep required services through final delivery. |
| **Data** | Use synthetic, queryably marked records and clean only this run's data. Restore measured prior settings. Dry-run data corrections; destructive changes require the applicable approval and recovery plan. |
| **Release** | ⟪TODO: build, deployment notes, target revision/environment, authorization scope, external checks and rollback; or Not applicable⟫. Accepted, merged, pushed and deployed are separate states. |
| **The guard** | Prove new, modified or affected guards with targeted mutations, including effects through runners, configuration, discovery, fixtures, dependencies or protected code. Confirm the intended assertion fails and then passes after restoration. Include missing behavior and incorrect values where relevant, as specified in Section 9. Do not replay every historical mutation automatically; preserve the Conductor's different mutation for code review. For documentation-only work, record Not applicable and the reason. |
| **Checks** | Follow the Step 5 schedule: documentation and consistency checks for documentation-only work; critical checks, change-specific tests and required mutations on the Executor branch; the full suite at code integration into main before publication. Extra branch full runs need a concrete sensitivity reason, unless current enforcement still requires them pending maintenance. Do not duplicate an identical successful hook run manually. Run the verifier once per unchanged verification stage. Fixes, changed inputs, incomplete evidence or a specific review concern require affected checks and dependencies again. Keep existing acceptance criteria. |
| **Evidence** | Record each result's command, working directory, commit, tree, environment identity, inputs, scope, acceptance criteria and complete output in a unique durable location; redact secrets and do not overwrite receipts. Reuse between hook attempts requires a reviewed integration that verifies eligibility and inputs. The optional run-checks.mjs tool is disabled by default; copying it does not establish eligibility. An older success cannot override a later failed or unfinished check, even if reuse was disabled then. Keep gates blocking and never bypass them with git push --no-verify. |
| **Visual evidence** | Capture named affected surfaces, including shared-component effects. Add newly discovered impacts with a reason. Do not claim the hook covers unmeasured behavior. |
| **\`${TYPE_LABEL}\`** | For code and any type measurement required by installed tools: does not exceed **${m.tscCount}** · and the crash class is **zero** |
| **The tree** | Clean at handover. ⛔ No leftover temporary scripts |
| **Pushing** | Confirm required hook services are available. After a failure, collect independently measurable blockers before retrying; do not run stages with failed prerequisites. An out-of-memory event or timeout alone does not prove an environmental cause. Follow the hook's implemented behavior and keep governance gates blocking. |

---

## Step 7: Exit gates

| # | Item | ✅ |
|---|---|---|
| 1 | Any required type measurement: \`${TYPE_LABEL}\` ≤ **${m.tscCount}** and the crash class is zero; retain measurements required by installed tools | ☐ |
| 2 | Account for the **${m.gates}** registered guard commands, run applicable checks and report additions or reviewed retirements; registration does not prove execution | ☐ |
| 3 | No regressions in existing behavior | ☐ |
| 4 | Incremental commits: one per batch | ☐ |
| 5 | The tree is clean and the selected delivery mode is complete: remote head verified, or local bundle verified with checksum and commit | ☐ |
| 6 | Documentation-only or code-branch checks meet the criteria on the final Executor commit; record evidence, any extra full-run reason, hook limitations and required reruns. For code, the main full-suite obligation is assigned, not claimed completed here; for documentation-only work, record it as not applicable | ☐ |
| 7 | New, modified or affected guards have targeted mutation evidence and pass after restoration; for documentation-only work, record Not applicable and the reason | ☐ |
| 8 | Named visual evidence is complete, with newly identified impacts and unmeasured behavior reported | ☐ |
| 9 | Helper work follows the allowlist and restrictions; every changed line was reviewed and decisions recorded | ☐ |
| 10 | Review findings already received are resolved and accepted limitations recorded; any required pre-handoff review is complete, with Conductor acceptance still pending after handoff | ☐ |
| ⟪…⟫ | ⟪TODO: this wave's specific checks; for code guards, name the behavior and deliberate fault; for documentation-only work, name content and consistency checks and state why mutations do not apply⟫ | ☐ |

---

## Step 8: Closing and handover

1. **The branch** \`⟪TODO: the branch name⟫\`: a commit per batch, then complete the selected delivery mode. For local handoff report the verified bundle, SHA-256, listed branch head and that no branch push occurred.
2. The Conductor reviews independently, merges to \`main\` and writes \`${DECISION_LOG}\` at merge time. Code integration requires the full suite on the integrated revision before publication. A failed check blocks publication; the Executor does not merge. Include proposed decisions in your report.
3. **Debt rows**: mark what was actually delivered closed with evidence; the Conductor checks and confirms closure at merge. Record new debt only within the closed range assigned in Step 2. Deliberate deferrals go in their own file with a trigger.
4. **A structured final report** covering:
   - every number in Step 2 you re-measured: **matched / differed (with the new value)**
   - what was delivered · and what was not and why
   - design decisions, affected consumers, preserved capabilities and the relevant before/after structure measurements; or Not applicable with reason
   - review findings, evidence for each significant finding and the correction contract's result
   - deployment-note changes for migrations, environment variables, scheduled work or operational dependencies; or None
   - delivery mode and separate accepted/merged/pushed/deployed states with the relevant commits; include bundle evidence for local handoff
   - new, modified or affected guards, why each was selected, the fault detected and the passing result after restoration
   - for existing guards considered in this task, what changed or why no repeated mutation was needed; group guards with the same reason
   - check commands, commit, environment, scope, stage, complete output and reasons for extra full runs or necessary reruns
   - actual hook support, missing capabilities and maintenance records; the remaining full-suite step for code integration into main
   - named visual evidence and limits; helper assignments, decisions and your review of their changes
   - **what I could not measure and why** (required)
   - the cost of any AI call as a number · and the branch name and commit hash

---

## 🛑 The single stop gate

**Sensitivity rating: ⟪TODO: 🔴 high / 🟡 medium / 🟢 low⟫**: use the higher class when uncertain.

**After completing the required work and the selected delivery mode, deliver the full Step 8 report with its evidence. End the report with this status summary:**

\`\`\`
🛑 Wave ${title} is ready.
   Branch: ⟪TODO⟫   Commit: <hash>
   Report and evidence: <path or link to the complete Step 8 report and supporting output>
   Delivered: <a two-item summary>
   Delivery: <remote branch or verified local bundle; commit and evidence>
   Integration/release: <pending/merged/pushed/deployed, with applicable commits>
   Measurements changed since task preparation: <the list or "none">
   Guard + mutation: <protected behavior · fault introduced · failure and restoration results; or Not applicable with the reason for documentation-only work>
   What I could not measure: <the list>
   AI call cost: <the number> <the currency>
   ⇒ For the owner: <one line in simple language; for medium sensitivity, include your recommendation on when to ship>
\`\`\`

**Then stop.** If a remaining step requires a decision outside your authority, commit the work so far, report the blocker and mark the wave incomplete. ⛔ Do not merge · do not start a next wave.
`
}

// Optional project policy excerpts. Sources must be committed measurement inputs.
const RULE_OPEN = "<!-- mawja:project-rules:start -->"
const RULE_CLOSE = "<!-- mawja:project-rules:end -->"
function projectRuleFiles(): string[] {
  return RULE_SOURCES.map((path) => {
    const absolute = resolve(ROOT, path)
    const inside = relative(ROOT, absolute)
    if (isAbsolute(path) || !inside || inside === ".." || inside.startsWith(".." + sep) || /[\r\n]/.test(path)) {
      console.error("⛔ CONFIG: RULE_SOURCES must name files inside the repository")
      process.exit(2)
    }
    requireConfigured(absolute, "project rule source", "RULE_SOURCES")
    const real = relative(realpathSync(ROOT), realpathSync(absolute))
    if (real === ".." || real.startsWith(".." + sep) || isAbsolute(real) || !lstatSync(absolute).isFile()) {
      console.error("⛔ CONFIG: RULE_SOURCES must name regular files inside the repository")
      process.exit(2)
    }
    return absolute
  })
}
function renderProjectRules(): string {
  if (!RULE_SOURCES.length) return ""
  if (new Set(RULE_SOURCES).size !== RULE_SOURCES.length) {
    console.error("⛔ CONFIG: duplicate RULE_SOURCES")
    process.exit(2)
  }
  const files = projectRuleFiles()
  const sections = RULE_SOURCES.map((path, index) => {
    const absolute = files[index]
    requireConfigured(absolute, "project rule source", "RULE_SOURCES")
    const content = readFileSync(absolute, "utf8").replace(/\r\n/g, "\n")
    const start = "<!-- mawja:rules:start -->", end = "<!-- mawja:rules:end -->"
    if (content.split(start).length !== 2 || content.split(end).length !== 2 ||
        content.indexOf(end) <= content.indexOf(start) || content.includes(RULE_OPEN) || content.includes(RULE_CLOSE)) {
      console.error(`⛔ CONFIG: ${path} needs exactly one ordered mawja:rules:start/end block`)
      process.exit(2)
    }
    const rules = content.slice(content.indexOf(start) + start.length, content.indexOf(end)).trim()
    if (!rules) {
      console.error(`⛔ CONFIG: empty project rules in ${path}`)
      process.exit(2)
    }
    return `### Project rules: ${path}\n\n${rules}`
  })
  return `${RULE_OPEN}\n${sections.join("\n\n")}\n${RULE_CLOSE}`
}
function projectRulesMatch(body: string): boolean {
  const expected = renderProjectRules()
  if (!expected) return !body.includes(RULE_OPEN) && !body.includes(RULE_CLOSE)
  const normalized = body.replace(/\r\n/g, "\n")
  if (normalized.split(RULE_OPEN).length !== 2 || normalized.split(RULE_CLOSE).length !== 2) return false
  const i = normalized.indexOf(RULE_OPEN), j = normalized.indexOf(RULE_CLOSE, i)
  return j > i && normalized.slice(i, j + RULE_CLOSE.length) === expected
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
  renderProjectRules()
  const tsc = measureTsc()
  const git = measureGit([...tsc.configurationFiles, ...projectRuleFiles()])
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
  console.log(`   Measured: HEAD \`${meta.head}\` · types ${meta.tscCount}/${meta.tscBaseline} · gates ${meta.gates} · debt ${meta.debtRows}/${meta.debtOpen} open · next available identifier #${meta.nextNumber} (not reserved)`)
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
  renderProjectRules()
  const tsc = measureTsc(), git = measureGit([...tsc.configurationFiles, ...projectRuleFiles()]), debt = measureDebt()
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
  if (!projectRulesMatch(body)) {
    bad = true
    console.log("\n🔴 Project rule excerpts differ from their configured source; regenerate before issuing.")
  }
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

const argv = process.argv.slice(2).filter((value) => value !== "--")
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
