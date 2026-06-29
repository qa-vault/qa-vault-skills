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
│   └── organize-test-repository/SKILL.md
├── README.md
├── LICENSE
└── AGENTS.md                           # this file
```

The `skills/` directory is the **single source of truth** for skill content. Both manifests reference it — never duplicate skill files.

## What this plugin is

`qa-vault-skills` makes an AI agent a competent QA practitioner for the **QA Vault** platform — an MCP-native test-management product. The skills add *process and judgment* on top of the QA Vault MCP tools; they do **not** restate the MCP's auto-injected tool descriptions, the enum catalog, or any role/permission detail.

## Skills overview

Four self-contained skills, auto-discovered from `skills/`. Each embeds the same five operating-discipline rules inline (there is no shared conventions skill).

- **`search-test-cases`** — read-only retrieval. Teaches the four QA Vault search modes (title `search_test_cases`, filtered `list_test_cases`, semantic `smart_search_cases`, related `find_related_cases`) and when to use/combine each. Pure retrieval; no coverage-gap analysis.
- **`create-test-cases`** — author manual **UI end-to-end scenarios** (one scenario = one case with many steps). Stages work as a `qa-vault/` Markdown draft for human review/approval, then transfers to the vault and deletes the draft. Sets a fixed required-field set (incl. `automation: not_automated` and high-level, reuse-first tags); other metadata only on request.
- **`maintain-test-cases`** — change-driven sync. Explores a development change, finds affected/outdated cases, and produces one reviewed changeset (update / author net-new / delete obsolete). Preserves an existing case's `automation` status; never overwrites it silently.
- **`organize-test-repository`** — structural housekeeping (suites, tags, case order) in reactive and proactive-audit modes. Previews plans in chat (no draft files); flags duplicate cases for per-pair decision rather than auto-resolving.

## Operating discipline (embedded in every skill)

1. Propose-then-act (preview before any consequential write; content skills do this via the `qa-vault/` review draft).
2. Search-before-create (dedupe before authoring).
3. Surface ambiguous decisions instead of silently guessing.
4. Ask for missing context instead of fabricating.
5. Report results (ids, locations, counts).

**No role/permission language** appears in any skill — that is a platform RLS concern and drift-prone. **No enum catalogs** are restated — agents call `get_field_options` for live values.

## Distribution model

Both ecosystems pull this plugin from the `qa-vault/marketplace` catalog repo:

- **Claude Code** marketplace entry uses `source: "github"` with `repo: "qa-vault/qa-vault-skills"`.
- **Codex CLI** discovers skills from `skills/` via the `.codex-plugin/plugin.json` manifest.

When adding or changing skills, keep `skills/` as the single source of truth, keep both manifests' metadata in sync, and keep the four one-line summaries above accurate. See `README.md` for the user-facing description.
