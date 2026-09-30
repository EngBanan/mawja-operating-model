# Calculator project

Work within this repository. The calculator currently supports addition.

- Preserve addition and signed-number behavior.
- Keep application code in app, behavior guards in scripts/governance, and tests in tests.
- For documentation-only work, check documentation and consistency. For code on an Executor branch, run critical type/debt checks, tests for affected calculator behavior and required mutations. In this small project, `npm run check` covers exactly that set and also the full project set; no extra full branch run is needed.
- Code integration into main requires full `npm run check` on the integrated revision before publication. Keep independent Conductor review and repeat affected checks after a fix or changed input.
- This example has no enforcing hook or automatic stage routing. Run required commands explicitly; installing routing needs a separate, validated integration. The supplied Mawja tools still require their configured type measurements.
- Register each behavior guard in `package.json` with a command name beginning with `test:`, such as `test:subtract`.
- Commit one logical change at a time. Use a separate branch for implementation.
- Record defects in PROGRESS/TECHNICAL_DEBT.md and decisions in DECISIONS.md.
- This example has no database, billing, deployment or configurable operational limits.
- Report changes, verification commands, results and any remaining limitations.
