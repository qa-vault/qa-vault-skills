---
name: search-test-cases
description: Use when you need to find existing test cases in QA Vault — locating cases about a feature or area, checking whether something is already covered, finding cases similar to a given one, or looking things up before creating or changing tests. Triggers include "find/search the test cases", "do we have tests for", "what covers", "which cases relate to". Read-only; does not create or modify anything.
---

# Search Test Cases

## Overview

QA Vault offers several ways to find cases. Picking the right mode — and combining them — is the whole job. This skill is **read-only**: it never creates, updates, or deletes anything.

## Work only with QA Vault's tools

Use the QA Vault MCP tools listed below. If another test-management MCP is also connected in the session (for example `qase`), **do not use it here** — it is a separate system with different cases. Inspect a QA Vault case with QA Vault's own `get_test_case`, not a look-alike tool from another server.

## The search modes

| Tool | What it does | Reach for it when |
|------|--------------|-------------------|
| `search_test_cases(project, query)` | Case-insensitive **substring** match on the case **title**; returns a page plus `total_count` | You know roughly what the case is called; a fast literal check |
| `list_test_cases(project, …filters)` | Structured **listing/filtering** by `suite_id` / `tags` / `priority` / `status` / `layer` (+ `search`, `fields`, `include`, `limit`/`offset`) | You want a **complete** scoped set — the only mode that enumerates exhaustively (paginate past the limit) |
| `smart_search_cases(project, query, …filters)` | **Semantic** vector search — the server selects what is relevant and labels each hit `relevance: strong` or `related` | You're searching by **meaning/concept**, where the title may not share keywords |
| `find_related_cases(case_id)` | **"More like this"** from one existing case, under the same relevance selection | You have a seed case and want its overlap/neighbors |
| `suggest_cases_for_defect(project, defect_title, …)` | Semantic search **from a defect** rather than a query, same relevance selection | You have a bug and want the cases covering the area it landed in |

For valid filter values (priority, layer, status, …), call `get_field_options` — don't guess them.

Both semantic tools accept an optional `threshold`, and it is **not** a routine parameter — there is no per-call default to tune. Relevance selection is calibrated inside the server, per mode; `threshold` only overrides the absolute floor that decides whether anything is relevant at all. Use it in exactly one situation: a search came back empty and you want to widen it deliberately — pass a *lower* value. Never raise it hoping for better matches.

`limit` is the same kind of parameter: **omit it.** The semantic modes set no default — the server returns everything its selection accepted, which is already bounded — so a `limit` can only ever hide matches the server judged relevant. Pass one only when you deliberately want a short list, and read the `total_matched` the response then carries. The listing modes are different: `list_test_cases` and the title search return a *page* plus the true `total_count`, and you page with `offset`. There, a returned page smaller than the total is normal; leaving it unread is not.

## Phrasing a semantic query

Describe what the test does in a full phrase — semantic search matches meaning, so "user resets a forgotten password from the login screen" retrieves its target reliably. Very short queries (two to four words) retrieve their target only about half the time and may clear nothing at all — describe the behaviour rather than guessing keywords. For exact wording or an id, use `list_test_cases` with its `search` parameter instead.

## Choosing and combining

- **Topic/concept** ("checkout-related", "anything about password reset") → **semantic first**; add a substring sweep on the obvious term(s) as a cheap backstop; union and dedupe by case id.
- **Known slice** ("all High-priority cases in the Login suite") → `list_test_cases` with filters; paginate to completeness.
- **"Is this already covered?"** (before authoring) → semantic + substring; confirm a real candidate with `get_test_case` before calling it a duplicate; optionally `find_related_cases` around it to see the whole cluster.
- **Everything in a suite/tag** → `list_test_cases` by `suite_id`/`tags`, not a search query.

## Presenting results

Inline, ranked: case id (number) + title + suite + the `relevance` tier the server returned. Say which searches you ran, so the engineer sees the lookup was thorough rather than one lucky keyword. Don't print raw similarity numbers — the server has already turned the score into a tier, and a cosine value reads like a percentage it isn't. Save results to a file only if asked.

**Never let a partial list read as the whole answer.** Any response carrying `truncated` also carries the real total (`total_matched` for the semantic modes, `total_count` for the listing ones): say how many of how many you are showing, then either fetch the rest — drop the `limit` you set, or page with `offset` — or state why the top slice is enough. A page that came back full is not evidence there is nothing after it; the total is.

## How far to trust the relevance tier

The tier is an aid, not a verdict — but re-scoring the results by hand throws away the calibration that produced it, so take the ranking as given and spend your judgement on the content instead. `strong` means the match cleared an absolute bar: a strong starting point, not a confirmed answer. `related` may mean nothing more than shared vocabulary. Read every returned title, and open the leading candidates with `get_test_case` before acting on them — always before calling something a duplicate or declaring an area covered. When the response says there are no strong matches, that is a signal to rephrase or widen the search, not permission to present the top row as the answer.

## Boundaries

- **Read-only.** Never create/update/delete from this skill.
- **`analyze_coverage_gaps` is a hint, not a coverage report.** The tool exists — give it a list of requirements and it returns `well-covered` / `partially-covered` / `gap` for each. But every verdict is bucketed from the **top-1 similarity of the single best-matching case**, and calibration measured that this signal does not track how much of a requirement is actually covered: across six human-labelled requirements the best achievable agreement was **67% (4 of 6)**, and the two labelled *partially covered* scored *lower* than the two labelled *not covered at all* — an inversion no pair of thresholds on one number can resolve. The redesign is filed as `qa-vault/qa-vault#28`. So use it to point at areas worth checking, confirm any verdict yourself with `get_test_case`, and call it a hint whenever you pass it on. This skill stays retrieval-only either way: you may inventory what exists and point out thin or empty areas, but a "missing" claim is your **inference**, never a computed coverage report.
- If the request is ambiguous (which project? what scope?), state your interpretation or ask before searching.
