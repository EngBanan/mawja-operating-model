# 14 · Failure patterns

Use these hypothetical cases to look for gaps in passing checks. They are not test results for the supplied toolkit.

## 1 · Correct rule, wrong scope

A charge intended to apply once per operation is applied to every internal part after the operation is split. A test of the per-part calculation can pass while the operation total is wrong.

Check whether the rule applies to a whole operation or to each part, then verify the total charged to the user.

## 2 · Repeated measurement, shared error

Two runs can return the same incorrect value when they share faulty inputs or an environment issue.

Use a separate observation or change a relevant condition to test the assumption behind the measurement.

## 3 · Fallback reported as success

A text-processing service returns its input unchanged after failure. A metric that treats input/output equality as success reports a perfect result.

Record when a fallback is used. Do not count a failed operation as a successful result.

## 4 · Text occurrence treated as execution

A filename in a comment does not establish that the program reads the file.

Trace the value to a read operation or observe the actual file access. Use text search to find code that needs inspection.

<a id="5--check-outcomes-collapsed-into-one-count"></a>

## 5 · Different reasons for skipped checks

A single skipped-check count can combine intentionally excluded checks, environment failures and explicit manual bypasses.

Report these states separately, with reasons. Apply the repository's acceptance policy to each category.

---

[Previous: 13 · Adoption checklist](13-audit-your-structure.md) · [Documentation index](README.md) · [Next: Appendix: technical contracts](appendix.md)
