# qa-vault-skills

Eight skills that make an AI agent a competent **QA practitioner** for the **QA Vault** platform — an MCP-native test-management product. They form two families. The **manual QA practice** family lets a QA engineer author, maintain, search, and organize manual UI test cases through their AI agent, with a human review-and-approve loop and QA Vault as the single source of truth. The **e2e automation harness** family turns those manual cases into automated Playwright tests — generate, heal, run, and report — closed-loop through the same QA Vault MCP.

The content skills (`create-test-cases`, `maintain-test-cases`) include a **validation phase**: while grounding cases in the real implementation, the agent flags implemented-but-suspicious behavior — possible bugs in product logic or UX — with a `⚠️ VALIDATE` note in the draft, and nothing is written to the vault until the engineer explicitly resolves every flag. Test authoring often happens before anyone manually explores the shipped feature, so these flags catch potential bugs at the cheapest moment.

**Manual QA practice:**

- **`search-test-cases`** — find existing cases: the four QA Vault search modes (title, filtered, semantic, related) and when to use each. Read-only.
- **`create-test-cases`** — author manual UI end-to-end scenarios from a spec, ticket, code, or conversation. Drafts for review — flagging suspicious implemented behavior (possible bugs) for the engineer to resolve — then writes to the vault.
- **`maintain-test-cases`** — keep the repository in sync after development changes: update stale cases, add new coverage, remove what's obsolete — in one reviewed changeset, flagging suspicious changed behavior (possible regressions) for the engineer to resolve.
- **`organize-test-repository`** — restructure and clean up suites, tags, and case order; audit for sprawl and duplicates.

**E2e automation harness:**

- **`setup-test-automation`** — one-time per-repo bootstrap: scaffold Playwright + playwright-cli, the seed test and fixtures, and the per-project `AUTOMATION.md` / `APP-MAP.md` contract the other automation skills read. Runs first.
- **`automate-test-cases`** — turn QA Vault manual cases into Playwright specs, verified against the live app with playwright-cli, linked both ways to their source cases, with automation status updated.
- **`heal-automated-tests`** — triage failing specs into test defect, data-isolation defect, intent change, or product bug; fix only what belongs to the test and escalate the rest. Never weakens assertions to force green.
- **`run-automated-tests`** — execute the suite, separate flake from real failure, record an `origin=automated` run and per-case results in QA Vault, and queue genuine failures for `heal-automated-tests`.

This plugin installs natively in both **Claude Code** and **Codex CLI**. In Claude Code the automation family also ships two companion subagents in `agents/` — `e2e-author` and `e2e-healer` — that run the browser-heavy author and heal loops in an isolated context; Codex has no subagent layer and runs the same skills inline.

## Who it's for

QA and QA-adjacent engineers who use an MCP-capable AI agent (Claude Code / Codex) with the QA Vault MCP server connected. The skills make the agent a force-multiplier — the engineer stays in control and reviews/approves everything before it lands in the vault.

## Prerequisites for the automation skills

The manual QA practice skills need only the **QA Vault MCP** connected. The e2e automation harness additionally requires:

- **Node.js 18+**
- **`@playwright/test` ≥ 1.60** and **`@playwright/cli` ≥ 0.1.16** (scaffolded by `setup-test-automation`)
- A **Playwright-testable web app** to drive
- The **QA Vault MCP** connected

`setup-test-automation` runs first — a one-time bootstrap per repository that installs the Playwright toolchain and writes the per-project contract files (`AUTOMATION.md`, `APP-MAP.md`) the other three automation skills read before they run.

---

## Install

`qa-vault-skills` is distributed through the `qa-vault` marketplace catalog. Installing it is **self-contained** — you do not need any other `qa-vault` plugin (such as `codelore`) installed first. Pick the section for your tool.

### Claude Code

1. **Add the marketplace** (one-time):

   ```
   /plugin marketplace add qa-vault/marketplace
   ```

   This fetches the catalog of `qa-vault` plugins from GitHub — no code is installed yet. (If you already added it for another `qa-vault` plugin, skip this step.)

2. **Install the plugin**:

   ```
   /plugin install qa-vault-skills@qa-vault
   ```

   Claude Code will ask where to install:
   - **User** — available in every project on your machine (recommended for personal use)
   - **Project** — only active in this project, shared with teammates via `.claude/settings.json`
   - **Local** — only for you, only in this project

3. **Verify** — type `/` and you should see `search-test-cases`, `create-test-cases`, `maintain-test-cases`, `organize-test-repository`, `setup-test-automation`, `automate-test-cases`, `heal-automated-tests`, and `run-automated-tests` (each annotated `(qa-vault-skills)`).

**Updates:** Claude Code auto-updates installed plugins at startup.

### Codex CLI

Codex has its own plugin marketplace system; the flow mirrors Claude Code's and is fully independent of any other plugin.

> **Requires Codex CLI 0.122+.** The `url` source variant this catalog uses shipped in stable 0.122 (2026-04-20); earlier 0.121.x releases accept only `local` plugin sources. Upgrade to 0.122 or later.

1. **Add the marketplace** (one-time):

   ```
   codex plugin marketplace add qa-vault/marketplace
   ```

   (If you already added it for another `qa-vault` plugin, skip this step.)

2. **Install the plugin** — inside Codex, open the plugin browser:

   ```
   /plugins
   ```

   Find `qa-vault-skills` under the `qa-vault` marketplace and toggle it on to install. (`/plugins` is an interactive browser — it does not accept inline arguments.)

3. **Verify** — type `$` in the Codex composer to open the skill-mention popup; `search-test-cases`, `create-test-cases`, `maintain-test-cases`, `organize-test-repository`, `setup-test-automation`, `automate-test-cases`, `heal-automated-tests`, and `run-automated-tests` should be listed. Invoke one explicitly with `$<skill-name> <your request>`, or let Codex auto-detect when your prompt matches a skill's `description`.

**Updates:** refresh with `codex plugin marketplace upgrade qa-vault` periodically.

---

## Skills

| Skill | Use it when | Writes? |
|-------|-------------|---------|
| `search-test-cases` | You need to find existing cases, or check coverage before authoring. | No (read-only) |
| `create-test-cases` | You're authoring new manual UI test scenarios. | Via review draft + flag resolution → vault |
| `maintain-test-cases` | Development changed and the tests need to catch up. | Via review draft + flag resolution → vault |
| `organize-test-repository` | You're restructuring or cleaning up suites/tags/cases. | After chat-preview confirm |
| `setup-test-automation` | You're preparing a repo for AI-driven Playwright automation (one-time bootstrap). | Scaffolds Playwright + contract files into the repo |
| `automate-test-cases` | You're turning manual cases into verified Playwright e2e specs. | Specs to the repo; links + automation status to the vault |
| `heal-automated-tests` | Generated specs are failing and need triage + repair. | Spec fixes to the repo; defects/escalations out |
| `run-automated-tests` | You're executing the suite and recording the outcome. | `origin=automated` run + per-case results to the vault |

## License

MIT — see [LICENSE](LICENSE).
