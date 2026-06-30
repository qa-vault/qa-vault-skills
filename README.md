# qa-vault-skills

Four skills that make an AI agent a competent **QA practitioner** for the **QA Vault** platform — an MCP-native test-management product. With the QA Vault MCP connected, these skills let a QA engineer author, maintain, search, and organize manual UI test cases through their AI agent, with a human review-and-approve loop and QA Vault as the single source of truth.

- **`search-test-cases`** — find existing cases: the four QA Vault search modes (title, filtered, semantic, related) and when to use each. Read-only.
- **`create-test-cases`** — author manual UI end-to-end scenarios from a spec, ticket, code, or conversation. Drafts for review, then writes to the vault.
- **`maintain-test-cases`** — keep the repository in sync after development changes: update stale cases, add new coverage, remove what's obsolete — in one reviewed changeset.
- **`organize-test-repository`** — restructure and clean up suites, tags, and case order; audit for sprawl and duplicates.

This plugin installs natively in both **Claude Code** and **Codex CLI**.

## Who it's for

QA and QA-adjacent engineers who use an MCP-capable AI agent (Claude Code / Codex) with the QA Vault MCP server connected. The skills make the agent a force-multiplier — the engineer stays in control and reviews/approves everything before it lands in the vault.

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

3. **Verify** — type `/` and you should see `search-test-cases`, `create-test-cases`, `maintain-test-cases`, and `organize-test-repository` (each annotated `(qa-vault-skills)`).

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

3. **Verify** — type `$` in the Codex composer to open the skill-mention popup; `search-test-cases`, `create-test-cases`, `maintain-test-cases`, and `organize-test-repository` should be listed. Invoke one explicitly with `$<skill-name> <your request>`, or let Codex auto-detect when your prompt matches a skill's `description`.

**Updates:** refresh with `codex plugin marketplace upgrade qa-vault` periodically.

---

## Skills

| Skill | Use it when | Writes? |
|-------|-------------|---------|
| `search-test-cases` | You need to find existing cases, or check coverage before authoring. | No (read-only) |
| `create-test-cases` | You're authoring new manual UI test scenarios. | Via review draft → vault |
| `maintain-test-cases` | Development changed and the tests need to catch up. | Via review draft → vault |
| `organize-test-repository` | You're restructuring or cleaning up suites/tags/cases. | After chat-preview confirm |

## License

MIT — see [LICENSE](LICENSE).
