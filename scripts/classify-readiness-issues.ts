// classify-readiness-issues.ts — one-shot tagging of the 103 mvp-readiness
// issues with the canonical label scheme (kind / surface / scope).
//
// Deterministic: section-based rules + a handful of per-feature overrides.
// Writes the resulting (issue, labels[]) map to classification.json before
// touching GitHub, so a future dry-run / re-run can diff against it.
//
// Run: npm run classify-readiness

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RD = dirname(SCRIPT_DIR);
const SPEC = join(RD, "spec", "annexure-a-scope.yaml");
const ISSUE_MAP = join(RD, "issue-map.json");
const OUT = join(RD, "scripts", "classification.json");
const REPO = "LexOriginIndia/mvp-readiness";

interface Feature { id: string; name: string; annexure: string }

// Section → default surface label. Everything else keeps user-facing.
const SURFACE_BY_SECTION: Record<string, string> = {
  "3.10 External APIs / Sources": "surface:integration",
  "3.12 Infrastructure": "surface:infrastructure",
};
const DEFAULT_SURFACE = "surface:user-facing";

// Per-feature overrides where the section rule gets it wrong.
const SURFACE_OVERRIDES: Record<string, string> = {
  "security-soc2-iso27001": "surface:infrastructure",
  "audit-logs-encryption-access-controls": "surface:infrastructure",
  "role-based-access": "surface:backend-service",
};

function classify(feat: Feature): string[] {
  const surface =
    SURFACE_OVERRIDES[feat.id] ?? SURFACE_BY_SECTION[feat.annexure] ?? DEFAULT_SURFACE;
  // Every readiness issue is a task by construction (one per Annexure A feature)
  // and in-scope (comes from the signed SDA).
  return ["kind:task", surface, "scope:in-contract"];
}

function main() {
  const features = parseYaml(readFileSync(SPEC, "utf8")) as Feature[];
  // issue-map.json stores { feature-id: { number, url, state } } per entry.
  const issueMap = JSON.parse(readFileSync(ISSUE_MAP, "utf8")) as Record<string, { number: number; state: string }>;

  const classification: Record<string, { issue: number; name: string; annexure: string; labels: string[] }> = {};
  const bySurface: Record<string, number> = {};

  for (const f of features) {
    const entry = issueMap[f.id];
    const issueNum = entry?.number;
    if (!issueNum) continue;
    const labels = classify(f);
    classification[f.id] = { issue: issueNum, name: f.name, annexure: f.annexure, labels };
    const surface = labels.find((l) => l.startsWith("surface:"))!;
    bySurface[surface] = (bySurface[surface] ?? 0) + 1;
  }

  writeFileSync(OUT, JSON.stringify(classification, null, 2), "utf8");
  console.log(`Classified ${Object.keys(classification).length} features. Distribution:`);
  for (const [k, v] of Object.entries(bySurface).sort()) console.log(`  ${k}: ${v}`);
  console.log(`\nWrote ${OUT}`);

  const DRY = process.argv.includes("--dry");
  if (DRY) {
    console.log(`\n(dry run — not calling gh. Pass without --dry to apply.)`);
    return;
  }

  console.log(`\nApplying labels on ${REPO}…`);
  let ok = 0, fail = 0;
  for (const [fid, c] of Object.entries(classification)) {
    const flags = c.labels.map((l) => `--add-label ${JSON.stringify(l)}`).join(" ");
    const cmd = `gh issue edit ${c.issue} --repo ${REPO} ${flags}`;
    try {
      execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] });
      ok++;
      if (ok % 10 === 0) console.log(`  … ${ok}/${Object.keys(classification).length}`);
    } catch (err) {
      fail++;
      console.warn(`  ! #${c.issue} (${fid}): ${(err as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`\nDone: ${ok} succeeded, ${fail} failed.`);
}

main();
