---
name: run-automated-tests
description: Use when executing the automated Playwright suite and recording the outcome in QA Vault — "run the automated tests and report", "record an automated run", "execute the regression suite into the vault". Runs the specs, separates flake from failure, creates an origin=automated test run via the QA Vault MCP, records per-case results, and queues real failures for heal-automated-tests.
---

# Run Automated Tests

## Overview

The **reporting leg** of the harness: execute the Playwright specs and land the outcome in QA
Vault as a test run — **the same shape, and the same place, as a manual run.** This skill does not
author or repair specs; it runs what exists, tells flake apart from real failure, records per-case
results against their source cases, and hands genuine failures to `heal-automated-tests`. The
provenance header on each spec is what maps a green/red spec back to the QA Vault case it proves.

## Contract gate

If `e2e/AUTOMATION.md` or `e2e/tests/seed.spec.ts` is missing in the target repo, stop and direct
the engineer to `setup-test-automation` — never improvise a partial contract.

## The process

### 1. Scope

- **`get_project_rules` first** — per QA Vault MCP guidance, before any substantive work in the
  project.

Three input shapes: **all automated cases** (cases at `automation: automated`), **a suite**
(resolve it to its cases), or **the specs matching a QA Vault run template**.

**Resolve spec↔case pairs by grepping provenance headers** — every generated spec opens with
`// qa-vault: project=<code> case=<case_id>`, so a grep across `e2e/tests/` maps each spec to its
case and each in-scope case to its spec, in both directions.

**A case whose spec file is missing — moved or deleted — is reported, never silently dropped.** It
is in scope but has no artifact to run; surface the gap in the report rather than letting it vanish
from the results.

### 2. Execute

- **Full scoped run**, retries per `playwright.config.ts`, **list reporter**,
  `PLAYWRIGHT_HTML_OPEN=never`. Execution is **headless via `npx playwright test`** — no
  browser-driving needed.
- **Rerun every failure once in isolation before classifying it.** A spec that passes on the
  isolated rerun is **flake, not a failure.**
- **Flake is reported as flake — never recorded as a failed result.** Only a failure that survives
  its isolated rerun is a real failure.
- If you must look at the live page to classify a failure, attach via
  [skills/automate-test-cases/references/cli-mechanics.md](skills/automate-test-cases/references/cli-mechanics.md)
  — it lives in the automate skill's directory; the plugin ships as one tree, so the relative path
  resolves. Deeper diagnosis and repair belong to `heal-automated-tests`.

### 3. Record

- **`create_test_run`** with **`origin: "automated"`**, the `project` code, the in-scope
  `case_ids` (or `template_id`), and title following the convention **`Automated <scope> <date>`**
  (e.g. `Automated smoke-suite 2026-07-20`).
- **`bulk_record_results`** with one entry per executed case — `case_id`, `status`, `comment`:
  - **`passed`** / **`failed`** per the outcome; every failure's **`comment` = one-line error
    summary + trace pointer** (`<file>:<line> — <assertion/error>; trace: <report or trace path>`).
  - A spec marked **`test.fixme()` over an open defect** → **`blocked`**, comment = the defect
    reference. A **Playwright-skipped** spec → **`skipped`**, comment = the skip reason.
  - **Flake gets NO recorded result** — it appears in the report as flake only.
- **`complete_test_run`** once the scope fully executed — leave the run active if execution was
  partial.
- **Confirmed product bugs propagate per
  [skills/heal-automated-tests/references/defect-propagation.md](skills/heal-automated-tests/references/defect-propagation.md)**
  — it lives in the heal skill's directory; the plugin ships as one tree, so the relative path
  resolves. **Link each filed defect to the run result it came from.**

### 4. Hand off

Real failures needing repair are queued as **explicit input for `heal-automated-tests`** — a list,
**one line each: `<file>:<line>` + one-line error summary.** This skill records; it does not fix.
**The engineer decides whether healing runs now** or later — never auto-invoke it.

## Discipline

Stamped, non-negotiable (spec §7):

- **Reporter** — minimal **list reporter**, `PLAYWRIGHT_HTML_OPEN=never`, headless
  `npx playwright test`; no full-page snapshot enters context (diagnosis is heal's job).
- **Isolation** — every failure rerun once in isolation **before** it is classified.
- **Honesty** — flake is reported as flake and **never recorded as a failed result**; the run
  records only what actually happened.
- **Models** — Sonnet-class models are sufficient and preferred for authoring/healing loops.
