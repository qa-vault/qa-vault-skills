# Defect propagation — filing a confirmed product bug

The shared rule for **every place the harness confirms a product bug** —
`heal-automated-tests` triage today, and any future skill that reaches the same verdict. It is a
standalone reference so those skills point to one copy at
`skills/heal-automated-tests/references/defect-propagation.md`. `run-automated-tests` uses this
rule only to **link** an already-confirmed defect to a recorded run/result — the confirming triage
itself is `heal-automated-tests`' job. The reverse flow — **closing** a defect the product has since
fixed — mirrors this same discipline and lives in *Closing the loop* below.

A confirmed product bug lands in **QA Vault first, then the project's own tracker**,
cross-referenced both ways. The agent **confirms the defect content with the user once** — and
**never files silently into external systems.**

## 0. Search before filing

Before creating anything, **search for an existing report of this symptom** — `list_defects` in QA
Vault, and the project's tracker when it's reachable. If a match already exists, **link and update
it** — add the backlink via `update_defect` plus a tracker comment — instead of filing a
duplicate. Only proceed to step 1 when no matching defect is found.

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

## Closing the loop — resolving a fixed product defect

Filing is not the end of a defect's life. When a later run proves the product is fixed — a
`test.fail()` spec **unexpectedly passes**, the built-in fix detector — the same defect is resolved.
**Closure is the exact reverse of filing, with the same discipline:**

1. **QA Vault first.** `update_defect` on the defect the spec's `issue` annotation points to — set
   its status to resolved/closed per the project's defect workflow, with a closing note naming the
   run or spec that proved the fix and the case now flipped to `automated`.
2. **Then the project's tracker.** Close the linked tracker issue through the **same channel that
   filed it** (repo task-creation skill → task-management MCP → `gh` CLI, in that priority order),
   referencing the QA Vault defect ID. Both records move together — neither is left open once the
   other is closed.
3. **Single confirmation, never silent.** The outward closure — the tracker issue — is **confirmed
   with the user once**, as part of the verdict/report flow, exactly as filing is. Never silently
   close an issue in an external system.

If a fixed spec has **no matching open defect** to resolve, report that anomaly (the marker was
removed without a defect record behind it) rather than closing nothing silently.

## Defect body template

The body records **what QA observed** — symptom, minimal repro, expected vs actual, environment,
references; a code-level diagnosis is **welcome when already known but never required**, and never
worth extra investigation time.

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
