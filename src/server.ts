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
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
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
    <article>${bodyHtml}</article>
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
    body: layout(title, html, summary),
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
      const r = serveReport(join(REPORTS, "latest.md"), "Lex Origin Readiness");
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
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(layout("Not found", `<h1>404</h1><p><code>${escapeHtml(path)}</code> is not a route. Try <a href="/readiness">/readiness</a>.</p>`, null));
  } catch (err) {
    res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    res.end(layout("Error", `<h1>Server error</h1><p>${escapeHtml((err as Error).message)}</p>`, null));
  }
});

server.listen(PORT, () => {
  console.log(`Readiness UI → http://localhost:${PORT}/readiness`);
});
