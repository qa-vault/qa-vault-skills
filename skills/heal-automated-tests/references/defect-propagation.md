# Defect propagation — filing a confirmed product bug

The shared rule for **every place the harness confirms a product bug** —
`heal-automated-tests` triage today, `run-automated-tests` recording today, and any future skill
that reaches the same verdict. It is a standalone reference so those skills point to one copy at
`skills/heal-automated-tests/references/defect-propagation.md`.

A confirmed product bug lands in **QA Vault first, then the project's own tracker**,
cross-referenced both ways. The agent **confirms the defect content with the user once** — and
**never files silently into external systems.**

## 1. QA Vault first

`create_defect` with the **full reproduction details** — QA Vault is the QA source of truth, so
the complete record lives here regardless of what else is reachable. Fill the defect body template
below (title, steps to reproduce, expected vs actual, environment, linked case / spec / run
references). **Keep the returned defect ID** — every other destination cross-references it.

## 2. Then the project's tracker

File the same bug into the project's development lifecycle. **Discover the session's issue channel
in priority order — use the first that works:**

1. **A repository-specific task-creation skill** available in the session — a skill that exists to
   create issues/tasks for *this* repo. First priority.
2. **A connected task-management MCP** for the project's tracker (Jira, Linear, GitHub Issues, …).
3. **Any other available tool** — e.g. the `gh` CLI.

**Cross-reference both ways:** the tracker issue carries the QA Vault defect ID, and the QA Vault
defect (`update_defect`) carries the tracker issue link. Neither record dangles.

## 3. No channel → ready-to-paste fallback

When the session has **no reachable tracker capability**, do not drop the bug: put the **complete
defect body verbatim** into the session report — the same filled template — so the user creates
the issue with a single copy-paste.

## Single confirmation, never silent

The defect content is **confirmed with the user once**, as part of the verdict/report flow, and
then lands in **every** destination (QA Vault + tracker, or QA Vault + report fallback). The agent
**never silently files** issues into external systems.

## Defect body template

Ready to fill — the same body goes to QA Vault, the tracker, and the fallback report:

```
Title: <concise symptom — what's wrong, where>

Steps to reproduce:
1. <step>
2. <step>
3. <step>

Expected: <what the QA Vault case says should happen>
Actual:   <what the app actually did>

Environment: <app URL / build or commit / browser + viewport / test-data prefix>

References:
- Spec:  <repo-relative spec path>:<line>
- Case:  <project code> / <case_id> (v<version>)
- Run:   <QA Vault run id> / result <result id>   (when filed from a recorded run)
- Trace: <playwright trace or report pointer>
```
