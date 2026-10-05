// Runner — loads YAML specs, dispatches checks via primitives.ts,
// aggregates results, and hands them to report.ts.
//
//   npm run readiness                 # full run, writes reports/latest.{md,json} + history snapshot
//   npm run readiness:scope           # only Annexure A features
//   npm run readiness:acceptance      # only Annexure C metrics
//   npm run readiness:verbose         # extra per-check logging to stdout
//
// Environment:
//   LEX_ORIGIN_ROOT  — override the repo root (default C:/Lex Origin)
//   AUTH_BEARER       — bearer token used by http_* checks that declare bearer_env
//
// A check that references an unset bearer env var is reported as `skip` rather
// than `fail`, so you can run the engine locally without any secrets and still
// get a static-analysis-only report of what the code looks like.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { parse as parseYaml } from "yaml";

import type {
  Feature,
  FeatureResult,
  FeatureStatus,
  AcceptanceMetric,
  AcceptanceResult,
  CheckResult,
  ReadinessReport,
  ManualVerdict,
  ManualVerdictsFile,
} from "./types.ts";
import { runCheck } from "./primitives.ts";
import { renderMarkdown } from "./report.ts";

const ROOT = process.env.LEX_ORIGIN_ROOT ?? "C:/Lex Origin";
const RD = join(ROOT, "readiness");

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has("--verbose");
const ONLY_SCOPE = args.has("--only=scope");
const ONLY_ACCEPT = args.has("--only=acceptance");

function log(...a: unknown[]): void {
  if (VERBOSE) console.log(...a);
}

function statusFromChecks(checks: CheckResult[]): FeatureStatus {
  if (checks.length === 0) return "unknown";
  const effective = checks.filter((c) => c.status !== "skip");
  if (effective.length === 0) return "unknown";
  const passed = effective.filter((c) => c.status === "pass").length;
  const failed = effective.filter((c) => c.status === "fail").length;
  const pending = effective.filter((c) => c.status === "manual_pending").length;
  // "needs_work" is a human verdict that says: code exists + works at the
  // integration level, but output quality / UX fitness is unverified.  It
  // contributes to Partial (not full Done, not Not Started).
  const needsWork = effective.filter((c) => c.status === "needs_work").length;
  if (pending > 0 && passed === 0 && failed === 0 && needsWork === 0) return "unknown";
  // All automated checks pass AND no pending manual AND no needs_work → Done
  if (failed === 0 && pending === 0 && needsWork === 0) return "done";
  // Nothing works at all (no pass, no needs_work, no pending) → Not Started
  if (passed === 0 && needsWork === 0 && pending === 0) return "not_started";
  return "partial";
}

function loadManualVerdicts(): Map<string, ManualVerdict> {
  const path = join(RD, "manual-verdicts.yaml");
  const m = new Map<string, ManualVerdict>();
  if (!existsSync(path)) return m;
  const parsed = parseYaml(readFileSync(path, "utf8")) as ManualVerdictsFile | null;
  if (!parsed?.verdicts) return m;
  for (const v of parsed.verdicts) {
    m.set(v.feature_id, v);
  }
  return m;
}

async function evaluateFeature(
  f: Feature,
  verdicts: Map<string, ManualVerdict>,
): Promise<FeatureResult> {
  if (f.status_override) {
    return {
      feature: f,
      status: f.status_override.status,
      checks: [],
      summary: `OVERRIDE: ${f.status_override.status} — ${f.status_override.reason} (${f.status_override.set_by}, ${f.status_override.set_on})`,
    };
  }
  const checkResults: CheckResult[] = [];
  for (const c of f.checks) {
    const r = await runCheck(c, { manual_verdicts: verdicts, feature_id: f.id });
    log(`  [${f.id}] ${c.type}: ${r.status} — ${r.detail}`);
    checkResults.push(r);
  }
  const status = statusFromChecks(checkResults);
  const summary = buildFeatureSummary(status, checkResults);
  return { feature: f, status, checks: checkResults, summary };
}

function buildFeatureSummary(status: FeatureStatus, checks: CheckResult[]): string {
  const pass = checks.filter((c) => c.status === "pass").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const skip = checks.filter((c) => c.status === "skip").length;
  const pending = checks.filter((c) => c.status === "manual_pending").length;
  const needsWork = checks.filter((c) => c.status === "needs_work").length;
  const parts: string[] = [];
  if (pass) parts.push(`${pass} pass`);
  if (fail) parts.push(`${fail} fail`);
  if (needsWork) parts.push(`${needsWork} needs-work`);
  if (pending) parts.push(`${pending} manual-pending`);
  if (skip) parts.push(`${skip} skipped`);
  return `${status.toUpperCase().replace("_", " ")} — ${parts.join(", ") || "no checks"}`;
}

async function evaluateMetric(
  m: AcceptanceMetric,
  verdicts: Map<string, ManualVerdict>,
): Promise<AcceptanceResult> {
  const checkResults: CheckResult[] = [];
  for (const c of m.checks) {
    const r = await runCheck(c, { manual_verdicts: verdicts, feature_id: m.id });
    log(`  [${m.id}] ${c.type}: ${r.status} — ${r.detail}`);
    checkResults.push(r);
  }
  const effective = checkResults.filter((c) => c.status !== "skip");
  let met: boolean | "unknown";
  if (effective.length === 0) met = "unknown";
  else if (effective.some((c) => c.status === "manual_pending")) met = "unknown";
  else met = effective.every((c) => c.status === "pass");
  const summary = `${met === true ? "MET" : met === false ? "UNMET" : "UNKNOWN"} — target: ${m.target}`;
  return { metric: m, met, checks: checkResults, summary };
}

function loadYamlArray<T>(file: string): T[] {
  if (!existsSync(file)) {
    console.warn(`spec file missing: ${file}`);
    return [];
  }
  const parsed = parseYaml(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) {
    console.warn(`spec file is not an array: ${file}`);
    return [];
  }
  return parsed as T[];
}

function previousReport(): ReadinessReport | null {
  const historyDir = join(RD, "reports", "history");
  if (!existsSync(historyDir)) return null;
  const entries = readdirSync(historyDir)
    .filter((f) => f.endsWith(".json"))
    .sort(); // ISO date sort = chronological
  if (entries.length === 0) return null;
  try {
    return JSON.parse(readFileSync(join(historyDir, entries[entries.length - 1]), "utf8")) as ReadinessReport;
  } catch {
    return null;
  }
}

function diffAgainst(prior: ReadinessReport | null, current: FeatureResult[]): {
  regressions: ReadinessReport["regressions"];
  improvements: ReadinessReport["improvements"];
} {
  if (!prior) return { regressions: [], improvements: [] };
  const rank: Record<FeatureStatus, number> = {
    not_started: 0,
    unknown: 1,
    partial: 2,
    done: 3,
  };
  const prev = new Map(prior.features.map((f) => [f.feature.id, f.status]));
  const regressions: NonNullable<ReadinessReport["regressions"]> = [];
  const improvements: NonNullable<ReadinessReport["improvements"]> = [];
  for (const f of current) {
    const was = prev.get(f.feature.id);
    if (!was || was === f.status) continue;
    if (rank[f.status] < rank[was]) regressions.push({ feature_id: f.feature.id, was, now: f.status });
    else improvements.push({ feature_id: f.feature.id, was, now: f.status });
  }
  return { regressions, improvements };
}

async function main(): Promise<void> {
  console.log("Lex Origin Readiness — starting…");
  const verdicts = loadManualVerdicts();

  const scope = ONLY_ACCEPT
    ? []
    : loadYamlArray<Feature>(join(RD, "spec", "annexure-a-scope.yaml"));
  const metrics = ONLY_SCOPE
    ? []
    : loadYamlArray<AcceptanceMetric>(join(RD, "spec", "annexure-c-acceptance.yaml"));

  log(`loaded ${scope.length} features, ${metrics.length} acceptance metrics, ${verdicts.size} manual verdicts`);

  const features: FeatureResult[] = [];
  for (const f of scope) {
    features.push(await evaluateFeature(f, verdicts));
  }
  const acceptance: AcceptanceResult[] = [];
  for (const m of metrics) {
    acceptance.push(await evaluateMetric(m, verdicts));
  }

  const scope_summary = {
    total: features.length,
    done: features.filter((f) => f.status === "done").length,
    partial: features.filter((f) => f.status === "partial").length,
    not_started: features.filter((f) => f.status === "not_started").length,
    unknown: features.filter((f) => f.status === "unknown").length,
  };
  const acceptance_summary = {
    total: acceptance.length,
    met: acceptance.filter((a) => a.met === true).length,
    unmet: acceptance.filter((a) => a.met === false).length,
    unknown: acceptance.filter((a) => a.met === "unknown").length,
  };

  const prior = previousReport();
  const { regressions, improvements } = diffAgainst(prior, features);

  const report: ReadinessReport = {
    generated_at: new Date().toISOString(),
    spec_versions: {
      scope: "annexure-a-scope.yaml",
      acceptance: "annexure-c-acceptance.yaml",
      timeline: "annexure-b-timeline.yaml",
    },
    scope_summary,
    acceptance_summary,
    features,
    acceptance,
    regressions,
    improvements,
  };

  const reportsDir = join(RD, "reports");
  const historyDir = join(reportsDir, "history");
  mkdirSync(historyDir, { recursive: true });

  const jsonPath = join(reportsDir, "latest.json");
  const mdPath = join(reportsDir, "latest.md");
  const histPath = join(historyDir, `${new Date().toISOString().slice(0, 10)}.json`);

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(histPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(mdPath, renderMarkdown(report), "utf8");

  // Short stdout summary — the real detail is in the two files.
  console.log("");
  console.log(`Scope:      ${scope_summary.done} done / ${scope_summary.partial} partial / ${scope_summary.not_started} not-started / ${scope_summary.unknown} unknown  (of ${scope_summary.total})`);
  console.log(`Acceptance: ${acceptance_summary.met} met / ${acceptance_summary.unmet} unmet / ${acceptance_summary.unknown} unknown  (of ${acceptance_summary.total})`);
  if (regressions && regressions.length) {
    console.log(`🔴 Regressions: ${regressions.length}`);
    for (const r of regressions) console.log(`   ${r.feature_id}: ${r.was} → ${r.now}`);
  }
  if (improvements && improvements.length) {
    console.log(`🟢 Improvements: ${improvements.length}`);
    for (const r of improvements) console.log(`   ${r.feature_id}: ${r.was} → ${r.now}`);
  }
  console.log("");
  console.log(`Report: ${mdPath}`);
  console.log(`JSON:   ${jsonPath}`);
  console.log(`Snapshot: ${histPath}`);
}

main().catch((err) => {
  console.error("readiness runner failed:", err);
  process.exit(1);
});
