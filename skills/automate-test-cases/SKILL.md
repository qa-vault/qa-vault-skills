---
name: automate-test-cases
description: Use when turning QA Vault manual test cases into automated Playwright specs — "automate these cases", "automate QAV-12", "what should we automate?", "generate e2e tests from the vault". Fetches cases via the QA Vault MCP, transcribes their steps into specs verified against the live app with playwright-cli, links spec and case both ways, and updates automation status. Requires the contract from setup-test-automation.
---

# Automate Test Cases

## Overview

Turn QA Vault manual cases into verified Playwright specs. The core insight: **a structured
manual case already IS the test plan** — its numbered steps and expected results are the script,
so there is no planning phase to run. Browser time is spent on one thing only: **learning the UI
the APP-MAP doesn't cover yet.** Everything a prior session mapped is transcribed, not
re-observed — so the token cost of a batch falls as the APP-MAP grows.

## Contract gate

If `e2e/AUTOMATION.md` or `e2e/tests/seed.spec.ts` is missing in the target repo, stop and direct
the engineer to `setup-test-automation` — never improvise a partial contract.

## The process

**Batch loop.** Steps 2–6.3 run **per case** — each case's write-back (automation fields + APP-MAP
append, step 7) lands as soon as it goes green after 6.3. Step 6.4 (full affected suite) runs **once
per batch** after all specs are authored, as the final gate; step 7's report closes the whole batch.

### 1. Scope the batch

Three input shapes: **explicit case IDs**, **a suite** (resolve it to its cases), or
**open-ended** ("what should we automate?").

For the open-ended form, query **`automation: to_be_automated` first** — that is the marked
backlog. But a case sitting at `not_automated` may just mean nobody set the flag, so **also sweep
`not_automated`** and propose the automatable ones as a **second, clearly separated group**:
*"candidates you haven't marked — confirm before I include them."* Nothing from this group enters
the batch without **explicit confirmation**, granted **per case** — the engineer may approve some
candidates and decline others; each approved case's status update lands as part of the approved
batch. Nothing is auto-included.

**Size the batch by forecast turns, not case count.** Before committing to a batch, forecast the
session's size from **zone depth × interactivity**, not the number of cases. Zones whose states are
**URL-addressable** are cheap to recon — a probe reaches them with no attach tax; zones that need
**provisioned data, modal flows, or realtime-driven UI** cost far more per case. **Split a deep zone
into sequential batches** rather than exceed what one session holds — a session degrades past roughly
**250–300 tool turns**, so keep the forecast under that ceiling.

### 2. Prepare

- **`get_project_rules` first** — per QA Vault MCP guidance, before any substantive work in the
  project; the `project` code comes from AUTOMATION.md's **QA Vault project** section.
- **`get_test_case`** for each target — read the full steps, not the title.
- Read **`e2e/AUTOMATION.md`** and **only the relevant `e2e/APP-MAP.md` sections** for the areas
  in scope.

### 3. Assess automatability

Per case, before touching the browser:

- **No email round-trips**; no third-party UIs the project can't control.
- **Off-limits, per AUTOMATION.md** — a case whose flow enters an off-limits area (payments, real-
  user emails, banned third-party surfaces) is declined with that reason, never driven anyway.
- **≤ ~15 steps.** A longer case → **API-seeded preconditions** per AUTOMATION.md's seeding
  strategy when the excess steps are setup (seed the state so the spec starts closer to the
  behavior under test), or **propose splitting** when the case genuinely holds two scenarios.

When a case's entry state is **URL-addressable**, a one-shot **probe** (cheap, read-only, no attach
tax — see [references/cli-mechanics.md](references/cli-mechanics.md) → *Probe*) confirms the surface
the case describes actually exists as described before you commit to automating it; a case pointing
at a screen that has moved or vanished is an intent-change candidate for `maintain-test-cases`, not
an automation target.

**Non-automatable cases are reported back with the reason — never silently skipped.**

### 4. Recon only the unknown

If APP-MAP already covers the case's UI area, **skip straight to authoring**. Otherwise recon the
case's flow **exactly once**, cheapest instrument first — both live in
[references/cli-mechanics.md](references/cli-mechanics.md):

- **Probe every URL-addressable state first.** For each state the case reaches by URL, run the
  one-shot **probe** — it writes the page's aria structure to a file with no attach-session tax.
  Read the snapshot and harvest the stable roles and exact text/values from it.
- **Attach only for the interactive layers** the probe cannot reach by URL — dialogs, menus,
  client-side toggles, multi-step flows — via the attach loop. Probe reduces attach sessions to
  roughly one per fresh area; it does not eliminate them, so attach still earns its cost here.

Harvesting as you go, **append every fact learned to APP-MAP; a fact that contradicts an existing
entry replaces it.** The cost is paid **once per UI area, not once per case** — the next case in the
same area reads the map instead of the browser.

### 5. Author the spec

Transcribe the case's steps into a spec. Rules:

- **Path:** `e2e/tests/<area>/<kebab-case-scenario>.spec.ts` — `<area>` is the **semantic UI
  zone**, aligned with APP-MAP's section headings; specs never sit at the tests root. The
  directory layout deliberately does **not** mirror the vault's suite tree: the case link lives
  in the provenance header, not the path, so suites stay free to be renamed and reorganized
  without moving a single file.
- **One case = one spec file.** The file carries this one case's provenance header and proves
  this one case's full scenario — several `test()` blocks are fine when they all prove it.
  Never share a file between cases: a test inside a file has no stable address, while the file
  path is exactly what `automation_ref` points at.
- **Import** `test`/`expect` from `../fixtures` (the contract's fixtures path), never raw
  `@playwright/test`.
- **Provenance header** — every spec opens with, verbatim:
  ```ts
  // qa-vault: project=<code> case=<case_id>
  // source: <case title> (v<version>)
  ```
- **`// N. <step text>`** comment before each step, mirroring the case's numbered steps one-to-one.
- **Locators:** role-first, **APP-MAP-first then browser** (`getByRole` → `getByLabel` →
  `getByText` → `getByTestId` escape hatch).
- **Assertions:** web-first, auto-retrying only (`toBeVisible`, `toHaveText`, …).
- **Data:** per-run unique, `` `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}` `` with the AUTOMATION.md Test-data
  prefix; the spec **provisions its own data and cleans up after itself**.
- **Banned waits:** `waitForTimeout`, `networkidle`, `waitForLoadState`.

**Concurrency-first — applied to every spec's first draft, before its first run.** Prevent
parallel-worker collisions at write time rather than discovering them through failed batch runs:

- **Scope every read and assertion to the entity the spec created** — its row, its dialog — never
  a bare page-wide role/text query; assume other workers are mutating the same lists and pages
  concurrently.
- **`exact: true` whenever an accessible name could substring-collide** with test-data words or a
  neighboring control's label. `exact: true` matching is **case-sensitive** — match the DOM's
  actual text, not its CSS-transformed rendering.
- **Prefer settled-state assertions** (e.g. count-based) over transient negative checks when
  asserting removal from an animated list.

### 6. Verify

1. **Iterate the single spec** to green: `npx playwright test <file>`. Only this spec — not the
   suite.
2. **Flake check at BATCH level.** After each batch spec is green **individually**, run the new
   specs **together twice** (parallel workers exercise data collisions); any failure gets **one
   isolated rerun** before classification. **A repeating signature is not flake:** when the **same
   failure signature** recurs — 2–3 times across reruns or across specs, especially a **timeout
   inside a shared helper** — stop rerunning and treat it as a **test-infrastructure defect**. Fix
   the shared budget or helper **in-session** before continuing; rerunning-until-green on a
   repeating signature only defers the cost to a future session at interest.
3. **Falsifiability — TARGETED, not universal.** Break-and-restore only the **first spec in a
   previously-uncovered APP-MAP area** plus **any known-trap assertion** (CSS-transformed text,
   animated list removals, glyph-sibling chips) — force **red**, restore, confirm **green**; others
   rely on web-first assertions + the flake check. A broken run **aborts before its own cleanup**:
   after restoring, delete what it left behind (the spec's cleanup path) — leftovers are parallel-suite mines.
4. **Full affected suite once**, at the very end.

### 7. Write back

- **Set both fields explicitly** in one `update_test_case`: `automation: "automated"` +
  `automation_ref: "<repo-relative spec path>"`. They are **independent fields** — setting the
  ref never flips the status and clearing the status never clears the ref, so always set both
  explicitly.
- **Append** every session discovery to APP-MAP; a fact that contradicts an existing entry replaces
  it.
- **Report the changeset:** specs created, cases updated, cases declined + why.
- **Stale schema** — if the QA Vault MCP **rejects or silently drops a documented parameter**, its
  cached tool schemas likely predate a server deploy; **reconnect the MCP server**, don't work around it.

**Specs land uncommitted for engineer review — this skill never commits.**

## Product defects — encode with `test.fail()`, not `fixme`

When verification trips over a **confirmed product bug** (the app misbehaves and the case is right),
the spec is neither declined nor deleted — it is kept as an **inverted expectation**, so the day the
product is fixed the suite tells you. Reproduce minimally — just enough to rule out a test defect —
then **file the defect per `skills/heal-automated-tests/references/defect-propagation.md`**
(plugin-root relative) and encode it in the spec.

`test.fixme()` is **not** used for a product defect: its documented meaning — "the test itself is
slow or crashes" — describes a broken *test*, not a broken *product*. Use `test.fail()`; the spec
body asserts the **correct** expected behavior per the case.

**The encoding is a pair, written together, always:**

```ts
test("<case title>", async ({ page }) => {
  test.fail();
  test.info().annotations.push({
    type: "issue",
    description: "<tracker URL of the filed defect>",
  });
  // ...steps asserting the correct behavior...
});
```

`test.fail()` carries the behavior — because the expectation is inverted, an unexpected **pass** is a
built-in product-fix detector. The `issue` annotation carries machine-readable traceability: it
travels into the HTML and JSON reports, which is what `run-automated-tests` reads to record the case
as **blocked** against its defect.

**A nondeterministic bug is forced deterministic before it is encoded.** A product bug that fires
only under **contention, timing, or load** must not be encoded against a flapping signal — first make
the failure deterministic (hold the racing response open with route interception until the vulnerable
window exists, or inject latency) so it fires on **every** run, and only then apply the `test.fail()`
+ `issue` pair with its full fix-detector semantics. If a race genuinely cannot be forced
deterministic, **escalate to the engineer in the report instead of encoding it** — never leave a
flapping `fail()` spec behind.

- A `fail()` spec that **provisions real data** does its cleanup in **`try/finally`** — the bug
  throws before the happy path's teardown would run — and sizes **`test.setTimeout`** to cover the
  cleanup's retry budget (per AUTOMATION.md's concurrency note).
- The case **stays un-flipped** — `automation` unchanged, **no `automation_ref`** — until the
  product is fixed; the fix is detected and the loop closed by `heal-automated-tests`. A case found
  **already at `automation: automated`** when the bug surfaces — a spec being re-derived — is
  **reverted to un-flipped and its `automation_ref` cleared**, to the same held state until the
  defect is resolved.

## Discipline

Stamped, non-negotiable:

- **Context** — snapshots to files only, never a full-page snapshot into context; query them with
  `find`/scoped reads.
- **Iteration** — iterate ONE spec; full affected suite once at the end; minimal reporter;
  `PLAYWRIGHT_HTML_OPEN=never`.
- **Locators** — APP-MAP-first then browser; role hierarchy `getByRole` → `getByLabel` →
  `getByText` → `getByTestId`; every locator discovered is written back to APP-MAP.
- **Waits** — banned: `waitForTimeout`, `networkidle`, `waitForLoadState`; web-first assertions
  only.
- **Data** — per-run unique prefix + self-cleanup; preconditions via seeding API when the contract
  allows.
- **Honesty** — never weaken an assertion to pass, never edit product code, escalate on ambiguous
  intent.
- **Product bugs** — verification tripping over suspected **product** misbehavior: reproduce
  minimally, **file per `skills/heal-automated-tests/references/defect-propagation.md`** (plugin-root
  relative), **encode with the `test.fail()` + `issue`-annotation pair** (see *Product defects*
  above; the case stays un-flipped), continue. Never turn authoring into a debugging session.
- **Screenshots** — only when a human will look at them.
- **Models** — Sonnet-class models are sufficient and preferred for authoring/healing loops.
- **Context isolation** — the browser-heavy loop belongs in a sub-agent whose snapshot/CLI
  traffic never reaches the dispatching session: on Claude Code, the plugin's `e2e-author`
  companion agent; on Codex CLI, spawn the built-in `worker` with the batch and this skill as
  its instruction set. Either way the sub-agent returns the changeset summary only — specs
  created/updated with case ids, write-backs, APP-MAP facts, escalations with verbatim
  evidence; never raw snapshots or full test output.
