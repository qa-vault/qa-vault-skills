# CLI mechanics — driving a live session with playwright-cli

The token-discipline mechanics of driving a real browser session with `playwright-cli`. This is
the shared reference: `automate-test-cases` recon and `heal-automated-tests` inspection both
attach through this loop. The rule behind every command below — **keep every observation on disk
and out of the conversation.**

Commands assume `@playwright/cli` ≥ 0.1.16 (see §6 for the fallback).

## 1. Attach to the seeded app

Never open the app URL directly — the seed test brings up **live fixtures and a signed-in
session**; a raw `goto` has neither. Attach to the paused seed test instead:

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/tests/seed.spec.ts --debug=cli
# wait for "Debugging Instructions" + a session name like tw-XXXX
playwright-cli attach tw-XXXX
playwright-cli resume
```

The session lands on the app root, authenticated and ready to drive.

## 2. Observe without polluting context

Every `playwright-cli` action writes its page snapshot to a file under `.playwright-cli/` and
prints the path. **Never paste a snapshot file into the conversation** — read it with targeted
queries, pulling only the fragment the current step needs:

```bash
playwright-cli find "<text>"        # grep the snapshot for text, with surrounding context
playwright-cli snapshot <ref>       # scoped snapshot of one element's subtree
playwright-cli snapshot --depth=N   # cap the tree depth instead of dumping the whole page
```

## 3. Harvest locators

```bash
playwright-cli generate-locator <ref> --raw        # best-practice Playwright locator code
playwright-cli generate-locator <ref> --raw eval   # exact rendered text / value to assert
```

`--raw` output is ready to paste straight into APP-MAP and specs; `--raw eval` gives the exact
string or value to put in an assertion.

## 4. Generated code is the raw material

Each CLI action also prints the **equivalent Playwright TypeScript** for what it just did.
**Collect these lines while walking a flow** — the spec is assembled from them, not written from
memory. This is why recon walks the flow once: the walk itself emits the spec's body.

## 5. Session hygiene

- **One named session per task:** pass `-s=<name>` on each command, or export
  `PLAYWRIGHT_CLI_SESSION=<name>`.
- **Close when done:** `playwright-cli close`.
- **Identity swaps:** `playwright-cli state-save <file>` / `playwright-cli state-load <file>` when
  a scenario needs to switch between saved storage states.

## 6. Version floor + fallback

- Commands assume **`@playwright/cli` ≥ 0.1.16**.
- When the global `playwright-cli` command is missing, use **`npx playwright cli <cmd>`** — the
  same commands and flags, just invoked through `npx`.
- **`playwright-cli --help`** prints the full command reference.
