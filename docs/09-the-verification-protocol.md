# 9 · The Verification Protocol

The Conductor completes these steps before merging. The toolkit can automate checks, type measurement and Git-state inspection; independent mutations and judgment remain review responsibilities.

| Step | Required evidence |
|---|---|
| **1. Run the task's guards** | Passing results from the reviewer’s environment |
| **2. Introduce an independent fault** | A mutation different from the Executor's cases; the intended guard fails, then passes after restoration |
| **3. Measure type budgets** | No per-file or total regression; configured crash diagnostics remain zero |
| **4. Check the central claim independently** | A reviewer-chosen command or observation that demonstrates the requested behavior |
| **5. Confirm restoration** | A clean working tree after mutations and automated checks |

Run the existing checks for behavior the change could affect, even if their command definitions did not change. The verifier discovers newly added or changed manifest commands; it cannot infer every affected behavior.

## Check adjacent behavior

A guard may test one route while missing another that uses the same code. Identify the affected screens, routes and API endpoints, and test each relevant entry point.

Record any missing checks. A passing test for one entry point does not verify the others.

## Test incorrect values as well as absence

A function can run and still return the wrong result. Where relevant, test both a missing implementation and one that produces incorrect values.

For example, a subtraction guard should detect a function that returns addition and one that incorrectly removes the sign of a negative result. Confirm that failure comes from the behavior assertion rather than an unrelated setup error.

Preserve the command, exit status and complete output for the fault and restored state.

## Choose checks for the requirement

[Black-box testing](00-terms.md#black-box-testing) uses the required behavior to choose inputs and expected results. For a notes app, save a note through the interface, reopen it and compare the text. The test can be manual or automated.

[White-box testing](00-terms.md#white-box-testing) uses the implementation to select what to exercise. A reviewer might identify the save function's error branch, cause a write failure and check its result. Reading the code alone is code review; the test exercises the selected behavior.

Choose checks that address the task's risks and [acceptance criteria](00-terms.md#acceptance-criteria). See [testing examples](00-terms.md#testing-examples) for the relationship to regression and mutation testing.

## Include the Owner's observations

For user-visible work, the Executor can provide reproducible test steps, and the Conductor can check their coverage against the requirements. The Owner can then perform the agreed tasks and record expected and actual results, including failures. This supports [user acceptance testing](00-terms.md#user-acceptance-testing).

The Conductor still completes the verification steps above. The Owner's ability to read code does not change those requirements. Keep [test evidence](00-terms.md#test-evidence) and unverified behavior in the report.

---

[Previous: 8 · Sensitivity Classification](08-sensitivity-classification.md) · [Documentation index](README.md) · [Next: 10 · The Toolkit](10-the-toolkit.md)
