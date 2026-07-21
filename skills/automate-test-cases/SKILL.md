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

**Batch loop.** Steps 2–6.3 run **per case** — each case's write-back (automation fields + APP-MAP
append, step 7) lands as soon as it goes green after 6.3. Step 6.4 (full affected suite) runs **once
per batch** after all specs are authored, as the final gate; step 7's report closes the whole batch.

### 1. Scope the batch

Three input shapes: **explicit case IDs**, **a suite** (resolve it to its cases), or
**open-ended** ("what should we automate?").

For the open-ended form, query **`automation: to_be_automated` first** — that is the marked
backlog. But a case sitting at `not_automated` may just mean nobody set the flag, so **also sweep
`not_automated`** and propose the automatable ones as a **second, clearly separated group**:
*"candidates you haven't marked — confirm before I include them."* Nothing from this group enters
the batch without **explicit confirmation**, granted **per case** — the engineer may approve some
candidates and decline others; each approved case's status update lands as part of the approved
batch. Nothing is auto-included.

### 2. Prepare

- **`get_project_rules` first** — per QA Vault MCP guidance, before any substantive work in the
  project; the `project` code comes from AUTOMATION.md's **QA Vault project** section.
- **`get_test_case`** for each target — read the full steps, not the title.
- Read **`e2e/AUTOMATION.md`** and **only the relevant `e2e/APP-MAP.md` sections** for the areas
  in scope.

### 3. Assess automatability

Per case, before touching the browser:

- **No email round-trips**; no third-party UIs the project can't control.
- **Off-limits, per AUTOMATION.md** — a case whose flow enters an off-limits area (payments, real-
  user emails, banned third-party surfaces) is declined with that reason, never driven anyway.
- **≤ ~15 steps.** A longer case → **API-seeded preconditions** per AUTOMATION.md's seeding
  strategy when the excess steps are setup (seed the state so the spec starts closer to the
  behavior under test), or **propose splitting** when the case genuinely holds two scenarios.

**Non-automatable cases are reported back with the reason — never silently skipped.**

### 4. Recon only the unknown

If APP-MAP already covers the case's UI area, **skip straight to authoring**. Otherwise walk the
case's flow **exactly once** via the attach loop in
[references/cli-mechanics.md](references/cli-mechanics.md), harvesting locators and exact
text/values as you go, and **append every fact learned to APP-MAP; a fact that contradicts an
existing entry replaces it.** The cost is paid **once per UI area, not once per case** — the next
case in the same area reads the map instead of the browser.

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
- **Data:** per-run unique, `` `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}` `` with the AUTOMATION.md Test-data
  prefix; the spec **provisions its own data and cleans up after itself**.
- **Banned waits:** `waitForTimeout`, `networkidle`, `waitForLoadState`.

### 6. Verify

1. **Iterate the single spec** to green: `npx playwright test <file>`. Only this spec — not the
   suite.
2. **Flake check at BATCH level.** After each batch spec is green **individually**, run the new
   specs **together twice** (parallel workers exercise data collisions); any failure gets **one
   isolated rerun** before classification.
3. **Falsifiability — TARGETED, not universal.** Break-and-restore only the **first spec in a
   previously-uncovered APP-MAP area** plus **any known-trap assertion** (CSS-transformed text,
   animated list removals, glyph-sibling chips) — force **red**, restore, confirm **green**; others
   rely on web-first assertions + the flake check. A broken run **aborts before its own cleanup**:
   after restoring, delete what it left behind (the spec's cleanup path) — leftovers are parallel-suite mines.
4. **Full affected suite once**, at the very end.

### 7. Write back

- **Set both fields explicitly** in one `update_test_case`: `automation: "automated"` +
  `automation_ref: "<repo-relative spec path>"`. They are **independent fields** — setting the
  ref never flips the status and clearing the status never clears the ref, so always set both
  explicitly.
- **Append** every session discovery to APP-MAP; a fact that contradicts an existing entry replaces
  it.
- **Report the changeset:** specs created, cases updated, cases declined + why.
- **Stale schema** — if the QA Vault MCP **rejects or silently drops a documented parameter**, its
  cached tool schemas likely predate a server deploy; **reconnect the MCP server**, don't work around it.

**Specs land uncommitted for engineer review — this skill never commits.**

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
- **Product bugs** — verification tripping over suspected **product** misbehavior: reproduce
  minimally, **file per `skills/heal-automated-tests/references/defect-propagation.md`** (plugin-root
  relative), **decline or `fixme`** the case, continue. Never turn authoring into a debugging session.
- **Screenshots** — only when a human will look at them.
- **Models** — Sonnet-class models are sufficient and preferred for authoring/healing loops.
