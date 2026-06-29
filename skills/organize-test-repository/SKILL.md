---
name: organize-test-repository
description: Use when restructuring or cleaning up existing test content in QA Vault — managing suites (create, move, reorder, re-parent, delete), managing tags (rename, merge near-duplicates, delete), reordering or moving cases between suites, or auditing the repository for tag sprawl, empty suites, and duplicate cases. Triggers include "reorganize", "clean up", "merge tags", "restructure suites".
---

# Organize Test Repository

## Overview

Structural housekeeping over existing QA Vault content — suites, tags, and case placement/order. This skill does **not** author case content (that's `create-test-cases`); it restructures and cleans up what's already there.

## Two modes

- **Reactive** — you name the operation ("merge these tags", "move this suite under that one", "regroup these 40 cases into sub-suites", "reorder these") → do it.
- **Proactive audit** — "clean up the repository" / "what's messy here?" → inventory and look for near-duplicate tags (`login`/`Login`/`log-in`), tag sprawl, orphan or empty suites, and likely duplicate cases, then propose a cleanup plan.

## Preview in chat, then execute — for every structural write

Structural operations do **not** use the `qa-vault/` draft lifecycle (there is no case content to edit). Instead, **preview the plan in chat and get a confirm before executing — for every consequential write, including ones that look obvious.** Show what changes, the affected set, and the blast radius. Examples:

- "Merge `Login`, `log-in` → `login`: re-tags ~N cases, deletes 2 tags."
- "Create sub-suites Cart/Shipping/Payment/Confirmation under Checkout and move these 12 / 9 / 14 / 5 case ids."

This matters most for the high-blast-radius tools: `merge_tags` (deletes the source tags), `delete_tag` (strips it from every case), `delete_test_suite` / `delete_test_suite_deep` (the deep form removes a whole subtree of suites **and** their cases), and `delete_test_case`.

## Suites

Read the tree first — `list_test_suites`, and `get_suite_summary` for case counts and tag distribution. Then: `create_test_suite`, `update_test_suite`, `move_test_suite` (re-parent; cycle-guarded), `set_test_suite_order` / `set_test_case_order` (reorder), `move_test_cases` (relocate; batch by target suite). After a restructure, **verify counts reconcile** — the source count drops and the sub-suite counts sum to the original. `move_test_cases` moves rather than copies; the count check catches a slip.

## Tags

Consolidate near-duplicates with `merge_tags(sources, into)` — it re-tags every case onto the winner and deletes the sources atomically. That is the right tool; do not delete-then-retag. Use `rename_tag` to fix a single name, and `delete_tag` only to genuinely retire a tag (it strips it from every case). Keep the taxonomy **high-level** — an application/module map, the same philosophy as `create-test-cases`. If the canonical name is unclear, or whether two tags are genuinely synonyms, ask before merging.

## Duplicate cases

There is **no "merge cases" tool**, so organize only **flags** likely duplicates — never auto-resolves them.

1. Find candidates: `find_related_cases` at a **high** threshold (precision over recall), plus near-identical titles.
2. Confirm: `get_test_case` on **both** and compare full content (steps, expected results, preconditions) — not titles. A positive case and its negative are related but **not** duplicates.
3. For each confirmed pair, let the **engineer decide per pair** — keep / deprecate / delete — with **no default action**.
4. Before removing a duplicate, **reconcile** anything unique it carries (tags via `merge_tags`; step/precondition content by hand) into the survivor, or that content is lost permanently.

## Discipline

Preview every structural change in chat and get a confirm before executing; surface ambiguity (which canonical name? which suite? a true duplicate or just related?); report exactly what changed.
