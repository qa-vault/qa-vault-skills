---
name: heal-automated-tests
description: Use when Playwright specs generated from QA Vault cases are failing — "fix the failing e2e tests", "the suite is red", "heal these specs", or when run-automated-tests hands over failures. Triages each failure into test defect, data-isolation defect, intent change, or product bug; fixes only what belongs to the test; escalates the rest (case updates via maintain-test-cases, defects into QA Vault plus the project's tracker).
---

# Heal Automated Tests

## Overview

When Playwright specs derived from QA Vault cases go red, healing is **triage first, editing
second** — every failure gets a verdict before a single line changes. The failure mode this whole
harness exists to prevent is **false healing**: retargeting a similar element (or loosening an
assertion) to force green, which masks a real regression. What makes that avoidable here is the
**QA Vault case — the oracle other harnesses lack**: the case states what the app is *supposed* to
do, so a failure can be judged "the test is wrong" vs "the app is wrong" instead of guessed at.

## Contract gate

If `e2e/AUTOMATION.md` or `e2e/tests/seed.spec.ts` is missing in the target repo, stop and direct
the engineer to `setup-test-automation` — never improvise a partial contract.

## The process

### 1. Reproduce cheaply

**Start from the real artifacts.** A heal handoff must carry the **verbatim Playwright error +
call-log** from the actual failing run and the paths to its `test-results/*/error-context.md`
files. A paraphrased symptom is not a sufficient handoff — when those artifacts are missing,
**request or regenerate them before investing in reproduction.**

Run **only the failing specs**, list reporter, **`--trace on`**, `PLAYWRIGHT_HTML_OPEN=never` —
never the whole suite. (`--trace on` is deliberate: local Playwright configs typically record no
trace for a **first-attempt** failure — exactly the failures heal diagnoses — so force it on for
the repro run.) Before any diagnosis, **rerun each failure once in isolation.** A pass on the isolated
rerun is **not automatically flake**: first check the original failure's signature for data/state
collision — unique-name violations, entities from another spec, leftover records — and that
signature means an **isolation defect**, not flake. Only a **signature-less, non-recurring**
isolated-pass is flake — reported as flake and never "healed."

### 2. Inspect

**Consult the repro run's trace first** — the `--trace on` run from step 1 already records the DOM,
network, and console at the moment of failure, so read it before hand-building an instrumented
diagnostic spec or attaching a live session. Attach **at the failure**: `--debug=cli` on the
failing `<file>:<line>`, then drive the
attach-and-observe loop in
[skills/automate-test-cases/references/cli-mechanics.md](skills/automate-test-cases/references/cli-mechanics.md)
— it lives in the automate skill's directory; the plugin ships as one tree, so the relative path
resolves (path relative to the plugin root). Pull **scoped** snapshots to files, plus console and
network **only as the failure
demands** — read only the failing spec's error context, never a full-page dump into the
conversation.

### 3. Triage — four verdicts, four exits

Every failure gets exactly one verdict; each verdict has one exit. Judge against the case — **never
force green.**

- **Test defect** (locator drift, timing) → **fix the spec.** Hard rules: **never
  weaken an assertion to pass; never edit product code; no `waitForTimeout`/`networkidle`.**
  Re-harvest the correct locator (APP-MAP-first, role hierarchy) and fix the wait or data, keeping
  the assertion's meaning intact.
- **Isolation defect** (the test collides with its own or a parallel run's data/state) → **fix the
  data strategy per AUTOMATION.md** — unique per-run naming, self-cleanup — **not the symptom.**
  Do not paper over a leak with a retry or a hard-coded wait.

  **Test defect vs isolation defect:** reproduces on a solo rerun with clean state → **test
  defect**; only reproduces with prior leftover state or under concurrent execution (colliding
  names, leaked entities in the failure signature) → **isolation defect**.
- **Intent change** (the app now deliberately behaves differently) → **the spec is not the truth,
  the case is.** Hand off to **`maintain-test-cases`** to update the manual case first, **then
  re-derive the spec from the updated case.** The provenance header keeps case↔spec identity
  stable across the rewrite. Never edit the spec to match new behavior without updating its source
  case.
- **Product bug** (spec right, app wrong) → **reproduce minimally — just enough to rule out a test
  defect — then propagate per
  [references/defect-propagation.md](references/defect-propagation.md)** and mark the spec
  **`test.fixme()` with the defect reference** so the suite stays green while the bug is open, and
  **report it to the engineer.** This harness is traditional QA: it **finds and files**. **Do NOT
  root-cause into app source, database, or network internals beyond confirming the symptom** —
  code-level diagnosis belongs to whoever picks up the ticket, a later SDLC stage. Never delete or
  weaken the spec to hide the failure.

### 4. Close

- **Minimum evidence for a "healed" verdict:** **2 isolated runs** of the fixed spec green, **1
  affected-suite run** read via **`--reporter=json`** (`stats.unexpected` = 0), and **1 final
  post-cleanup confirmation** — the affected suite once, at the very end. Add runs beyond this set
  only when each proves a **distinct named fact** (e.g. a deliberate budget-proof run for a timeout
  fix); green reruns that prove nothing new are wasted turns.
- **Append every new page fact** discovered while inspecting to APP-MAP; a fact that contradicts an
  existing entry replaces it.
- **Report verdict-by-verdict:** each failure, its verdict, and its exit (spec fixed / case + spec
  re-derived / defect filed + `fixme` / flake).

**Healed specs land uncommitted for engineer review — this skill never commits.**

**Anti-false-healing warning:** retargeting a similar element to force a spec green **masks
regressions.** When an element's accessible **name or role changed meaning** — not just its
selector — that is an **intent change**, not a locator fix: the app's contract moved, so the case
moves first (via `maintain-test-cases`), never the spec alone.

## Discipline

Stamped, non-negotiable:

- **Context** — snapshots to files only, never a full-page snapshot into context; query them with
  `find`/scoped reads.
- **Iteration** — iterate ONE spec; full affected suite once at the end; minimal reporter;
  `PLAYWRIGHT_HTML_OPEN=never`.
- **Locators** — APP-MAP-first then browser; role hierarchy `getByRole` → `getByLabel` →
  `getByText` → `getByTestId`; every locator discovered is written back to APP-MAP.
- **Waits** — banned: `waitForTimeout`, `networkidle`, `waitForLoadState`; web-first assertions
  only.
- **Data** — per-run unique prefix + self-cleanup; preconditions via seeding API when the contract
  allows.
- **Honesty** — never weaken an assertion to pass, never edit product code, escalate on ambiguous
  intent.
- **Screenshots** — only when a human will look at them.
- **Models** — Sonnet-class models are sufficient and preferred for authoring/healing loops.
