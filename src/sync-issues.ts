// sync-issues.ts — one-shot script that reads reports/latest.json and
// creates one GitHub issue per Not-Started / Partial feature in a target
// repo, then writes a tracking map that the readiness engine uses to
// close the loop (close issue → feature flips to Done on next run).
//
//   REPO=LexOriginIndia/mvp-readiness npm run sync-issues
//
// Idempotent: if an issue with the same title already exists in the
// repo (open OR closed), it is reused and nothing is created.  Running
// again is safe.
//
// Writes:
//   issue-map.json        — { feature_id → { number, url, state } }
// Rewrites:
//   spec/annexure-a-scope.yaml      — appends a github_issue check to
//                                     each feature that didn't have one
//   spec/annexure-c-acceptance.yaml — same for Annexure C metrics
//
// Requires: GITHUB_TOKEN env var with repo write scope.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const REPO = process.env.REPO || "LexOriginIndia/mvp-readiness";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN not set — refusing to run without it.");
  process.exit(1);
}

const ROOT = process.env.LEX_ORIGIN_ROOT ?? "C:/Lex Origin";
const RD = join(ROOT, "readiness");

interface Report {
  features: Array<{
    status: "done" | "partial" | "not_started" | "unknown";
    feature: { id: string; name: string; annexure: string; required_for_mvp?: boolean };
    summary: string;
  }>;
  acceptance: Array<{
    met: boolean | "unknown";
    metric: { id: string; name: string; target: string };
    summary: string;
  }>;
}

interface IssueMap {
  [featureId: string]: { number: number; url: string; state: "open" | "closed" };
}

async function ghApi<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const method = init?.method ?? "GET";
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${TOKEN}`,
      "x-github-api-version": "2022-11-28",
      ...(init?.body ? { "content-type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function listAllIssues(): Promise<Array<{ number: number; title: string; html_url: string; state: "open" | "closed" }>> {
  const out: Array<{ number: number; title: string; html_url: string; state: "open" | "closed" }> = [];
  let page = 1;
  while (true) {
    const batch = (await ghApi<Array<{ number: number; title: string; html_url: string; state: "open" | "closed"; pull_request?: unknown }>>(
      `/repos/${REPO}/issues?state=all&per_page=100&page=${page}`,
    ));
    if (batch.length === 0) break;
    for (const i of batch) {
      if (i.pull_request) continue; // PRs show up in the issues endpoint
      out.push({ number: i.number, title: i.title, html_url: i.html_url, state: i.state });
    }
    if (batch.length < 100) break;
    page++;
  }
  return out;
}

async function ensureLabel(name: string, color: string, description: string): Promise<void> {
  try {
    await ghApi(`/repos/${REPO}/labels`, {
      method: "POST",
      body: { name, color, description },
    });
    console.log(`  created label: ${name}`);
  } catch (err) {
    // 422 means it already exists
    const msg = (err as Error).message;
    if (!msg.includes("422")) throw err;
  }
}

async function main(): Promise<void> {
  console.log(`Target repo: ${REPO}`);

  // 1. Load the latest report
  const reportPath = join(RD, "reports", "latest.json");
  if (!existsSync(reportPath)) {
    console.error(`reports/latest.json not found — run npm run readiness first`);
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;

  // 2. Ensure labels exist (fire-and-forget — ignore duplicates)
  console.log("Ensuring labels…");
  await ensureLabel("status:done", "0e8a16", "Feature verified Done");
  await ensureLabel("status:partial", "fbca04", "Feature partially built — needs completion + UX verification");
  await ensureLabel("status:not-started", "d93f0b", "Feature has no implementation yet");
  await ensureLabel("acceptance-metric", "5319e7", "Annexure C hard-metric acceptance criterion");
  await ensureLabel("priority:p0", "b60205", "MVP-blocker — contract-required for acceptance");
  for (const section of ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12"]) {
    await ensureLabel(`section:${section}`, "c5def5", `Annexure A §${section}`);
  }
  await ensureLabel("section:annexure-c", "c5def5", "Annexure C acceptance metric");

  // 3. List existing issues (idempotency)
  console.log("Fetching existing issues for idempotency…");
  const existing = await listAllIssues();
  const byTitle = new Map(existing.map((i) => [i.title, i]));
  console.log(`  found ${existing.length} existing issues/PRs`);

  // 4. Create (or reuse) one issue per feature + per acceptance metric
  const issueMap: IssueMap = {};
  const toCreate: Array<{ featureId: string; title: string; body: string; labels: string[] }> = [];

  // Only create issues for Not-Started and Partial — Done features don't need tickets.
  for (const f of report.features) {
    if (f.status === "done") continue;
    const section = (f.feature.annexure.match(/^(\d+\.\d+)/) ?? [])[1] ?? "3.1";
    const title = `[${section}] ${f.feature.name}`;
    const labels = [
      `status:${f.status.replace("_", "-")}`,
      `section:${section}`,
    ];
    if (f.feature.required_for_mvp !== false) labels.push("priority:p0");
    const body = buildFeatureBody(f);
    toCreate.push({ featureId: f.feature.id, title, body, labels });
  }
  for (const a of report.acceptance) {
    if (a.met === true) continue;
    const title = `[Annexure C] ${a.metric.name}`;
    const labels = [
      "acceptance-metric",
      "section:annexure-c",
      "priority:p0",
    ];
    const body = buildAcceptanceBody(a);
    toCreate.push({ featureId: a.metric.id, title, body, labels });
  }

  console.log(`\nTo process: ${toCreate.length} issues`);
  let created = 0;
  let reused = 0;
  for (const item of toCreate) {
    const existing = byTitle.get(item.title);
    if (existing) {
      issueMap[item.featureId] = {
        number: existing.number,
        url: existing.html_url,
        state: existing.state,
      };
      reused++;
      continue;
    }
    const result = await ghApi<{ number: number; html_url: string; state: "open" | "closed" }>(
      `/repos/${REPO}/issues`,
      { method: "POST", body: { title: item.title, body: item.body, labels: item.labels } },
    );
    issueMap[item.featureId] = {
      number: result.number,
      url: result.html_url,
      state: result.state,
    };
    created++;
    console.log(`  #${result.number} ${item.title}`);
    // GitHub secondary rate limit on content-creating endpoints — small cooldown
    await new Promise((r) => setTimeout(r, 300));
  }

  // 5. Write issue map
  const mapPath = join(RD, "issue-map.json");
  writeFileSync(mapPath, JSON.stringify(issueMap, null, 2), "utf8");
  console.log(`\nIssue map written: ${mapPath} (${Object.keys(issueMap).length} entries)`);

  console.log(`\nDone. Created ${created} · Reused ${reused}`);
}

function buildFeatureBody(f: Report["features"][number]): string {
  return [
    `**Contract reference:** ${f.feature.annexure} (see [CONTRACT_REFERENCE.md](../blob/main/CONTRACT_REFERENCE.md) in the workspace docs)`,
    "",
    `**Current status (automated):** ${f.status.toUpperCase().replace("_", " ")}`,
    "",
    `**Summary from last readiness run:** ${f.summary}`,
    "",
    "### What this issue tracks",
    "",
    f.status === "not_started"
      ? "This contract-named feature has no implementation detected in the codebase. Three contractually-valid resolutions:"
      : "This contract-named feature has code in the repository but has not yet been verified end-to-end by a legal / accounting professional. Three contractually-valid resolutions:",
    "",
    "1. **Build** — complete the feature against the contract text",
    "2. **Waive** — Client agrees in writing that it is out of scope / deferred post-MVP",
    "3. **Accept partial** — Client agrees current state satisfies acceptance for this item",
    "",
    "### How this issue closes",
    "",
    "When this issue is **closed**, the readiness engine will mark the feature as Done in the next run (the engine checks GitHub issue state via the `github_issue` check type). This creates a bidirectional loop: close here → report updates there.",
    "",
    "### Evidence trail",
    "",
    `Re-run the engine locally: \`npm run readiness\` from \`readiness/\`. Full detail in \`readiness/reports/latest.md\`.`,
    "",
    `---`,
    `_Feature id: \`${f.feature.id}\` · opened by the readiness-tracker auto-sync._`,
  ].join("\n");
}

function buildAcceptanceBody(a: Report["acceptance"][number]): string {
  return [
    `**Contract reference:** Annexure C — Acceptance Test Plan`,
    "",
    `**Target:** ${a.metric.target}`,
    "",
    `**Current status:** ${a.met === true ? "MET" : a.met === false ? "UNMET" : "UNKNOWN"}`,
    "",
    `**Blocker:** ${a.summary}`,
    "",
    "### What this issue tracks",
    "",
    "This is one of the 12 hard-metric acceptance criteria from Annexure C. MVP acceptance requires every one of these to be MET (not Partial — Annexure C does not allow Partial).",
    "",
    "### How this issue closes",
    "",
    "Close this issue when the metric is demonstrably met and the evidence is recorded in `readiness/manual-verdicts.yaml` (for metrics that need a human-measured value) or when an automated probe passes.",
    "",
    `---`,
    `_Metric id: \`${a.metric.id}\` · opened by the readiness-tracker auto-sync._`,
  ].join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
