#!/usr/bin/env tsx
/**
 * Count package scripts with the configured guard prefixes.
 *
 * Used by wave-prompt.ts as the default gate-count command. Output includes
 * `(N live gates`, matched by GATES_COUNT_RE. Keep GUARD_SCRIPT_PREFIXES aligned
 * with verify-wave.ts.
 *
 * Exit 0 returns the count, including zero. Exit 2 indicates an unreadable
 * manifest. Projects with another manifest can configure a different command.
 */
import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// ══════════════════════════ CONFIG: edit this block ════════════════════════
/** Where your `package.json` lives, relative to the repository root. `""` for a single-package repo. */
const CODE_ROOT = ""
/** The name prefixes that make a script a gate: keep in step with `verify-wave.ts`. */
const GUARD_SCRIPT_PREFIXES: readonly string[] = ["lint:", "test:"]
// ════════════════════════════ END CONFIG ════════════════════════════════════

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url))
const ROOT = (() => {
  try { return execSync("git rev-parse --show-toplevel", { cwd: HERE, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() }
  catch { console.error(`⛔ CONFIG: this file is not inside a Git repository (looked from ${HERE})`); process.exit(2) }
})()
const MANIFEST = resolve(ROOT, CODE_ROOT, "package.json")
if (!existsSync(MANIFEST)) { console.error(`⛔ CONFIG: no manifest at ${MANIFEST}: set CODE_ROOT at the top of this file.`); process.exit(2) }
let scripts: Record<string, string>
try { scripts = (JSON.parse(readFileSync(MANIFEST, "utf8")) as { scripts?: Record<string, string> }).scripts ?? {} }
catch { console.error(`⛔ CONFIG: ${MANIFEST} is not JSON`); process.exit(2) }

const gates = Object.keys(scripts).filter((k) => GUARD_SCRIPT_PREFIXES.some((p) => k.startsWith(p))).sort()
console.log(`🚪 gates manifest: ${MANIFEST.replace(ROOT + "/", "")} (${gates.length} live gates · prefixes ${GUARD_SCRIPT_PREFIXES.join(" · ")})`)
for (const g of gates) console.log(`   • ${g}`)
