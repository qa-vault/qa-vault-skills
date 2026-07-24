import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildRunSummary, parsePlaywrightReport } from "./parse-report.mjs";

function result(status, annotations = []) {
  return {
    status,
    duration: 25,
    errors: status === "failed" ? [{ message: "Error: assertion failed" }] : [],
    annotations,
    attachments:
      status === "failed"
        ? [{ name: "error-context", path: "/tmp/error-context.md" }]
        : [],
  };
}

function playwrightReport(specs) {
  return {
    suites: [{ title: "fixture", specs }],
    stats: { expected: 1, unexpected: 0, skipped: 0 },
  };
}

function spec({
  file = "e2e/tests/sample.spec.ts",
  line,
  title,
  testStatus = "expected",
  expectedStatus = "passed",
  resultStatus = "passed",
  annotations = [],
}) {
  return {
    file,
    line,
    title,
    tests: [
      {
        status: testStatus,
        expectedStatus,
        annotations,
        results: [result(resultStatus, annotations)],
      },
    ],
  };
}

function fixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-vault-report-"));
  const testDir = path.join(rootDir, "e2e", "tests");
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(
    path.join(testDir, "sample.spec.ts"),
    [
      "// qa-vault: project=QAV case=10",
      "test('passes', () => {});",
      "",
      "// qa-vault: project=QAV case=11",
      "test('fails', () => {});",
      "",
      "// qa-vault: project=QAV case=12",
      "test('blocked', () => {});",
      "",
    ].join("\n"),
  );
  return { rootDir, testDir: "e2e/tests" };
}

test("maps nearest provenance header and records passed and blocked cases", () => {
  const options = fixture();
  const parsed = parsePlaywrightReport(
    playwrightReport([
      spec({ line: 2, title: "passes" }),
      spec({
        line: 8,
        title: "blocked",
        expectedStatus: "failed",
        resultStatus: "failed",
        annotations: [{ type: "issue", description: "https://issues.test/12" }],
      }),
    ]),
    options,
  );
  const summary = buildRunSummary(parsed);

  assert.deepEqual(summary.results, [
    { case_id: 10, status: "passed" },
    {
      case_id: 12,
      status: "blocked",
      comment: "Blocked by https://issues.test/12",
    },
  ]);
});

test("records a stable isolated failure with its artifact", () => {
  const options = fixture();
  const initial = parsePlaywrightReport(
    playwrightReport([
      spec({
        line: 5,
        title: "fails",
        testStatus: "unexpected",
        resultStatus: "failed",
      }),
    ]),
    options,
  );
  const rerun = parsePlaywrightReport(
    playwrightReport([
      spec({
        line: 5,
        title: "fails",
        testStatus: "unexpected",
        resultStatus: "failed",
      }),
    ]),
    options,
  );
  const summary = buildRunSummary(initial, new Map([[initial.tests[0].key, rerun.tests[0]]]));

  assert.equal(summary.results[0].status, "failed");
  assert.match(summary.results[0].comment, /error-context\.md/);
  assert.equal(summary.heal_handoff[0].reason, "stable_failure");
});

test("requires review instead of guessing when an isolated rerun passes", () => {
  const options = fixture();
  const initial = parsePlaywrightReport(
    playwrightReport([
      spec({
        line: 5,
        title: "fails",
        testStatus: "unexpected",
        resultStatus: "failed",
      }),
    ]),
    options,
  );
  const rerun = parsePlaywrightReport(
    playwrightReport([spec({ line: 5, title: "fails" })]),
    options,
  );
  const summary = buildRunSummary(initial, new Map([[initial.tests[0].key, rerun.tests[0]]]));

  assert.deepEqual(summary.results, []);
  assert.equal(summary.review_required[0].reasons[0], "isolated_pass");
});

test("keeps unmapped setup tests outside QA Vault results", () => {
  const options = fixture();
  const parsed = parsePlaywrightReport(
    playwrightReport([spec({ file: "auth.setup.ts", line: 1, title: "setup" })]),
    options,
  );
  const summary = buildRunSummary(parsed);

  assert.deepEqual(summary.results, []);
  assert.equal(summary.unmapped[0].title, "setup");
});

test("flags an expected failure that has no issue annotation", () => {
  const options = fixture();
  const parsed = parsePlaywrightReport(
    playwrightReport([
      spec({
        line: 8,
        title: "blocked",
        expectedStatus: "failed",
        resultStatus: "failed",
      }),
    ]),
    options,
  );
  const summary = buildRunSummary(parsed);

  assert.equal(summary.results[0].status, "blocked");
  assert.match(summary.warnings[0].warning, /unannotated known failure/);
});

test("blocks recording when Playwright reports a top-level error", () => {
  const options = fixture();
  const report = playwrightReport([]);
  report.errors = [{ message: "Error: web server failed" }];
  const parsed = parsePlaywrightReport(report, options);
  const summary = buildRunSummary(parsed, new Map(), { initial_exit_code: 1 });

  assert.equal(summary.run_errors[0].source, "playwright");
  assert.match(summary.run_errors[0].message, /web server failed/);
});

test("blocks recording when an unmapped setup test fails", () => {
  const options = fixture();
  const parsed = parsePlaywrightReport(
    playwrightReport([
      spec({
        file: "e2e/tests/auth.setup.ts",
        line: 1,
        title: "setup",
        testStatus: "unexpected",
        resultStatus: "failed",
      }),
    ]),
    options,
  );
  const summary = buildRunSummary(parsed, new Map(), { initial_exit_code: 1 });

  assert.equal(summary.run_errors[0].source, "unmapped_test");
  assert.equal(summary.run_errors[0].title, "setup");
});

test("does not call an unexpected pass product-fixed when rerun restores the failure", () => {
  const options = fixture();
  const initial = parsePlaywrightReport(
    playwrightReport([
      spec({
        line: 8,
        title: "blocked",
        testStatus: "unexpected",
        expectedStatus: "failed",
        resultStatus: "passed",
      }),
    ]),
    options,
  );
  const rerun = parsePlaywrightReport(
    playwrightReport([
      spec({
        line: 8,
        title: "blocked",
        expectedStatus: "failed",
        resultStatus: "failed",
      }),
    ]),
    options,
  );
  const summary = buildRunSummary(initial, new Map([[initial.tests[0].key, rerun.tests[0]]]));

  assert.equal(summary.review_required[0].reasons[0], "expected_failure_restored");
  assert.deepEqual(summary.heal_handoff, []);
});
