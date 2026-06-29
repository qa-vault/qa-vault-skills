---
name: search-test-cases
description: Use when you need to find existing test cases in QA Vault — locating cases about a feature or area, checking whether something is already covered, finding cases similar to a given one, or looking things up before creating or changing tests. Triggers include "find/search the test cases", "do we have tests for", "what covers", "which cases relate to". Read-only; does not create or modify anything.
---

# Search Test Cases

## Overview

QA Vault offers several ways to find cases. Picking the right mode — and combining them — is the whole job. This skill is **read-only**: it never creates, updates, or deletes anything.

## Work only with QA Vault's tools

Use the QA Vault MCP tools listed below. If another test-management MCP is also connected in the session (for example `qase`), **do not use it here** — it is a separate system with different cases. Inspect a QA Vault case with QA Vault's own `get_test_case`, not a look-alike tool from another server.

## The four search modes

| Tool | What it does | Reach for it when |
|------|--------------|-------------------|
| `search_test_cases(project, query)` | Case-insensitive **substring** match on the case **title** | You know roughly what the case is called; a fast literal check |
| `list_test_cases(project, …filters)` | Structured **listing/filtering** by `suite_id` / `tags` / `priority` / `status` / `layer` (+ `search`, `fields`, `include`, `limit`/`offset`) | You want a **complete** scoped set — the only mode that enumerates exhaustively (paginate past the limit) |
| `smart_search_cases(project, query, …filters, threshold=0.3)` | **Semantic** vector search ranked by `similarity` | You're searching by **meaning/concept**, where the title may not share keywords; default threshold favors recall |
| `find_related_cases(case_id, threshold=0.5)` | **"More like this"** from one existing case | You have a seed case and want its overlap/neighbors |

For valid filter values (priority, layer, status, …), call `get_field_options` — don't guess them.

## Choosing and combining

- **Topic/concept** ("checkout-related", "anything about password reset") → **semantic first**; add a substring sweep on the obvious term(s) as a cheap backstop; union and dedupe by case id.
- **Known slice** ("all High-priority cases in the Login suite") → `list_test_cases` with filters; paginate to completeness.
- **"Is this already covered?"** (before authoring) → semantic + substring; confirm a real candidate with `get_test_case` before calling it a duplicate; optionally `find_related_cases` around it to see the whole cluster.
- **Everything in a suite/tag** → `list_test_cases` by `suite_id`/`tags`, not a search query.

## Presenting results

Inline, ranked: case id (number) + title + suite + `similarity`/score. Say which searches you ran, so the engineer sees the lookup was thorough rather than one lucky keyword. Put a low-confidence tail under a separate "borderline — your call" heading instead of silently including or dropping it. Save results to a file only if asked.

## Boundaries

- **Read-only.** Never create/update/delete from this skill.
- **No coverage/gap tool exists.** You may inventory what exists and point out thin or empty areas, but say plainly that "missing" is your **inference** from a wide search against a mental checklist — not a computed coverage report.
- If the request is ambiguous (which project? what scope?), state your interpretation or ask before searching.
