# Terms

Use this page when a term appears in a task, command output or report.

[Testing terms](#checks-and-quality) · [Agent work](#agent-work) · [Mawja conventions](#mawja-conventions) · [Examples](#testing-examples)

## Checks and quality

| Term | Definition |
|---|---|
| <a id="acceptance-criteria"></a>**Acceptance criteria** | Agreed, observable conditions a result must meet to be accepted. Define them before implementation. |
| <a id="acceptance-testing"></a>**Acceptance testing** | Evaluating whether a system meets its acceptance criteria and is ready to be accepted. |
| <a id="user-acceptance-testing"></a>**User acceptance testing (UAT)** | Intended users or their representatives assess whether the product supports their needs and tasks. |
| <a id="test-case"></a>**Test case** | A defined setup, input or action, and expected result used to check a behavior. |
| <a id="test-evidence"></a>**Test evidence** | Recorded inputs, commands or actions, actual results and relevant conditions that support a reported finding. |
| <a id="regression-testing"></a>**Regression testing** | Checking existing behavior after a change to detect unintended effects. |
| <a id="boundary-case"></a>**Boundary case** | An input or condition at or near a defined limit, such as the maximum allowed length. |
| <a id="passing-checks"></a>**Passing checks / green build** | The checks that ran met their acceptance criteria. This does not establish coverage of untested behavior. |
| <a id="quality-gate"></a>**Quality gate / blocking gate** | A check that stops progression when it fails, normally through a nonzero exit code. |
| <a id="mutation-testing"></a>**Mutation testing** | Introducing a deliberate fault and checking whether a test detects it. Restore the original behavior after the test. |
| <a id="baseline"></a>**Baseline** | A committed snapshot used to compare later measurements. |
| <a id="ratchet"></a>**Ratchet** | A rule that permits improvement while preventing a measured regression. |
| <a id="vacuous-pass"></a>**Vacuous pass** | A passing result that does not establish the intended property, for example because a scanner examined no relevant files. |
| <a id="technical-debt"></a>**Technical debt** | A known defect or missing requirement retained with an explicit cost and closure condition. |
| <a id="blast-radius"></a>**Blast radius** | The components, users or operations affected if a change fails. |
| <a id="fail-closed"></a>**Fail closed** | Reject progression when a required measurement is missing or cannot be completed. |
| <a id="adversarial-review"></a>**Adversarial review** | Review that actively searches for counterexamples and failure cases. |
| <a id="black-box-testing"></a>**Black-box testing** | Designing checks from required behavior without relying on the implementation. The checks may be manual or automated. |
| <a id="white-box-testing"></a>**White-box testing** | Designing checks from the implementation structure, such as its statements and branches. Code inspection informs which paths to exercise. |
| <a id="runner"></a>**Runner** | The package commands, CI jobs or hooks that execute checks. |
| <a id="type-checker"></a>**Type checker** | A static analysis tool that checks type rules for the configured language and files. |

## Agent work

| Term | Definition |
|---|---|
| <a id="agent"></a>**Agent** | A program that uses a language model and tools to carry out a task. |
| <a id="subagent"></a>**Subagent** | An agent given a bounded task by another agent. Available tools, context and interaction depend on the platform. |
| <a id="prompt"></a>**Prompt** | The task instructions, constraints and expected report. |
| <a id="context-window"></a>**Context window** | The information available to the model in the current interaction. |
| <a id="autonomous-loop"></a>**Autonomous loop** | Repeated planning, execution and measurement within an authorized scope and defined stopping conditions. |
| <a id="specification-led-development"></a>**Specification-led development** | Defining intended behavior and acceptance criteria before implementation. |

## Mawja conventions

| Term | Definition |
|---|---|
| <a id="owner"></a>**Owner** | Sets priorities, resolves product decisions, approves spending and decides when to ship. |
| <a id="conductor"></a>**Conductor** | Prepares tasks, independently verifies branches, merges and records results. Does not write production code. |
| <a id="executor"></a>**Executor** | Implements a task in a separate conversation, verifies it and returns evidence. Does not merge to the main branch. |
| <a id="wave"></a>**Wave** | A bounded task with one branch, an implementation conversation and an exit checklist. |
| <a id="stop-gate"></a>**Stop gate** | The task's reporting point, reached at completion or earlier when work requires an Owner decision. |
| <a id="guard"></a>**Guard** | An automated check protecting a defined behavior. Acceptance requires evidence that it detects a relevant fault. |
| <a id="surface"></a>**Surface** | A screen, route, endpoint or other location where behavior is observed. |
| <a id="debt-ledger"></a>**Debt ledger** | Numbered records of known debt, with evidence, priority and a closure condition. |
| <a id="non-vacuity-floor"></a>**Non-vacuity floor** | The minimum number of relevant items a check must examine before it can pass. |
| <a id="crash-class"></a>**Crash class** | Configured diagnostic categories that cannot enter the error budget, including syntax errors in the supplied checker. It is not complete runtime coverage. |
| <a id="self-contained-prompt"></a>**Self-contained prompt** | Task decisions, current measurements and constraints appear in the prompt; file references provide supporting detail. |
| <a id="independent-mutation"></a>**Independent mutation** | A deliberate fault chosen by the reviewer that differs from those used by the implementer. |

## Testing examples

| Term | Example |
|---|---|
| [Acceptance criteria](#acceptance-criteria) | After saving a note and reopening the page, its text is unchanged. |
| [Black-box testing](#black-box-testing) | Save a note through the interface, reopen it and compare its text with the input. |
| [White-box testing](#white-box-testing) | Inspect the save function's error branch, then cause a write failure and verify that branch's result. |
| [User acceptance testing](#user-acceptance-testing) | A user completes the agreed note-taking tasks and assesses whether the result meets their needs. |
| [Regression testing](#regression-testing) | After adding subtraction, rerun the calculator's existing addition checks. |
| [Mutation testing](#mutation-testing) | Change subtraction to addition, confirm the subtraction check fails, then restore the code and confirm it passes. |

Black-box and white-box describe how checks are designed. UAT describes an acceptance activity involving intended users. A code review inspects implementation; a white-box test exercises behavior selected from its structure.

Apply these checks using the [verification protocol](09-the-verification-protocol.md).

For the underlying terminology, see [test techniques](https://astqb.org/4-1-test-techniques-overview/), [test levels and types](https://astqb.org/2-2-test-levels-and-test-types/) and [acceptance testing](https://istqb.org/certifications/certified-tester-acceptance-testing/). Mawja's role names and conventions are defined separately above.

---

[Previous: Start here](00-foreword.md) · [Documentation index](README.md) · [Next: 1 · The Governing Principle](01-the-governing-principle.md)
