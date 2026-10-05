// merge-issues-into-spec.ts — reads issue-map.json and appends a
// `github_issue` check to each feature / metric in the two spec files
// so the readiness engine starts following issue state as a signal.
//
// Idempotent: skips features that already have a github_issue check.
//
//   npm run merge-issues

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const ROOT = process.env.LEX_ORIGIN_ROOT ?? "C:/Lex Origin";
const RD = join(ROOT, "readiness");
const REPO = process.env.REPO || "LexOriginIndia/mvp-readiness";

interface IssueMap {
  [id: string]: { number: number; url: string; state: string };
}

interface CheckWithType { type: string; [k: string]: unknown }

interface FeatureLike {
  id: string;
  checks?: CheckWithType[];
}

function mergeSpec(path: string, issueMap: IssueMap): { changed: number } {
  if (!existsSync(path)) {
    console.warn(`spec file missing: ${path}`);
    return { changed: 0 };
  }
  const raw = readFileSync(path, "utf8");
  const items = parseYaml(raw) as FeatureLike[] | null;
  if (!Array.isArray(items)) {
    console.warn(`${path} is not an array`);
    return { changed: 0 };
  }
  let changed = 0;
  for (const f of items) {
    const mapping = issueMap[f.id];
    if (!mapping) continue;
    if (!Array.isArray(f.checks)) f.checks = [];
    const already = f.checks.some(
      (c) => c.type === "github_issue" && c.issue === `${REPO}#${mapping.number}`,
    );
    if (already) continue;
    // Remove any stale github_issue checks pointing at a different number
    f.checks = f.checks.filter((c) => c.type !== "github_issue");
    f.checks.push({
      type: "github_issue",
      issue: `${REPO}#${mapping.number}`,
      note: "Auto-added by merge-issues. Close the issue to flip this feature to Done.",
    } as CheckWithType);
    changed++;
  }
  // Write back with stable formatting
  writeFileSync(path, stringifyYaml(items, { lineWidth: 100 }), "utf8");
  return { changed };
}

function main(): void {
  const mapPath = join(RD, "issue-map.json");
  if (!existsSync(mapPath)) {
    console.error(`issue-map.json not found — run sync-issues first`);
    process.exit(1);
  }
  const issueMap = JSON.parse(readFileSync(mapPath, "utf8")) as IssueMap;
  console.log(`Loaded ${Object.keys(issueMap).length} issue mappings from ${REPO}`);

  const a = mergeSpec(join(RD, "spec", "annexure-a-scope.yaml"), issueMap);
  const c = mergeSpec(join(RD, "spec", "annexure-c-acceptance.yaml"), issueMap);
  console.log(`Annexure A: ${a.changed} features updated with github_issue check`);
  console.log(`Annexure C: ${c.changed} metrics updated with github_issue check`);
  console.log(`\nNext: commit the two spec files and run \`npm run readiness\` to pick up the new checks.`);
}

main();
