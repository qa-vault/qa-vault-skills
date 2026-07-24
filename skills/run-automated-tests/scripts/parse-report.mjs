import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ANSI_RE = /\u001b\[[0-9;]*m/g;
const PROVENANCE_RE = /^\s*\/\/\s*qa-vault:\s+project=(\S+)\s+case=(\d+)\s*$/;

function walkSuites(suites, visit) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) visit(spec);
    walkSuites(suite.suites, visit);
  }
}

function normalizeFile(reportFile) {
  return reportFile.replaceAll("\\", path.sep);
}

function sourcePath(rootDir, testDir, reportFile) {
  if (path.isAbsolute(reportFile)) return reportFile;
  const normalized = normalizeFile(reportFile);
  const underRoot = path.resolve(rootDir, normalized);
  if (fs.existsSync(underRoot)) return underRoot;
  const underTestDir = path.resolve(rootDir, testDir, normalized);
  if (fs.existsSync(underTestDir)) return underTestDir;
  return underRoot;
}

function provenanceFor(sourceFile, specLine, cache) {
  if (!cache.has(sourceFile)) {
    const headers = [];
    if (fs.existsSync(sourceFile)) {
      const lines = fs.readFileSync(sourceFile, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        const match = line.match(PROVENANCE_RE);
        if (match) {
          headers.push({
            line: index + 1,
            project: match[1],
            caseId: Number(match[2]),
          });
        }
      });
    }
    cache.set(sourceFile, headers);
  }

  const headers = cache.get(sourceFile);
  if (headers.length === 1) return headers[0];
  return headers.filter((header) => header.line <= specLine).at(-1) ?? null;
}

function annotationsFor(test, result) {
  const annotations = [...(test.annotations ?? []), ...(result?.annotations ?? [])];
  const seen = new Set();
  return annotations.filter((annotation) => {
    const key = `${annotation.type}:${annotation.description ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstError(result) {
  const message = result?.error?.message ?? result?.errors?.[0]?.message ?? "";
  return message.replace(ANSI_RE, "").split("\n").find(Boolean) ?? "Unknown Playwright failure";
}

function artifactFor(result) {
  const attachment = (result?.attachments ?? []).find(
    (item) => item.name === "trace" || item.name === "error-context",
  );
  return attachment?.path ?? null;
}

function rawOutcome(test, result) {
  if (test.status === "skipped" || result?.status === "skipped") return "skipped";
  if (test.status === "flaky") return "flaky";
  if (test.status === "unexpected") {
    if (test.expectedStatus === "failed" && result?.status === "passed") {
      return "unexpected_pass";
    }
    return "unexpected_failure";
  }
  if (test.expectedStatus === "failed") return "blocked";
  return "passed";
}

export function parsePlaywrightReport(report, options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const testDir = options.testDir ?? "e2e/tests";
  const provenanceCache = new Map();
  const tests = [];

  walkSuites(report.suites, (spec) => {
    for (const test of spec.tests ?? []) {
      const result = test.results?.at(-1) ?? null;
      const file = normalizeFile(spec.file ?? result?.errorLocation?.file ?? "");
      const line = spec.line ?? result?.errorLocation?.line ?? 0;
      const absoluteFile = sourcePath(rootDir, testDir, file);
      const provenance = provenanceFor(absoluteFile, line, provenanceCache);
      const annotations = annotationsFor(test, result);
      const issue = annotations.find((annotation) => annotation.type === "issue")?.description;
      const skipReason = annotations.find((annotation) => annotation.type === "skip")?.description;

      tests.push({
        key: `${file}:${line}:${spec.title}`,
        file,
        absoluteFile,
        line,
        title: spec.title,
        project: provenance?.project ?? null,
        caseId: provenance?.caseId ?? null,
        expectedStatus: test.expectedStatus,
        outcome: rawOutcome(test, result),
        issue: issue ?? null,
        skipReason: skipReason ?? null,
        error: firstError(result),
        artifact: artifactFor(result),
        durationMs: result?.duration ?? 0,
      });
    }
  });

  return {
    stats: report.stats ?? {},
    errors: (report.errors ?? []).map((error) => ({
      message: (error.message ?? String(error)).replace(ANSI_RE, ""),
      location: error.location ?? null,
    })),
    tests,
  };
}

function resultComment(item, status) {
  if (status === "blocked") {
    return item.issue ? `Blocked by ${item.issue}` : "";
  }
  if (status === "failed") {
    const trace = item.artifact ? `; trace: ${item.artifact}` : "";
    return `${item.file}:${item.line} — ${item.error}${trace}`;
  }
  if (status === "skipped") return item.skipReason ?? "";
  return "";
}

function resolveUnexpected(item, rerun) {
  if (item.outcome === "unexpected_pass") {
    if (!rerun) {
      return {
        ...item,
        finalStatus: null,
        reviewReason: "rerun_not_available",
      };
    }
    if (rerun.outcome === "unexpected_pass") {
      return {
        ...item,
        finalStatus: null,
        reviewReason: "product_fixed",
        rerun,
      };
    }
    if (rerun.outcome === "blocked") {
      return {
        ...item,
        finalStatus: null,
        reviewReason: "expected_failure_restored",
        rerun,
      };
    }
    return {
      ...item,
      finalStatus: null,
      reviewReason: `unexpected_pass_rerun_${rerun.outcome}`,
      rerun,
    };
  }
  if (item.outcome === "flaky") {
    return {
      ...item,
      finalStatus: null,
      reviewReason: "playwright_retry_passed",
    };
  }
  if (item.outcome !== "unexpected_failure") {
    return {
      ...item,
      finalStatus: item.outcome,
      reviewReason: null,
    };
  }
  if (!rerun) {
    return {
      ...item,
      finalStatus: null,
      reviewReason: "rerun_not_available",
    };
  }
  if (rerun.outcome === "unexpected_failure") {
    return {
      ...item,
      finalStatus: "failed",
      reviewReason: null,
      rerun,
    };
  }
  if (rerun.outcome === "unexpected_pass") {
    return {
      ...item,
      finalStatus: null,
      reviewReason: "product_fixed",
      rerun,
    };
  }
  if (rerun.outcome === "blocked") {
    return {
      ...item,
      finalStatus: null,
      reviewReason: "expected_failure_restored",
      rerun,
    };
  }
  if (rerun.outcome === "passed") {
    return {
      ...item,
      finalStatus: null,
      reviewReason: "isolated_pass",
      rerun,
    };
  }
  return {
    ...item,
    finalStatus: null,
    reviewReason: `rerun_${rerun.outcome}`,
    rerun,
  };
}

function aggregateCases(items) {
  const grouped = new Map();
  for (const item of items) {
    if (item.caseId === null) continue;
    const group = grouped.get(item.caseId) ?? [];
    group.push(item);
    grouped.set(item.caseId, group);
  }

  const results = [];
  const reviewRequired = [];
  for (const [caseId, group] of grouped) {
    const reviews = group.filter((item) => item.reviewReason);
    if (reviews.length > 0) {
      reviewRequired.push({
        case_id: caseId,
        reasons: [...new Set(reviews.map((item) => item.reviewReason))],
        tests: reviews.map(({ file, line, title, error, artifact, rerun }) => ({
          file,
          line,
          title,
          error,
          artifact,
          rerun_outcome: rerun?.outcome ?? null,
        })),
      });
      continue;
    }

    const statuses = group.map((item) => item.finalStatus);
    let status;
    if (statuses.includes("failed")) status = "failed";
    else if (statuses.includes("blocked")) status = "blocked";
    else if (statuses.every((value) => value === "skipped")) status = "skipped";
    else status = "passed";

    const comments = [
      ...new Set(group.map((item) => resultComment(item, status)).filter(Boolean)),
    ];
    results.push({
      case_id: caseId,
      status,
      ...(comments.length > 0 ? { comment: comments.join(" | ") } : {}),
    });
  }

  results.sort((a, b) => a.case_id - b.case_id);
  reviewRequired.sort((a, b) => a.case_id - b.case_id);
  return { results, reviewRequired };
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildRunSummary(initial, reruns = new Map(), metadata = {}) {
  const resolved = initial.tests.map((item) => resolveUnexpected(item, reruns.get(item.key)));
  const unmapped = resolved
    .filter((item) => item.caseId === null)
    .map(({ file, line, title, outcome }) => ({ file, line, title, outcome }));
  const mapped = resolved.filter((item) => item.caseId !== null);
  const { results, reviewRequired } = aggregateCases(mapped);
  const healHandoff = resolved
    .filter((item) => item.finalStatus === "failed" || item.reviewReason === "product_fixed")
    .map(({ caseId, file, line, title, error, artifact, reviewReason }) => ({
      case_id: caseId,
      file,
      line,
      title,
      error,
      artifact,
      reason: reviewReason ?? "stable_failure",
    }));
  const warnings = resolved
    .filter((item) => item.finalStatus === "blocked" && !item.issue)
    .map(({ caseId, file, line, title }) => ({
      case_id: caseId,
      file,
      line,
      title,
      warning: "unannotated known failure — add the issue annotation",
    }));
  const runErrors = [
    ...(initial.errors ?? []).map((error) => ({
      source: "playwright",
      message: error.message,
      location: error.location,
    })),
    ...resolved
      .filter(
        (item) =>
          item.caseId === null &&
          ["unexpected_failure", "unexpected_pass", "flaky"].includes(item.outcome),
      )
      .map(({ file, line, title, outcome, error, artifact }) => ({
        source: "unmapped_test",
        file,
        line,
        title,
        outcome,
        message: error,
        artifact,
      })),
  ];
  const hasMappedUnexpected = resolved.some(
    (item) =>
      item.caseId !== null &&
      ["unexpected_failure", "unexpected_pass", "flaky"].includes(item.outcome),
  );
  if (
    metadata.initial_exit_code !== undefined &&
    metadata.initial_exit_code !== 0 &&
    runErrors.length === 0 &&
    !hasMappedUnexpected
  ) {
    runErrors.push({
      source: "runner",
      message: `Playwright exited with code ${metadata.initial_exit_code} without a mapped failure`,
    });
  }

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    ...metadata,
    test_counts: countBy(resolved, "finalStatus"),
    case_counts: countBy(results, "status"),
    results,
    review_required: reviewRequired,
    heal_handoff: healHandoff,
    warnings,
    run_errors: runErrors,
    unmapped,
  };
}

function parseCliArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") options.report = argv[++index];
    else if (arg === "--output") options.output = argv[++index];
    else if (arg === "--root") options.rootDir = argv[++index];
    else if (arg === "--test-dir") options.testDir = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.report) throw new Error("--report is required");
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = parseCliArgs(process.argv.slice(2));
  const report = JSON.parse(fs.readFileSync(options.report, "utf8"));
  const parsed = parsePlaywrightReport(report, options);
  const summary = buildRunSummary(parsed, new Map(), {
    initial_report: path.resolve(options.report),
  });
  const output = JSON.stringify(summary, null, 2);
  if (options.output) fs.writeFileSync(options.output, `${output}\n`);
  else process.stdout.write(`${output}\n`);
}
