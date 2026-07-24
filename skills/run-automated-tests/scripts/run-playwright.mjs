#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { buildRunSummary, parsePlaywrightReport } from "./parse-report.mjs";

function parseArgs(argv) {
  const separator = argv.indexOf("--");
  const optionArgs = separator === -1 ? argv : argv.slice(0, separator);
  const specs = separator === -1 ? [] : [...new Set(argv.slice(separator + 1))];
  const options = {
    rootDir: process.cwd(),
    testDir: "e2e/tests",
    project: "chromium",
    maxAutoReruns: 10,
    artifactDir: null,
  };

  for (let index = 0; index < optionArgs.length; index += 1) {
    const arg = optionArgs[index];
    if (arg === "--root") options.rootDir = optionArgs[++index];
    else if (arg === "--test-dir") options.testDir = optionArgs[++index];
    else if (arg === "--project") options.project = optionArgs[++index];
    else if (arg === "--artifact-dir") options.artifactDir = optionArgs[++index];
    else if (arg === "--max-auto-reruns") {
      options.maxAutoReruns = Number(optionArgs[++index]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (specs.length === 0) throw new Error("Pass resolved spec paths after --");
  if (!Number.isInteger(options.maxAutoReruns) || options.maxAutoReruns < 0) {
    throw new Error("--max-auto-reruns must be a non-negative integer");
  }
  return { options, specs };
}

function artifactName() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function buildPlaywrightArgs({ project, specs, workers, outputDir }) {
  const args = [
    "playwright",
    "test",
    ...specs,
    `--project=${project}`,
    "--reporter=json",
    `--output=${outputDir}`,
  ];
  if (workers !== undefined) args.push(`--workers=${workers}`);
  return args;
}

function runPlaywright({
  rootDir,
  project,
  reportPath,
  logPath,
  outputDir,
  specs,
  workers,
}) {
  return new Promise((resolve, reject) => {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const args = buildPlaywrightArgs({ project, specs, workers, outputDir });

    const logFd = fs.openSync(logPath, "w");
    let logClosed = false;
    const closeLog = () => {
      if (logClosed) return;
      logClosed = true;
      fs.closeSync(logFd);
    };
    const child = spawn(npx, args, {
      cwd: rootDir,
      env: {
        ...process.env,
        PLAYWRIGHT_HTML_OPEN: "never",
        PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
      },
      stdio: ["ignore", logFd, logFd],
    });
    child.on("error", (error) => {
      closeLog();
      reject(error);
    });
    child.on("close", (code, signal) => {
      closeLog();
      resolve({ code, signal });
    });
  });
}

export function selectorFor(item, rootDir, testDir) {
  const normalized = item.file.replaceAll("\\", path.sep);
  let file;
  if (path.isAbsolute(normalized)) {
    file = path.relative(rootDir, normalized);
  } else if (fs.existsSync(path.resolve(rootDir, normalized))) {
    file = normalized;
  } else {
    file = path.join(testDir, normalized);
  }
  return `${file}:${item.line}`;
}

export function summaryExitCode(summary) {
  if (summary.rerun_guard.triggered || summary.run_errors.length > 0) return 2;
  if ((summary.case_counts.failed ?? 0) > 0 || summary.review_required.length > 0) return 1;
  return 0;
}

export async function main() {
  const { options, specs } = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(options.rootDir);
  const artifactDir = path.resolve(
    rootDir,
    options.artifactDir ?? path.join("test-results", "qa-vault", artifactName()),
  );
  const rerunDir = path.join(artifactDir, "reruns");
  fs.mkdirSync(rerunDir, { recursive: true });

  const initialReportPath = path.join(artifactDir, "initial.json");
  const initialLogPath = path.join(artifactDir, "initial.log");
  const initialOutputDir = path.join(artifactDir, "initial-output");
  const startedAt = new Date().toISOString();
  const initialProcess = await runPlaywright({
    rootDir,
    project: options.project,
    reportPath: initialReportPath,
    logPath: initialLogPath,
    outputDir: initialOutputDir,
    specs,
  });
  if (!fs.existsSync(initialReportPath)) {
    throw new Error(`Playwright did not write ${initialReportPath}; see ${initialLogPath}`);
  }

  const initialReport = JSON.parse(fs.readFileSync(initialReportPath, "utf8"));
  const initial = parsePlaywrightReport(initialReport, {
    rootDir,
    testDir: options.testDir,
  });
  const unexpected = initial.tests.filter(
    (item) =>
      item.outcome === "unexpected_failure" ||
      item.outcome === "unexpected_pass" ||
      item.outcome === "flaky",
  );
  const guardTriggered = unexpected.length > options.maxAutoReruns;
  const reruns = new Map();

  if (!guardTriggered) {
    for (let index = 0; index < unexpected.length; index += 1) {
      const item = unexpected[index];
      const prefix = `${String(index + 1).padStart(3, "0")}-${item.caseId ?? "unmapped"}`;
      const reportPath = path.join(rerunDir, `${prefix}.json`);
      const logPath = path.join(rerunDir, `${prefix}.log`);
      const outputDir = path.join(rerunDir, `${prefix}-output`);
      await runPlaywright({
        rootDir,
        project: options.project,
        reportPath,
        logPath,
        outputDir,
        specs: [selectorFor(item, rootDir, options.testDir)],
        workers: 1,
      });
      if (!fs.existsSync(reportPath)) continue;
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      const parsed = parsePlaywrightReport(report, {
        rootDir,
        testDir: options.testDir,
      });
      const rerun = parsed.tests.find(
        (candidate) =>
          candidate.caseId === item.caseId &&
          candidate.title === item.title &&
          candidate.file === item.file,
      );
      if (rerun) reruns.set(item.key, rerun);
    }
  }

  const summary = buildRunSummary(initial, reruns, {
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    artifact_dir: artifactDir,
    initial_report: initialReportPath,
    initial_log: initialLogPath,
    initial_exit_code: initialProcess.code,
    initial_signal: initialProcess.signal,
    project: options.project,
    specs_requested: specs.length,
    reruns_attempted: reruns.size,
    rerun_guard: {
      threshold: options.maxAutoReruns,
      unexpected_failures: unexpected.length,
      triggered: guardTriggered,
    },
  });
  const summaryPath = path.join(artifactDir, "summary.json");
  const handoffPath = path.join(artifactDir, "handoff.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(
    handoffPath,
    `${JSON.stringify(
      {
        review_required: summary.review_required,
        heal_handoff: summary.heal_handoff,
      },
      null,
      2,
    )}\n`,
  );

  process.stdout.write(
    `${JSON.stringify({
      artifact_dir: artifactDir,
      summary: summaryPath,
      case_counts: summary.case_counts,
      review_required: summary.review_required.length,
      run_errors: summary.run_errors.length,
      rerun_guard_triggered: guardTriggered,
    })}\n`,
  );

  process.exitCode = summaryExitCode(summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  });
}
