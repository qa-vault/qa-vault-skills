# Agent Context: qa-vault-skills

This repository is a **dual-ecosystem plugin** — installable natively in both Claude Code and Codex CLI via the `qa-vault/marketplace` catalog. When working on this codebase, keep both ecosystems in sync.

## Repository layout

```
qa-vault-skills/
├── .claude-plugin/plugin.json          # Claude Code manifest
├── .codex-plugin/plugin.json           # Codex manifest ("skills": "./skills/")
├── skills/
│   ├── search-test-cases/SKILL.md
│   ├── create-test-cases/
│   │   ├── SKILL.md
│   │   └── references/scenario-examples.md
│   ├── maintain-test-cases/SKILL.md
│   ├── organize-test-repository/SKILL.md
│   ├── setup-test-automation/
│   │   ├── SKILL.md
│   │   └── references/scaffold-templates.md
│   ├── automate-test-cases/
│   │   ├── SKILL.md
│   │   └── references/cli-mechanics.md
│   ├── heal-automated-tests/
│   │   ├── SKILL.md
│   │   └── references/defect-propagation.md
│   └── run-automated-tests/
│       ├── SKILL.md
│       └── scripts/                    # Native runner, JSON parser, parser tests
├── agents/                             # Claude Code subagents (Codex runs skills inline)
│   ├── e2e-author.md
│   └── e2e-healer.md
├── README.md
├── LICENSE
└── AGENTS.md                           # this file
```

The `skills/` directory is the **single source of truth** for skill content. Both manifests reference it — never duplicate skill files.

## What this plugin is

`qa-vault-skills` makes an AI agent a competent QA practitioner for the **QA Vault** platform — an MCP-native test-management product. The skills add *process and judgment* on top of the QA Vault MCP tools; they do **not** restate the MCP's auto-injected tool descriptions, the enum catalog, or any role/permission detail.

## Skills overview

Nine self-contained skills, auto-discovered from `skills/`, in two families — **manual QA practice** (the QA Vault content lifecycle) and the **e2e automation harness** (Playwright generation, healing, and reporting). Each embeds its operating-discipline rules inline (there is no shared conventions skill).

**Manual QA practice:**

- **`search-test-cases`** — read-only retrieval. Teaches the four QA Vault search modes (title `search_test_cases`, filtered `list_test_cases`, semantic `smart_search_cases`, related `find_related_cases`) and when to use/combine each. Pure retrieval; no coverage-gap analysis.
- **`create-test-cases`** — author manual **UI end-to-end scenarios** (one scenario = one case with many steps). Stages work as a `qa-vault/` Markdown draft for human review/approval, then transfers to the vault and deletes the draft. Sets a fixed required-field set (incl. `automation: not_automated` and high-level, reuse-first tags); other metadata only on request. A validation phase flags implemented-but-suspicious behavior (`⚠️ VALIDATE`, draft-only) and blocks transfer until the engineer resolves each flag.
- **`maintain-test-cases`** — change-driven sync. Explores a development change, finds affected/outdated cases, and produces one reviewed changeset (update / author net-new / delete obsolete) staged in the shared case-block format with `[UPDATE/NEW/REMOVE]` prefixes. A validation phase flags implemented-but-suspicious changes (`⚠️ VALIDATE`, draft-only — e.g. a change contradicting a previously approved expected result) and blocks apply until each flag is resolved. Preserves an existing case's `automation` status; never overwrites it silently.
- **`organize-test-repository`** — structural housekeeping (suites, tags, case order) in reactive and proactive-audit modes. Previews plans in chat (no draft files); flags duplicate cases for per-pair decision rather than auto-resolving.

**E2e automation harness:**

- **`setup-test-automation`** — one-time repo bootstrap. Interviews the engineer with argued recommendations, scaffolds Playwright + playwright-cli, the seed test and fixtures, and the per-project `AUTOMATION.md` / `APP-MAP.md` contract files every other automation skill reads before it runs.
- **`automate-test-cases`** — turns QA Vault manual cases into verified Playwright specs. Fetches cases via the MCP, transcribes their steps, verifies against the live app with playwright-cli, links spec↔case both ways, and updates automation status. Requires the `setup-test-automation` contract.
- **`heal-automated-tests`** — triages failing specs (test defect / isolation defect / intent change / product bug), fixes only what belongs to the test, and escalates the rest — case updates via `maintain-test-cases`, defects into QA Vault plus the project's tracker.
- **`run-automated-tests`** — the reporting leg. Runs specs through an artifact-first native runner, parses a compact per-case summary, separates flake from failure, records an `origin=automated` test run with per-case results via the MCP, and queues real failures for `heal-automated-tests`.

## Agents

Two thin subagents live in `agents/` — **Claude Code only**. `e2e-author` wraps `automate-test-cases`; `e2e-healer` wraps `heal-automated-tests`. Each adds context isolation, not behavior: the browser, snapshot, and CLI traffic stays inside the subagent, and only the changeset (author) or verdicts + diffs (healer) return to the dispatching session. **Codex has no subagent layer — it runs the automation skills inline.**

## Operating discipline (embedded in every skill)

The **manual QA family** embeds these five rules:

1. Propose-then-act (preview before any consequential write; content skills do this via the `qa-vault/` review draft).
2. Search-before-create (dedupe before authoring).
3. Surface ambiguous decisions instead of silently guessing.
4. Ask for missing context instead of fabricating.
5. Report results (ids, locations, counts).

The **e2e automation family** carries its own stamped *Discipline* block — Context, Iteration, Locators, Waits, Data, Honesty, Screenshots, Models — repeated verbatim at the foot of each automation skill.

**No role/permission language** appears in any skill — that is a platform access-control concern and drift-prone. **No enum catalogs** are restated — agents call `get_field_options` for live values.

## Distribution model

Both ecosystems pull this plugin from the `qa-vault/marketplace` catalog repo:

- **Claude Code** marketplace entry uses `source: "github"` with `repo: "qa-vault/qa-vault-skills"`.
- **Codex CLI** discovers skills from `skills/` via the `.codex-plugin/plugin.json` manifest.

When adding or changing skills, keep `skills/` as the single source of truth, keep both manifests' metadata in sync, and keep the nine one-line summaries above accurate. See `README.md` for the user-facing description.
