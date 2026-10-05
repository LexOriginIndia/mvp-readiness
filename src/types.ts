// Shared types for the readiness engine.  Kept intentionally small —
// a feature is either Done, Partial, Not Started, or Unknown
// (unknown = we never attempted to automate a check for it; the
// spec is incomplete).  Manual checks resolve to one of those four
// via the stored verdict in manual-verdicts.yaml.

export type FeatureStatus =
  | "done"          // every automated check passed, manual verdicts current
  | "partial"       // ≥1 check passed, ≥1 check failed
  | "not_started"   // every automated check failed OR no implementation detected
  | "unknown";      // no checks defined, or manual verdict missing/stale

export type CheckStatus = "pass" | "fail" | "skip" | "manual_pending" | "needs_work";

// ────────────────────────────────────────────────────────────────
// Check definitions (from YAML spec)
// ────────────────────────────────────────────────────────────────

export interface FileExistsCheck {
  type: "file_exists";
  path: string;             // relative to repo root (C:\Lex Origin)
  must_exist?: boolean;     // default true
  note?: string;
}

export interface GrepCheck {
  type: "grep";
  path: string;             // file OR directory (recursive)
  pattern: string;          // regex, JS flavor
  must_exist?: boolean;     // default true (pattern must be found)
  min_matches?: number;     // optional threshold
  note?: string;
}

export interface HttpStatusCheck {
  type: "http_status";
  url: string;
  expect_status: number;    // 200, 403, 404, etc.
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  bearer_env?: string;      // env var name holding a bearer token
  body?: unknown;
  timeout_ms?: number;      // default 5000
  note?: string;
}

export interface HttpLatencyCheck {
  type: "http_latency";
  url: string;
  threshold_ms: number;     // from Annexure C
  samples?: number;         // default 5
  method?: "GET" | "POST";
  bearer_env?: string;
  note?: string;
}

export interface ManualCheck {
  type: "manual";
  question: string;         // what the human reviewer must verify
  review_cadence_days?: number;  // default 30 — verdict goes stale after this
  note?: string;
}

/**
 * Tracks a feature's status against a GitHub issue.
 * - Open issue   → check fails (feature still has outstanding work)
 * - Closed issue → check passes (feature was accepted / shipped)
 *
 * This is how the interactive loop works: Client (or team) closes the
 * issue in GitHub → next readiness run flips the feature to Done
 * without anyone editing YAML.
 *
 * `issue` is "<owner>/<repo>#<number>" (e.g.
 * "LexOriginIndia/mvp-readiness#42") so the engine can look up any repo.
 */
export interface GithubIssueCheck {
  type: "github_issue";
  issue: string;            // "owner/repo#number"
  note?: string;
}

export type CheckDef =
  | FileExistsCheck
  | GrepCheck
  | HttpStatusCheck
  | HttpLatencyCheck
  | ManualCheck
  | GithubIssueCheck;

// ────────────────────────────────────────────────────────────────
// Feature definition (one scope item)
// ────────────────────────────────────────────────────────────────

export interface Feature {
  id: string;               // stable kebab-case id — used as key everywhere
  name: string;             // human-readable, used in reports
  annexure: string;         // e.g. "3.1 Core AI Development"
  category?: string;        // free-text grouping ("ai" | "accounting" | …)
  required_for_mvp?: boolean;  // default true
  checks: CheckDef[];
  // Optional: force a status regardless of automated checks. Use sparingly —
  // typically for things that can't be probed from this box (e.g.
  // "VAPT report delivered").
  status_override?: {
    status: FeatureStatus;
    reason: string;
    set_by: string;
    set_on: string;         // YYYY-MM-DD
  };
}

export interface AcceptanceMetric {
  id: string;
  name: string;             // "Average response time ≤ 2 seconds"
  target: string;           // human-readable target text
  checks: CheckDef[];
}

export interface TimelinePhase {
  id: string;
  name: string;             // "Phase 1 — Foundation"
  target_month_end: string; // YYYY-MM
  deliverable: string;
  // Which Annexure A feature ids should be Done for this phase to be considered Complete.
  completes_features: string[];
}

// ────────────────────────────────────────────────────────────────
// Run-time results
// ────────────────────────────────────────────────────────────────

export interface CheckResult {
  check: CheckDef;
  status: CheckStatus;
  detail: string;           // one-line explanation ("file exists", "grep found 0 matches", "status 404 (expected 200)")
  evidence?: Record<string, unknown>;   // raw numbers for the report (e.g. { avg_ms: 420, samples: 5 })
  duration_ms: number;
}

export interface FeatureResult {
  feature: Feature;
  status: FeatureStatus;
  checks: CheckResult[];
  summary: string;          // one line for the report
}

export interface AcceptanceResult {
  metric: AcceptanceMetric;
  met: boolean | "unknown";
  checks: CheckResult[];
  summary: string;
}

export interface ReadinessReport {
  generated_at: string;     // ISO
  spec_versions: {
    scope: string;
    acceptance: string;
    timeline: string;
  };
  scope_summary: {
    total: number;
    done: number;
    partial: number;
    not_started: number;
    unknown: number;
  };
  acceptance_summary: {
    total: number;
    met: number;
    unmet: number;
    unknown: number;
  };
  features: FeatureResult[];
  acceptance: AcceptanceResult[];
  // Diff against previous run (filled in if a prior report is found)
  regressions?: { feature_id: string; was: FeatureStatus; now: FeatureStatus }[];
  improvements?: { feature_id: string; was: FeatureStatus; now: FeatureStatus }[];
}

// ────────────────────────────────────────────────────────────────
// Manual verdicts (persisted between runs)
// ────────────────────────────────────────────────────────────────

export interface ManualVerdict {
  feature_id: string;       // or metric_id — namespaced by caller
  question: string;         // mirrored from the check for clarity
  verdict: "pass" | "fail" | "needs_work";
  evidence: string;
  reviewed_by: string;
  reviewed_on: string;      // YYYY-MM-DD
}

export interface ManualVerdictsFile {
  verdicts: ManualVerdict[];
}
