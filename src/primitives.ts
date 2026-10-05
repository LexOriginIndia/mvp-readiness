// Primitive check implementations.  Each check knows how to run itself
// and returns a CheckResult.  Keep these dumb and self-contained — no
// cross-primitive logic.  New primitives: add here and extend the
// discriminated union in types.ts.

import { statSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CheckDef,
  CheckResult,
  FileExistsCheck,
  GrepCheck,
  HttpStatusCheck,
  HttpLatencyCheck,
  ManualCheck,
  GithubIssueCheck,
  ManualVerdict,
} from "./types.ts";

const REPO_ROOT = process.env.LEX_ORIGIN_ROOT ?? "C:/Lex Origin";

export async function runCheck(
  check: CheckDef,
  context: { manual_verdicts: Map<string, ManualVerdict>; feature_id: string },
): Promise<CheckResult> {
  const started = Date.now();
  try {
    switch (check.type) {
      case "file_exists":
        return finish(check, runFileExists(check), started);
      case "grep":
        return finish(check, runGrep(check), started);
      case "http_status":
        return finish(check, await runHttpStatus(check), started);
      case "http_latency":
        return finish(check, await runHttpLatency(check), started);
      case "manual":
        return finish(
          check,
          runManual(check, context.feature_id, context.manual_verdicts),
          started,
        );
      case "github_issue":
        return finish(check, await runGithubIssue(check), started);
      default: {
        const _exhaustive: never = check;
        return finish(
          check as CheckDef,
          { status: "fail", detail: `unknown check type: ${JSON.stringify(_exhaustive)}` },
          started,
        );
      }
    }
  } catch (err) {
    return finish(
      check,
      {
        status: "fail",
        detail: `check threw: ${(err as Error).message}`,
      },
      started,
    );
  }
}

function finish(
  check: CheckDef,
  partial: Pick<CheckResult, "status" | "detail"> & { evidence?: Record<string, unknown> },
  started: number,
): CheckResult {
  return {
    check,
    status: partial.status,
    detail: partial.detail,
    evidence: partial.evidence,
    duration_ms: Date.now() - started,
  };
}

// ────────────────────────────────────────────────────────────────

function runFileExists(
  check: FileExistsCheck,
): Pick<CheckResult, "status" | "detail"> {
  const abs = resolveRepoPath(check.path);
  const mustExist = check.must_exist ?? true;
  let exists = false;
  try {
    statSync(abs);
    exists = true;
  } catch {
    exists = false;
  }
  const ok = exists === mustExist;
  return {
    status: ok ? "pass" : "fail",
    detail: `${check.path} ${exists ? "exists" : "missing"} (expected ${mustExist ? "exists" : "missing"})`,
  };
}

function runGrep(
  check: GrepCheck,
): Pick<CheckResult, "status" | "detail" | "evidence"> {
  const abs = resolveRepoPath(check.path);
  const mustExist = check.must_exist ?? true;
  const minMatches = check.min_matches ?? 1;
  let matches = 0;
  try {
    const re = new RegExp(check.pattern);
    walk(abs, (file, contents) => {
      if (re.test(contents)) matches++;
    });
  } catch (err) {
    return {
      status: "fail",
      detail: `grep failed on ${check.path}: ${(err as Error).message}`,
    };
  }
  const found = matches >= minMatches;
  const ok = found === mustExist;
  return {
    status: ok ? "pass" : "fail",
    detail: `${check.pattern} → ${matches} file(s) matched in ${check.path} (expected ${mustExist ? `≥${minMatches}` : "0"})`,
    evidence: { matches },
  };
}

async function runHttpStatus(
  check: HttpStatusCheck,
): Promise<Pick<CheckResult, "status" | "detail" | "evidence">> {
  const method = check.method ?? "GET";
  const headers: Record<string, string> = { accept: "application/json" };
  if (check.bearer_env) {
    const token = process.env[check.bearer_env];
    if (!token) {
      return {
        status: "skip",
        detail: `bearer env var ${check.bearer_env} not set — skipping http_status for ${check.url}`,
      };
    }
    headers.authorization = `Bearer ${token}`;
  }
  if (check.body) headers["content-type"] = "application/json";
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), check.timeout_ms ?? 5000);
  let res: Response;
  try {
    res = await fetch(check.url, {
      method,
      headers,
      body: check.body ? JSON.stringify(check.body) : undefined,
      signal: ac.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = (err as Error).name === "AbortError"
      ? `timed out after ${check.timeout_ms ?? 5000}ms`
      : (err as Error).message;
    return {
      status: "fail",
      detail: `${method} ${check.url} → ${msg}`,
    };
  }
  clearTimeout(timer);
  const ok = res.status === check.expect_status;
  return {
    status: ok ? "pass" : "fail",
    detail: `${method} ${check.url} → ${res.status} (expected ${check.expect_status})`,
    evidence: { status: res.status, expected: check.expect_status },
  };
}

async function runHttpLatency(
  check: HttpLatencyCheck,
): Promise<Pick<CheckResult, "status" | "detail" | "evidence">> {
  const method = check.method ?? "GET";
  const samples = check.samples ?? 5;
  const headers: Record<string, string> = { accept: "application/json" };
  if (check.bearer_env) {
    const token = process.env[check.bearer_env];
    if (!token) {
      return {
        status: "skip",
        detail: `bearer env var ${check.bearer_env} not set — skipping http_latency for ${check.url}`,
      };
    }
    headers.authorization = `Bearer ${token}`;
  }
  const timings: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t = Date.now();
    try {
      const res = await fetch(check.url, { method, headers });
      // drain the body so we measure full roundtrip, not just header receipt
      await res.arrayBuffer();
      timings.push(Date.now() - t);
    } catch (err) {
      return {
        status: "fail",
        detail: `${method} ${check.url} sample ${i + 1}/${samples} failed: ${(err as Error).message}`,
      };
    }
  }
  const avg = Math.round(timings.reduce((a, b) => a + b, 0) / samples);
  const p95 = timings.sort((a, b) => a - b)[Math.max(0, Math.floor(samples * 0.95) - 1)];
  const ok = avg <= check.threshold_ms;
  return {
    status: ok ? "pass" : "fail",
    detail: `${method} ${check.url} avg ${avg}ms over ${samples} samples (threshold ≤${check.threshold_ms}ms, p95 ${p95}ms)`,
    evidence: { avg_ms: avg, p95_ms: p95, samples, threshold_ms: check.threshold_ms },
  };
}

function runManual(
  check: ManualCheck,
  featureId: string,
  verdicts: Map<string, ManualVerdict>,
): Pick<CheckResult, "status" | "detail" | "evidence"> {
  // Keyed by feature_id alone — simplest for the YAML writer.  If a
  // feature has multiple manual checks, one verdict applies to all of
  // them (the written evidence/question gives context).  Change here
  // AND runner.loadManualVerdicts if that ever needs to be more granular.
  const v = verdicts.get(featureId);
  const cadence = check.review_cadence_days ?? 30;
  if (!v) {
    return {
      status: "manual_pending",
      detail: `manual check never reviewed: "${check.question}"`,
      evidence: { verdict_key: featureId },
    };
  }
  const ageDays = daysBetween(new Date(v.reviewed_on), new Date());
  const stale = ageDays > cadence;
  if (stale) {
    return {
      status: "manual_pending",
      detail: `manual verdict is ${ageDays}d old (cadence ${cadence}d), re-review: "${check.question}"`,
      evidence: { verdict_key: featureId, reviewed_on: v.reviewed_on, age_days: ageDays },
    };
  }
  // Three-way mapping (changed from pass/fail only):
  //   pass        → pass          (counts as a passing check)
  //   needs_work  → needs_work    (new — code exists but quality unverified;
  //                                 contributes to the feature being Partial,
  //                                 NOT Not Started.  Semantically "half done")
  //   fail        → fail          (counts as a failing check)
  let status: CheckResult["status"];
  if (v.verdict === "pass") status = "pass";
  else if (v.verdict === "needs_work") status = "needs_work";
  else status = "fail";
  return {
    status,
    detail: `[manual, ${v.reviewed_by} on ${v.reviewed_on}] ${v.verdict} — ${v.evidence}`,
    evidence: { verdict_key: featureId, verdict: v.verdict, reviewed_on: v.reviewed_on },
  };
}

async function runGithubIssue(
  check: GithubIssueCheck,
): Promise<Pick<CheckResult, "status" | "detail" | "evidence">> {
  // issue string: "owner/repo#number"
  const m = /^([^/]+)\/([^#]+)#(\d+)$/.exec(check.issue);
  if (!m) {
    return {
      status: "fail",
      detail: `invalid github_issue format: ${check.issue} (expected owner/repo#number)`,
    };
  }
  const [, owner, repo, number] = m;
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      status: "skip",
      detail: `GITHUB_TOKEN not set — skipping github_issue check for ${check.issue}`,
    };
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${number}`,
      {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
        },
      },
    );
    if (!res.ok) {
      return {
        status: "fail",
        detail: `github issue ${check.issue} fetch failed: ${res.status}`,
      };
    }
    const body = (await res.json()) as { state: string; title: string; closed_at: string | null };
    const closed = body.state === "closed";
    return {
      status: closed ? "pass" : "fail",
      detail: closed
        ? `issue ${check.issue} CLOSED on ${body.closed_at ?? "?"}: ${body.title}`
        : `issue ${check.issue} OPEN: ${body.title}`,
      evidence: { state: body.state, closed_at: body.closed_at, title: body.title },
    };
  } catch (err) {
    return {
      status: "fail",
      detail: `github api error for ${check.issue}: ${(err as Error).message}`,
    };
  }
}

// ────────────────────────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────────────────────────

function resolveRepoPath(p: string): string {
  if (/^[a-zA-Z]:[\\/]/.test(p) || p.startsWith("/")) return p;
  return join(REPO_ROOT, p);
}

function walk(abs: string, visit: (file: string, contents: string) => void): void {
  let stat;
  try {
    stat = statSync(abs);
  } catch {
    return; // non-existent paths read as "no matches"
  }
  if (stat.isFile()) {
    try {
      visit(abs, readFileSync(abs, "utf8"));
    } catch {
      // binary / unreadable — treat as no match
    }
    return;
  }
  if (stat.isDirectory()) {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      // Skip the usual suspects to keep grep fast
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === "venv" ||
        entry.name === "__pycache__" ||
        entry.name === "coverage"
      )
        continue;
      walk(join(abs, entry.name), visit);
    }
  }
}

function hashString(s: string): string {
  // Short deterministic key — 32-bit FNV-1a hash, hex.  Collisions are
  // tolerable since the key is namespaced by feature_id first.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
