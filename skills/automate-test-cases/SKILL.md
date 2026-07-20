---
name: automate-test-cases
description: Use when turning QA Vault manual test cases into automated Playwright specs — "automate these cases", "automate QAV-12", "what should we automate?", "generate e2e tests from the vault". Fetches cases via the QA Vault MCP, transcribes their steps into specs verified against the live app with playwright-cli, links spec and case both ways, and updates automation status. Requires the contract from setup-test-automation.
---

# Automate Test Cases

## Overview

Turn QA Vault manual cases into verified Playwright specs. The core insight: **a structured
manual case already IS the test plan** — its numbered steps and expected results are the script,
so there is no planning phase to run. Browser time is spent on one thing only: **learning the UI
the APP-MAP doesn't cover yet.** Everything a prior session mapped is transcribed, not
re-observed — so the token cost of a batch falls as the APP-MAP grows.

## Contract gate

If `e2e/AUTOMATION.md` or `e2e/tests/seed.spec.ts` is missing in the target repo, stop and direct
the engineer to `setup-test-automation` — never improvise a partial contract.

## The process

### 1. Scope the batch

Three input shapes: **explicit case IDs**, **a suite** (resolve it to its cases), or
**open-ended** ("what should we automate?").

For the open-ended form, query **`automation: to_be_automated` first** — that is the marked
backlog. But a case sitting at `not_automated` may just mean nobody set the flag, so **also sweep
`not_automated`** and propose the automatable ones as a **second, clearly separated group**:
*"candidates you haven't marked — confirm before I include them."* Nothing from this group enters
the batch without **explicit confirmation**; on approval, its status update lands as part of the
approved batch. Nothing is auto-included.

### 2. Prepare

- **`get_project_rules` first** — per QA Vault MCP guidance, before any substantive work in the
  project.
- **`get_test_case`** for each target — read the full steps, not the title.
- Read **`e2e/AUTOMATION.md`** and **only the relevant `e2e/APP-MAP.md` sections** for the areas
  in scope.

### 3. Assess automatability

Per case, before touching the browser:

- **No email round-trips**; no third-party UIs the project can't control.
- **≤ ~15 steps.** A longer case → propose **splitting it**, or **API-seeded preconditions** per
  AUTOMATION.md's seeding strategy, so the spec starts closer to the behavior under test.

**Non-automatable cases are reported back with the reason — never silently skipped.**

### 4. Recon only the unknown

If APP-MAP already covers the case's UI area, **skip straight to authoring**. Otherwise walk the
case's flow **exactly once** via the attach loop in
[references/cli-mechanics.md](references/cli-mechanics.md), harvesting locators and exact
text/values as you go, and **append every fact learned to APP-MAP.** The cost is paid **once per
UI area, not once per case** — the next case in the same area reads the map instead of the browser.

### 5. Author the spec

Transcribe the case's steps into a spec. Rules:

- **Path:** `e2e/tests/<area>/<kebab-case-scenario>.spec.ts`.
- **Import** `test`/`expect` from `../fixtures` (the contract's fixtures path), never raw
  `@playwright/test`.
- **Provenance header** — every spec opens with, verbatim:
  ```ts
  // qa-vault: project=<code> case=<case_id>
  // source: <case title> (v<version>)
  ```
- **`// N. <step text>`** comment before each step, mirroring the case's numbered steps one-to-one.
- **Locators:** role-first, **APP-MAP-first then browser** (`getByRole` → `getByLabel` →
  `getByText` → `getByTestId` escape hatch).
- **Assertions:** web-first, auto-retrying only (`toBeVisible`, `toHaveText`, …).
- **Data:** per-run unique, `` `${prefix}${Date.now()}` `` with the AUTOMATION.md Test-data
  prefix; the spec **provisions its own data and cleans up after itself**.
- **Banned waits:** `waitForTimeout`, `networkidle`, `waitForLoadState`.

### 6. Verify

1. **Iterate the single spec** to green: `npx playwright test <file>`. Only this spec — not the
   suite.
2. **Flake check** — run it **3×**; a spec that isn't green all three times isn't done.
3. **Falsifiability spot-check — one per NEW spec, on its primary assertion:** break the
   precondition via data, confirm the spec goes **red**, restore, confirm **green** again. Proves
   the assertion can actually fail.
4. **Full affected suite once**, at the very end.

### 7. Write back

- **Set both fields explicitly** in one `update_test_case`: `automation: "automated"` +
  `automation_ref: "<repo-relative spec path>"`. They are **independent fields** — a ref-only
  update wouldn't bump the case version, so always pass both together.
- **Append** every session discovery to APP-MAP.
- **Report the changeset:** specs created, cases updated, cases declined + why.

**Specs land uncommitted for engineer review — this skill never commits.**

## Discipline

Stamped, non-negotiable (spec §7):

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
