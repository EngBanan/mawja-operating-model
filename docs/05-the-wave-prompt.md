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
| **Step 4: The scope** | Included and excluded work, debt identifiers and deliberate deferrals |
| **Step 5: Batch order** | Logical implementation batches and commits |
| **Step 6: Hard constraints** | Project requirements for environments, data, security, money, language and release |
| **Step 7: Exit gates** | Required checks and evidence |
| **Step 8: Closing and handover** | Report fields and remaining limitations |
| **The single stop gate** | Sensitivity, review requirements and the reporting point |

The Executor resolves routine implementation choices within the authorized scope. If work depends on an Owner decision, record the question, save the completed work and reach the reporting point early. Do not continue dependent work on an unapproved assumption.

## Required limitation field

Every report includes **"What I could not measure, and why."** Name the unverified behavior and its practical effect on acceptance. A passing summary must not imply coverage beyond the checks performed.

## Reusable procedures

Store recurring procedures in skills and name the relevant skills in the required reading. Each skill describes its trigger, steps, known failure cases and completion criteria.

A skill supplies the method. The prompt still supplies this task's decisions and scope. For a verification skill, use [the verification procedure](09-the-verification-protocol.md) and adapt its commands to the project's stack.

---

[Previous: 4 · The Wave Cycle](04-the-wave-cycle.md) · [Documentation index](README.md) · [Next: 6 · File Architecture](06-file-architecture.md)
