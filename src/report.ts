// Markdown report rendering.  Keep this file dumb: it reads a
// ReadinessReport and emits strings.  No I/O, no fetch.  All layout
// decisions live here so you can re-skin the report without touching
// the runner.

import type { ReadinessReport, FeatureResult, AcceptanceResult, FeatureStatus } from "./types.ts";

const STATUS_BADGE: Record<FeatureStatus, string> = {
  done: "✅ Done",
  partial: "🟡 Partial",
  not_started: "⚪ Not started",
  unknown: "❓ Unknown",
};

export function renderMarkdown(r: ReadinessReport): string {
  const lines: string[] = [];
  const date = new Date(r.generated_at).toISOString().replace("T", " ").slice(0, 19);

  lines.push(`# Lex Origin — MVP Readiness Report`);
  lines.push("");
  lines.push(`_Generated: ${date} UTC — automated, do not edit by hand._`);
  lines.push("");
  lines.push(`Source of truth: [\`CONTRACT_REFERENCE.md\`](../CONTRACT_REFERENCE.md). Spec: \`readiness/spec/*.yaml\`. Re-run: \`npm run readiness\` from \`readiness/\`.`);
  lines.push("");

  // ── Headline ───────────────────────────────────────────────
  lines.push(`## Headline`);
  lines.push("");
  lines.push(`**Scope coverage (Annexure A):** ${r.scope_summary.done} of ${r.scope_summary.total} features Done · ${r.scope_summary.partial} Partial · ${r.scope_summary.not_started} Not started · ${r.scope_summary.unknown} Unknown.`);
  lines.push("");
  lines.push(`**Acceptance metrics (Annexure C):** ${r.acceptance_summary.met} of ${r.acceptance_summary.total} met · ${r.acceptance_summary.unmet} unmet · ${r.acceptance_summary.unknown} unknown.`);
  lines.push("");

  const pct = r.scope_summary.total
    ? Math.round((r.scope_summary.done / r.scope_summary.total) * 100)
    : 0;
  lines.push(`**Done-rate:** ${pct}% of scope. UAT acceptance per Annexure C is a separate bar — see §4.`);
  lines.push("");

  if ((r.regressions?.length ?? 0) > 0 || (r.improvements?.length ?? 0) > 0) {
    lines.push(`## Change since last run`);
    lines.push("");
    if (r.regressions && r.regressions.length) {
      lines.push(`### 🔴 Regressions (${r.regressions.length})`);
      lines.push("");
      lines.push(`| Feature | Was | Now |`);
      lines.push(`|---|---|---|`);
      for (const d of r.regressions) {
        lines.push(`| \`${d.feature_id}\` | ${STATUS_BADGE[d.was]} | ${STATUS_BADGE[d.now]} |`);
      }
      lines.push("");
    }
    if (r.improvements && r.improvements.length) {
      lines.push(`### 🟢 Improvements (${r.improvements.length})`);
      lines.push("");
      lines.push(`| Feature | Was | Now |`);
      lines.push(`|---|---|---|`);
      for (const d of r.improvements) {
        lines.push(`| \`${d.feature_id}\` | ${STATUS_BADGE[d.was]} | ${STATUS_BADGE[d.now]} |`);
      }
      lines.push("");
    }
  }

  // ── Acceptance (Annexure C) ────────────────────────────────
  if (r.acceptance.length) {
    lines.push(`## Acceptance metrics — Annexure C`);
    lines.push("");
    lines.push(`| Metric | Target | Status | Evidence |`);
    lines.push(`|---|---|---|---|`);
    for (const a of r.acceptance) {
      const badge = a.met === true ? "✅ Met" : a.met === false ? "❌ Unmet" : "❓ Unknown";
      const evidence = topEvidence(a);
      lines.push(`| ${escapePipe(a.metric.name)} | ${escapePipe(a.metric.target)} | ${badge} | ${escapePipe(evidence)} |`);
    }
    lines.push("");
  }

  // ── Scope (Annexure A) grouped by annexure section ─────────
  if (r.features.length) {
    const bySection = new Map<string, FeatureResult[]>();
    for (const f of r.features) {
      const key = f.feature.annexure;
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key)!.push(f);
    }

    lines.push(`## Scope — Annexure A, by section`);
    lines.push("");

    const sortedSections = Array.from(bySection.keys()).sort();
    for (const section of sortedSections) {
      const items = bySection.get(section)!;
      const done = items.filter((i) => i.status === "done").length;
      lines.push(`### ${section} — ${done}/${items.length} done`);
      lines.push("");
      lines.push(`| # | Feature | Status | Summary |`);
      lines.push(`|---|---|---|---|`);
      items.forEach((f, i) => {
        lines.push(
          `| ${i + 1} | ${escapePipe(f.feature.name)} | ${STATUS_BADGE[f.status]} | ${escapePipe(f.summary)} |`,
        );
      });
      lines.push("");
    }
  }

  // ── Appendix: failing checks in detail ─────────────────────
  const failing = r.features.filter((f) => f.status === "not_started" || f.status === "partial");
  if (failing.length) {
    lines.push(`## Appendix A — Failing / partial checks (detail)`);
    lines.push("");
    for (const f of failing) {
      lines.push(`### \`${f.feature.id}\` — ${f.feature.name}`);
      lines.push(`- Status: ${STATUS_BADGE[f.status]}`);
      lines.push(`- Annexure: ${f.feature.annexure}`);
      for (const c of f.checks) {
        if (c.status === "fail" || c.status === "manual_pending") {
          lines.push(`- 🔸 \`${c.check.type}\`: ${escapeMd(c.detail)}`);
        }
      }
      lines.push("");
    }
  }

  // ── Appendix: manual-pending list ──────────────────────────
  const manuals: { feature_id: string; question: string; detail: string }[] = [];
  for (const f of r.features) {
    for (const c of f.checks) {
      if (c.status === "manual_pending" && c.check.type === "manual") {
        manuals.push({ feature_id: f.feature.id, question: c.check.question, detail: c.detail });
      }
    }
  }
  for (const a of r.acceptance) {
    for (const c of a.checks) {
      if (c.status === "manual_pending" && c.check.type === "manual") {
        manuals.push({ feature_id: a.metric.id, question: c.check.question, detail: c.detail });
      }
    }
  }
  if (manuals.length) {
    lines.push(`## Appendix B — Manual reviews needed (${manuals.length})`);
    lines.push("");
    lines.push(`These items are not something the engine can decide for you. Review each, then record the verdict in \`readiness/manual-verdicts.yaml\` and re-run \`npm run readiness\`.`);
    lines.push("");
    for (const m of manuals) {
      lines.push(`- **\`${m.feature_id}\`**: ${escapeMd(m.question)}`);
    }
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

function topEvidence(a: AcceptanceResult): string {
  const first = a.checks.find((c) => c.evidence);
  if (first && first.evidence) {
    return Object.entries(first.evidence)
      .map(([k, v]) => `${k}=${v}`)
      .join(" · ");
  }
  const line = a.checks[0]?.detail ?? "";
  return line.length > 90 ? line.slice(0, 90) + "…" : line;
}

function escapePipe(s: string): string {
  return (s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function escapeMd(s: string): string {
  return (s ?? "").replace(/\n/g, " ");
}
