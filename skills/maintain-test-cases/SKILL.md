---
name: maintain-test-cases
description: Use when development has changed the product and existing QA Vault test cases may now be outdated — after a feature is added, changed, or expanded, or when asked to "update the tests for this change", "sync the test cases", "the login flow changed, fix the tests", or to bring test coverage back in line with new behavior.
---

# Maintain Test Cases

## Overview

A **change-driven sync**: development changed the product, so part of the QA Vault repository is now stale. Bring it back in line in **one coherent, reviewed changeset** — updates, new cases, and removals together.

## The process: explore → find → stage changeset → review → apply

Like `create-test-cases`, you do **not** write to the vault until the engineer approves a staged changeset.

1. **Explore the change** from any source you can read — a diff, PR, ticket/spec, a prose description, or the existing cases themselves. Understand what actually changed well enough to know what to look for. If the change is described too thinly, ask.
2. **Find affected cases.** Search **broadly** — a change usually ripples past the obvious area (a new 2FA login step also touches password-reset, remember-me, and any case asserting "reaches the dashboard"). Use semantic + title search; pull candidates and **read each one with `get_test_case` before deciding** — never edit step text you haven't read.
3. **Stage the changeset in `qa-vault/`.** Write the proposed changes as a Markdown draft (same `qa-vault/` folder = suite, file = set format as `create-test-cases`), showing per case what changes: edited steps, new cases, removals — and why.
4. **Review & approve.** Present the changeset, surface anything ambiguous (is this case really affected? is it in scope?), and iterate until the engineer approves.
5. **Apply, then report & clean up.** Make the approved changes, report the changeset (ids updated / created / deleted), and delete the draft.

## The changeset has three kinds of action

- **Update / extend** stale cases. Rewrite the affected `steps`/fields per case with `update_test_case`. Edits differ case to case, so **do not** use `bulk_update_test_cases` for step text — it applies one identical change to every target and overwrites them. Reserve `bulk_update_test_cases` for a genuinely uniform change (e.g. adding one tag to many cases). It also doesn't refresh semantic search, which is a second reason to prefer per-case `update_test_case` when you change case text.
- **Author net-new** cases for behavior the change introduces that nothing covers yet (e.g. wrong / expired / resend-code screens for new 2FA). Author these as manual UI scenarios **following `create-test-cases`** — same required-field model: `title`, `description`, `preconditions` (if non-obvious), `steps` (UI-verifiable, no backend detail), `priority`, `behavior`, `automation: not_automated`, and high-level reuse-first `tags` (application/module map — **not** behavior or test-type labels like `negative`/`smoke`/`regression`, which belong in the `behavior`/`type` fields); don't set `severity`/`type`/`layer`/`postconditions` unless asked.
- **Remove obsolete** cases. When a feature is gone, the cases that only tested it are obsolete. **Delete** them (`delete_test_case`) by default, after the engineer approves the removals in the changeset. When the engineer would rather keep history, set `status: deprecated` instead.

## Preserve automation status

A case's `automation` value (`not_automated` / `to_be_automated` / `automated`) reflects engineering reality you can't see from here. **Never silently change it.** When you edit an already-`automated` case, leave `automation` as-is (don't pass the field) and **flag it** to the engineer: a redesign can break the existing automated test's locators even when behavior is unchanged, so they should confirm whether it still passes. Change `automation` only on explicit instruction.

## Discipline

Search broadly before deciding; read before editing; stage the whole changeset for review before any write; surface scope ambiguity instead of guessing; report the full changeset (updated / new / deleted).
