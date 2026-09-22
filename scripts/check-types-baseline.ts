#!/usr/bin/env tsx
/**
 * Type-error budgets for TypeScript and configured JavaScript.
 *
 * Requires a local TypeScript compiler and tsconfig.json. JavaScript also
 * requires allowJs, checkJs and an explicit file scope. The rules are defined
 * in Appendix C; Appendix D defines the measurement contract.
 *
 * --json prints:
 *   count              current type-error count
 *   baseline           committed global ceiling
 *   filesOverBudget    files exceeding their committed budgets
 *   kind               null, crash-class, file-ratchet, regression or config
 *   crashHits          count of configured crash and syntax diagnostics
 *   crashClass         configured codes plus the compiler's syntax category
 *   syntaxDiagnostics  individual syntax diagnostics
 *   configurationFiles configuration paths read by the compiler parser
 *   ok                 true when every type rule passes
 *
 * --init creates the snapshot and refuses to overwrite an existing one.
 * --update lowers the ceiling and file budgets; neither may increase.
 * Commit the snapshot with the changes that establish the new baseline.
 * Configured crash diagnostics and syntax errors must remain zero.
 *
 * Exit 0: passed. Exit 1: crash diagnostics or an exceeded budget.
 * Exit 2: the checker, configuration or snapshot could not be used.
 */
import { execSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

// ══════════════════════════ CONFIG: edit this block ════════════════════════
/** Where your code and its `tsconfig.json` live, relative to the repository root. `""` for a single-package repo. */
const CODE_ROOT = ""
/** The checker. Must print one `path(line,col): error TSxxxx:` line per error. */
const TSC_CMD = "npx tsc --noEmit --pretty false"
/** Same project as TSC_CMD. Keep aligned if you customize the command; --build is not supported here. */
const TSC_PROJECT = "tsconfig.json"
/** The committed snapshot (global ceiling and per-file budgets), relative to the repository root. `--init` creates it. */
const BASELINE_FILE = "scripts/conductor/types-baseline.json"
/**
 * Diagnostics that must remain zero regardless of the global or per-file budget.
 */
const CRASH_CLASS: readonly string[] = ["TS2304", "TS2552", "TS1308"]
// ════════════════════════════ END CONFIG ════════════════════════════════════

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url))
const ROOT = (() => {
  try { return execSync("git rev-parse --show-toplevel", { cwd: HERE, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() }
  catch { console.error(`⛔ CONFIG: this file is not inside a Git repository (looked from ${HERE})`); process.exit(2) }
})()
const CODE = CODE_ROOT ? resolve(ROOT, CODE_ROOT) : ROOT
const BASELINE = resolve(ROOT, BASELINE_FILE)
const argv = process.argv.slice(2)
const JSON_OUT = argv.includes("--json")

function fail(msg: string, detail?: string): never {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, kind: "config", error: msg, detail: detail ?? null }))
  else { console.error(`\n⛔ CONFIG: ${msg}`); if (detail) console.error(`   ${detail}`); console.error("") }
  process.exit(2)
}

// ── Measure ─────────────────────────────────────────────────────────────────
let out: string
let checkerExit = 0
try { out = execSync(TSC_CMD, { cwd: CODE, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }
catch (e: unknown) {
  const err = e as { stdout?: string; stderr?: string; status?: number | null; signal?: string; code?: string }
  if (err.code || err.signal || typeof err.status !== "number")
    fail("the checker did not finish: partial output cannot be counted", err.code ?? err.signal ?? "process terminated")
  // TypeScript completes with 0, 1 or 2. A shell can turn a killed child into
  // status 137 with no signal field; its partial diagnostics are not a count.
  if (![0, 1, 2].includes(err.status))
    fail("the checker did not finish with a normal TypeScript exit code", `exit ${err.status}; partial output cannot be counted`)
  checkerExit = err.status === 0 ? 2 : err.status
  out = (err.stdout ?? "") + (err.stderr ?? "")
}

// Reject missing compilers, invalid project configuration and unreadable output.
const perFile = new Map<string, string[]>()
for (const m of out.matchAll(/^(.+?)\(\d+,\d+\): error (TS\d{4,5}):/gm)) {
  const file = m[1].replace(/\\/g, "/")
  perFile.set(file, [...(perFile.get(file) ?? []), m[2]])
}
const globalErrors = [...out.matchAll(/^error (TS\d{4,5}):/gm)].map((m) => m[1])
const firstLine = out.split("\n").find((l) => l.trim())?.replace(/\x1b\[[0-9;]*m/g, "").trim().slice(0, 120)
if (/not the tsc command|command not found|ENOENT|could not determine executable/i.test(out) && !perFile.size)
  fail("TypeScript is not installed in this project: `npx tsc` found no compiler", `Run \`npm install --save-dev typescript\` (from \`${CODE_ROOT || "."}\`). Output was: ${firstLine ?? "(none)"}`)
if (/^Version \d/m.test(out) && !perFile.size && !globalErrors.length)
  fail(`no \`tsconfig.json\` under \`${CODE_ROOT || "."}\`: tsc printed its version instead of checking`, "Create tsconfig.json with `\"noEmit\": true` and an `include` covering application code, guards and tests. Use the TypeScript or JavaScript example configuration from the Mawja repository.")
if (globalErrors.includes("TS18003") && !perFile.size)
  fail("tsconfig.json matches no input file (TS18003)", "Its `include` names no file that exists. Point it at your code directories.")
if (!perFile.size && !globalErrors.length && !/\b(?:Found \d+ errors?|error TS)\b/.test(out) && out.trim() !== "")
  fail(`\`${TSC_CMD}\` printed neither an error line nor a summary: it did not run as a checker`, firstLine)

if (checkerExit !== 0 && !perFile.size && !globalErrors.length)
  fail(`\`${TSC_CMD}\` failed with exit ${checkerExit} without readable diagnostics`, firstLine ?? "(no output)")

if (globalErrors.length || [...perFile.keys()].some((file) => /\.json$/i.test(file)))
  fail("the checker reported a configuration or project-loading error", firstLine)

// Use the installed compiler to resolve configuration inputs and syntax diagnostics.
// The parse host records configuration reads, excluding source and library files.
const configurationInputs = new Set<string>()
let syntaxDiagnostics: { file: string; code: string; line: number; message: string }[]
try {
  const ts = createRequire(resolve(CODE, "package.json"))("typescript")
  const parsed = ts.getParsedCommandLineOfConfigFile(resolve(CODE, TSC_PROJECT), {}, {
    ...ts.sys,
    getCurrentDirectory: () => CODE,
    readFile: (path: string) => {
      const content = ts.sys.readFile(path)
      if (content !== undefined) configurationInputs.add(resolve(path))
      return content
    },
    onUnRecoverableConfigFileDiagnostic: (d: { messageText: unknown }) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"))
    },
  })
  if (!parsed || parsed.errors.length || !parsed.fileNames.length)
    throw new Error("project configuration is invalid or has no inputs")
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences })
  syntaxDiagnostics = program.getSyntacticDiagnostics().map((d: any) => ({
    file: d.file?.fileName ?? "(global)", code: `TS${d.code}`,
    line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : 0,
    message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
  }))
} catch (e) { fail("could not inspect TypeScript project configuration and syntax", String(e)) }
const configurationFiles = [...configurationInputs].sort()

const files: Record<string, number> = {}
for (const [f, codes] of [...perFile.entries()].sort()) files[f] = codes.length
if (globalErrors.length) files["(global)"] = globalErrors.length
const count = Object.values(files).reduce((a, b) => a + b, 0)
const crash = [...perFile.values()].flat().concat(globalErrors).filter((c) => CRASH_CLASS.includes(c))
// Syntactic diagnostics are never debt, even when the per-file budget is large.
crash.push(...syntaxDiagnostics.filter((d) => !CRASH_CLASS.includes(d.code)).map((d) => d.code))

type Snapshot = { ceiling: number; files: Record<string, number>; measured: string }
const snapshot = (): Snapshot => ({ ceiling: count, files, measured: new Date().toISOString().slice(0, 10) })
const write = (s: Snapshot) => { mkdirSync(dirname(BASELINE), { recursive: true }); writeFileSync(BASELINE, JSON.stringify(s, null, 2) + "\n", "utf8") }

// ── The ratchet ─────────────────────────────────────────────────────────────
if ((argv.includes("--init") || argv.includes("--update")) && crash.length)
  fail("refusing to record a snapshot with crash-class errors", [...new Set(crash)].join(" · "))

if (argv.includes("--init")) {
  if (existsSync(BASELINE)) fail(`snapshot already exists at ${BASELINE_FILE}`, "Use --update to lower the committed ceiling and file budgets.")
  write(snapshot())
  console.log(`✅ ${BASELINE_FILE} written: ceiling ${count} · ${Object.keys(files).length} file budget(s)`)
  process.exit(0)
}
if (!existsSync(BASELINE)) fail(`no snapshot at ${BASELINE_FILE}`, "Run once with --init to record today's counts as the ceiling and the per-file budgets.")
let base: Snapshot
try {
  const j = JSON.parse(readFileSync(BASELINE, "utf8")) as Partial<Snapshot>
  if (!Number.isInteger(j.ceiling) || (j.ceiling as number) < 0) throw new Error("ceiling")
  if (!j.files || typeof j.files !== "object" || Array.isArray(j.files) || Object.values(j.files).some((n) => !Number.isInteger(n) || n < 0)) throw new Error("file budgets")
  base = { ceiling: j.ceiling as number, files: j.files, measured: j.measured ?? "" }
} catch { fail(`${BASELINE_FILE} must carry a non-negative integer \`ceiling\` and an object of non-negative integer file budgets`) }

const over = Object.entries(files).filter(([f, n]) => n > (base.files[f] ?? 0)).map(([f, n]) => `${f}: ${n} > ${base.files[f] ?? 0}`)

if (argv.includes("--update")) {
  if (count > base.ceiling) fail(`refusing to raise the ceiling ${base.ceiling} → ${count}`, "Resolve the type-error regression before updating the baseline.")
  if (over.length) fail(`refusing to raise a file budget`, over.slice(0, 5).join(" · "))
  write(snapshot())
  console.log(`✅ ceiling ${base.ceiling} → ${count} · budgets recorded for ${Object.keys(files).length} file(s)`)
  process.exit(0)
}

// ── Verdict ─────────────────────────────────────────────────────────────────
const kind = crash.length ? "crash-class" : over.length ? "file-ratchet" : count > base.ceiling ? "regression" : null
const ok = kind === null
if (JSON_OUT) {
  console.log(JSON.stringify({ ok, kind, count, baseline: base.ceiling, crashClass: [...CRASH_CLASS, "syntax"], crashHits: crash.length, filesOverBudget: over, configurationFiles, syntaxDiagnostics }))
} else {
  console.log(`🧮 Types: ${count} / ceiling ${base.ceiling} · ${Object.keys(base.files).length} file budget(s) · crash class ${crash.length ? `🔴 ${crash.length} (${[...new Set(crash)].join(" · ")})` : "zero"}`)
  if (over.length) { console.log(`🔴 ${over.length} file(s) above their budget:`); over.slice(0, 10).forEach((o) => console.log(`   • ${o}`)) }
  if (kind === "regression") console.log(`🔴 ${count - base.ceiling} above the committed ceiling`)
  if (ok) console.log("✅ crash class zero · every file within budget · total at or under the ceiling")
}
process.exit(ok ? 0 : 1)
