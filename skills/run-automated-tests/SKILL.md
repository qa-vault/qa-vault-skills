---
name: run-automated-tests
description: Use when executing the automated Playwright suite and recording the outcome in QA Vault — "run the automated tests and report", "record an automated run", "execute the regression suite into the vault". Runs the specs, separates flake from failure, creates an origin=automated test run via the QA Vault MCP, records per-case results, and queues real failures for heal-automated-tests.
---

# Run Automated Tests

## Overview

The **reporting leg** of the harness: execute the Playwright specs and land the outcome in QA
Vault as a test run — **the same shape, and the same place, as a manual run.** This skill does not
author or repair specs; it runs what exists, tells flake apart from real failure, records per-case
results against their source cases, and hands genuine failures to `heal-automated-tests`. The
provenance header on each spec is what maps a green/red spec back to the QA Vault case it proves.

## Contract gate

If `e2e/AUTOMATION.md` or `e2e/tests/seed.spec.ts` is missing in the target repo, stop and direct
the engineer to `setup-test-automation` — never improvise a partial contract.

## The process

### 1. Scope

- **`get_project_rules` first** — per QA Vault MCP guidance, before any substantive work in the
  project. The `project` code comes from AUTOMATION.md's **QA Vault project** section.

Three input shapes: **all automated cases** (cases at `automation: automated`), **a suite**
(resolve it to its cases), or **the specs matching a QA Vault run template**. When the caller gives
**no scope**, propose **all automated cases** and **confirm before running** — never start an
unbounded run unasked.

**Resolve spec↔case pairs by grepping provenance headers** — every generated spec opens with
`// qa-vault: project=<code> case=<case_id>`, so a grep across `e2e/tests/` maps each spec to its
case and each in-scope case to its spec, in both directions.

**Version-drift check.** Fetch the in-scope cases' current versions in one `list_test_cases` call
(`fields: ["id", "version"]`, automation filter as relevant) and compare each against its spec's
provenance-header `v<version>`. A spec whose header version lags the case's current version is
reported as **STALE** — it still runs and records (it may still be valid), but the report lists it as
a re-derivation candidate for `automate-test-cases`.

**A case whose spec file is missing — moved or deleted — is reported, never silently dropped** (fix:
update the case's `automation_ref`, or restore/relocate the spec). It is in scope but has no artifact
to run; surface the gap in the report rather than letting it vanish from the results.

**A spec whose provenance-header case no longer exists in the vault — deleted — is reported as
orphaned.** It does not run and no result is recorded for it.

**Orphan redefinition — a `fail()` bug spec is not an orphan.** A spec whose provenance-header case
is not at `automation: automated` would normally read as an orphan, **but a `test.fail()`-annotated
bug spec is the deliberate exception**: its case stays un-flipped on purpose while the defect is
open, and the spec is a **first-class run participant recorded as `blocked`** (§3), not a dangling
artifact. The orphan report keeps catching the genuinely dangling specs — a header pointing at a
**deleted** case, or a non-automated case whose stray spec carries **no** `fail()` annotation.

### 2. Execute

- Resolve `scripts/run-playwright.mjs` relative to this `SKILL.md` and invoke it once from the
  target repository. Pass every resolved spec path after `--`:

  ```bash
  node <skill-dir>/scripts/run-playwright.mjs \
    --root "$PWD" \
    --test-dir e2e/tests \
    --project chromium \
    -- <paths...>
  ```

- The runner executes the full scope headlessly in one native Playwright process, honoring
  `playwright.config.ts` for workers, retries, and timeouts. It forces only isolated reruns to
  `--workers=1`. `PLAYWRIGHT_HTML_OPEN=never` and the JSON reporter are set by the runner.
- Full JSON and terminal output stay on disk under
  `test-results/qa-vault/<timestamp>/`; the runner prints only the artifact path, case counts,
  review count, run-error count, and rerun-guard status. **Do not open or print `initial.json` or
  `initial.log` wholesale.** Read `summary.json`; inspect a full artifact only for a specific
  unresolved test.
- Launch one runner process. Do not poll per test, stream the log, drive a browser, or narrate
  individual progress. If the execution tool yields a process handle, wait on that same handle
  with no output injection until it completes.
- The runner reruns each unexpected failure once as its own `file:line` Playwright invocation.
  It auto-reruns at most 10 failures. More than 10 sets `rerun_guard.triggered=true` and leaves
  the failures in `review_required`; stop before recording and ask the engineer whether to
  investigate the broad failure or authorize a larger rerun.
- An isolated pass is **not automatically flake**. `summary.json` places it in
  `review_required` with `isolated_pass`; check the original signature for data/state collision.
  Unique-name violations, entities from another spec, or leftover records mean an **isolation
  defect**, not flake. Only a signature-less, non-recurring isolated pass is flake.
- **Flake is reported as flake — never recorded as a failed result.** A collision-signature
  failure is a real failure — recorded as `failed` and queued for heal.
- **Classification uses `summary.json`, a specific test's artifact when needed, and its isolated
  rerun only.** Anything that needs live-page inspection is `heal-automated-tests`' job, not this
  skill's.

### 3. Record

- **`create_test_run`** with **`origin: "automated"`**, the `project` code, the in-scope
  `case_ids` (or `template_id`), and title following the convention **`Automated <scope> <date>`**
  (e.g. `Automated smoke-suite 2026-07-20`).
- Create the run **only after** `rerun_guard.triggered=false`, `run_errors` is empty, and every
  `review_required` item has been classified. This prevents a partial or mixed execution from
  becoming a misleading run.
- **`bulk_record_results`** using the resolved entries from `summary.json.results`, plus any
  engineer-reviewed isolation verdicts. There is one entry per in-scope case whose spec ran
  (passed / failed / expected-failure → blocked) or was Playwright-skipped — flake,
  unexpected-pass ("product fixed") and missing-spec cases stay excluded — each with `case_id`,
  `status`, `comment`:
  - **`passed`** / **`failed`** per the outcome; every failure's **`comment` = one-line error
    summary + trace pointer** (`<file>:<line> — <assertion/error>; trace: <report or trace path>`).
  - **`expectedFailure` with an `issue` annotation** (a `test.fail()` bug spec, failing as expected
    over a filed defect) → **`blocked`**, comment = **`Blocked by <issue url from the annotation>`**.
    The annotation rides into the JSON report, so the reference is read straight from it.
  - **`expectedFailure` without an `issue` annotation** → **`blocked`** with **no** reference, **and
    flagged in the report**: *"unannotated known failure — add the `issue` annotation"* (the pair is
    incomplete; the annotation must always accompany `test.fail()`).
  - **An unexpected pass on a `test.fail()` spec** (the product was fixed) → **record nothing** for
    that case; **flag it** *"product fixed — heal removes the marker"* and include it in the failure
    handoff to `heal-automated-tests`. The unexpected pass turns the suite red, so 0.4.2's artifact
    capture applies to it like any other failure.
  - **A `test.fail()` spec in the FAILED list is not automatically news.** `test.fail()` absorbs
    assertion failures but **not timeouts**: under worker contention a fail() spec that times out
    lands among the failures without its expected verdict. Before treating any fail()-spec outcome
    as "product fixed" or "new failure", read the failure mode — a **timeout** means the spec never
    reached the guarded behavior. Rerun it in isolation: expected-failure restored → report as
    contention flake (no recorded result, no heal handoff); anything else → classify normally.
  - A **Playwright-skipped** spec → **`skipped`**, comment = the skip reason.
  - **Flake gets NO recorded result** — it appears in the report as flake only.
- **`complete_test_run`** once the scope fully executed — leave the run active if execution was
  partial. **Missing-spec cases (Scope) sit outside the executable scope** — reported, but they do
  **not** block completion once everything runnable has executed.

If the QA Vault MCP **rejects or silently drops a parameter documented here**, the session's cached
tool schemas likely predate a server deploy — **reconnect the MCP server** rather than working
around it.

### 4. Hand off

**STALE specs (Scope) are listed as re-derivation candidates for `automate-test-cases`** — a spec
whose header version lags its case's current version, surfaced for the engineer to decide on.

Real failures needing repair are queued as **explicit input for `heal-automated-tests`** — a list,
**one line each: `<file>:<line>` + one-line error summary.** Capture into that handoff, at run
time, the **verbatim Playwright error + call-log** and the **`test-results/*/error-context.md`**
path(s) for each failure — the artifacts are already on disk, so attaching them is free, while a
paraphrase forces the healer to re-derive the failure. **Unexpected passes on `test.fail()` specs
(product fixed) join this handoff too** — heal removes the marker, runs the spec green, flips the
case, and closes the defect. This skill records; it does not fix.
**Once the run is recorded, invoke `heal-automated-tests` on the queued failures automatically** —
do not park them for permission first. Healing is the point of the loop, and heal already gates the
only irreversible steps itself: it fixes test and isolation defects and re-derives on intent change
without asking, and stops for a **single product-terms confirmation** only when its triage confirms
a **product bug** (filing a defect) or a **product-fixed** case (closing one). Everything it touches
lands **uncommitted** for engineer review. So the run→heal handoff needs no separate gate; the
engineer's decisions happen inside heal, exactly where an outward or irreversible action is about to
occur. **Defects for those failures are filed by `heal-automated-tests`' triage** — per
[skills/heal-automated-tests/references/defect-propagation.md](skills/heal-automated-tests/references/defect-propagation.md),
which lives in the heal skill's directory; the plugin ships as one tree, so the relative path
resolves (path relative to the plugin root) — and linked back to the run results recorded here.

## Discipline

Stamped, non-negotiable:

- **Reporter** — artifact-first JSON through `scripts/run-playwright.mjs`; full reports and logs
  stay on disk, and only `summary.json` enters context by default.
- **Execution** — one native runner process, no per-test browser driving, log streaming, or
  controller-side classification while Playwright is still running.
- **Isolation** — every failure rerun once in isolation **before** it is classified.
- **Honesty** — flake is reported as flake and **never recorded as a failed result**; the run
  records only what actually happened.
- **Models** — Sonnet-class models are sufficient and preferred for authoring/healing loops.
