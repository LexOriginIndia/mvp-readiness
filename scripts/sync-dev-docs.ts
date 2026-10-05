// sync-dev-docs.ts — refresh C:/Lex Origin/developers-docs/ by pulling:
//   1. Every .md under each listed source repo (local checkout)
//   2. Every GitHub issue with the "documentation" label (open + closed)
//      from each listed source repo, as a markdown file with YAML frontmatter.
//
// Run: npm run sync-dev-docs   (defined in readiness/package.json)
//
// The Developer Docs browser (/dev-docs) walks developers-docs/ recursively,
// so anything this script drops shows up automatically on next page load.
//
// Nothing is deleted outside the two sync subtrees we own. Hand-authored
// files in developers-docs/ (ARCHITECTURE.md, BLOCK_MANAGEMENT.md, …) are
// never touched.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync, rmSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.env.LEX_ORIGIN_ROOT ?? "C:/Lex Origin";
const DEV_DOCS = join(ROOT, "developers-docs");

interface Repo {
  key: string;        // folder slug under developers-docs/
  localPath: string;  // absolute checkout path
  ghRepo: string;     // owner/name for gh CLI
}

const REPOS: Repo[] = [
  { key: "authservice",     localPath: join(ROOT, "authservice"),     ghRepo: "LexOriginIndia/authservice" },
  { key: "lexai-client-fe", localPath: join(ROOT, "lexai-client-fe"), ghRepo: "LexOriginIndia/lexai-client-fe" },
];

const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", ".turbo", "coverage"]);

function walkMd(dir: string, prefix = ""): Array<{ abs: string; rel: string }> {
  const out: Array<{ abs: string; rel: string }> = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    const abs = join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walkMd(abs, rel));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) out.push({ abs, rel });
  }
  return out;
}

function clean(dir: string) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function copyMarkdown(repo: Repo): number {
  const destRoot = join(DEV_DOCS, repo.key);
  clean(destRoot);
  const files = walkMd(repo.localPath);
  for (const f of files) {
    const destAbs = join(destRoot, f.rel);
    mkdirSync(dirname(destAbs), { recursive: true });
    const body = readFileSync(f.abs, "utf8");
    // Prepend a header so the viewer shows where this came from.
    const header =
      `<!-- source: ${repo.ghRepo}/${f.rel} · synced ${new Date().toISOString().slice(0, 10)} -->\n\n`;
    writeFileSync(destAbs, header + body, "utf8");
  }
  return files.length;
}

interface Issue {
  number: number;
  title: string;
  state: string;
  body: string;
  labels: Array<{ name: string }>;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  author: { login: string };
  url: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function fetchDocumentationIssues(repo: Repo): Issue[] {
  // Pull both open AND closed issues with the "documentation" label.
  const cmd = `gh issue list -R ${repo.ghRepo} --state all --label documentation --limit 1000 --json number,title,state,body,labels,createdAt,updatedAt,closedAt,author,url`;
  try {
    const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`! gh issue list failed for ${repo.ghRepo}: ${(err as Error).message}`);
    return [];
  }
}

function issueToMarkdown(repo: Repo, issue: Issue): string {
  const labels = issue.labels.map((l) => l.name).join(", ");
  const frontmatter = [
    "---",
    `source: ${repo.ghRepo}#${issue.number}`,
    `title: ${JSON.stringify(issue.title)}`,
    `state: ${issue.state.toLowerCase()}`,
    `author: ${issue.author?.login ?? "unknown"}`,
    `created: ${issue.createdAt}`,
    `updated: ${issue.updatedAt}`,
    issue.closedAt ? `closed: ${issue.closedAt}` : `closed: null`,
    `labels: [${labels}]`,
    `url: ${issue.url}`,
    "---",
    "",
  ].join("\n");
  const header = `# #${issue.number} — ${issue.title}\n\n` +
    `**State:** ${issue.state} · **Repo:** [${repo.ghRepo}](${issue.url}) · **Labels:** ${labels || "—"}\n\n---\n\n`;
  const body = issue.body?.trim() || "_(no body)_";
  return frontmatter + header + body + "\n";
}

function syncIssues(repo: Repo): number {
  const destRoot = join(DEV_DOCS, `${repo.key}-issues`);
  clean(destRoot);
  const issues = fetchDocumentationIssues(repo);
  if (!issues.length) {
    writeFileSync(join(destRoot, "README.md"), `# ${repo.ghRepo} — documentation issues\n\n_No issues with the \`documentation\` label at ${new Date().toISOString()}._\n`, "utf8");
    return 0;
  }
  // Index page listing every issue.
  const indexLines = [
    `# ${repo.ghRepo} — documentation issues`,
    ``,
    `${issues.length} issue${issues.length === 1 ? "" : "s"} labelled \`documentation\` (open + closed).`,
    `Synced ${new Date().toISOString()}.`,
    ``,
    `| # | State | Title |`,
    `|---|---|---|`,
  ];
  for (const i of issues.sort((a, b) => b.number - a.number)) {
    const slug = slugify(i.title) || `issue-${i.number}`;
    const fname = `${String(i.number).padStart(4, "0")}-${slug}.md`;
    indexLines.push(`| [#${i.number}](./${fname}) | ${i.state.toLowerCase()} | ${i.title.replace(/\|/g, "\\|")} |`);
    writeFileSync(join(destRoot, fname), issueToMarkdown(repo, i), "utf8");
  }
  writeFileSync(join(destRoot, "README.md"), indexLines.join("\n") + "\n", "utf8");
  return issues.length;
}

function main() {
  if (!existsSync(DEV_DOCS)) mkdirSync(DEV_DOCS, { recursive: true });
  for (const repo of REPOS) {
    console.log(`\n== ${repo.key} ==`);
    if (!existsSync(repo.localPath)) {
      console.warn(`! local checkout missing: ${repo.localPath} — skipping markdown copy`);
    } else {
      const n = copyMarkdown(repo);
      console.log(`  markdown: ${n} files → developers-docs/${repo.key}/`);
    }
    const i = syncIssues(repo);
    console.log(`  issues:   ${i} documentation issues → developers-docs/${repo.key}-issues/`);
  }
  console.log(`\nDone. The Dev Docs browser at /dev-docs picks these up on next load.`);
}

main();
