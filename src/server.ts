// server.ts — small HTTP server that renders the readiness report as a
// local web UI.
//
//   npm run serve
//
// Then open http://localhost:8020/readiness
//
// Routes:
//   GET  /readiness              — rendered HTML of reports/latest.md
//   GET  /readiness/raw          — raw markdown
//   GET  /readiness/data         — reports/latest.json
//   GET  /readiness/history      — list of dated snapshots
//   GET  /readiness/history/:d   — rendered HTML of a specific snapshot
//   POST /readiness/refresh      — re-run the engine, re-render
//
// Keep deps minimal — just marked for markdown→HTML.  No Express.

import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { spawn } from "node:child_process";
import { marked } from "marked";

const ROOT = process.env.LEX_ORIGIN_ROOT ?? "C:/Lex Origin";
const RD = join(ROOT, "readiness");
const REPORTS = join(RD, "reports");
const HISTORY = join(REPORTS, "history");
const PORT = Number(process.env.READINESS_PORT ?? 8020);

const REPO_URL = "https://github.com/LexOriginIndia/mvp-readiness";

marked.setOptions({ gfm: true, breaks: false });

interface ReportSummary {
  generated_at: string;
  scope_summary: { total: number; done: number; partial: number; not_started: number; unknown: number };
  acceptance_summary: { total: number; met: number; unmet: number; unknown: number };
}

function loadSummary(jsonPath: string): ReportSummary | null {
  try {
    return JSON.parse(readFileSync(jsonPath, "utf8")) as ReportSummary;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Add stable section anchors to the rendered contract HTML so the
 * report can link into them.  Converts:
 *   <h2>1. Headline terms</h2>          → <h2 id="s-1">...</h2>
 *   <h3>3.1 Core AI Development</h3>   → <h3 id="s-3-1">...</h3>
 * marked's built-in slugger generates less predictable ids (e.g.
 * "1-headline-terms"), so we overwrite them with the numeric form the
 * report refers to.
 */
function anchorContractSections(html: string): string {
  // Overwrite existing id= OR insert one if missing.  Only touch h2/h3.
  return html
    .replace(/<h2(?:\s+id="[^"]*")?>\s*(\d+)\.\s*([^<]+)<\/h2>/g,
      (_m, n, name) => `<h2 id="s-${n}">${n}. ${name}</h2>`)
    .replace(/<h3(?:\s+id="[^"]*")?>\s*(\d+)\.(\d+)\s*([^<]+)<\/h3>/g,
      (_m, a, b, name) => `<h3 id="s-${a}-${b}">${a}.${b} ${name}</h3>`);
}

/**
 * In the readiness report HTML, turn every reference like "3.1 Core AI
 * Development" or "Annexure C" into an anchor link that scrolls the
 * left-hand contract column to the matching section.  Keeps the visible
 * text unchanged.
 *
 * Patterns matched:
 *  - "N.N " at start of a heading / cell  →  #s-N-N
 *  - "N. "  at start of a heading / cell  →  #s-N
 *  - "Annexure A|B|C"                     →  #s-3 (A) / #s-2 (B) / #s-4 (C)
 *                                           — using CONTRACT_REFERENCE.md's
 *                                             numbering, where §2 is Timeline,
 *                                             §3 is Scope (Annexure A), §4 is
 *                                             Acceptance (Annexure C).
 */
function linkContractRefs(html: string): string {
  let out = html;
  // "N.N <text>" at the start of h2/h3/h4 and inside table cells
  out = out.replace(
    /(<(?:h[1-6])[^>]*>)(\s*)(\d+)\.(\d+)(\s+[^<]+<\/h[1-6]>)/g,
    (_m, open, pre, a, b, rest) =>
      `${open}${pre}<a href="#s-${a}-${b}">${a}.${b}</a>${rest.replace(
        /^\s*/,
        " ",
      )}`,
  );
  // "N. <text>" at the start of h2/h3
  out = out.replace(
    /(<(?:h[23])[^>]*>)(\s*)(\d+)\.(\s+[^<]+<\/h[23]>)/g,
    (_m, open, pre, n, rest) =>
      `${open}${pre}<a href="#s-${n}">${n}.</a>${rest.replace(/^\s*/, " ")}`,
  );
  // "Annexure A/B/C" anywhere — map to the right contract section
  const annex: Record<string, string> = { A: "s-3", B: "s-2", C: "s-4" };
  out = out.replace(/\bAnnexure (A|B|C)\b/g, (_m, letter) =>
    `<a href="#${annex[letter]}">Annexure ${letter}</a>`);
  // Section-header refs inside table cells too: "| 3.1 | ..."
  // Already covered by the h*-anchored pass since Annexure A sections
  // appear as h3 in the report. Leaving the matcher conservative on
  // purpose — rewriting raw <td>3.1</td> is too aggressive and would
  // false-match version numbers.
  return out;
}

function layout(title: string, bodyHtml: string, summary: ReportSummary | null): string {
  const scope = summary?.scope_summary;
  const accept = summary?.acceptance_summary;
  const generated = summary?.generated_at
    ? new Date(summary.generated_at).toISOString().replace("T", " ").slice(0, 19)
    : "—";
  const pct = scope && scope.total ? Math.round((scope.done / scope.total) * 100) : 0;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #0b0d10; --card: #141820; --border: #262c36; --text: #e6e8eb; --muted: #9aa3af;
      --accent: #8ab4ff; --done: #2ea043; --partial: #d29922; --not: #cf222e; --unk: #6e7681;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    @media (prefers-color-scheme: light) {
      :root { --bg:#f6f7f9; --card:#ffffff; --border:#e5e7eb; --text:#111827; --muted:#4b5563; --accent:#2563eb; --unk:#6b7280; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    header { position: sticky; top: 0; z-index: 10; background: var(--bg); border-bottom: 1px solid var(--border); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    header .brand { display: flex; align-items: baseline; gap: 10px; }
    header h1 { margin: 0; font-size: 17px; font-weight: 600; }
    header .meta { font-size: 12px; color: var(--muted); font-family: var(--mono); }
    header nav { display: flex; gap: 10px; flex-wrap: wrap; font-size: 13px; }
    header nav a, header nav button {
      color: var(--accent); text-decoration: none; background: transparent; border: 1px solid var(--border);
      padding: 5px 10px; border-radius: 6px; font: inherit; cursor: pointer;
    }
    header nav a:hover, header nav button:hover { border-color: var(--accent); }
    main { max-width: 1180px; margin: 0 auto; padding: 24px; }
    /* Two-column layout used only by /readiness.
       Left column (contract) is sticky-scrollable so you can scan the
       report on the right while any §-reference link scrolls the left. */
    main.split { max-width: 1600px; display: grid; grid-template-columns: minmax(340px, 1fr) minmax(0, 1.4fr); gap: 24px; align-items: start; }
    main.split > .cards { grid-column: 1 / -1; }
    main.split > aside, main.split > article { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 20px 24px; }
    main.split > aside { position: sticky; top: 72px; max-height: calc(100vh - 96px); overflow-y: auto; }
    main.split > aside h1 { font-size: 18px; }
    main.split > aside h2 { font-size: 15px; margin-top: 24px; }
    main.split > aside h3 { font-size: 13px; margin-top: 14px; color: var(--text); }
    main.split > aside h2:target, main.split > aside h3:target {
      background: rgba(138,180,255,0.14); outline: 2px solid var(--accent); border-radius: 4px; padding: 2px 6px; margin-left: -6px;
    }
    main.split > aside table { font-size: 12px; }
    @media (max-width: 1024px) {
      main.split { grid-template-columns: 1fr; }
      main.split > aside { position: static; max-height: none; }
    }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
    .card .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .card .value { font-size: 28px; font-weight: 600; margin-top: 4px; }
    .card .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .card.done .value { color: var(--done); }
    .card.partial .value { color: var(--partial); }
    .card.not .value { color: var(--not); }
    .card.unk .value { color: var(--unk); }
    .progress { height: 6px; background: var(--border); border-radius: 999px; overflow: hidden; margin-top: 8px; }
    .progress .fill { height: 100%; background: linear-gradient(90deg, var(--done), var(--partial)); }
    article { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 24px 28px; }
    article h1, article h2, article h3 { line-height: 1.3; }
    article h1 { font-size: 24px; margin-top: 0; }
    article h2 { font-size: 18px; margin-top: 32px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
    article h3 { font-size: 15px; margin-top: 20px; color: var(--muted); font-weight: 600; }
    article table { border-collapse: collapse; width: 100%; margin: 12px 0 20px; font-size: 13px; }
    article th, article td { border: 1px solid var(--border); padding: 7px 10px; text-align: left; vertical-align: top; }
    article th { background: rgba(127,127,127,0.08); font-weight: 600; }
    article code { background: rgba(127,127,127,0.14); padding: 1px 5px; border-radius: 4px; font-family: var(--mono); font-size: 12.5px; }
    article a { color: var(--accent); }
    article hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
    footer { padding: 32px 24px; color: var(--muted); font-size: 12px; text-align: center; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    .status-dot.done { background: var(--done); }
    .status-dot.partial { background: var(--partial); }
    .status-dot.not { background: var(--not); }
    .status-dot.unk { background: var(--unk); }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--card); border: 1px solid var(--border); padding: 10px 16px; border-radius: 8px; font-size: 13px; }
    .toast.err { border-color: var(--not); color: var(--not); }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <h1>Lex Origin Readiness</h1>
      <span class="meta">generated ${generated} UTC</span>
    </div>
    <nav>
      <a href="/readiness">Latest</a>
      <a href="/readiness/history">History</a>
      <a href="/docs">Docs</a>
      <a href="/readiness/raw">Raw .md</a>
      <a href="/readiness/data">JSON</a>
      <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a>
      <a href="${REPO_URL}/issues" target="_blank" rel="noopener">Issues</a>
      <button type="button" onclick="refresh()">↻ Re-run engine</button>
    </nav>
  </header>
  ${
    scope
      ? `<main>
    <div class="cards">
      <div class="card done"><div class="label">Done</div><div class="value">${scope.done}</div><div class="sub">of ${scope.total} features</div></div>
      <div class="card partial"><div class="label">Partial</div><div class="value">${scope.partial}</div><div class="sub">code exists, UX unverified</div></div>
      <div class="card not"><div class="label">Not started</div><div class="value">${scope.not_started}</div><div class="sub">no implementation</div></div>
      <div class="card unk"><div class="label">Unknown</div><div class="value">${scope.unknown}</div><div class="sub">no checks defined</div></div>
      <div class="card"><div class="label">Done rate</div><div class="value">${pct}%</div><div class="progress"><div class="fill" style="width:${pct}%"></div></div></div>
      <div class="card done"><div class="label">Acceptance met</div><div class="value">${accept!.met}</div><div class="sub">of ${accept!.total} criteria</div></div>
    </div>
    ${bodyHtml}
  </main>`
      : `<main><article>${bodyHtml}</article></main>`
  }
  <footer>
    npm run readiness · engine source at <a href="${REPO_URL}" style="color:inherit">${REPO_URL}</a>
  </footer>
  <script>
    async function refresh() {
      const t = document.createElement('div'); t.className='toast'; t.textContent='Re-running engine…'; document.body.appendChild(t);
      try {
        const r = await fetch('/readiness/refresh', { method: 'POST' });
        if (!r.ok) throw new Error(await r.text());
        t.textContent = 'Refreshed — reloading…'; setTimeout(() => location.reload(), 400);
      } catch (e) {
        t.textContent = 'Refresh failed: ' + e.message; t.classList.add('err');
        setTimeout(() => t.remove(), 4000);
      }
    }
  </script>
</body>
</html>`;
}

function errorPage(msg: string): string {
  const html = `<h1>Readiness — error</h1><p>${escapeHtml(msg)}</p>`;
  return layout("Readiness — error", html, null);
}

function serveReport(path: string, title: string): { status: number; headers: Record<string, string>; body: string } {
  if (!existsSync(path)) {
    return { status: 404, headers: { "content-type": "text/html; charset=utf-8" }, body: errorPage(`${path} not found. Run \`npm run readiness\` first.`) };
  }
  const md = readFileSync(path, "utf8");
  const html = marked.parse(md) as string;
  const jsonPath = path.replace(/\.md$/, ".json");
  const summary = loadSummary(jsonPath);
  return {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    body: layout(title, `<article>${html}</article>`, summary),
  };
}

/**
 * Two-column /readiness view: contract on the left (sticky), report on
 * the right.  Section refs in the report (3.1, 3.2, …, "Annexure A|C")
 * are linked into the contract's anchored headings, so clicking a
 * reference scrolls the left column to that section.
 */
function serveSplitReadiness(): { status: number; headers: Record<string, string>; body: string } {
  const reportPath = join(REPORTS, "latest.md");
  const contractPath = join(RD, "CONTRACT_REFERENCE.md");
  if (!existsSync(reportPath)) {
    return { status: 404, headers: { "content-type": "text/html; charset=utf-8" }, body: errorPage(`${reportPath} not found. Run \`npm run readiness\` first.`) };
  }
  const reportMd = readFileSync(reportPath, "utf8");
  const reportHtml = linkContractRefs(marked.parse(reportMd) as string);
  const contractHtml = existsSync(contractPath)
    ? anchorContractSections(marked.parse(readFileSync(contractPath, "utf8")) as string)
    : `<p><em>CONTRACT_REFERENCE.md not found in <code>${escapeHtml(RD)}</code>.</em></p>`;
  const summary = loadSummary(join(REPORTS, "latest.json"));
  const body = `
    <aside aria-label="Contract reference (left)">${contractHtml}</aside>
    <article aria-label="Readiness report (right)">${reportHtml}</article>
  `;
  return {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    body: layout("Lex Origin Readiness", body, summary).replace("<main>", `<main class="split">`),
  };
}

function serveHistoryList(): { status: number; headers: Record<string, string>; body: string } {
  if (!existsSync(HISTORY)) {
    return { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: layout("Readiness — history", "<p>No snapshots yet.</p>", null) };
  }
  const files = readdirSync(HISTORY).filter((f) => f.endsWith(".json")).sort().reverse();
  const rows = files
    .map((f) => {
      const date = f.replace(/\.json$/, "");
      const s = loadSummary(join(HISTORY, f));
      const scope = s?.scope_summary;
      const accept = s?.acceptance_summary;
      return `<tr>
        <td><a href="/readiness/history/${encodeURIComponent(date)}">${date}</a></td>
        <td>${scope?.done ?? "?"} / ${scope?.total ?? "?"}</td>
        <td>${scope?.partial ?? "?"}</td>
        <td>${scope?.not_started ?? "?"}</td>
        <td>${accept?.met ?? "?"} / ${accept?.total ?? "?"}</td>
      </tr>`;
    })
    .join("\n");
  const html = `<h1>Readiness — history</h1>
    <p>Dated snapshots, newest first. Each row links to the full report at that point in time.</p>
    <table>
      <thead><tr><th>Date</th><th>Done</th><th>Partial</th><th>Not Started</th><th>Acceptance met</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: layout("Readiness — history", html, null) };
}

function serveHistorySnapshot(date: string): { status: number; headers: Record<string, string>; body: string } {
  const json = join(HISTORY, `${date}.json`);
  if (!existsSync(json)) {
    return { status: 404, headers: { "content-type": "text/html; charset=utf-8" }, body: errorPage(`snapshot ${date}.json not found`) };
  }
  const data = JSON.parse(readFileSync(json, "utf8")) as any;
  const scope = data.scope_summary;
  const accept = data.acceptance_summary;
  const bySection = new Map<string, Array<{ id: string; name: string; status: string; summary: string }>>();
  for (const f of data.features ?? []) {
    const key = f.feature.annexure;
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push({ id: f.feature.id, name: f.feature.name, status: f.status, summary: f.summary });
  }
  let body = `<h1>Readiness snapshot — ${escapeHtml(date)}</h1>`;
  body += `<p>Scope: ${scope.done} done · ${scope.partial} partial · ${scope.not_started} not-started · ${scope.unknown} unknown of ${scope.total}. Acceptance met: ${accept.met}/${accept.total}.</p>`;
  for (const [section, items] of Array.from(bySection.entries()).sort()) {
    const done = items.filter((i) => i.status === "done").length;
    body += `<h2>${escapeHtml(section)} — ${done}/${items.length} done</h2>`;
    body += `<table><thead><tr><th>Feature</th><th>Status</th><th>Summary</th></tr></thead><tbody>`;
    for (const i of items) {
      const dot = i.status === "done" ? "done" : i.status === "partial" ? "partial" : i.status === "not_started" ? "not" : "unk";
      body += `<tr><td><code>${escapeHtml(i.id)}</code><br>${escapeHtml(i.name)}</td><td><span class="status-dot ${dot}"></span>${escapeHtml(i.status.replace("_", " "))}</td><td>${escapeHtml(i.summary)}</td></tr>`;
    }
    body += `</tbody></table>`;
  }
  return { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: layout(`Readiness ${date}`, body, data) };
}

/**
 * Serve any .md file inside RD as rendered HTML.
 *
 * Security: the request path is resolved against RD and we verify the
 * resolved absolute path still starts with RD before reading.  Anything
 * that would escape (e.g. `/../../etc/passwd`) is refused.  Non-.md
 * paths are rejected by the caller, not here.
 */
function serveMarkdownFile(reqPath: string): { status: number; headers: Record<string, string>; body: string } {
  // Strip leading slash, keep the rest as a relative path.
  const rel = decodeURIComponent(reqPath.replace(/^\/+/, ""));
  const abs = resolve(RD, rel);
  const relToRd = relative(RD, abs);
  // relative() returns an empty string for exact-match, '..' or absolute
  // for outside-RD.  Refuse the latter.
  if (relToRd.startsWith("..") || relToRd.startsWith(sep) || /^[A-Za-z]:/.test(relToRd)) {
    return {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: layout("Bad path", `<h1>400</h1><p>Path escapes the readiness directory.</p>`, null),
    };
  }
  if (!existsSync(abs)) {
    return {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: layout("Not found", `<h1>404</h1><p><code>${escapeHtml(rel)}</code> not found in <code>${escapeHtml(RD)}</code>.</p><p><a href="/docs">See available docs</a></p>`, null),
    };
  }
  let stat;
  try { stat = statSync(abs); } catch {
    return { status: 404, headers: { "content-type": "text/plain" }, body: "not found" };
  }
  if (!stat.isFile()) {
    return {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: layout("Not a file", `<h1>404</h1><p><code>${escapeHtml(rel)}</code> is not a file.</p>`, null),
    };
  }
  const md = readFileSync(abs, "utf8");
  const html = marked.parse(md) as string;
  // Show summary cards only for the main report; other docs get just
  // the rendered body with the shared header.
  const summary = rel.replace(/\\/g, "/") === "reports/latest.md"
    ? loadSummary(join(REPORTS, "latest.json"))
    : null;
  const title = `${rel} — Lex Origin Readiness`;
  return {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    body: layout(title, html, summary),
  };
}

/** List every .md file in RD (top level + reports/) so you can click to any of them. */
function serveDocsIndex(): { status: number; headers: Record<string, string>; body: string } {
  const files: Array<{ path: string; size: number; mtime: string }> = [];
  // Top-level .md
  for (const entry of readdirSync(RD, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      const abs = join(RD, entry.name);
      const s = statSync(abs);
      files.push({ path: entry.name, size: s.size, mtime: s.mtime.toISOString().slice(0, 19).replace("T", " ") });
    }
  }
  // reports/*.md
  if (existsSync(REPORTS)) {
    for (const entry of readdirSync(REPORTS, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        const abs = join(REPORTS, entry.name);
        const s = statSync(abs);
        files.push({ path: `reports/${entry.name}`, size: s.size, mtime: s.mtime.toISOString().slice(0, 19).replace("T", " ") });
      }
    }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const rows = files
    .map((f) => `<tr>
      <td><a href="/${encodeURI(f.path)}"><code>${escapeHtml(f.path)}</code></a></td>
      <td style="text-align:right">${(f.size / 1024).toFixed(1)} KB</td>
      <td style="font-family:var(--mono);font-size:12px">${f.mtime}</td>
    </tr>`)
    .join("\n");
  const body = `<h1>Docs</h1>
    <p>Every markdown file in the readiness repository, served rendered. Links are the same URLs you can share with anyone who can reach this host.</p>
    <table><thead><tr><th>Path</th><th>Size</th><th>Modified (UTC)</th></tr></thead><tbody>${rows}</tbody></table>`;
  return { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: layout("Docs — Lex Origin Readiness", body, null) };
}

async function runEngine(): Promise<{ ok: boolean; log: string }> {
  return new Promise((resolve) => {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const p = spawn(npm, ["run", "readiness"], { cwd: RD, env: { ...process.env } });
    let log = "";
    p.stdout.on("data", (d) => (log += d.toString()));
    p.stderr.on("data", (d) => (log += d.toString()));
    p.on("close", (code) => resolve({ ok: code === 0, log }));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  try {
    if (path === "/" || path === "/readiness") {
      const r = serveSplitReadiness();
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }
    // Single-column (old) report, in case anyone wants a report-only view
    if (path === "/readiness/only") {
      const r = serveReport(join(REPORTS, "latest.md"), "Lex Origin Readiness — report only");
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }
    if (path === "/readiness/raw") {
      const file = join(REPORTS, "latest.md");
      if (!existsSync(file)) {
        res.writeHead(404);
        res.end("latest.md not found");
        return;
      }
      res.writeHead(200, { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" });
      res.end(readFileSync(file, "utf8"));
      return;
    }
    if (path === "/readiness/data") {
      const file = join(REPORTS, "latest.json");
      if (!existsSync(file)) {
        res.writeHead(404);
        res.end("latest.json not found");
        return;
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(readFileSync(file, "utf8"));
      return;
    }
    if (path === "/readiness/history") {
      const r = serveHistoryList();
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }
    const histMatch = /^\/readiness\/history\/([0-9A-Za-z-]+)$/.exec(path);
    if (histMatch) {
      const r = serveHistorySnapshot(histMatch[1]);
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }
    if (path === "/readiness/refresh" && req.method === "POST") {
      const { ok, log } = await runEngine();
      res.writeHead(ok ? 200 : 500, { "content-type": "text/plain; charset=utf-8" });
      res.end(log);
      return;
    }
    if (path === "/docs") {
      const r = serveDocsIndex();
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }
    // Generic .md file server — serves any .md inside the readiness
    // directory as rendered HTML.  Path-traversal safe: resolves against
    // RD and refuses anything outside.
    if (path.toLowerCase().endsWith(".md")) {
      const r = serveMarkdownFile(path);
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(layout("Not found", `<h1>404</h1><p><code>${escapeHtml(path)}</code> is not a route. Try <a href="/readiness">/readiness</a> or <a href="/docs">/docs</a>.</p>`, null));
  } catch (err) {
    res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    res.end(layout("Error", `<h1>Server error</h1><p>${escapeHtml((err as Error).message)}</p>`, null));
  }
});

server.listen(PORT, () => {
  console.log(`Readiness UI → http://localhost:${PORT}/readiness`);
});
