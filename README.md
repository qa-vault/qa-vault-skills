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

### Claude Code

1. **Add the marketplace** (one-time):

   ```
   /plugin marketplace add qa-vault/marketplace
   ```

2. **Install the plugin**:

   ```
   /plugin install qa-vault-skills@qa-vault
   ```

3. **Verify** — type `/` and you should see `search-test-cases`, `create-test-cases`, `maintain-test-cases`, and `organize-test-repository` (each annotated `(qa-vault-skills)`).

**Updates:** Claude Code auto-updates installed plugins at startup.

### Codex CLI

Codex discovers the skills from this plugin's `skills/` directory via the `qa-vault/marketplace` catalog. Add the marketplace and install `qa-vault-skills`, then the four skills are available in your Codex sessions.

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
