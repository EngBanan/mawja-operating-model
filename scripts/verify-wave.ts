#!/usr/bin/env tsx
/**
 * Verify the implementation branch using the five-step review procedure.
 *
 * Automatic: run added or changed guard commands, measure type budgets and
 * check the working tree before and after commands.
 * Manual: the Conductor chooses independent mutations and verifies the
 * central claim. --claim runs a reviewer-supplied command; its exit status
 * is checked, while interpreting its output remains the reviewer's task.
 *
 * Code or guard-file changes without a discovered guard command require an
 * explicit --no-guard-ok reason. A passing automatic result does not complete
 * the manual review.
 */
import { execFileSync, execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// ══════════════════════════ CONFIG: edit this block ════════════════════════
/**
 * Configure repository paths, commands and discovery patterns below.
 * Paths are relative to the repository root or CODE_ROOT as documented.
 * The verifier checks that the configured layout contains matching files.
 */

/**
 * Where your code and its `package.json` live, relative to the repository root.
 * A monorepo with the app under `frontend/` sets `"frontend/"`.
 * A single-package repo sets `""`.
 */
const CODE_ROOT = ""

/**
 * Path prefixes excluded from the working-tree check.
 * Generated prompts are excluded by default so the Conductor can retain
 * the task prompt during verification.
 */
const NOT_CODE: readonly string[] = ["WAVE_PROMPT_"]

/**
 * Your type-check command, run from `CODE_ROOT`. It must print `{ ok, count, baseline }` as JSON;
 * `ok` means every type rule passed, including per-file budgets. It may also print
 * `crashClass` (guarded codes) and `crashHits` (errors found). Without both, step ③ says **not measured**,
 * never that it is zero.
 */
const TYPES_CMD = "npx tsx scripts/conductor/check-types-baseline.ts --json"

/**
 * Directories relative to CODE_ROOT and regex fragments for file endings.
 * These identify guard, test and application files in the branch diff.
 */
const GUARD_DIRS: readonly string[] = ["scripts/governance", "scripts/scanners", "scripts/audit"]
const TEST_DIRS: readonly string[] = ["tests", "e2e"]
const CODE_DIRS: readonly string[] = ["app", "lib", "components"]
const GUARD_END = "\\.ts"
const TEST_END = "\\.(test|spec)\\.tsx?"
const CODE_END = "\\.tsx?"

/** How a guard is run. `npm run` · `pnpm run` · `yarn`: whatever your repo uses. */
const RUN_GUARD = "npm run"

/**
 * Manifest script prefixes used to discover added or changed guard commands.
 * For example, use ["gate:"] for gate:* commands. At least one prefix is required.
 */
const GUARD_SCRIPT_PREFIXES: readonly string[] = ["lint:", "test:"]

/**
 * The package manifest must exist before guard discovery can run.
 */
const MANIFEST = join(CODE_ROOT, "package.json").replace(/\\/g, "/")
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
const codePath = relative(ROOT, CODE).replace(/\\/g, "/")
const CODE_PREFIX = codePath ? `${codePath}/` : ""

const raw = (cmd: string, cwd = ROOT) => {
  try { return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }
  catch (e: unknown) { const err = e as { stdout?: string; stderr?: string }; return (err.stdout ?? "") + (err.stderr ?? "") }
}
const sh = (cmd: string, cwd = ROOT) => raw(cmd, cwd).trim()

/**
 * Preserve porcelain status whitespace and NUL-delimited paths.
 * Rename and copy entries include a second path.
 */
const porcelain = () => {
  const entries = gitRead("status", "--porcelain=v1", "-z", "--untracked-files=all").split("\0")
  const result: { status: string; path: string }[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry) continue
    const status = entry.slice(0, 2)
    result.push({ status, path: entry.slice(3) })
    if (/[RC]/.test(status)) i++
  }
  return result
}
const ok = (cmd: string, cwd = ROOT) => {
  try { execSync(cmd, { cwd, stdio: "ignore" }); return true } catch { return false }
}

const gitRead = (...args: string[]) => {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }
  catch (e: unknown) {
    const err = e as { stderr?: string }
    console.error(`⛔ CONFIG: git ${args[0]} could not read the requested state`)
    console.error((err.stderr ?? "").trim())
    process.exit(2)
  }
}

const C = { r: "\x1b[31m", g: "\x1b[32m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" }
const line = (s = "") => console.log(s)

// ── What did the wave ship? ─────────────────────────────────────────────────

/**
 * Discover changed files from the branch diff.
 */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const under = (dirs: readonly string[], end: string) =>
  new RegExp(`^${escape(CODE_PREFIX)}(?:${dirs.map(escape).join("|")})/.+${end}$`)

const GATE_RE = under(GUARD_DIRS, GUARD_END)
const TEST_RE = under(TEST_DIRS, TEST_END)
const CODE_RE = under(CODE_DIRS, CODE_END)

/**
 * Validate configured directories and file patterns against tracked files.
 * Missing guard or code inputs cause a configuration error (exit 2).
 * Missing test directories are reported as a warning.
 */
function assertLayoutMatches() {
  const all = gitRead("ls-files", "-z").split("\0").filter(Boolean)
  const present = (dirs: readonly string[]) =>
    dirs.filter((d) => all.some((f) => f.startsWith(`${CODE_PREFIX}${d}/`)))

  const g = present(GUARD_DIRS), c = present(CODE_DIRS), t = present(TEST_DIRS)
  const missing: string[] = []
  if (!g.length) missing.push(`GUARD_DIRS (${GUARD_DIRS.join(" · ")})`)
  if (!c.length) missing.push(`CODE_DIRS (${CODE_DIRS.join(" · ")})`)
  // Both directories and file-ending patterns must match tracked files.
  if (g.length && !all.some((f) => GATE_RE.test(f))) missing.push(`a file under GUARD_DIRS matching GUARD_END (${GUARD_END})`)
  if (c.length && !all.some((f) => CODE_RE.test(f))) missing.push(`a file under CODE_DIRS matching CODE_END (${CODE_END})`)

  if (missing.length) {
    line(`${C.r}🔴 CONFIG: the declared layout matches nothing in this repository${C.x}`)
    missing.forEach((m) => line(`${C.r}   not found under \`${CODE_ROOT || "."}\`: ${m}${C.x}`))
    line(`${C.d}   Discovery paths are relative to CODE_ROOT.${C.x}`)
    line(`${C.d}   Set directories and file-ending patterns that match tracked files in CONFIG.${C.x}`)
    process.exit(2)
  }
  if (!t.length) line(`${C.y}   ⚠️ No TEST_DIRS found (${TEST_DIRS.join(" · ")}): tests will always count zero${C.x}`)
  return { gates: g.length, code: c.length, tests: t.length }
}

function discoverGuards(base: string, head: string) {
  const files = gitRead("diff", "--name-only", "-z", `${base}...${head}`, "--").split("\0").filter(Boolean)
  const gates = files.filter((f) => GATE_RE.test(f))
  const tests = files.filter((f) => TEST_RE.test(f))
  const code = files.filter((f) => CODE_RE.test(f))
  const docs = files.filter((f) => /\.md$/.test(f))
  return { files, gates, tests, code, docs }
}

const isGuardName = (k: string) => GUARD_SCRIPT_PREFIXES.some((p) => k.startsWith(p))

/** The manifest's `scripts` at a ref. `null` = no manifest there. Throws on a manifest that is not JSON. */
function scriptsAt(ref: string): Record<string, string> | null {
  try { execFileSync("git", ["cat-file", "-e", `${ref}:${MANIFEST}`], { cwd: ROOT, stdio: "ignore" }) } catch { return null }
  const txt = gitRead("show", `${ref}:${MANIFEST}`)
  return (JSON.parse(txt) as { scripts?: Record<string, string> }).scripts ?? {}
}

/**
 * Compare manifest script names and values to discover added or changed commands.
 */
function changedGuardScripts(base: string, head: string): { guards: string[]; rejected: string[]; pairs: string[] } {
  /**
 * Require a readable manifest and at least one discovery prefix.
 */
  if (!existsSync(resolve(ROOT, MANIFEST))) {
    line(`${C.r}🔴 CONFIG: no manifest at \`${MANIFEST}\`${C.x}: set CODE_ROOT at the top of this file.`)
    line(`${C.d}   Guard discovery requires a readable package manifest.${C.x}`)
    process.exit(2)
  }
  if (!GUARD_SCRIPT_PREFIXES.length) {
    line(`${C.r}🔴 CONFIG: GUARD_SCRIPT_PREFIXES is empty${C.x}: configure at least one guard-script prefix.`)
    process.exit(2)
  }
  let before: Record<string, string>, after: Record<string, string>
  try { before = scriptsAt(base) ?? {} } catch { before = {} }   // absent or unreadable at base ⇒ every key is new
  try {
    const a = scriptsAt(head)
    if (a === null) throw new Error("absent")
    after = a
  } catch (e) {
    line(`${C.r}🔴 CONFIG: \`${MANIFEST}\` at \`${head}\` is missing or not JSON${C.x} (${(e as Error).message.split("\n")[0]})`)
    line(`${C.d}   Guard discovery requires a readable JSON manifest at the selected commit.${C.x}`)
    process.exit(2)
  }
  if (!Object.keys(after).some(isGuardName))
    line(`${C.y}   ⚠️ No script in \`${MANIFEST}\` starts with ${GUARD_SCRIPT_PREFIXES.join(" · ")}: guard discovery will count zero until one does (GUARD_SCRIPT_PREFIXES)${C.x}`)

  const changed = Object.keys(after).filter((k) => !(k in before) || before[k] !== after[k])
  const guards = changed.filter(isGuardName)
  const rejected = changed.filter((k) => !isGuardName(k))
  // Run every added or changed guard command, including :strict variants.
  const pairs = guards.filter((s) => guards.includes(`${s}:strict`))
  return { guards, rejected, pairs }
}

// Verdict evaluation

/**
 * Inputs collected by main() for verdict evaluation.
 */
export interface WaveFacts {
  /** Uncommitted paths (after excluding `NOT_CODE`). */
  dirty: readonly string[]
  /**
 * measured:false indicates a failed measurement and blocks acceptance.
 */
  tsc: { measured: boolean; ok: boolean; count: number | null; baseline: number | null; kind?: string | null; filesOverBudget?: string[] }
  guardScripts: ReadonlyArray<{ name: string; green: boolean }>
  /** How many gate + test files the branch touched. */
  touchedGuardFiles: number
  changedCodeFiles: number
  /**
 * Executed --claim command; null leaves claim verification pending.
 */
  claim: { command: string; exitCode: number } | null
  /** The text of `--no-guard-ok=` as written, or `null`. */
  noGuardReason: string | null
}

export interface WaveVerdict {
  fails: string[]
  /**
 * Non-blocking declarations. main() separately prints manual review requirements.
 */
  notes: string[]
  /**
 * Missing-guard state, shared by verdict evaluation and output.
 */
  silence: { kind: "S1" | "S2"; what: string } | null
  exitCode: 0 | 1
}

/**
 * Minimum length of a --no-guard-ok reason.
 */
export const MIN_NO_GUARD_REASON = 15

/**
 * Evaluate automatic checks without I/O.
 *
 * A dirty tree, failed type check or failed guard blocks acceptance.
 * S1: guard files changed without a discovered guard command.
 * S2: application code changed without guard files or a guard command.
 * S3: the supplied --claim command returned a nonzero exit status.
 *
 * A printed --no-guard-ok reason of sufficient length can waive S1 or S2.
 * It cannot waive S3. Independent mutations and interpretation of claim output
 * remain manual requirements and are not included in this automatic verdict.
 */
export function evaluateWave(f: WaveFacts): WaveVerdict {
  const fails: string[] = []
  const notes: string[] = []

  if (f.dirty.length) fails.push(`The tree has ${f.dirty.length} uncommitted change(s)`)

  if (!f.tsc.measured) fails.push("Types could not be measured")
  else if (!f.tsc.ok) {
    if (f.tsc.kind === "file-ratchet") fails.push(`Types: per-file ratchet failed: ${f.tsc.filesOverBudget?.join(" · ") || "a file exceeded its budget"}`)
    else if (f.tsc.kind === "crash-class") fails.push("Types: a crash-class error appeared")
    else if (f.tsc.count !== null && f.tsc.baseline !== null && f.tsc.count > f.tsc.baseline) fails.push(`Types: ${f.tsc.count} above the ceiling ${f.tsc.baseline}`)
    else fails.push(`Types: the configured check reported a failure${f.tsc.kind ? ` (${f.tsc.kind})` : ""}`)
  }

  for (const g of f.guardScripts) if (!g.green) fails.push(`Guard ${g.name} is red`)

  // ── S1 · S2: opened by a printed declaration and nothing else ─────────────
  const declared = f.noGuardReason !== null && f.noGuardReason.trim().length >= MIN_NO_GUARD_REASON
  // S1 and S2 apply only when no guard command was discovered.
  const noRunner = f.guardScripts.length === 0
  const s1 = noRunner && f.touchedGuardFiles > 0
  const s2 = noRunner && f.changedCodeFiles > 0 && f.touchedGuardFiles === 0
  let silence: WaveVerdict["silence"] = null

  if (s1 || s2) {
    const what = s1
      ? `the branch touched ${f.touchedGuardFiles} guard file(s) and added or changed no script named ${GUARD_SCRIPT_PREFIXES.join("… · ")}…: no matching guard command was discovered (check GUARD_SCRIPT_PREFIXES)`
      : `${f.changedCodeFiles} code file(s) changed and no guards added`
    silence = { kind: s1 ? "S1" : "S2", what }
    if (declared) notes.push(`Skipped by declaration: ${what}: reason: "${f.noGuardReason!.trim()}"`)
    else if (f.noGuardReason !== null)
      fails.push(`${what}, and \`--no-guard-ok\` has a reason shorter than ${MIN_NO_GUARD_REASON} characters`)
    else fails.push(`${what} (to skip: --no-guard-ok="<reason ≥${MIN_NO_GUARD_REASON} chars>")`)
  }

  // ── S3: the claim's exit code, not its content ────────────────────────────
  if (f.claim && f.claim.exitCode !== 0) {
    fails.push(`The \`--claim\` command failed with code ${f.claim.exitCode}: the claim is unproven`)
  }

  return { fails, notes, silence, exitCode: fails.length ? 1 : 0 }
}

// ── Execution ───────────────────────────────────────────────────────────────

/**
 * Run a command and preserve both its output and exit status.
 * Exported for direct testing of execution and failure handling.
 */
export function runWithCode(cmd: string, cwd = ROOT): { out: string; code: number } {
  try {
    const out = execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
    return { out, code: 0 }
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    return { out: (err.stdout ?? "") + (err.stderr ?? ""), code: typeof err.status === "number" ? err.status : 1 }
  }
}

function commitAt(ref: string): string {
  try { return execFileSync("git", ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() }
  catch { console.error(`⛔ CONFIG: no commit at ${ref}`); process.exit(2) }
}

function main() {
  const argv = process.argv.slice(2)
  const arg = (n: string) => argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=")
  const head = arg("branch") ?? sh("git rev-parse --abbrev-ref HEAD")
  const base = arg("base") ?? "main"
  const claimCmd = arg("claim")
  const noGuardReason = arg("no-guard-ok") ?? null

  line(`\n${C.b}🔍 Conductor's check${C.x}: ${C.b}${head}${C.x} vs ${base}\n`)
  // Resolve all requested commits before verification; invalid refs exit 2.
  const checkedOut = commitAt("HEAD")
  const requested = commitAt(head)
  const baseCommit = commitAt(base)
  if (checkedOut !== requested) {
    console.error(`⛔ CONFIG: checked-out HEAD ${checkedOut.slice(0, 7)} differs from requested branch ${head} (${requested.slice(0, 7)})`)
    console.error(`   Check out that branch, or run from its worktree. No wave check has run.`)
    process.exit(2)
  }

  assertLayoutMatches()
  const g = discoverGuards(baseCommit, requested)
  line(`${C.d}   ${g.files.length} files changed · ${g.code.length} code · ${g.gates.length} gates · ${g.tests.length} tests · ${g.docs.length} docs${C.x}\n`)

  // ⑤ Check the tree before running commands.
  const dirtyBefore = porcelain().map((e) => e.path).filter((p) => !NOT_CODE.some((n) => p.startsWith(n)))
  if (dirtyBefore.length) line(`${C.r}   ⑤ 🔴 The tree is not clean${C.x}: ${dirtyBefore.slice(0,3).join(" · ")}${dirtyBefore.length>3?" …":""}`)
  else line(`${C.g}   ⑤ ✅ The tree is clean${C.x}`)

  // ③ Types
  const tscOut = sh(TYPES_CMD, CODE)
  let tsc: WaveFacts["tsc"] = { measured: false, ok: false, count: null, baseline: null }
  try {
    const j = JSON.parse(tscOut.slice(tscOut.indexOf("{")))
    if (!j || !Number.isInteger(j.count) || j.count < 0 || !Number.isInteger(j.baseline) || j.baseline < 0 || typeof j.ok !== "boolean") throw new Error("invalid type-check fields")
    if (j.crashHits !== undefined && (!Number.isInteger(j.crashHits) || j.crashHits < 0)) throw new Error("invalid crashHits")
    if (j.crashClass !== undefined && (!Array.isArray(j.crashClass) || !j.crashClass.every((c: unknown) => typeof c === "string" && c.length > 0))) throw new Error("invalid crashClass")
    if (j.ok && (j.count > j.baseline || j.crashHits > 0 || (Array.isArray(j.filesOverBudget) && j.filesOverBudget.length))) throw new Error("inconsistent type-check verdict")
    tsc = { measured: true, ok: j.ok, count: j.count, baseline: j.baseline,
      kind: typeof j.kind === "string" ? j.kind : null,
      filesOverBudget: Array.isArray(j.filesOverBudget) ? j.filesOverBudget.map(String) : [] }
    // crashClass lists categories; crashHits counts findings.
    // Both are required to report the measured crash count.
    const crash = Array.isArray(j.crashClass) && j.crashClass.length && Number.isInteger(j.crashHits)
      ? `${j.crashHits ? C.r : C.g}crash class ${j.crashHits === 0 ? "zero" : j.crashHits}${C.x}${C.d} (${j.crashClass.length} guarded codes)${C.x}`
      : `${C.y}crash class not measured: TYPES_CMD must print both \`crashClass\` and \`crashHits\`${C.x}`
    if (!tsc.ok) line(`${C.r}   ③ 🔴 Types ${tsc.count}/${tsc.baseline}${C.x}`)
    else line(`${C.g}   ③ ✅ Types ${tsc.count}/${tsc.baseline}${C.x} · ${crash}`)
  } catch {
    // Missing or invalid measurement JSON is a configuration error (exit 2).
    line(`${C.r}   ③ 🔴 Types could not be measured: \`${TYPES_CMD}\` (from ${CODE}) printed no readable type-check JSON${C.x}`)
    line(`${C.d}      │ ${(tscOut.split("\n").find((l) => l.trim()) ?? "(no output)").slice(0, 120)}${C.x}`)
    line(`${C.d}      Set TYPES_CMD in the CONFIG block at the top of this file. It must print { ok, count, baseline } as JSON.${C.x}\n`)
    process.exit(2)
  }

  // ① The wave's guards
  const scripts = changedGuardScripts(baseCommit, requested)
  const guardScripts = scripts.guards.map((name) => ({ name, green: ok(`${RUN_GUARD} ${name}`, CODE) }))
  if (guardScripts.length) {
    line(`\n${C.b}   ① The wave's guards (${guardScripts.length})${C.x}`)
    for (const s of guardScripts) {
      line(s.green ? `${C.g}      ✅ ${s.name}${C.x}` : `${C.r}      🔴 ${s.name}: fails${C.x}`)
    }
  }
  // Report changed commands excluded by the configured prefixes.
  if (scripts.rejected.length)
    line(`${C.y}   ⚠️ ${scripts.rejected.length} added or changed script(s) not counted as guards (names must start with ${GUARD_SCRIPT_PREFIXES.join(" · ")}): ${scripts.rejected.slice(0, 6).join(" · ")}${C.x}`)
  for (const p of scripts.pairs)
    line(`${C.d}   ↳ ${p} and ${p}:strict both added or changed: both ran${C.x}`)

  // ④ The central claim: run here so its exit code enters the verdict (S3)
  let claim: WaveFacts["claim"] = null
  let claimOut = ""
  if (claimCmd) {
    const r = runWithCode(claimCmd)
    claim = { command: claimCmd, exitCode: r.code }
    claimOut = r.out
  }

  const dirtyAfter = porcelain().map((e) => e.path).filter((p) => !NOT_CODE.some((n) => p.startsWith(n)))
  const dirty = [...new Set([...dirtyBefore, ...dirtyAfter])]
  if (commitAt("HEAD") !== requested) {
    console.error("⛔ CONFIG: HEAD changed during verification. Re-run on the requested commit.")
    process.exit(2)
  }
  line(dirtyAfter.length
    ? `${C.r}   ⑤ 🔴 The tree is not clean after automatic commands${C.x}: ${dirtyAfter.slice(0, 3).join(" · ")}`
    : `${C.g}   ⑤ ✅ The tree is clean after automatic commands${C.x}`)

  const verdict = evaluateWave({
    dirty,
    tsc,
    guardScripts,
    touchedGuardFiles: g.gates.length + g.tests.length,
    changedCodeFiles: g.code.length,
    claim,
    noGuardReason,
  })

  // S1/S2: report the state used by the verdict.
  if (verdict.silence?.kind === "S1") {
    line(`\n${C.r}   ① 🔴 ${verdict.silence.what}${C.x}`)
    g.gates.concat(g.tests).slice(0, 5).forEach((f) => line(`${C.d}         ${f}${C.x}`))
  } else if (verdict.silence?.kind === "S2") {
    line(`\n${C.r}   ① 🔴 ${verdict.silence.what}${C.x}`)
    line(`${C.d}      If this change intentionally adds no guard command, provide a reason with --no-guard-ok.${C.x}`)
  } else if (guardScripts.length === 0 && g.code.length === 0 && !g.gates.length && !g.tests.length) {
    line(`\n${C.y}   ① ⚠️ Zero guards and zero code in this wave${C.x}`)
  }
  // Include accepted skip reasons in the output.
  for (const n of verdict.notes) line(`${C.y}   🗣️  ${n}${C.x}`)

  if (g.gates.length || g.tests.length) {
    line(`\n${C.b}   Changed guard files: each needs its own run and mutation:${C.x}`)
    g.gates.concat(g.tests).forEach((file) => line(`      ☐ ${file}`))
    line(`${C.d}      The automatic run covers manifest commands added or changed by the wave. It does not map every file to a runner.${C.x}`)
    line(`${C.d}      Run existing commands for any remaining changed guard files and record their results.${C.x}`)
  }

  // ②: independent mutation required from the Conductor.
  line(`\n${C.b}${C.r}   ② Independent mutation: required from the Conductor.${C.x}`)
  if (guardScripts.length) {
    line(`${C.d}      For each guard below: introduce a relevant fault ${C.b}different from the Executor's cases${C.x}${C.d}, confirm the intended check fails, restore the source and rerun the check.${C.x}`)
    guardScripts.forEach((s) => line(`      ☐ ${s.name}`))
  } else {
    line(`${C.d}      No added or changed guard command discovered. Check for guards ${C.b}outside the runner${C.x}${C.d} and run them separately.${C.x}`)
  }
  line(`${C.d}      Record the mutation, the intended failure and the passing result after restoration.${C.x}`)

  line(`\n${C.b}${C.r}   ④ Verify the central claim independently.${C.x}`)
  if (claim) {
    line(`${C.d}      Running the reviewer-supplied command (from ${ROOT}):${C.x} ${claim.command}`)
    claimOut.trim().split("\n").slice(0, 8).forEach((l) => line(`${C.d}      │ ${l.slice(0, 110)}${C.x}`))
    if (claim.exitCode === 0) line(`${C.y}      ⚠️ The command succeeded. ${C.b}Review its output against the central claim.${C.x}`)
    else line(`${C.r}      🔴 The command failed with code ${claim.exitCode}: the claim is not verified${C.x}`)
  } else {
    line(`${C.d}      ☐ Write your own command and pass it: ${C.b}--claim="<command>"${C.x}`)
    line(`${C.d}      Choose a verification command independently of the Executor.${C.x}`)
  }

  line("")
  if (verdict.fails.length) {
    line(`${C.r}${C.b}⛔ ${verdict.fails.length} automatic ${verdict.fails.length === 1 ? "check" : "checks"} failed: no merge:${C.x}`)
    verdict.fails.forEach((f) => line(`${C.r}   • ${f}${C.x}`))
    line("")
    process.exit(1)
  }
  line(`${C.g}${C.b}✅ Automatic checks green for the commands run.${C.x}  ${C.y}Complete any remaining guard-file runs in ①, every mutation in ②, and the independent judgment in ④.${C.x}\n`)
}

/**
 * Run main() only when invoked directly. Imports expose the testable functions.
 */
if (/[/\\]verify-wave\.ts$/.test(process.argv[1] ?? "")) main()
