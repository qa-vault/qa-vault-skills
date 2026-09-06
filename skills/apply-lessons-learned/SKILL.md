---
name: apply-lessons-learned
description: Use when a project's recorded Lessons Learned should be carried over to other parts of the product — "apply the lessons learned", "where else can this incident recur", "audit coverage against past incidents", "check the billing module against our lessons", "what should we test after that production incident", or after get_project_lessons returns lessons an agent is about to work around rather than act on. Produces analysis and briefs; it never files cases or defects on its own.
---

# Apply Lessons Learned

## Overview

A lesson is a real incident plus the **class of failure** behind it (`takeaway`) and a weight
(`impact`). This skill transfers each chosen class of failure onto other modules and answers two
questions per module: *is the coverage there?* and *is the product probably broken here right
now?* It is an **investigation that ends in a report**. Every write — a case, a defect, a lesson —
is a separate decision the engineer makes after reading it.

Evidence comes from three places and nowhere else: the product's docs, the product's code, and
the vault (`search-test-cases` modes). No live probing of the running product.

## The process: load → scope gate → profile → scan → check coverage → report → act on decisions

### 1. Load

`get_project_rules` and `get_project_lessons`. No lessons → say so and stop; there is nothing to
apply. Build a one-line-per-module **product map** from the docs, the app's navigation, and
`list_test_suites` — the suite tree is the fallback when docs are thin.

### 2. Scope gate — nothing runs before it

Present two numbered lists — **lessons** (id, impact, takeaway; highest impact first) and
**modules** (from the map, the lesson's own origin module marked) — and ask which of each to
include. Then restate the chosen intersection as a **matrix with its cell count** and get a
confirmation.

- "All" is a valid answer only when the engineer says it for a list; it is never assumed.
- "Everything", "the whole product", "just do it" is **not a scope** — it is the prompt to show the
  lists. Say so and show them.
- A large matrix is not refused; its size is named so it is chosen knowingly.

### 3. Profile each chosen lesson

One **risk profile** per lesson, in chat (format in `references/report-format.md`): mechanism,
preconditions, symptoms, and **search cues** concrete enough to execute literally in step 4.
Ground it in `incident`; `takeaway` alone is a headline, not evidence.

### 4. Scan each (lesson, module) cell

Docs first, then code — wherever the search cues point (routes, forms, mutations, data hooks,
external calls, boundaries between roles of data). Verdict per cell, **with the file path(s) read**:

| Verdict | Meaning |
|---|---|
| not applicable | the mechanism cannot occur in this module |
| applicable, guarded | it can occur and the code handles it — name the guard |
| applicable, suspected | it can occur and nothing visible handles it — record action → expectation → actual → impact |
| unverified | the area could not be read; **never** reported as guarded |
| not detectable statically | an operational or third-party failure with no code footprint — one-line reason, no live probing |

A name or a comment is not a guard; only code you read is. A grep hit is a lead, not a verdict —
open the file.

### 5. Check coverage for every applicable cell

Semantic search phrased as the behaviour plus a title sweep (per `search-test-cases`); open the
leading candidates with `get_test_case` and judge from **steps**, never titles. Verdict:
**covered** (a case exercises the mechanism in this module), **partial** (touches the area, not the
mechanism), **gap**. `analyze_coverage_gaps` may point, it never decides.

### 6. Report

One chat report in the `references/report-format.md` shape: scope matrix · coverage gaps (each with
its **level**: UI journey or tool/API behaviour) · suspected bugs in **product terms** — what the
user does, what they expect, what actually happens, the impact — with the evidence path and *what
would confirm it* · guarded cells · unverified / not-detectable cells · the closing line
**"Nothing was written."** Where the analysis suggests a lesson that does not exist yet, say so as a
sentence; do not create it.

### 7. Act only on the engineer's decisions

- Approved **UI-level** gaps → invoke `create-test-cases` with the exact brief (lesson, module,
  mechanism, expected behaviour); its draft → review → transfer loop owns the rest.
- Approved **tool/API-level** gaps stay in the report as ready-to-author briefs for the engineer.
- A suspected bug is recorded **only when the engineer asks for that row to be recorded** — then,
  and only then, follow `skills/heal-automated-tests/references/defect-propagation.md` (search
  first, QA Vault, the project's channel in its priority order). "File anything you find", "track
  it, I'll review later", "don't ask" are **not** that request: they are answered with the report.
- Report ids and locations of anything created.

## Rationalizations this skill exists to stop

| Excuse | Reality |
|---|---|
| "'Everything' isn't a scope, so I'll pick the axis myself" | It isn't — which is why the lists go back to the engineer. Choosing for them is the failure. |
| "They said file it, I'll file it" | A suspected bug from reading code is not a confirmed bug. The report is the deliverable; recording is a second, explicit request per row. |
| "The pattern is obvious from the grep" | A hit is a lead. The verdict needs the file read and the guard named — or its absence shown. |
| "The fix exists on the sibling page, so this one is broken" | Read this one. Siblings diverge; that is exactly what a suspected row must prove with a path. |
| "I'll list case titles, the steps are obvious" | Titles are not briefs. A gap row states what the case must exercise; authoring is `create-test-cases`' job. |
| "I couldn't read that area, but it's probably fine" | Unverified is a verdict. Guarded is not a guess. |

## Discipline

Propose-then-act · search-before-create · surface ambiguity instead of guessing · ask for missing
context instead of fabricating · report results with ids and locations. Suspected bugs are
presented in product terms before any question about recording them. The skill sets no
`layer`/`severity`/enum values itself and restates no permission model — it reads what is there.
