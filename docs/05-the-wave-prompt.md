# 5 · The Wave Prompt

A task prompt must be usable in a fresh conversation. Include decisions, current measurements, constraints and [acceptance criteria](00-terms.md#acceptance-criteria) directly. Link to specific files or document sections for supporting detail. Replace every `⟪…⟫` placeholder, run `npm run wave:check -- WAVE_PROMPT_MY_CHANGE.md` for a prompt created with `--slug=my-change`, and send it to the Executor only after it reports `Ready to issue`.

## Agree on observable results

Describe what the user should be able to do and how the result will be checked. For example: "After saving a note and reopening it, its text is unchanged." Include relevant failure cases and existing behavior that must continue to work.

Ask the Conductor to turn the request into proposed criteria and [test cases](00-terms.md#test-case). As the Owner, confirm the intended behavior and scope before implementation. The Executor supplies the implementation and evidence; the Conductor verifies them independently.

## The eleven sections

| Section | Required content |
|---|---|
| **Mode and role** | Authorized scope, autonomous execution and commit policy |
| **Step 0: Read first** | Required project files and skills, in reading order |
| **Step 1: Owner decisions** | Accepted decisions, quoted and numbered; do not reopen them |
| **Step 2: Repository measurements** | Measurement date, values and verification commands; current observations take precedence |
| **Step 3: What already works** | Existing capabilities to preserve |
| **Step 4: The scope** | Included and excluded work, affected surfaces, debt identifiers and deliberate deferrals |
| **Step 5: Batch order** | Logical batches, commits, the verification plan and named helper assignments |
| **Step 6: Hard constraints** | Project requirements for environments, data, security, money, language and release |
| **Step 7: Exit gates** | Final check results, targeted mutation evidence, visual evidence and restoration |
| **Step 8: Closing and handover** | Report fields and remaining limitations |
| **The single stop gate** | Sensitivity, review requirements and the reporting point |

The Executor resolves routine implementation choices within the authorized scope. If work depends on an Owner decision, record the question, save the completed work and reach the reporting point early. Do not continue dependent work on an unapproved assumption.

## Verification and helper assignments

State which checks run during implementation, which complete suites run on the final commit, what the enforcing hook covers, and what the Conductor checks independently. Name affected guards and visual surfaces, including indirect effects from shared code or styles. Follow [the verification protocol](09-the-verification-protocol.md#schedule-checks).

List helper tasks explicitly, or state that none are planned. Apply the [closed allowlist and restrictions](03-why-a-separate-conversation.md#helper-implementation); include how questions reach the Executor and how the Executor reviews the result.

The Conductor reviews whether the plan is sufficient and whether repeated checks have a reason. The prompt checker validates placeholders and measurements; it does not assess the meaning of the plan or reject phrases about repetition.

## Required limitation field

Deliver every field required by Step 8 and its supporting evidence. End the full report with the stop-gate status summary and a path or link to the report and evidence.

Every report includes **"What I could not measure, and why."** Name the unverified behavior and its practical effect on acceptance. A passing summary must not imply coverage beyond the checks performed.

## Reusable procedures

Store recurring procedures in skills and name the relevant skills in the required reading. Each skill describes its trigger, steps, known failure cases and completion criteria.

A skill supplies the method. The prompt still supplies this task's decisions and scope. For a verification skill, use [the verification procedure](09-the-verification-protocol.md) and adapt its commands to the project's stack.

---

[Previous: 4 · The Wave Cycle](04-the-wave-cycle.md) · [Documentation index](README.md) · [Next: 6 · File Architecture](06-file-architecture.md)
