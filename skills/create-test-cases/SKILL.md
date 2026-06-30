---
name: create-test-cases
description: Use when authoring new manual UI test cases in QA Vault from a spec, ticket, code, design, or conversation — "write test cases for X", "create scenarios for this feature", "add tests covering Y". Also for simple direct edits to a specific existing case. Produces end-to-end UI scenarios (one scenario = one case with many steps), not API or unit tests.
---

# Create Test Cases

## Overview

Author manual **UI end-to-end test scenarios** in QA Vault. Core principle: **one scenario = one test case with many steps** — a complete user journey a manual tester runs in one sitting, not fragmented atomic checks.

## Scope: UI scenarios only

This skill writes end-to-end **UI** scenarios. If asked for pure **API** or **unit** tests, say that is outside this skill and offer to capture the UI-level journey instead — do not author `layer: api` or `layer: unit` cases here.

## Ground every case in the docs, then the real implementation

Scenarios must describe what is **actually built**, never a hypothetical UI. Gather understanding in two passes, both required, in this order:

1. **Read the project documentation first.** READMEs, `docs/`, specs, feature/usage guides, ADRs. Docs describe the product at a **higher level** — intended flows, domain concepts, and how the application is structured — which orients everything after it. Docs may be partial or absent; use whatever exists and note the gaps.
2. **Then explore the actual implementation.** Routes, page/screen components, forms and their real field/label text, auth and config (e.g. which login providers actually exist), and empty/error states. This is where every step and expected result gets its concrete, verifiable detail.

**Do not invent** button labels, providers, fields, or flows. Where the docs and the code disagree, the **running code wins** (docs drift) — note the discrepancy. If you can't verify how something works from either, **flag the assumption** for the engineer instead of guessing. Every step and expected result must be behavior that is implemented and observable in the real UI.

## The process: explore → propose structure → draft → review → transfer (never write straight to the vault)

QA Vault is the source of truth, but cases are **reviewed and approved by the engineer before they land there**. **Do not call `create_test_case` / `bulk_create_test_cases` until an approved draft exists.**

1. **Gather context — QA Vault *and* the real product.** On the QA Vault side: resolve the project (`list_projects`), pull the tag vocabulary (`list_tags`) and the suite layout (`list_test_suites`). On the product side: **read the project docs, then explore the actual implementation** for the scope (per "Ground every case in the docs, then the real implementation" above) so the scenarios reflect what's built and you understand how the app is structured. If the feature details are too thin to write meaningful scenarios, ask rather than invent coverage.
2. **Search first (dedupe).** Before authoring, search existing cases for overlap (semantic + title — see the `search-test-cases` modes). Surface near-duplicates and let the engineer choose: new / update existing / skip.
3. **Propose the suite structure — semantic-first.** Shape the suite/sub-suite breakdown around the **application's semantic structure** — its domains and conceptual map, as revealed by the docs and the app's own information architecture / navigation — **not merely a flat list of functional areas**. Think "how is this product meaningfully organized?", with functional groupings living *within* that semantic structure. When the scope spans distinct semantic areas, **propose the breakdown in chat and get a confirm before drafting** — don't collapse distinct areas into one suite/file. The agreed structure (existing suites + any new sub-suites) determines the draft folders and files.
4. **Draft into `qa-vault/`** — **one draft file per (sub-)suite** from the agreed structure. Write under a `qa-vault/` folder at the **project root** (create it if absent). **Folder = a suite** (nested suites → nested folders); **file = a set of cases**; each case is a block with its full fields (below). This is the review artifact — not the vault.
5. **Review & approve.** The engineer reviews and edits the draft; iterate until they approve. Surfacing these choices *is* the point of the skill — don't decide silently.
6. **Transfer.** On approval, write to QA Vault: `create_test_case` for one, `bulk_create_test_cases` for many (max 100 per call). Create the suites/sub-suites (`create_test_suite`) to match the agreed structure.
7. **Report & clean up.** Report the created `case_id`s and where they landed, then **delete** the draft files — once in the vault they are done (remove, don't keep).

Single create, bulk create, and a simple single edit (`update_test_case`) are all valid — pick what fits.

## Fields to set on every case

Set **exactly** these:

- **`title`** — describe the **scenario only**: `[Context] + [Action] + [Outcome]` (e.g. "Sign in with valid credentials and reach the projects page"). **No suite/module-name prefix** — don't write "Login — sign in…": the case already lives in a suite and carries tags, so the module context is redundant in nearly every view. Avoid generic titles like "Test login".
- **`description`** — one or two sentences on what the scenario verifies.
- **`preconditions`** — **only if non-obvious** (specific state / data / permissions). Skip the obvious ("user is logged in").
- **`steps`** — each `{action, expected_result}`, grounded in the real UI (real labels/fields/flows, not invented — see *Ground every case in the real implementation*). The `expected_result` carries **everything a manual tester verifies through the UI**: UI changes, validations, data persistence, visible side-effects. **No backend detail** — no endpoints, status codes, table names, or logs.
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
