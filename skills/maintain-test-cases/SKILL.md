---
name: maintain-test-cases
description: Use when development has changed the product and existing QA Vault test cases may now be outdated — after a feature is added, changed, or expanded, or when asked to "update the tests for this change", "sync the test cases", "the login flow changed, fix the tests", or to bring test coverage back in line with new behavior.
---

# Maintain Test Cases

## Overview

A **change-driven sync**: development changed the product, so part of the QA Vault repository is now stale. Bring it back in line in **one coherent, reviewed changeset** — updates, new cases, and removals together.

## The process: explore → find → stage changeset → validate → review → apply

Like `create-test-cases`, you do **not** write to the vault until the engineer approves a staged changeset.

1. **Explore the change** from any source you can read — a diff, PR, ticket/spec, a prose description, or the existing cases themselves. Understand what actually changed well enough to know what to look for. If the change is described too thinly, ask. While exploring, note anything suspicious as you pass it (see *Validation: flag suspicious behavior* below) — you'll sweep for these after staging.
2. **Find affected cases.** Search **broadly** — a change usually ripples past the obvious area (a new 2FA login step also touches password-reset, remember-me, and any case asserting "reaches the dashboard"). Use semantic + title search to gather candidates, then `get_test_case` each one and **judge affectedness from its actual `steps` and descriptive fields (`description`, `preconditions`) — not its title.** A title like "User logs in" won't mention the changed step, so a title-only scan silently drops cases whose steps do reference it. Never edit **or dismiss** a case you haven't read in full.
3. **Stage the changeset in `qa-vault/`.** Write the proposed changes as a Markdown draft (same `qa-vault/` folder = suite, file = set layout as `create-test-cases`), using the *Changeset draft format* below — per case what changes: edited steps, new cases, removals — and why.
4. **Validation sweep.** Before presenting the changeset, re-read it against what the change actually does: attach a `⚠️ VALIDATE` line (format below) to entries whose implemented behavior you noted as suspicious, and check across entries for inconsistencies (e.g., two screens now handling the same situation differently). See *Validation: flag suspicious behavior*.
5. **Review & approve.** Present the changeset, surface anything ambiguous (is this case really affected? is it in scope?), and iterate until the engineer approves. Alongside it, present a **validation summary** in chat: each flagged entry (title, draft file, one-line suspicion), plus a short *General observations* list for suspicious things you saw that didn't map to any entry. **Do not apply while any flag is unresolved** — for each flag the engineer explicitly decides: valid as-is / modify the entry / drop the entry / it's a real bug (they handle filing and choose whether the case then encodes the intended behavior or is dropped). A blanket "changeset approved" does **not** resolve flags: get a per-flag decision, or an explicit "all flags approved as valid", before any write.
6. **Apply, then report; clean up on confirmation.** Make the approved changes and report the changeset (ids updated / created / deleted). Deleting the draft is destructive — **ask before removing it and only delete on explicit confirmation**; never auto-delete.

## The changeset has three kinds of action

- **Update / extend** stale cases. Rewrite the affected `steps`/fields per case with `update_test_case`. Edits differ case to case, so **do not** use `bulk_update_test_cases` for step text — it applies one identical change to every target and overwrites them. Reserve `bulk_update_test_cases` for a genuinely uniform change (e.g. adding one tag to many cases). It also doesn't refresh semantic search, which is a second reason to prefer per-case `update_test_case` when you change case text.
- **Author net-new** cases for behavior the change introduces that nothing covers yet (e.g. wrong / expired / resend-code screens for new 2FA). Author these as manual UI scenarios **following `create-test-cases`** — grounded in the project docs + the actual new implementation (real labels/flows, not invented), same required-field model: `title`, `description`, `preconditions` (if non-obvious), `steps` (UI-verifiable, no backend detail), `priority`, `behavior`, `automation: not_automated`, and high-level reuse-first `tags` (application/module map — **not** behavior or test-type labels like `negative`/`smoke`/`regression`, which belong in the `behavior`/`type` fields); don't set `severity`/`type`/`layer`/`postconditions` unless asked.
- **Remove obsolete** cases. When a feature is gone, the cases that only tested it are obsolete. **Delete** them (`delete_test_case`) by default, after the engineer approves the removals in the changeset. When the engineer would rather keep history, set `status: deprecated` instead.

## Changeset draft format

Every case block reads **identically to a `create-test-cases` draft block** — the changeset semantics live only in the bracket prefix of the heading and one extra bullet (`Change:` / `Reason:`). Show each case's **final state**, not old→new per-field diffs.

```
### [UPDATE <case_id>] <Title>
- Change: <what changed in the product and what is edited here — and why>
- Priority: <low|medium|high>
- Behavior: <positive|negative|destructive>
- Tags: <tag, tag>
- Preconditions: <only if non-obvious>
- Steps:
  1. <action> → Expected: <the case as it will read after the update>
  2. ...

### [NEW] <Title>
- Priority: <low|medium|high>
- Behavior: <positive|negative|destructive>
- Tags: <tag, tag>
- Preconditions: <only if non-obvious>
- Steps:
  1. <action> → Expected: <everything the tester verifies through the UI>
  2. ...

### [REMOVE <case_id>] <Title>
- Reason: <why obsolete — e.g. the feature it tested is gone>
- Action: delete | deprecate (deprecate only when the engineer wants history kept)
```

Any block may end with one optional `- ⚠️ VALIDATE: <observed behavior> — <why it looks suspicious>` bullet (see below). `automation` is preserved per *Preserve automation status* — don't repeat it per block.

## Validation: flag suspicious behavior

The changed implementation **may itself contain bugs** — maintenance runs right after development changed the product, usually before anyone has manually explored it, so you are the first pair of eyes. Flag **implemented, verifiable behavior a competent QA engineer would pause at**: inconsistent behavior between screens/flows; silent data loss or truncation; missing loading/empty/error states; destructive actions without confirmation; misleading labels; dead-end flows. You are not claiming "bug"; you are saying "confirm this is intended before it becomes the approved expected result." Maintenance adds two signals of its own:

- **The change contradicts a previously approved expected result.** An existing case's expected behavior was approved truth; when the new implementation does something surprisingly different or worse, that may be a regression, not a redesign — flag the `[UPDATE]` instead of silently rewriting the case.
- **A "gone" feature may be breakage, not removal.** Before staging a `[REMOVE]`, check the disappearance is plausibly intended (the ticket/diff says so); if it looks accidental, flag it.

**Keep flags few and high-signal**: each names a concrete observed behavior and why it's suspicious — no style opinions, no speculation. "The devs confirmed it's final" or "the engineer is in a hurry" is never a reason to skip a flag — deciding is the engineer's job, noticing is yours. A flagged entry still describes the **implemented** behavior (code wins) until the engineer rules otherwise. Flags are **draft-only**: never carry a `⚠️ VALIDATE` line — or any trace of it — into the vault.

## Preserve automation status

A case's `automation` value (`not_automated` / `to_be_automated` / `automated`) reflects engineering reality you can't see from here. **Never silently change it.** When you edit an already-`automated` case, leave `automation` as-is (don't pass the field) and **flag it** to the engineer: a redesign can break the existing automated test's locators even when behavior is unchanged, so they should confirm whether it still passes. When such a case has an `automation_ref`, include it in the flag — that is the spec whose locators may now be stale; healing it is `heal-automated-tests`' job, not this skill's. Change `automation` only on explicit instruction.

## Discipline

Search broadly before deciding; read before editing; stage the whole changeset for review before any write; surface scope ambiguity instead of guessing; report the full changeset (updated / new / deleted).
