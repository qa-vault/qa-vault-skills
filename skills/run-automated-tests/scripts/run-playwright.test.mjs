import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildPlaywrightArgs,
  selectorFor,
  summaryExitCode,
} from "./run-playwright.mjs";

test("uses an invocation-specific Playwright output directory", () => {
  const args = buildPlaywrightArgs({
    project: "chromium",
    specs: ["e2e/tests/example.spec.ts"],
    workers: 1,
    outputDir: "/tmp/qa-vault/run/rerun-1-output",
  });

  assert.ok(args.includes("--output=/tmp/qa-vault/run/rerun-1-output"));
  assert.ok(args.includes("--workers=1"));
});

test("builds selectors for testDir-relative and root-relative report paths", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-vault-selector-"));
  const file = path.join(rootDir, "e2e", "tests", "example.spec.ts");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "");

  assert.equal(
    selectorFor({ file: "example.spec.ts", line: 12 }, rootDir, "e2e/tests"),
    path.join("e2e", "tests", "example.spec.ts:12"),
  );
  assert.equal(
    selectorFor({ file: "e2e/tests/example.spec.ts", line: 12 }, rootDir, "e2e/tests"),
    path.join("e2e", "tests", "example.spec.ts:12"),
  );
  assert.equal(
    selectorFor({ file: "e2e\\tests\\example.spec.ts", line: 12 }, rootDir, "e2e/tests"),
    path.join("e2e", "tests", "example.spec.ts:12"),
  );
});

test("blocks a run with infrastructure errors or unresolved review", () => {
  const base = {
    rerun_guard: { triggered: false },
    run_errors: [],
    case_counts: {},
    review_required: [],
  };

  assert.equal(summaryExitCode(base), 0);
  assert.equal(summaryExitCode({ ...base, run_errors: [{ message: "setup failed" }] }), 2);
  assert.equal(summaryExitCode({ ...base, review_required: [{}] }), 1);
  assert.equal(summaryExitCode({ ...base, rerun_guard: { triggered: true } }), 2);
});
