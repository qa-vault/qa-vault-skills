# Report format — apply-lessons-learned

Three artifacts, all in chat, in this order. Keep the shapes exactly; the engineer reads them
diagonally across runs.

## 1. Scope proposal (before any analysis)

```
Lessons (highest impact first)
  L1  [critical]  <takeaway, one line>
  L2  [high]      <takeaway>
  …
Modules (from docs / navigation / suite tree)
  M1  <module> — <one line>            ← origin of L1
  M2  <module> — <one line>
  …
Pick lessons and modules (numbers, ranges, or "all" for a list).
```

After the answer, restate and confirm:

```
Scope: L1, L3 × M2, M4, M5 — 6 cells. Proceed?
```

## 2. Risk profile (one per chosen lesson)

```
L1 — <takeaway>
  Mechanism:      <the class of failure in one sentence, grounded in the incident>
  Preconditions:  <what must be true for it to fire>
  Symptoms:       <what a user or an agent would observe>
  Search cues:    <literal things to look for: primitives, call shapes, patterns, doc sections>
```

## 3. Final report

```
## Scope
<the confirmed matrix and cell count>

## Coverage gaps
| Lesson | Module | Verdict | Level | What a case must exercise | Nearest existing case |
|---|---|---|---|---|---|
| L1 | M2 | gap | UI | <behaviour the case drives and the outcome it asserts> | QAV-166 (tool-level only) |
| L1 | M4 | partial | tool/API | <…> | QAV-81 |

Tool/API rows are ready-to-author briefs: mechanism, steps, expected outcome are all in the row.

## Suspected bugs (suspected, not confirmed)
| # | Lesson | Module | What the user does | What they expect | What actually happens | Impact | Evidence | Would confirm it |
|---|---|---|---|---|---|---|---|---|
| B1 | L1 | M2 | edits a rule after a teammate deleted it, presses Save | an error, editor stays open | editor closes as if saved | silent data loss | apps/web/src/features/rules/useRuleMutations.ts (no row check after update) | reproduce with two sessions |

## Guarded
L1×M5 — <guard named, path>; L3×M2 — <…>

## Unverified / not detectable statically
L3×M4 — <why>

Nothing was written.
```

The last line is literal. If a row later becomes a write at the engineer's request, the follow-up
message reports the id and location of what was created.

## Filled example (abridged)

```
Scope: L1 × M2 (Rules), M4 (Tags) — 2 cells. Proceed?   → yes

L1 — Row-level security filters silently: a write matching no row succeeds with zero rows.
  Mechanism:      an update/delete whose row was removed or became unwritable returns no error
  Preconditions:  concurrent delete by another session, or a role change after the page rendered
  Symptoms:       editor/dialog closes as if saved; next refresh shows the old value
  Search cues:    .update( / .delete( followed by .eq( without .select(; callers that close UI on resolve

## Coverage gaps
| L1 | Rules | gap | UI | edit a rule after it was deleted elsewhere; expect an error and an open editor | QAV-166 (tool-level only) |
| L1 | Tags  | gap | UI | rename a tag that no longer exists; expect an error, dialog stays open | none |

## Suspected bugs
| B1 | L1 | Rules | edits a rule a teammate just deleted, presses Save | error, editor stays open | editor closes, nothing saved | silent data loss | useRuleMutations.ts: update without .select() | two-session repro |
| B2 | L1 | Tags  | renames a tag deleted meanwhile | error | dialog closes | phantom rename | useTagMutations.ts: same shape | two-session repro |

## Guarded
none in scope

## Unverified / not detectable statically
none

Nothing was written.
```
