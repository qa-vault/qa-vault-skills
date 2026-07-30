---
name: backfill-search-abstracts
description: Use when a QA Vault project has test cases without a search_abstract — "generate abstracts for project X", "backfill search abstracts", "these cases are missing abstracts", or when another skill or a UI signal reports mass abstract absence. Inventories the gap, splits the work into whole-suite zones, writes sibling-distinguishing abstracts, checks the batch, applies them via MCP, and repairs embeddings. Writes ONLY the search_abstract field — never case content.
---

# Backfill Search Abstracts

## Overview

A case's `search_abstract` is its second face in semantic search: a hidden, search-only text embedded into its own vector, so the case is found under phrasings its own wording doesn't carry (plain user language, paraphrases, technical jargon). Cases created through the web UI — and every case that predates the feature — have no abstract and are findable only through their text face.

This skill closes that gap **in bulk** for a project. It writes exactly one field — `search_abstract` — and touches nothing else: no steps, no titles, no tags, no metadata. Single-case abstract work that arises during other flows stays in those flows (`create-test-cases` authors the abstract with the case; `maintain-test-cases` regenerates it when an edit changes what the case verifies).

## 1. Inventory the gap

Ask the server for exactly the lacking cases — never page the whole project through your context to test a field's presence:

```
list_test_cases(project, missing_abstract: true, fields: ["id", "case_number", "title", "suite_id"], limit, offset)
```

The response's `total_count` is the gap size; paginate to collect every lacking case's number and suite. Report the numbers ("118 of 215 cases lack an abstract, across N suites") and **confirm the scope with the engineer before writing anything**. The abstracts themselves are invisible infrastructure and are not reviewed per item — the scope, and a sample of the output (step 4), are what the engineer sees.

## 2. Zone the work — whole suites, never fragments of one

Split the lacking cases into zones of **1–2 related suites (~20–30 cases)** and process each zone as one unit — dispatch parallel subagents where the session supports it, or work zone by zone.

**Never split a suite across zones.** The whole quality of an abstract is that it *distinguishes* its case from the siblings ("wrong password" vs "unregistered email", "empty suite removal" vs "removal with blast radius"). An author who sees one case in isolation writes about the shared feature area instead — which pulls the family's vectors *together* and makes the siblings harder to tell apart in search, the opposite of the point.

A zone author reads **every case of the zone in full** (title, description, preconditions, steps — `get_test_case`) before writing the first abstract. Cases in the zone that already have an abstract are read too (they are context), but not rewritten.

## 3. Write the abstracts

The canonical format lives in the write tools' own `search_abstract` description; in short — exactly three lines per case:

```
Verifies: <one plain-language sentence — what the user encounters in this flow, as an end user would put it; the encounter, not necessarily something rendered on screen>
Also asked as: <2-3 short alternative phrasings another QA might type when looking for exactly this case>
Technical terms: <3-6 industry terms for the concepts involved, e.g. "least-privilege enforcement", "anti-enumeration", "idempotency">
```

Hard rules: every line specific to THIS case and distinguishing it from its zone siblings; no suite, folder, tag, or product names; no filler openers ("This test case…"); max 80 words per case.

## 4. Check the batch before applying

Per zone, before any write:

- **Format** — all three labeled lines present in every block.
- **Bans** — no product name, no suite/tag names, no boilerplate openers, length within bounds.
- **Sibling overlap** — compare each pair of same-suite abstracts for lexical overlap; a pair sharing more than roughly half its content words means two siblings blurred into one topic — rewrite them to sharpen the difference. (Genuine near-twin cases are the acceptable exception.)
- **Spot-read the riskiest zones** — conceptual families that span outcomes rather than screens (permission levels, live updates, recovery flows) blur most easily.

Show the engineer a small sample (2–3 abstracts from different zones) with the zone counts — not the full batch.

## 5. Apply and repair

**Each zone agent applies its own zone's writes** — per case with `update_test_case`, sending **only** `search_abstract` — and reports counts; the writes are then spread across the parallel agents instead of serialized through one session, which is what keeps a several-hundred-case project inside a reasonable wall-clock. The write is version-neutral (the case's `version` does not change) and the server embeds the new face immediately.

If any write reports an embedding failure or staleness, run `backfill_embeddings` for the project until it reports nothing remaining — it repairs both faces (case text and abstract). Do not report the backfill as done while anything remains.

## 6. Report

Zone-by-zone counts (written / skipped / failed), the overlap pairs that needed a rewrite, and the final `backfill_embeddings` state. Cases that could not be processed stay listed by number — a silent gap here recreates the exact problem this skill exists to close.

## Boundaries

- **`search_abstract` only.** Never modify case content, steps, tags, metadata, or structure — if reading a zone surfaces stale cases or bugs, report them for the `maintain-test-cases` flow instead of fixing them here.
- **Never write an abstract for a case you have not read in full.**
- **Never delete or blank an existing abstract** — clearing (`search_abstract: null`) is a deliberate act outside this skill's scope.
- Model-agnostic: abstracts are written by whichever agent the engineer runs; this skill never prescribes one.
