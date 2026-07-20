---
name: setup-test-automation
description: Use when preparing a repository for AI-driven Playwright e2e automation with QA Vault — "set up test automation", "bootstrap e2e automation", "prepare this repo for automated tests" — or when another qa-vault automation skill reports the automation contract files are missing. Interviews the engineer with argued recommendations, scaffolds Playwright + playwright-cli, the seed test and fixtures, and the per-project AUTOMATION.md / APP-MAP.md contract files.
---

# Set Up Test Automation

## Overview

A **one-time bootstrap** that takes any web-app repo to agent-ready Playwright state. The output *is the contract*: the files every other qa-vault automation skill (`automate-test-cases`, `heal-automated-tests`, `run-automated-tests`) reads before it runs. Everything project-specific lives in those generated files — **this skill itself stays universal**; nothing about your app is hard-coded here.

Run it **once per repository**. The other skills refuse to run without the contract and point back here.

## Prerequisites

- **Node 18+** and a web app testable by Playwright (a URL you can open in a browser).
- **QA Vault MCP connected** — the automation loop reads cases and writes results through it.
- **`@playwright/test` ≥ 1.60** and **`@playwright/cli` ≥ 0.1.16** — this skill installs them if absent. Its command is `playwright-cli`; use `npx playwright cli` when a global install is unwanted.

## The process: detect → interview → scaffold → verify → hand off

This skill commits nothing — **every artifact lands for the engineer to review** (see *Hand off*).

### 1. Detect

Inspect the repo before asking anything: package manager (from the lockfile), any existing `playwright.config.*` or `e2e/` tests, the app framework, the dev-server command (`package.json` scripts), and whether CI exists. Carry the findings into the interview so every recommendation is grounded in what is actually here.

### 2. Interview — a guided consultation, not a form

For **every** question: first inspect the repo and the running app, then **recommend the option you judge right for this project, with your argumentation** — the engineer confirms or overrides. Never present a bare checklist.

- **Base URL + run command** — the URL the app serves on and the command that starts it.
- **Auth model** — a dedicated test account with reusable storage state (the recommended default), programmatic vs UI login, or unauthenticated when the app has no login.
- **Test-data strategy** — can tests hit a seeding API or script, or is it UI-only? **Unique-prefix naming** for everything a test creates (default prefix `e2e-` plus a per-run suffix). Cleanup policy — each test removes what it created.
- **Off-limits areas** — what agents must never drive: payments, emails to real users, third-party surfaces.

The answers become `e2e/AUTOMATION.md`.

### 3. Scaffold

Generate the artifacts from [references/scaffold-templates.md](references/scaffold-templates.md), filled with the interview answers: install/verify `@playwright/test` + `playwright-cli`; write `playwright.config.ts` (auth setup project, `storageState`, `webServer`, agent-run reporter/retry defaults), `e2e/tests/auth.setup.ts`, `e2e/tests/fixtures.ts`, `e2e/tests/seed.spec.ts`, `e2e/AUTOMATION.md`, `e2e/APP-MAP.md` (skeleton with per-area headings), and the `.gitignore` additions.

### 4. Verify — prove the whole toolchain before any authoring

1. Run the seed test headless to **green**: `PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/tests/seed.spec.ts`.
2. One `--debug=cli` attach round-trip so the agent path is proven end to end: `PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/tests/seed.spec.ts --debug=cli`, then `playwright-cli attach <session>`, `resume`, and detach.

If either step is red, fix the scaffold before handing off — a broken bootstrap breaks every skill downstream.

### 5. Hand off

Print the contract summary: files created and the key interview decisions. **Nothing is committed without the engineer** — they review and commit.

## Adapting an existing Playwright setup

**Adapt, don't replace.** Diff what already exists against the contract and propose the **minimal** changes to close the gap — reuse the engineer's config, fixtures, and auth wherever they already satisfy it.

Adaptation has a hard limit, though: **the contract must actually hold, or the harness will not work.** When the existing setup conflicts with a contract requirement — no reusable auth state, tests depending on shared mutable data, or config that blocks agent-driven runs — **do not silently work around it.** Clearly warn the engineer, name the blocker, argue for the correct setup, and get agreement on the change before proceeding.

## The contract files

Created here, maintained by every later session:

| File | Purpose |
|---|---|
| `playwright.config.ts` | baseURL, auth setup project + `storageState`, `webServer`, agent-run reporter/retry defaults |
| `e2e/AUTOMATION.md` | project policy: test-data prefix + cleanup, seeding strategy, auth model, run commands, off-limits areas |
| `e2e/APP-MAP.md` | append-forever knowledge base: per-area known-good locators, empirical quirks, navigation facts |
| `e2e/tests/fixtures.ts` | auth/navigation fixtures specs import instead of raw `@playwright/test` |
| `e2e/tests/seed.spec.ts` | the environment bootstrap every generation/heal session attaches to |

**APP-MAP.md format — curated markdown, never CLI artifacts.** One `## <Feature area>` section per area; each holds known-good locators as Playwright code, one-line `⚠` quirk warnings, and navigation rules in prose. Raw `.playwright-cli/` outputs (snapshots, screenshots, logs) stay gitignored and **never** enter this file. Every session appends the page facts it learned.

**Provenance header — the case↔spec link every skill relies on.** Each generated spec opens with, verbatim:

```ts
// qa-vault: project=<code> case=<case_id>
// source: <case title> (v<version>)
```

Greppable in both directions by any agent, with no product dependency. `automate-test-cases` writes it; the other skills read it to resolve spec↔case pairs.
