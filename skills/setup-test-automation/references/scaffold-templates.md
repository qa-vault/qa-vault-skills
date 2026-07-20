# Scaffold templates

Reference material for `setup-test-automation`. These are the concrete artifacts the skill
generates during **Scaffold**, each filled with the answers from the **Interview**. Every
`<placeholder>` is replaced with a project-specific value the interview decided; the file
paths, section names, and structure are the contract and do **not** change per project.

**File layout the templates assume** (paths are repo-relative; `playwright.config.ts` sits at
the repo root, so all config paths resolve from there):

```
playwright.config.ts
e2e/
  AUTOMATION.md          # project policy (interview answers)
  APP-MAP.md             # append-forever locator knowledge base
  .auth/user.json        # signed-in storage state (gitignored)
  tests/
    auth.setup.ts        # signs in once, writes .auth/user.json
    fixtures.ts          # test/expect specs import instead of @playwright/test
    seed.spec.ts         # environment bootstrap; sessions attach here
    **/*.spec.ts         # generated specs land here later
.playwright-cli/         # ephemeral playwright-cli working files (gitignored)
```

---

## 0. Install / verify the toolchain

Install both dev dependencies, then the Chromium browser Playwright drives:

```bash
# npm
npm install -D @playwright/test @playwright/cli
# pnpm
pnpm add -D @playwright/test @playwright/cli
# yarn
yarn add -D @playwright/test @playwright/cli

npx playwright install chromium
```

Verify the versions before scaffolding (contract floors: `@playwright/test` ≥ 1.60,
`@playwright/cli` ≥ 0.1.16):

```bash
npx playwright --version         # @playwright/test
playwright-cli --version         # global CLI; if that command is absent:
npx playwright cli --version     # fallback through npx
```

---

## 1. `playwright.config.ts`

Root config. `testDir` is `e2e/tests`; the `setup` project signs in once and the main project
reuses its storage state. Agent runs use the plain `list` reporter and **never** open the HTML
report — an auto-opening report blocks a headless agent session (pair with
`PLAYWRIGHT_HTML_OPEN=never` on the command line).

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Keep this "list". Agent runs must not open the HTML report (it hangs a headless session).
  reporter: [["list"]],
  use: {
    baseURL: "<base-url>", // e.g. http://localhost:3000
    trace: "on-first-retry",
  },
  projects: [
    // Signs in once; writes the storage state the main project reuses.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "<dev-server-command>", // e.g. npm run dev
    url: "<base-url>", // the URL Playwright waits for before running
    reuseExistingServer: !process.env.CI, // reuse a locally running dev server; always start fresh in CI
  },
});
```

---

## 2. `e2e/tests/auth.setup.ts`

Signs in **once** and saves the session so every later test starts authenticated. Prefer the
programmatic path (Option B) when the app exposes an auth API — it is faster and less flaky;
otherwise drive the real login UI (Option A). Either way, `.auth/user.json` holds a live
session and **must be gitignored** (see template 7). **Credentials never land in committed code** —
they live in the shell/CI env (a gitignored `.env.e2e` loaded by the engineer's shell, or CI
secrets), read here as `E2E_EMAIL` / `E2E_PASSWORD`.

```ts
import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  // Credentials come from the environment, never from committed code.
  if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD in your shell/CI env before running auth setup.");
  }

  // OPTION A — real UI login (works for any app).
  await page.goto("<login-path>"); // e.g. /login
  await page.getByLabel("<email-label>").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("<password-label>").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "<submit-label>" }).click();
  // Wait on a signed-in signal, never on a fixed timeout.
  await expect(page.getByRole("<signed-in-marker-role>", { name: "<signed-in-marker>" })).toBeVisible();

  // OPTION B — programmatic login when the app exposes an auth API (delete Option A above).
  // page.request shares the browser context's cookie jar, so storageState still captures it.
  // const res = await page.request.post("<auth-api-path>", {
  //   data: { email: process.env.E2E_EMAIL!, password: process.env.E2E_PASSWORD! },
  // });
  // expect(res.ok()).toBeTruthy();

  await page.context().storageState({ path: authFile });
});
```

---

## 3. `e2e/tests/fixtures.ts`

Extends Playwright's built-in fixtures so every test lands on the app root already signed in
(the storage state is applied by the config project's `use.storageState`). **Specs import
`test` and `expect` from this file, not from `@playwright/test`.**

```ts
import { test as base, expect } from "@playwright/test";

// Specs import test/expect from HERE. This fixture lands every test on the app root ("/")
// ready to interact; the signed-in storage state is applied by the config project.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto("/");
    await use(page);
  },
});

export { expect };
```

---

## 4. `e2e/tests/seed.spec.ts`

The environment bootstrap. Generation and heal sessions attach to this test (paused via
`--debug=cli`) to reach a signed-in, ready page cheaply. Its body is intentionally empty — the
`page` fixture is requested only to trigger the navigation; reaching here green proves that
auth, fixtures, and config all work end to end.

```ts
import { test } from "./fixtures";

// Environment bootstrap — the paused test that generation/heal sessions attach to.
// `page` is requested to run the fixture's navigation; the body is intentionally empty.
test("seed", async ({ page }) => {});
```

---

## 5. `e2e/AUTOMATION.md`

Project policy, one line per section, written from the interview answers. Section headings are
the contract — the other skills read them by name. Replace each `<!-- … -->` placeholder with
the decided policy.

```markdown
# Automation contract

Project-specific automation policy for AI agents. Set once via the `setup-test-automation`
interview; edited rarely. Every automation skill reads this before touching the app.

## QA Vault project
<!-- The QA Vault project code this repo's cases live under.
     e.g. Cases live in project `<CODE>`; when several projects map to this repo, list each with its area. -->

## Test data
<!-- Unique-prefix naming for everything a test creates + cleanup policy.
     e.g. Every entity name is prefixed `e2e-` plus a per-run suffix; each test deletes what it created. -->

## Auth
<!-- The auth model: test account + reusable storage state, or unauthenticated.
     e.g. Signed in via e2e/tests/auth.setup.ts -> e2e/.auth/user.json; credentials from
     E2E_EMAIL / E2E_PASSWORD in the shell/CI env, never committed. -->

## Seeding
<!-- How preconditions are established: seeding API/script vs UI-only.
     e.g. Seed via `POST <seed-endpoint>` / `<seed-script>`; fall back to UI when no API exists. -->

## Commands
<!-- How to run the app and the tests.
     e.g. App: `<dev-server-command>` at <base-url>. Tests: `PLAYWRIGHT_HTML_OPEN=never npx playwright test`. -->

## Off-limits
<!-- Areas agents must never automate against.
     e.g. No live payment submission; no emails to real addresses; do not drive <third-party> surfaces. -->
```

---

## 6. `e2e/APP-MAP.md`

The append-forever locator knowledge base. Generated as a skeleton: the format-contract header
comment plus one empty example area. Sessions append real areas as they discover them.

```markdown
# App map

<!--
FORMAT CONTRACT — read before editing.
This file is CURATED markdown, not a dump of tool output. It is the durable, distilled subset
of what sessions learn about the app, grouped one `## <Feature area>` section per area.

Each area section holds three kinds of entry:
  1. Known-good locators — as Playwright code, ready to paste (from `generate-locator`).
  2. `⚠` quirk lines — one-line empirical traps (CSS-uppercased text, duplicated buttons,
     dialog-close-before-navigate races, ...).
  3. Navigation rules — plain prose: how to reach the area, order-of-operations facts.

APPEND after every session that learned a page fact this file did not already have.
When a newly observed fact CONTRADICTS an existing entry (a locator no longer matches, a quirk is
gone), REPLACE that entry — this file states current truth, not history.
NEVER paste raw `.playwright-cli/` artifacts (snapshots, screenshots, logs) here — those are
ephemeral, gitignored working files. A snapshot says what the page looked like at one moment;
this file says which locator to use and what traps exist there.
-->

## <Feature area>
<!-- Replace with real areas as sessions discover them. Example shape:

Locators:
- `page.getByRole("button", { name: "<label>" })` — <what it targets>

Quirks:
- ⚠ <one-line empirical trap>

Navigation:
- <how to reach this area; order-of-operations facts>
-->
```

---

## 7. `.gitignore` additions

Append these two lines (create `.gitignore` if absent). They keep the live session state and
the ephemeral CLI artifacts out of version control — both must match the generated directories
above exactly.

```gitignore
# Playwright signed-in storage state (a live session — never commit)
e2e/.auth/

# playwright-cli working artifacts (snapshots, screenshots, logs) — ephemeral
.playwright-cli/
```
