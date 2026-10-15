---
name: create-test-cases
description: Use when authoring new manual UI test cases in QA Vault from a spec, ticket, code, design, or conversation — "write test cases for X", "create scenarios for this feature", "add tests covering Y" — and for an explicitly requested immediate write of one specific case. Produces end-to-end UI scenarios (one scenario = one case with many steps), not API or unit tests.
---

# Create Test Cases

## Overview

Author manual **UI end-to-end test scenarios** in QA Vault. Core principle: **one scenario = one test case with many steps** — a complete user journey a manual tester runs in one sitting, not fragmented atomic checks. The proposal is a **changeset** in the vault: the engineer reviews it on the web Review page and applies it there; nothing reaches the repository before that.

## Scope: UI scenarios only

This skill writes end-to-end **UI** scenarios. Asked for pure **API** or **unit** tests, say that is outside this skill and offer the UI-level journey instead — never `layer: api` / `layer: unit` here.

## Ground every case in the docs, then the real implementation

Scenarios must describe what is **actually built**, never a hypothetical UI. Two passes, both required, in this order:

1. **Read the project documentation first.** READMEs, `docs/`, specs, feature guides, ADRs. Docs describe the product at a **higher level** — intended flows, domain concepts, how the application is structured. They may be partial or absent; use what exists and note the gaps.
2. **Then explore the actual implementation.** Routes, page/screen components, forms and their real field/label text, auth and config (e.g. which login providers actually exist), and empty/error states. This is where every step and expected result gets its concrete, verifiable detail.

**Do not invent** button labels, providers, fields, or flows. Where the docs and the code disagree, the **running code wins** — note the discrepancy. If you can't verify how something works from either, **flag the assumption** for the engineer instead of guessing.

## The process: explore → propose structure → stage → validate → hand over → act on feedback (never write straight to the vault)

QA Vault is the source of truth, but cases are **reviewed and approved by the engineer before they land there**. The proposal lives in the vault as a **changeset**: you stage it, the engineer reviews it on the web Review page, and the vault writes it when they apply. **Do not call `create_test_case` / `bulk_create_test_cases` for reviewed work** — see *When the person asks for a direct write* for the one exception.

1. **Gather context — QA Vault *and* the real product.** On the QA Vault side: resolve the project (`list_projects`), pull the tag vocabulary (`list_tags`) and the suite layout (`list_test_suites`), read the project's rules and lessons (`get_project_rules`, `get_project_lessons`). On the product side: docs first, then the actual implementation (section above). If the feature details are too thin, ask rather than invent coverage. While exploring, note anything suspicious as you pass it — you'll sweep for these before staging.
2. **Search first (dedupe).** Before authoring, search existing cases for overlap — semantic **and** title, since either alone misses (see the `search-test-cases` modes); one title search is not a dedupe. Phrase the semantic query as a full description of the behaviour, not two or three keywords. Then **confirm each candidate with `get_test_case` before calling it a near-duplicate** — a `related` hit may share nothing but vocabulary. Surface the confirmed overlaps and let the engineer choose: new / update existing / skip — an existing case goes in as an `update_case` item per `maintain-test-cases` → *The three kinds of item* (the whole current case, every field kept), never as a trimmed `create_case`. An empty result means nothing cleared the relevance floor — not proof the area is uncovered.
3. **Propose the suite structure — semantic-first.** Shape the suite/sub-suite breakdown around the **application's semantic structure** — its domains, as the docs and the app's own information architecture reveal them — **not a flat list of functional areas**; functional groupings live *within* it. When the scope spans distinct areas, **propose the breakdown in chat and get a confirm before staging**. The agreed structure is what `suite_ref` will point at.
4. **Write the cases, then sweep them.** Compose every case in full (fields below) with the whole set in front of you — the abstracts must distinguish siblings. Then the **validation sweep**: re-read the set against what you observed in the code, write a flag for each case whose implemented behavior looked suspicious, and look across the set for inconsistencies (two screens handling the same situation differently). Nothing is staged yet.
5. **Stage the changeset.** `create_changeset` with a title that says what the proposal is about and a `summary` (recipe below). Then `stage_changeset_items`: every case as a `create_case` item with its `suite_ref` (`{ "suite_id": null }` for Ungrouped — always present) and its `flags`. New suites go first, as `create_suite` items in a call of their own (one call per nesting level, parents first), then the cases point at them with `{ "item_id": n }` from that response; then one call for all the cases, never one per case. A refusal names the field: fix the payload, never trim the case to get past it.
6. **Hand over.** Update the summary if staging changed anything, then tell the engineer in chat: the `review_url` the create call returned, how many cases and suites were staged, the **validation summary** (each flagged case: title, one-line suspicion) and a short *General observations* list for suspicious things outside the cases. One sentence on what happens next: they review, edit, leave feedback or approve on that page and tell you when they want you to act. Then stop — do not offer to apply.
7. **Act on feedback.** When the engineer comes back — "I left feedback", "take a look", or just "next" — **read `get_changeset` first**, every time: their decisions, their in-place edits, `pending_comments` with their items, per-item `revision`. For each pending comment: re-stage the addressed items with `item_id` and the `expected_revision` you just read — the **whole item** again, edited: `kind`, `case_id`, `suite_ref`, `change_note`, the still-unresolved flags as their `text` strings, and the payload (a re-stage replaces all of them; an omitted `suite_ref` drops a new case into Ungrouped, omitted flags silently lift the approval block) — then `resolve_changeset_comment` with a one-sentence note on what changed. Feedback given **in chat** gets the same record: `add_changeset_comment` on the items it concerns, in the engineer's words, before you act, resolved the same way after — the Review page's feedback overview is the complete history, the chat is not. Before handing over again, read `get_changeset` once more: a comment still in `pending_comments` is unanswered, however sure you are. Then hand over (step 6, shorter). Never re-stage an item nobody asked you to change — it resets to `staged` and discards the person's decision; "while I'm at it" is not a request.
8. **Report when it lands.** The engineer applies on the Review page or asks you to (see *The changeset lifecycle*). After an apply, report what landed the way they see it in QA Vault — each case as `#number "title"` under its suite, from the apply response or `get_changeset`. Case numbers under `embedding.failed` are saved but not yet findable by semantic search: run `backfill_embeddings` for the project until nothing remains, and say so.

### Summary — the living report on the changeset

The `summary` is the report the engineer reads **on the Review page**; the chat only points at it. Write it on create, keep it current with `update_changeset_summary`. Its parts, in order:

1. **Scope** — what was asked, which source grounded it, what was explicitly left out.
2. **Dedupe** — what you searched and what you found (confirmed overlaps and the decision on each; "no overlap found" when so).
3. **Structure** — the suites used and proposed, one line each, and why the split.
4. **Flagged** — every flagged case: title, the observed behavior, why it looks suspicious.
5. **General observations** — suspicious things outside the cases.
6. **Changes since the last review** — after a feedback round: which items were re-staged and why.

## The changeset lifecycle

The vault, not the chat, is where approval happens. Hold these lines:

- **Approval is read, never assumed.** "Looks good" in chat is not a decision: the engineer approves items on the Review page, and `get_changeset` shows you what they decided.
- **Decide, resolve, apply or discard over MCP only when the engineer says so in this conversation**, in those words — "approve them all", "apply it", "resolve that flag", "discard it". "Write the cases", "get them in", "hurry" or "just do it" is a request to **stage**. When they do ask you to apply, apply what is approved; `mode: "all"` only when they said to apply everything. An item you re-staged is back in review, not approved: when they say "apply" and the items are `staged`, say so and ask whether to approve them in their name and apply; only on their yes, `decide_changeset_items` approve, then `apply_changeset`. Report the response as it came back.
- **A conflict is the engineer's call.** `changed_since_staged: true` means the case changed in the vault after you staged. Re-stage against `current` with the new `expected_revision` so your proposal builds on their edit, and say so; never ask for `overwrite_conflicts` on your own initiative. An item an apply reports under `conflicts` is theirs to overwrite or return.
- **One changeset per piece of work.** A new request is a new changeset; a follow-up on an open one re-stages into it. Check `list_changesets` before opening another, and a case whose `open_changesets` is not empty is already being proposed on — say so first.
- **Re-staging is the only edit.** A re-staged item is the whole item again — payload, `suite_ref`, `change_note`, flags; start from what `get_changeset` returns (it carries the engineer's in-place edits), not from memory. The one re-stage nobody has to ask for is a `changed_since_staged` item, and it too resets the item to `staged`.

| Pressure | What it is not |
|---|---|
| "I'm in a hurry, just put them in the vault" | Not a decision. Stage, hand over the link: the review is one click per item. |
| "They approved it in the chat" | Not a decision. Decisions are on the page; `get_changeset` shows them. |
| "It's one small case, a changeset is overkill" | Still a changeset: the diff and the record are the point. |
| "They named one specific case, so they want a direct write" | A single case is not the exception; the words "now" / "no review" / "straight away" are. |
| "Apply all, they trust me" | Only on "apply" / "apply all" said in this conversation. |
| "Shall I apply it for you?" | Don't offer. They apply on the page, or say the word. |
| "The flag is obviously fine, I'll resolve it" | You noticed; they decide. |
| "The case changed in the vault; my version is better" | Re-stage on top of their edit. Overwrite is theirs to choose. |
| "While re-staging this item I'll tidy the neighbouring one" | Nobody asked. A re-stage discards their decision on that item. |

## When the person asks for a direct write

Only when the engineer **explicitly** asks for an immediate change to one specific case, bypassing review — "just fix the typo in #42 now", "delete #17, no review", "add this one case straight away" — write directly with `update_test_case`, `delete_test_case` or `create_test_case`, one case. Say in one sentence that this bypasses review and leaves no changeset record (a directly created case lands as `draft`), then do exactly what was asked: `tags` **replaces** the whole tag set; an edit that changes what the case verifies regenerates `search_abstract` in the same call; `embedding_stale` in the answer means semantic search still matches the **previous** wording — run `backfill_embeddings` and report it. Anything else goes through a changeset.

## Validation: flag suspicious behavior

The implementation you ground scenarios in **may itself contain bugs** — drafting often happens before the engineer has manually explored the shipped feature, so you are the first pair of eyes. Flag **implemented, verifiable behavior a competent QA engineer would pause at**. You are not claiming "bug"; you are saying "confirm this is intended before it becomes an expected result." Three kinds:

- **Suspicious functional logic** — behavior inconsistent between screens/flows of the same app; surprising edge handling (silent data loss or truncation, odd limits); state that unexpectedly doesn't persist.
- **Non-functional nuances visible in the UI** — no feedback on slow operations; missing loading/empty/error states; unbounded lists.
- **Questionable UX decisions** — destructive actions without confirmation; misleading labels; dead-end flows; deviations from platform conventions or the app's own patterns.

**Keep flags few and high-signal**: each names a concrete observed behavior and why it's suspicious — no style opinions, no speculation. Not the "flag the assumption" rule (*missing* evidence); a validation flag marks evidence you **have** that looks wrong. "The devs confirmed it's final" or "the engineer is in a hurry" is never a reason to skip a flag — deciding is the engineer's job, noticing is yours. A flagged case's steps still describe the **implemented** behavior (code wins) until the engineer rules otherwise.

Each flag is one string in the item's `flags` — `"<observed behavior> — <why it looks suspicious>"`. The Review page shows it beside the case and blocks approval until the engineer resolves it; the case text carries no trace of it. Repeat the flagged cases in the summary's *Flagged* part.

## Fields to set on every case

Set **exactly** these:

- **`title`** — the **scenario only**: `[Context] + [Action] + [Outcome]` (e.g. "Sign in with valid credentials and reach the projects page"). **No suite/module-name prefix** — the suite and tags already carry the module context. No generic titles like "Test login".
- **`description`** — one or two sentences on what the scenario verifies.
- **`preconditions`** — **only if non-obvious** (specific state / data / permissions). Skip the obvious ("user is logged in").
- **`steps`** — each `{action, expected_result}`, grounded in the real UI (real labels/fields/flows). The `expected_result` carries **everything a manual tester verifies through the UI**: UI changes, validations, data persistence, visible side-effects. **No backend detail** — no endpoints, status codes, table names, or logs.
- **`priority`** — from business impact + regression risk + frequency.
- **`behavior`** — `positive` / `negative` / `destructive`.
- **`automation`** — always **`not_automated`** (QA Vault has no "manual" value; this is it). Change only if the engineer asks.
- **`search_abstract`** — the case's hidden second face in semantic search (format in the tool description: `Verifies:` / `Also asked as:` / `Technical terms:`, max 80 words). It must distinguish this case from its suite siblings — write it while the whole set is in front of you, never as a description of the shared feature area; no suite/tag/product names. Regenerate it whenever an edit changes what the case verifies.
- **`tags`** — see below.

**Do not set `severity`, `type`, `layer`, or `postconditions`** unless the engineer explicitly asks — defaults add noise and false precision. For an enum value you're unsure of, call `get_field_options`.

## Tags: high-level, reuse-first

Tags form a **map of the product**, not a label dump: **high-level only** (application / module / sub-module / functionality — `checkout`, `authentication`, `cart`; a small, stable vocabulary); **not behavior or test type** (`negative`, `smoke`, `regression` belong in the `behavior` / `type` fields); **reuse-first** — read `list_tags` and reuse the **exact existing name**, since QA Vault auto-creates a tag on first use and `Login` vs `login` silently forks the map. Propose a new tag only when nothing fits.

## Coverage

Across a set, balance happy / alternative / error / edge scenarios; weight toward where the feature actually breaks.

## Item payload

Each case is one `create_case` item of `stage_changeset_items`: `payload` is the whole case as `create_test_case` takes it — exactly the fields above, nothing more (no `severity`, `type` or `layer` unless asked; no `status` — a proposal has none and lands `active` when applied); `suite_ref` is the placement; `flags` the validation flags; `change_note` one line on why the case exists. A new suite is a `create_suite` item with `payload: { title, description }` and a `suite_ref` to its parent, staged before the cases that point at it with `{ "item_id": <its id> }`.

For full worked scenarios (mobile / web / admin / e-commerce) and the coverage spread they show, see [references/scenario-examples.md](references/scenario-examples.md).
