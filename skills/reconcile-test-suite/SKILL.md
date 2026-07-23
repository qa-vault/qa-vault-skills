---
name: reconcile-test-suite
description: Use when a repository's existing e2e specs predate the QA Vault process — specs without provenance headers, vault cases marked automated with no automation_ref, unknown overlap between old tests and vault coverage, or a request to "adopt", "link up", or "clean up" a pre-existing test suite.
---

# Reconcile a Pre-Existing Test Suite

## Overview

A repository that adopted QA Vault after it already had e2e tests holds **two generations of
specs**: harness-generated ones carrying the provenance link, and dev-era orphans written before
the process existed. Reconciliation turns that mixture into a fully linked system where **every
spec implements exactly one vault case and every automated case points at exactly one spec** —
without discarding the working test code the team already paid for.

The governing expectation, validated in practice: dev-era specs usually encode real case intent.
Most orphans **link** to existing cases (often cases already marked `automated` with an empty
`automation_ref` — the missing link is process, not coverage). Authoring new cases is the
exception, needed only for surfaces the vault never covered. Plan for linking first, authoring
last.

## Contract gate

Requires the harness contract (`e2e/AUTOMATION.md`, `e2e/tests/seed.spec.ts`) — run
`setup-test-automation` first if absent. The engineer review gate in the middle of this skill is
non-negotiable: no deletion, no vault write, and no case authoring happens before the engineer
approves the reconciliation map.

## The invariant

**One case ↔ one spec.** A spec file carries ONE provenance header and proves ONE case's full
scenario. Processless authoring breaks this in three recurring ways — all three must be hunted
explicitly:

- a case's scenario **split across two files** (each covering half the steps — sometimes in
  different zones/directories);
- several cases **collapsed into one file** (one test() walking an add→edit→delete flow that the
  vault holds as three cases);
- **multi-test files** where each test() maps to a different case (one header slot, many cases).

## Phase 1 — Classify (strictly read-only)

Nothing is edited, run, or written to the vault in this phase.

1. **Inventory both sides.** Grep provenance headers across the spec tree: linked vs unlinked
   files (exclude harness infrastructure — the seed and probe specs need no case). Pull the
   project's cases with automation fields: every `automated`-without-ref case is a **linking
   candidate**, not a gap.
2. **Verify the already-linked.** Every header must point at an existing case; automation status
   must be consistent (a `test.fail()` bug spec pairs with an un-flipped case); header versions
   lagging current case versions are drift *hints* to re-check, not proof of divergence.
3. **Classify per `test()`, not per file** — multi-test files hide multi-case mappings. Compare
   each test's actual actions/assertions against candidate cases' steps (fetch full cases; titles
   are not enough). Verdicts:
   - **DUPLICATE** — the scenario is already proven by a linked spec → deletion candidate;
   - **MATCH** — a case exists and the spec implements its full scenario → link + contract retrofit;
   - **PARTIAL** — a case exists but the spec skips steps the case requires (Cancel/Escape paths,
     persistence-after-reload, negative states are the classic omissions) or diverges from its
     preconditions → retrofit with the missing steps, or re-derive if the divergence is structural;
   - **NO-CASE** — no vault counterpart → gap, queued for case authoring.
4. **Report unmatched BOTH ways.** For each zone: specs that matched no case AND slice cases that
   matched no spec. The two-way report is what exposes split and collapsed cases — a one-way scan
   reads a half-covered case as "covered".
5. **Audit the contract debt** per spec while reading it: fixtures import, hardcoded origins,
   test-data entropy, cleanup of created entities, seeded-data dependence or mutation. This feeds
   the retrofit work orders.

Zone-based fan-out (one semantic UI zone per classification batch) keeps comparisons coherent;
classification is read-only and safe to parallelize across zones.

## The reconciliation map — the review gate

Compile one document the engineer decides from: per-file verdict + action, the deletion list, every
spec-vs-case mismatch that needs a ruling (which side is right?), the gap list with proposed new
cases/suites, and the systemic contract debt. **The engineer's rulings govern everything after.**
After review, the **case is the source of truth**: specs are aligned to approved cases, never the
reverse — and for gaps, the case authored from the spec becomes authoritative once the engineer
approves it.

## Phase 2 — Execute, in this order

1. **Link the clean matches** — provenance header + `automation_ref` write-back. Nothing else
   changes.
2. **Zone retrofits** — bring MATCH/PARTIAL specs to the contract (fixtures, relative URLs,
   entropy, try/finally cleanup, self-provisioned isolation) and add the case steps PARTIALs skip.
   Verify each zone green before moving on.
3. **Consolidations and splits** — merge split-case pairs into one spec, break collapsed files
   into one spec per case, split multi-test files. **A source file is deleted only after its
   replacement passes twice.**
4. **Gap authoring** — draft the missing cases from the specs + the live product (via
   `create-test-cases` conventions, including validation flags for implemented-but-suspicious
   behavior), submit drafts for engineer review, transfer approved cases to the vault, then link
   and retrofit the gap specs like any others.
5. **Final gate** — full-suite run; triage failures per `run-automated-tests` discipline (isolated
   rerun before classifying; remember `test.fail()` does not absorb timeouts).

Vault write-backs (refs, automation flips, un-flips over open defects) belong to the dispatching
session, not to the zone workers — one writer keeps the linkage consistent.

## What to expect

- **Retrofitting finds product bugs.** Dev-era specs assert what the code did; the cases state
  what the user needs. Walking "already-tested" flows against their written cases surfaces real
  defects — handle them with the standard product-bug exit (escalate in product terms, file on
  the engineer's confirmation, encode `test.fail()` + `issue` annotation, un-flip the case).
- **Cleanup debt bites during the work itself**: legacy specs that leak entities or mutate seeded
  data poison later zones' runs. Retrofit isolation early; audit the database for residue after
  destructive zones.
- **Deletion is the riskiest verb.** Before deleting a duplicate, diff its assertions against the
  survivor — salvage anything unique into the surviving spec or its case first.

## Dispatch and isolation

Zone workers that RUN tests operate strictly one-at-a-time per repository (shared dev server and
database); read-only classification may fan out in parallel. Dispatch zone work to sub-agents to
keep browser traffic out of the main context — on Claude Code the plugin's companion agents or
general subagents, on Codex CLI the built-in `worker` — and have them return summaries only. The
dispatching session owns the map, the review gate, and all vault writes.
