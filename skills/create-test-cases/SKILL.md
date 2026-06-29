---
name: create-test-cases
description: Use when authoring new manual UI test cases in QA Vault from a spec, ticket, code, design, or conversation — "write test cases for X", "create scenarios for this feature", "add tests covering Y". Also for simple direct edits to a specific existing case. Produces end-to-end UI scenarios (one scenario = one case with many steps), not API or unit tests.
---

# Create Test Cases

## Overview

Author manual **UI end-to-end test scenarios** in QA Vault. Core principle: **one scenario = one test case with many steps** — a complete user journey a manual tester runs in one sitting, not fragmented atomic checks.

## Scope: UI scenarios only

This skill writes end-to-end **UI** scenarios. If asked for pure **API** or **unit** tests, say that is outside this skill and offer to capture the UI-level journey instead — do not author `layer: api` or `layer: unit` cases here.

## The process: draft → review → transfer (never write straight to the vault)

QA Vault is the source of truth, but cases are **reviewed and approved by the engineer before they land there**. **Do not call `create_test_case` / `bulk_create_test_cases` until an approved draft exists.**

1. **Gather context.** Resolve the project (`list_projects`); pull the tag vocabulary (`list_tags`) and suite layout (`list_test_suites`). If the feature details are too thin to write meaningful scenarios, ask rather than invent coverage.
2. **Search first (dedupe).** Before authoring, search existing cases for overlap (semantic + title — see the `search-test-cases` modes). Surface near-duplicates and let the engineer choose: new / update existing / skip.
3. **Draft into `qa-vault/`.** Write the scenarios as Markdown under a `qa-vault/` folder at the **project root** (create it if absent). **Folder = a suite** (nested suites → nested folders); **file = a set of cases**; each case is a block with its full fields (below). This is the review artifact — not the vault.
4. **Review & approve.** The engineer reviews and edits the draft; iterate until they approve. Surfacing these choices *is* the point of the skill — don't decide silently.
5. **Transfer.** On approval, write to QA Vault: `create_test_case` for one, `bulk_create_test_cases` for many (max 100 per call). Create suites (`create_test_suite`) to match the draft folders.
6. **Report & clean up.** Report the created `case_id`s and where they landed, then **delete** the draft files — once in the vault they are done (remove, don't keep).

Single create, bulk create, and a simple single edit (`update_test_case`) are all valid — pick what fits.

## Fields to set on every case

Set **exactly** these:

- **`title`** — `[Goal] + [Context] + [Outcome]`, e.g. "Checkout — pay with a valid card and reach order confirmation". Not "Test checkout".
- **`description`** — one or two sentences on what the scenario verifies.
- **`preconditions`** — **only if non-obvious** (specific state / data / permissions). Skip the obvious ("user is logged in").
- **`steps`** — each `{action, expected_result}`. The `expected_result` carries **everything a manual tester verifies through the UI**: UI changes, validations, data persistence, visible side-effects. **No backend detail** — no endpoints, status codes, table names, or logs.
- **`priority`** — from business impact + regression risk + frequency.
- **`behavior`** — `positive` / `negative` / `destructive`.
- **`automation`** — always **`not_automated`** (these are manual cases; QA Vault has no "manual" value, `not_automated` is it). Change only if the engineer asks.
- **`tags`** — see below.

**Do not set `severity`, `type`, `layer`, or `postconditions`** unless the engineer explicitly asks. Setting them by default adds noise and false precision. For any enum value you're unsure of, call `get_field_options`.

## Tags: high-level, reuse-first

Tags form a **map of the product**, not a label dump.

- **High-level only** — application / module / sub-module / functionality (e.g. `checkout`, `authentication`, `cart`). Aim for a small, stable vocabulary.
- **Not behavior or test type** — never tag `negative`, `smoke`, `regression`; those belong in the `behavior` / `type` fields.
- **Reuse-first** — read `list_tags` and reuse the **exact existing name**; QA Vault auto-creates a tag on first use, so `Login` vs `login` silently forks the map. Propose a new tag only when nothing fits.

## Coverage

Across a set, balance happy / alternative / error / edge scenarios; weight toward where the feature actually breaks.

## Draft file format

Each case block in a `qa-vault/<suite>/<set>.md` file:

```
### <Title>
- Priority: <low|medium|high>
- Behavior: <positive|negative|destructive>
- Tags: <tag, tag>
- Preconditions: <only if non-obvious>
- Steps:
  1. <action> → Expected: <everything the tester verifies through the UI>
  2. ...
```

`automation: not_automated` applies to every case — don't repeat it per block. For full worked scenarios (mobile / web / admin / e-commerce) and an example mapped directly onto the QA Vault fields, see [references/scenario-examples.md](references/scenario-examples.md).
