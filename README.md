# qa-vault-skills

**Turn your AI agent into a QA practitioner for QA Vault: author, maintain, search, and organize manual test cases, then automate them with Playwright, all through the QA Vault MCP with you approving every write.**

[![Version](https://img.shields.io/badge/version-0.7.1-blue)](.claude-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-cc785c)](#install)
[![Codex CLI](https://img.shields.io/badge/Codex_CLI-plugin-1f2328)](#install)

Eleven skills in two families for [QA Vault](https://qa-vault.com), an MCP-native test-management platform. Part of the [qa-vault](https://github.com/qa-vault/marketplace) plugin family.

## What it does

- **Authors and maintains manual UI test cases** from a spec, ticket, code, or conversation, as end-to-end scenarios drafted for your review before anything reaches the vault.
- **Flags suspicious behavior while authoring.** Grounding cases in the real implementation often surfaces bugs before anyone explores the shipped feature. Each flag must be resolved by you before the write.
- **Keeps the repository healthy.** Searches with every QA Vault mode, restructures suites and tags, backfills the search abstracts that power semantic search, and applies recorded lessons learned to find where the same class of failure can recur.
- **Turns manual cases into Playwright e2e specs** verified against the live app, linked both ways to their source cases, then runs, heals, and reports them, recording every automated run back in QA Vault.
- **Keeps you in control.** QA Vault is the single source of truth, and the engineer reviews and approves everything that lands in it.

## Quick start

```
/plugin marketplace add qa-vault/marketplace
/plugin install qa-vault-skills@qa-vault
```

With the QA Vault MCP connected, ask your agent:

```
write test cases for the checkout flow
```

For automation, run the one-time bootstrap in your repository first:

```
/setup-test-automation
```

Full steps for both harnesses are under [Install](#install).

## Skills

### Manual QA practice

| Skill | When it runs | What it does | Writes to the vault? |
|---|---|---|---|
| `search-test-cases` | "Do we have tests for X?", "what covers this?" | Finds existing cases using the QA Vault search modes: title, filtered, semantic, related, defect-seeded. | No, read-only |
| `create-test-cases` | "Write test cases for X", "create scenarios for this feature" | Authors manual UI end-to-end scenarios, flags suspicious implemented behavior, writes after your review. | After review and flag resolution |
| `maintain-test-cases` | After development changed the product: "sync the test cases", "the login flow changed" | Updates stale cases, adds coverage, removes what is obsolete, in one reviewed changeset. | After review and flag resolution |
| `organize-test-repository` | "Restructure the suites", "clean up the tags", "audit for duplicates" | Restructures suites, tags, and case order; audits for sprawl and duplicates. | After a chat-preview confirm |
| `backfill-search-abstracts` | Cases are missing search abstracts and semantic search misses them | Writes sibling-distinguishing abstracts in checked batches and repairs embeddings. | The `search_abstract` field only |
| `apply-lessons-learned` | "Apply the lessons learned", "where else can this incident recur?" | Transfers each recorded class of failure onto other modules: coverage gaps to author, suspected live bugs to confirm. | No, reports and briefs only |

### E2E automation harness

| Skill | When it runs | What it does | Writes where? |
|---|---|---|---|
| `setup-test-automation` | Once per repository, first | Scaffolds Playwright and playwright-cli, the seed test and fixtures, and the `AUTOMATION.md` / `APP-MAP.md` contract the other automation skills read. | Repository |
| `automate-test-cases` | "Automate QAV-12", "what should we automate?" | Turns manual cases into Playwright specs verified against the live app, linked both ways to their source cases. | Specs to the repository; links and automation status to the vault |
| `run-automated-tests` | "Run the e2e suite and record it" | Executes the suite through an artifact-first native runner, separates flake from real failure, records an `origin=automated` run with per-case results, and hands genuine failures to healing. | Run and results to the vault |
| `heal-automated-tests` | "The suite is red", "heal these specs" | Triages each failure into test defect, data-isolation defect, intent change, product bug, or product fixed. Fixes only what belongs to the test, escalates the rest. Never weakens assertions to force green. | Spec fixes to the repository; defects and escalations out |
| `reconcile-test-suite` | Adopting a repository whose e2e specs predate the vault linkage | Classifies every unlinked spec against the vault, then links, retrofits, and consolidates per an engineer-approved map. | Repository; vault only after your review |

### Companion subagents

In Claude Code the plugin ships two subagents in `agents/`, `e2e-author` and `e2e-healer`, that run the browser-heavy author and heal loops in an isolated context so snapshots and logs stay out of your session. In Codex CLI the same skills direct those loops into spawned sub-agents.

## Who it's for

QA and QA-adjacent engineers who use an MCP-capable AI agent (Claude Code or Codex CLI) with the QA Vault MCP server connected. The skills make the agent a force multiplier while the engineer stays in control.

## How it fits with the other qa-vault plugins

- [`quality-loop`](https://github.com/qa-vault/quality-loop) covers the code-quality side of the same iteration: exploratory QA of plans and code, contract-driven tests, a pre-PR gate, and critical review triage.
- [`codelore`](https://github.com/qa-vault/codelore) keeps implementation docs indexed and routed into the agent's context, which gives these skills grounded product context when authoring.

Neither plugin is required. Installing qa-vault-skills is self-contained.

## Prerequisites

The manual QA practice skills need only the **QA Vault MCP** connected. The e2e automation harness additionally requires:

- **Node.js 18+**
- **`@playwright/test` 1.60 or later** and **`@playwright/cli` 0.1.16 or later**, scaffolded by `setup-test-automation`
- A **Playwright-testable web app** to drive

## Install

`qa-vault-skills` is distributed through the `qa-vault` marketplace catalog.

<details>
<summary><strong>Claude Code</strong></summary>

1. **Add the marketplace** (one-time):

   ```
   /plugin marketplace add qa-vault/marketplace
   ```

   This fetches the catalog of `qa-vault` plugins from GitHub. No code is installed yet. If you already added it for another `qa-vault` plugin, skip this step.

2. **Install the plugin**:

   ```
   /plugin install qa-vault-skills@qa-vault
   ```

   Claude Code asks where to install:
   - **User**: available in every project on your machine (recommended for personal use)
   - **Project**: only active in this project, shared with teammates via `.claude/settings.json`
   - **Local**: only for you, only in this project

3. **Verify**: type `/` and you should see the eleven skills listed, each annotated `(qa-vault-skills)`.

**Updates:** Claude Code auto-updates installed plugins at startup.

</details>

<details>
<summary><strong>Codex CLI</strong></summary>

> Requires Codex CLI 0.122 or later. The `url` source variant this catalog uses shipped in stable 0.122 (2026-04-20).

1. **Add the marketplace** (one-time):

   ```
   codex plugin marketplace add qa-vault/marketplace
   ```

   If you already added it for another `qa-vault` plugin, skip this step.

2. **Install the plugin**: inside Codex, open the plugin browser:

   ```
   /plugins
   ```

   Find `qa-vault-skills` under the `qa-vault` marketplace and toggle it on. `/plugins` is an interactive browser and does not accept inline arguments.

3. **Verify**: type `$` in the Codex composer to open the skill-mention popup. The eleven skills should be listed. Invoke one explicitly with `$<skill-name> <your request>`, or let Codex auto-detect when your prompt matches a skill's description.

**Updates:** refresh with `codex plugin marketplace upgrade qa-vault` periodically.

</details>

## License

Apache-2.0. See [LICENSE](LICENSE).
