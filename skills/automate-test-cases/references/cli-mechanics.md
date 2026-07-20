# CLI mechanics — driving a live session with playwright-cli

The token-discipline mechanics of driving a real browser session with `playwright-cli`. This is
the shared reference: `automate-test-cases` recon and `heal-automated-tests` inspection both
attach through this loop. The rule behind every command below — **keep every observation on disk
and out of the conversation.**

Commands assume `@playwright/cli` ≥ 0.1.16 (see §7 for the fallback).

## 1. Attach to the seeded app

Never open the app URL directly — the seed test brings up **live fixtures and a signed-in
session**; a raw `goto` has neither. Attach to the paused seed test instead.

**Run the debug session in the BACKGROUND.** `--debug=cli` pauses the test and holds the process
open until you resume it — a foreground shell blocks on that pause and never reaches `attach`.

```bash
# launch in the background, then read its output for the attach line:
PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/tests/seed.spec.ts --debug=cli &
# wait for "Debugging Instructions" + a session name like tw-XXXX, then:
playwright-cli attach tw-XXXX
```

The test is paused at its **start, on `about:blank`** — *before* the fixture's `goto`, so nothing
is on screen yet; it is **not** already on the app root. The seed depends on the auth-setup
project, so **that** test pauses first; `resume` it and the seed test then pauses at its own start
and prints a fresh attach line — attach to that one. From the seed's pause, **`step-over` past the
fixture navigation** lands the page on the authenticated app root, now live and drivable:

```bash
playwright-cli step-over          # advance past the fixture's goto("/") → authenticated app root
playwright-cli find "<text>"      # observe/drive the paused live page (§2)
```

Drive the flow from this paused state (§2–§4). When the walk is done, **`resume` releases the
session** — the test runs to completion, and when the run's last test finishes the process exits
and the session ends on its own.

`--debug=cli` on a specific `<file>:<line>` (as heal attaches at a failure, §2 of that skill) uses
`<file>:<line>` as the standard Playwright **test filter** — it selects *which* test runs; the
pause is still at that test's start on `about:blank`, exactly as above. It does **not** teleport
execution to that line.

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
playwright-cli generate-locator <ref> --raw              # best-practice Playwright locator code
playwright-cli --raw eval "el => el.textContent" <ref>   # exact rendered text/value to assert
```

`generate-locator` output is ready to paste straight into APP-MAP and specs; `--raw eval`
extracts the exact string or value to put in an assertion. (`--raw` is a **global** flag — it
precedes the command, as in `--raw eval`; on `generate-locator` it trails as an option instead.)

## 4. Drive the flow

The core action verbs used while walking a case:

```bash
playwright-cli click <ref>
playwright-cli fill <ref> "text"
playwright-cli select <ref> "value"
playwright-cli press <key>
playwright-cli check <ref>          # / uncheck <ref>
playwright-cli hover <ref>
```

The full verb list is in `playwright-cli --help`.

## 5. Generated code is the raw material

Each CLI action also prints the **equivalent Playwright TypeScript** for what it just did.
**Collect these lines while walking a flow** — the spec is assembled from them, not written from
memory. This is why recon walks the flow once: the walk itself emits the spec's body.

## 6. Session hygiene

- **One named session per task:** within a single attach flow the session is implicit;
  `-s=<name>` (or exporting `PLAYWRIGHT_CLI_SESSION=<name>`) matters only when driving **multiple**
  sessions at once.
- **Close when done:** `playwright-cli close`.
- **Identity swaps:** `playwright-cli state-save <file>` / `playwright-cli state-load <file>` when
  a scenario needs to switch between saved storage states.

## 7. Version floor + fallback

- Commands assume **`@playwright/cli` ≥ 0.1.16**.
- When the global `playwright-cli` command is missing, use **`npx playwright cli <cmd>`** — the
  same commands and flags, just invoked through `npx`.
- **`playwright-cli --help`** prints the full command reference.
