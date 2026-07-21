# CLI mechanics — driving a live session with playwright-cli

The token-discipline mechanics of driving a real browser session with `playwright-cli`. This is
the shared reference: `automate-test-cases` recon and `heal-automated-tests` inspection both
attach through this loop. The rule behind every command below — **keep every observation on disk
and out of the conversation.**

Commands assume `@playwright/cli` ≥ 0.1.16 (see §9 for the fallback).

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
project, so **that** test pauses first; **`-s=tw-XXXX resume`** it and the seed test then pauses at
its own start and prints a fresh attach line — attach to that one. From the seed's pause,
**`step-over` past the fixture navigation** lands the page on the authenticated app root, now live
and drivable:

```bash
playwright-cli -s=tw-XXXX step-over    # advance past the fixture's goto("/") → authenticated app root
playwright-cli -s=tw-XXXX find "<text>" # observe/drive the paused live page (§2)
```

Drive the flow from this paused state (§2–§4). When the walk is done, **`-s=tw-XXXX resume` releases
the session** — the test runs to completion, and when the run's last test finishes the process exits
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

- **Every invocation targets `default` unless told otherwise:** each `playwright-cli` command is a
  fresh process with no memory of the last one, so it targets the `default` session by default.
  After `attach tw-X`, **EVERY** subsequent command must pass **`-s=tw-X`** (`step-over`, `find`,
  `resume`, …) — or **export `PLAYWRIGHT_CLI_SESSION=tw-X` once** for the shell so every later
  command inherits it. Skip the flag and the command silently drives the wrong (empty `default`)
  session.
- **Close when done:** `playwright-cli close`.
- **Identity swaps:** `playwright-cli state-save <file>` / `playwright-cli state-load <file>` when
  a scenario needs to switch between saved storage states.

## 7. Chain deterministic steps to cut turns

When the next 1–2 CLI steps do **not** depend on the previous command's output — deterministic
navigation, refs already known from the current snapshot — **chain them in one shell invocation
with `&&`** rather than spending a turn per command, and take a **fresh snapshot only at decision
points** (where the next action depends on what just appeared):

```bash
playwright-cli -s=tw-XXXX click <ref-a> && playwright-cli -s=tw-XXXX fill <ref-b> "text"
```

**Caveat — refs regenerate per snapshot.** An element ref is valid only for the snapshot that
produced it, so **chain actions only against refs from the current snapshot**; when a step may
change what the next ref points at, break the chain and re-snapshot. **Single-step when unsure.**

## 8. Machine-readable run verdicts

When a run's pass/fail feeds the **agent's own decision** rather than a human-facing log, run with
**`--reporter=json`** and read **`stats.unexpected`** (`0` = everything passed) instead of parsing
list-reporter prose:

```bash
npx playwright test <paths…> --reporter=json > .playwright-cli/run.json
# read stats.unexpected from the JSON — non-zero is the count of real failures to act on
```

The redirect keeps the JSON on disk and out of context (§2's rule). A human-facing summary still
uses the list reporter; the JSON verdict is only for programmatic branching.

## 9. Version floor + fallback

- Commands assume **`@playwright/cli` ≥ 0.1.16**.
- When the global `playwright-cli` command is missing, use **`npx playwright cli <cmd>`** — the
  same commands and flags, just invoked through `npx`.
- **`playwright-cli --help`** prints the full command reference.
