#!/usr/bin/env tsx
/**
 * Debt-ledger validation and status counts.
 *
 * A row is closed when `✅` starts its description or priority cell.
 * Use `✔︎` for emphasis elsewhere in a row; it has no closure meaning.
 *
 * R1 **Marker position**: reject `✅` outside the two allowed positions.
 * R2 **Valid, unique numbering**: require a unique complete identifier.
 * R3 **Non-vacuity floor**: require the configured minimum row and closed counts.
 *
 * Exit 2 indicates a configuration or floor error. With `--strict`, violations
 * exit 1; otherwise they are reported with exit 0.
 */
import { execSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// ══════════════════════════ CONFIG: edit this block ════════════════════════
/** Your debt ledger, relative to the repository root. */
const DEBT_LEDGER = "PROGRESS/TECHNICAL_DEBT.md"

/**
 * Minimum recognized rows and closed rows required for validation.
 * Set these from the current ledger and raise them as it grows.
 *
 * FLOOR_ROWS must be positive. A scan with no recognized rows cannot pass.
 * FLOOR_CLOSED may start at 0 when no debt is closed; this disables the
 * closed-row floor. Raise it after the first closure.
 */
const FLOOR_ROWS = 1
const FLOOR_CLOSED = 0
// ════════════════════════════ END CONFIG ════════════════════════════════════

/**
 * Resolve the repository root through Git. HERE supports CommonJS and ESM.
 */
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url))
const ROOT = (() => {
  try { return execSync("git rev-parse --show-toplevel", { cwd: HERE, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() }
  catch {
    console.error(`🔴 CONFIG: this file is not inside a Git repository (looked from ${HERE}).`)
    console.error(`   The toolkit reads the root from \`git rev-parse --show-toplevel\`. Copy it into the repository it should measure.`)
    process.exit(2)
  }
})()
const DEBT = resolve(ROOT, DEBT_LEDGER)
const STRICT = process.argv.includes("--strict")

/**
 * Split table cells on pipes outside inline code.
 */
export function splitCells(row: string): string[] {
  let s = row.trim()
  if (s.startsWith("|")) s = s.slice(1)
  if (s.endsWith("|")) s = s.slice(0, -1)
  const cells: string[] = []
  let buf = "", tick = false
  for (const ch of s) {
    if (ch === "`") { tick = !tick; buf += ch }
    else if (ch === "|" && !tick) { cells.push(buf); buf = "" }
    else buf += ch
  }
  cells.push(buf)
  return cells.map((c) => c.trim())
}

/** The complete sub-number is an identity; the generator reads its numeric base from this same expression. */
export const DEBT_NUMBER_RE = /#(\d+(?:-[\u0600-\u06FF\w]+)?)/
/** Identify numbered-row candidates even when malformed; the plain table header is not an item. */
export function isDebtRow(row: string): boolean {
  const cell = splitCells(row)[0] ?? ""
  return row.trimStart().startsWith("|") && cell !== "#" && /^\*{0,2}#/.test(cell)
}

/** Parse the published row convention, including its complete sub-number. */
export function debtNumber(row: string): string | null {
  const cell = splitCells(row)[0] ?? ""
  const m = DEBT_NUMBER_RE.exec(cell)
  return row.startsWith("| **#") && m && cell === `**#${m[1]}**` ? m[1] : null
}

export const CLOSED_MARK = "✅"
/** Cells the mark may start: 1 description · 2 priority. Positional ⇒ language-independent. */
export const MARK_CELLS = [1, 2] as const

export function isClosed(cells: string[]): boolean {
  return MARK_CELLS.some((i) => (cells[i] ?? "").startsWith(CLOSED_MARK))
}

/** Any `✅` outside the start of the two allowed cells: a violation. One report per cell, at the first offending mark. */
export function markViolations(cells: string[]): { cell: number; at: number }[] {
  const out: { cell: number; at: number }[] = []
  cells.forEach((cell, i) => {
    const allowedAtStart = (MARK_CELLS as readonly number[]).includes(i) && cell.startsWith(CLOSED_MARK)
    const body = allowedAtStart ? cell.slice(CLOSED_MARK.length) : cell
    const k = body.indexOf(CLOSED_MARK)
    if (k >= 0) out.push({ cell: i, at: allowedAtStart ? k + CLOSED_MARK.length : k })
  })
  return out
}

// Run only when invoked directly. The generator imports the parsing functions.
// argv[1] supports both CommonJS and ESM entry points.
if (/[/\\]check-debt-ledger\.ts$/.test(process.argv[1] ?? "")) {
  main()
}

function main() {
// Rows use the published | **#N** | convention (Appendix B).
/**
 * A missing configured ledger is a configuration error (exit 2).
 */
if (!existsSync(DEBT)) {
  console.error(`🔴 CONFIG: no ledger at \`${DEBT_LEDGER}\` (looked in ${DEBT}).`)
  console.error(`   Set DEBT_LEDGER at the top of this file to your ledger's path, relative to the repository root (${ROOT}).`)
  process.exit(2)
}

const rows = readFileSync(DEBT, "utf8").split("\n").filter(isDebtRow)

/**
 * Require the row floor before validating individual entries.
 */
if (rows.length < FLOOR_ROWS) {
  console.error(`🔴 non-vacuity floor: ${rows.length} ledger row(s) found at \`${DEBT_LEDGER}\`, expected at least ${FLOOR_ROWS}.`)
  console.error(`   Check the DEBT_LEDGER path, row format and FLOOR_ROWS in the CONFIG block.`)
  console.error(`   A new ledger needs at least one row in the Appendix B format before this gate can validate it.`)
  process.exit(2)
}
const errors: string[] = []
const seen = new Map<string, number>()
let closed = 0

rows.forEach((row, idx) => {
  const cells = splitCells(row)
  // Sub-number suffixes are part of the identity. The parser supports Arabic
  // characters and ASCII word characters; retain both when extending it.
  const parsed = debtNumber(row)
  const num = parsed ?? `?row${idx}`
  if (parsed === null) errors.push(`Row ${idx}: malformed identity: use the published | **#N** | convention.`)

  // R1: mark position
  for (const v of markViolations(cells))
    errors.push(`#${num}: \`✅\` in cell ${v.cell} at offset ${v.at}: allowed only at the start of cell 1 or 2. Use \`✔︎\` for prose emphasis.`)

  // R2: number uniqueness
  const prev = seen.get(num)
  if (prev !== undefined) errors.push(`#${num}: duplicate number (rows ${prev} and ${idx}): referring to it in a commit becomes ambiguous.`)
  seen.set(num, idx)

  if (isClosed(cells)) closed++
})

/**
 * R3: a failed floor exits 2 regardless of --strict.
 */
const floorFails: string[] = []
if (rows.length < FLOOR_ROWS) floorFails.push(`only ${rows.length} rows (< ${FLOOR_ROWS}): the pattern did not capture the table.`)
if (closed < FLOOR_CLOSED) floorFails.push(`only ${closed} closed (< ${FLOOR_CLOSED}): below the required closed-row count.`)

const open = rows.length - closed
console.log(`🧾 Debt ledger: **${rows.length}** rows · **${closed}** closed · **${open}** open.`)

/**
 * Report the configured floors, including a disabled closed-row floor.
 */
console.log(
  `   floors: rows ≥ ${FLOOR_ROWS} ✓ · closed ≥ ${FLOOR_CLOSED} ` +
    (FLOOR_CLOSED === 0
      ? "⚠️ **disabled.** Raise FLOOR_CLOSED after the first closed row."
      : closed < FLOOR_CLOSED
        ? `🔴 **FAILED: only ${closed} closed.** Details below.`
        : "✓"),
)

if (floorFails.length) {
  console.error(`\n⛔ Non-vacuity floor: configuration error:`)
  floorFails.forEach((f) => console.error(`   • ${f}`))
  console.error("")
  process.exit(2)
}

if (errors.length) {
  console.error(`\n🔴 ${errors.length} violations:`)
  errors.slice(0, 25).forEach((e) => console.error(`   • ${e}`))
  if (errors.length > 25) console.error(`   … and ${errors.length - 25} more`)
  console.error(`\n   Convention: \`✅\` at the start of the description or priority cell = **closed** · absent = **open** · \`✔︎\` for emphasis.\n`)
  process.exit(STRICT ? 1 : 0)
}
console.log(`✅ Ledger format valid: zero violations (positions ${MARK_CELLS.join(" or ")} allowed · ✔︎ for prose emphasis).`)
}
