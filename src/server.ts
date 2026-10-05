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
const DEV_DOCS = join(ROOT, "developers-docs");
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

/**
 * Load the full feature + acceptance-metric lists from latest.json.
 * Used to attach drill-down modals to status cells in the rendered
 * report. Returns empty arrays if the file is missing or malformed.
 */
function loadReportEntities(): { features: any[]; acceptance: any[] } {
  try {
    const data = JSON.parse(readFileSync(join(REPORTS, "latest.json"), "utf8"));
    return {
      features: Array.isArray(data.features) ? data.features : [],
      acceptance: Array.isArray(data.acceptance) ? data.acceptance : [],
    };
  } catch {
    return { features: [], acceptance: [] };
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
  // Inject id="rs-N" on the heading tag itself (so the scroll-sync code
  // can find the right-side counterpart) — only if the heading has no id.
  const addId = (openTag: string, tag: string, id: string): string =>
    /\bid="/.test(openTag) ? openTag : openTag.replace(`<${tag}`, `<${tag} id="${id}"`);

  // "N.N <text>" at the start of h2/h3/h4 and inside table cells
  out = out.replace(
    /(<(h[1-6])[^>]*>)(\s*)(\d+)\.(\d+)(\s+[^<]+<\/h[1-6]>)/g,
    (_m, open, tag, pre, a, b, rest) => {
      const newOpen = addId(open, tag, `rs-${a}-${b}`);
      return `${newOpen}${pre}<a href="#s-${a}-${b}">${a}.${b}</a>${rest.replace(/^\s*/, " ")}`;
    },
  );
  // "N. <text>" at the start of h2/h3
  out = out.replace(
    /(<(h[23])[^>]*>)(\s*)(\d+)\.(\s+[^<]+<\/h[23]>)/g,
    (_m, open, tag, pre, n, rest) => {
      const newOpen = addId(open, tag, `rs-${n}`);
      return `${newOpen}${pre}<a href="#s-${n}">${n}.</a>${rest.replace(/^\s*/, " ")}`;
    },
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

function layout(title: string, bodyHtml: string, summary: ReportSummary | null, opts: { bare?: boolean } = {}): string {
  const scope = summary?.scope_summary;
  const accept = summary?.acceptance_summary;
  const generated = summary?.generated_at
    ? new Date(summary.generated_at).toISOString().replace("T", " ").slice(0, 19)
    : "—";
  const pct = scope && scope.total ? Math.round((scope.done / scope.total) * 100) : 0;
  // Only inject the entities payload on report pages (summary present).
  // Keeps unrelated .md pages lean.
  const entities = summary ? loadReportEntities() : { features: [], acceptance: [] };
  const entitiesPayload = JSON.stringify(entities);
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
    main.split > .cards, main.split > .filters { grid-column: 1 / -1; }
    main.split > aside, main.split > article { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 20px 24px; }
    main.split > aside { position: sticky; top: 72px; max-height: calc(100vh - 96px); overflow-y: auto; }
    main.split > aside h1 { font-size: 18px; }
    main.split > aside h2 { font-size: 15px; margin-top: 24px; }
    main.split > aside h3 { font-size: 13px; margin-top: 14px; color: var(--text); }
    main.split > aside h2:target, main.split > aside h3:target {
      background: rgba(138,180,255,0.14); outline: 2px solid var(--accent); border-radius: 4px; padding: 2px 6px; margin-left: -6px;
    }
    main.split > aside table { font-size: 12px; }
    @media (max-width: 899px) {
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
    /* Clickable status cells + modal */
    article td.status-cell { cursor: pointer; user-select: none; }
    article td.status-cell:hover { background: rgba(138,180,255,0.08); outline: 1px solid var(--accent); outline-offset: -1px; }
    article td.status-cell::after { content: " ⓘ"; color: var(--muted); font-size: 11px; opacity: 0.6; }
    article td.status-cell:hover::after { opacity: 1; color: var(--accent); }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: none; align-items: flex-start; justify-content: center; z-index: 100; overflow-y: auto; padding: 48px 16px; }
    .modal-backdrop.open { display: flex; }
    .modal { background: var(--card); border: 1px solid var(--border); border-radius: 12px; max-width: 820px; width: 100%; padding: 24px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .modal header { position: static; background: transparent; border: none; padding: 0 0 12px; display: block; }
    .modal h2 { margin: 0 0 4px; font-size: 18px; }
    .modal .annex { font-size: 12px; color: var(--muted); font-family: var(--mono); }
    .modal .close { position: absolute; top: 10px; right: 12px; background: transparent; border: none; color: var(--muted); font-size: 22px; cursor: pointer; line-height: 1; }
    .modal .close:hover { color: var(--text); }
    .modal-top { position: relative; }
    .modal .status-line { font-size: 14px; margin: 8px 0 16px; padding: 8px 12px; border-radius: 6px; background: rgba(127,127,127,0.08); }
    .modal .status-line .pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; margin-right: 8px; }
    .modal .status-line .pill.done { background: rgba(46,160,67,0.18); color: var(--done); }
    .modal .status-line .pill.partial { background: rgba(210,153,34,0.18); color: var(--partial); }
    .modal .status-line .pill.not { background: rgba(207,34,46,0.18); color: var(--not); }
    .modal .status-line .pill.unk { background: rgba(110,118,129,0.22); color: var(--unk); }
    .modal .check { border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
    .modal .check-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .modal .check-head .pill { padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .modal .check-head .pill.pass { background: rgba(46,160,67,0.18); color: var(--done); }
    .modal .check-head .pill.fail { background: rgba(207,34,46,0.2); color: var(--not); }
    .modal .check-head .pill.needs_work { background: rgba(210,153,34,0.2); color: var(--partial); }
    .modal .check-head .pill.manual_pending { background: rgba(110,118,129,0.22); color: var(--unk); }
    .modal .check-head .pill.skip { background: rgba(110,118,129,0.15); color: var(--muted); }
    .modal .check-head .type { font-family: var(--mono); font-size: 12px; color: var(--muted); }
    .modal .check-body { font-size: 13px; color: var(--text); }
    .modal .check-body code { background: rgba(127,127,127,0.14); padding: 1px 5px; border-radius: 3px; font-family: var(--mono); font-size: 12px; }
    .modal .check-note { font-size: 12px; color: var(--muted); margin-top: 6px; font-style: italic; }
    .modal .check-detail { font-family: var(--mono); font-size: 12px; margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
    .modal .issue-link { font-size: 12px; margin-top: 6px; }
    .modal .issue-link a { color: var(--accent); }
    .modal .what-missing { background: rgba(207,34,46,0.08); border-left: 3px solid var(--not); padding: 10px 14px; margin: 12px 0; border-radius: 4px; font-size: 13px; }
    .modal .what-missing strong { color: var(--not); }
    .modal .what-missing.ok { background: rgba(46,160,67,0.08); border-color: var(--done); }
    .modal .what-missing.ok strong { color: var(--done); }
    /* Status filter chips */
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; align-items: center; }
    .filters .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-right: 4px; }
    .filter-chip { background: var(--card); border: 1px solid var(--border); color: var(--text); padding: 6px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
    .filter-chip:hover { border-color: var(--accent); }
    .filter-chip .count { color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
    .filter-chip .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .filter-chip .dot.done { background: var(--done); }
    .filter-chip .dot.partial { background: var(--partial); }
    .filter-chip .dot.not { background: var(--not); }
    .filter-chip .dot.unk { background: var(--unk); }
    .filter-chip[data-active="true"] { background: var(--accent); color: #fff; border-color: var(--accent); }
    .filter-chip[data-active="true"] .count { color: rgba(255,255,255,0.75); }
    @media (prefers-color-scheme: light) {
      .filter-chip[data-active="true"] { color: #fff; }
    }
    /* Rows + section tables hidden by filter */
    article tr.filter-hidden { display: none; }
    article .section-hidden { display: none; }
    /* Appendix A → card grid */
    article .appendix-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin: 16px 0 24px; }
    article .appendix-card {
      background: var(--card); border: 1px solid var(--border); border-left-width: 3px;
      border-radius: 8px; padding: 12px 14px; cursor: pointer; display: flex; flex-direction: column; gap: 6px;
      transition: border-color 120ms ease, transform 120ms ease;
    }
    article .appendix-card:hover { border-color: var(--accent); transform: translateY(-1px); }
    article .appendix-card:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
    article .appendix-card.status-done { border-left-color: var(--done); }
    article .appendix-card.status-partial { border-left-color: var(--partial); }
    article .appendix-card.status-not_started { border-left-color: var(--not); }
    article .appendix-card.status-unknown { border-left-color: var(--unk); }
    article .appendix-card .ap-head { display: flex; align-items: center; gap: 8px; }
    article .appendix-card .pill { padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 10.5px; letter-spacing: 0.04em; }
    article .appendix-card .pill.done { background: rgba(46,160,67,0.18); color: var(--done); }
    article .appendix-card .pill.partial { background: rgba(210,153,34,0.18); color: var(--partial); }
    article .appendix-card .pill.not { background: rgba(207,34,46,0.2); color: var(--not); }
    article .appendix-card .pill.unk { background: rgba(110,118,129,0.22); color: var(--unk); }
    article .appendix-card .ap-id { font-size: 11px; color: var(--muted); font-family: var(--mono); background: transparent; padding: 0; }
    article .appendix-card .ap-name { font-size: 14px; font-weight: 600; line-height: 1.3; }
    article .appendix-card .ap-annex { font-size: 11px; color: var(--muted); font-family: var(--mono); }
    article .appendix-card .ap-sum { font-size: 12px; color: var(--text); opacity: 0.78; }
    article .appendix-card .ap-miss { font-size: 11.5px; color: var(--not); font-weight: 600; }
    article .appendix-card.status-done .ap-miss { color: var(--done); }
    /* Developer Docs: 30/70 split, sidebar + iframe preview */
    main.dev-docs { max-width: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(260px, 30%) 1fr; min-height: calc(100vh - 65px); }
    main.dev-docs > .dd-sidebar { background: var(--card); border-right: 1px solid var(--border); overflow-y: auto; max-height: calc(100vh - 65px); display: flex; flex-direction: column; }
    main.dev-docs .dd-search { padding: 12px 14px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card); z-index: 1; }
    main.dev-docs .dd-search input { width: 100%; padding: 7px 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font: inherit; font-size: 13px; }
    main.dev-docs .dd-search input:focus { outline: none; border-color: var(--accent); }
    main.dev-docs .dd-list { list-style: none; padding: 8px 0; margin: 0; }
    main.dev-docs .dd-list li { margin: 0; }
    main.dev-docs .dd-list a { display: flex; align-items: center; gap: 8px; padding: 7px 14px; color: var(--text); text-decoration: none; font-size: 13px; border-left: 2px solid transparent; }
    main.dev-docs .dd-list a:hover { background: rgba(138,180,255,0.08); }
    main.dev-docs .dd-list a.active { background: rgba(138,180,255,0.14); border-left-color: var(--accent); color: var(--accent); }
    main.dev-docs .dd-list .icon { font-size: 13px; width: 16px; flex: 0 0 auto; }
    main.dev-docs .dd-list .name { font-family: var(--mono); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    main.dev-docs > .dd-view { background: var(--bg); position: relative; }
    main.dev-docs .dd-empty { padding: 48px 32px; color: var(--muted); max-width: 640px; }
    main.dev-docs .dd-empty h1 { color: var(--text); margin-top: 0; }
    main.dev-docs .dd-frame { width: 100%; height: calc(100vh - 65px); border: none; background: var(--bg); }
    @media (max-width: 768px) {
      main.dev-docs { grid-template-columns: 1fr; min-height: auto; }
      main.dev-docs > .dd-sidebar { max-height: 240px; }
      main.dev-docs .dd-frame { height: 70vh; }
    }
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
      <a href="/dev-docs">Developer Docs</a>
      <a href="/readiness/raw">Raw .md</a>
      <a href="/readiness/data">JSON</a>
      <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a>
      <a href="${REPO_URL}/issues" target="_blank" rel="noopener">Issues</a>
      <button type="button" onclick="refresh()">↻ Re-run engine</button>
    </nav>
  </header>
  ${
    opts.bare
      ? bodyHtml
      : scope
      ? `<main>
    <div class="cards">
      <div class="card done"><div class="label">Done</div><div class="value">${scope.done}</div><div class="sub">of ${scope.total} features</div></div>
      <div class="card partial"><div class="label">Partial</div><div class="value">${scope.partial}</div><div class="sub">code exists, UX unverified</div></div>
      <div class="card not"><div class="label">Not started</div><div class="value">${scope.not_started}</div><div class="sub">no implementation</div></div>
      <div class="card unk"><div class="label">Unknown</div><div class="value">${scope.unknown}</div><div class="sub">no checks defined</div></div>
      <div class="card"><div class="label">Done rate</div><div class="value">${pct}%</div><div class="progress"><div class="fill" style="width:${pct}%"></div></div></div>
      <div class="card done"><div class="label">Acceptance met</div><div class="value">${accept!.met}</div><div class="sub">of ${accept!.total} criteria</div></div>
    </div>
    <div class="filters" id="status-filters" role="group" aria-label="Filter report by status">
      <span class="label">Filter:</span>
      <button type="button" class="filter-chip" data-filter="all" data-active="true">All <span class="count">${scope.total}</span></button>
      <button type="button" class="filter-chip" data-filter="done" data-active="false"><span class="dot done"></span>Done <span class="count">${scope.done}</span></button>
      <button type="button" class="filter-chip" data-filter="partial" data-active="false"><span class="dot partial"></span>Partial <span class="count">${scope.partial}</span></button>
      <button type="button" class="filter-chip" data-filter="not_started" data-active="false"><span class="dot not"></span>Not started <span class="count">${scope.not_started}</span></button>
      ${scope.unknown ? `<button type="button" class="filter-chip" data-filter="unknown" data-active="false"><span class="dot unk"></span>Unknown <span class="count">${scope.unknown}</span></button>` : ``}
    </div>
    ${bodyHtml}
  </main>`
      : `<main><article>${bodyHtml}</article></main>`
  }
  <footer>
    npm run readiness · engine source at <a href="${REPO_URL}" style="color:inherit">${REPO_URL}</a>
  </footer>
  <div class="modal-backdrop" id="modal-bg" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal" id="modal-body">
      <div class="modal-top"><button class="close" type="button" aria-label="Close" onclick="closeModal()">×</button></div>
      <div id="modal-content"></div>
    </div>
  </div>
  <script id="entities-json" type="application/json">${entitiesPayload.replace(/</g, "\\u003c")}</script>
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

    // --- Feature + acceptance-metric drill-down modal ---------------------
    // Parse entities once, index by normalized name so we can match table
    // rows (which have the name but no id) back to their check data. Both
    // scope features and Annexure C acceptance metrics share one modal.
    window.__entities = { features: [], acceptance: [] };
    (function () {
      let entities = { features: [], acceptance: [] };
      try { entities = JSON.parse(document.getElementById('entities-json').textContent || '{}'); } catch (e) {}
      window.__entities = entities;
      const features = Array.isArray(entities.features) ? entities.features : [];
      const acceptance = Array.isArray(entities.acceptance) ? entities.acceptance : [];
      if (!features.length && !acceptance.length) return;
      const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim().toLowerCase();

      // Build { name → {kind, data} } so one lookup serves both tables.
      const byName = new Map();
      for (const f of features) {
        if (f && f.feature && f.feature.name) byName.set(norm(f.feature.name), { kind: 'feature', data: f });
      }
      for (const a of acceptance) {
        if (a && a.metric && a.metric.name) byName.set(norm(a.metric.name), { kind: 'metric', data: a });
      }

      // Walk every table in the report article. Try cell[1] (feature tables:
      // "# | Feature | Status | Summary") then cell[0] (acceptance table:
      // "Metric | Target | Status | Evidence"). Status is always in cell[2].
      document.querySelectorAll('article table').forEach((table) => {
        table.querySelectorAll('tbody tr').forEach((tr) => {
          const cells = tr.querySelectorAll('td');
          if (cells.length < 3) return;
          const hit = byName.get(norm(cells[1].textContent)) || byName.get(norm(cells[0].textContent));
          if (!hit) return;
          const statusCell = cells[2];
          statusCell.classList.add('status-cell');
          statusCell.setAttribute('role', 'button');
          statusCell.setAttribute('tabindex', '0');
          statusCell.setAttribute('data-entity-kind', hit.kind);
          statusCell.setAttribute('data-entity-id', hit.kind === 'feature' ? hit.data.feature.id : hit.data.metric.id);
          statusCell.title = 'Click to see what passed / failed';
          // Tag the row for status filtering (only scope features have the
          // status enum; acceptance rows are met/unmet, not filtered).
          if (hit.kind === 'feature') tr.setAttribute('data-status', hit.data.status);
        });
      });

      // --- Appendix cards: hoist "<h3><code>id</code> — Name</h3> + <ul>"
      // triples under "## Appendix A …" into a responsive card grid, and
      // make every card click through to the modal.
      enhanceAppendix(features);

      // --- Status filter chips ---------------------------------------------
      // "All" shows everything; any other chip hides rows whose data-status
      // doesn't match. Tables whose rows are all hidden get hidden too, as
      // does any section heading immediately preceding them.
      function applyFilter(filter) {
        document.querySelectorAll('#status-filters .filter-chip').forEach((b) => {
          b.setAttribute('data-active', b.getAttribute('data-filter') === filter ? 'true' : 'false');
        });
        document.querySelectorAll('article table').forEach((table) => {
          const rows = table.querySelectorAll('tbody tr[data-status]');
          if (!rows.length) return; // not a feature table (e.g. acceptance table)
          let shown = 0;
          rows.forEach((tr) => {
            const match = filter === 'all' || tr.getAttribute('data-status') === filter;
            tr.classList.toggle('filter-hidden', !match);
            if (match) shown++;
          });
          table.classList.toggle('section-hidden', shown === 0);
          // Also hide the heading right before this table if it exists and
          // the table is empty — keeps the UI tidy when a section has no
          // matching rows.
          let prev = table.previousElementSibling;
          while (prev && !/^H[1-6]$/.test(prev.tagName)) prev = prev.previousElementSibling;
          if (prev) prev.classList.toggle('section-hidden', shown === 0);
        });
      }
      document.querySelectorAll('#status-filters .filter-chip').forEach((btn) => {
        btn.addEventListener('click', () => applyFilter(btn.getAttribute('data-filter')));
      });

      // Event delegation covers both table status cells and appendix cards.
      function openByAttrs(el) {
        const kind = el.getAttribute('data-entity-kind') || 'feature';
        const id = el.getAttribute('data-entity-id') || el.getAttribute('data-feature-id');
        if (!id) return;
        if (kind === 'metric') {
          const m = acceptance.find((a) => a && a.metric && a.metric.id === id);
          if (m) openModal({ kind: 'metric', data: m });
        } else {
          const f = features.find((x) => x && x.feature && x.feature.id === id);
          if (f) openModal({ kind: 'feature', data: f });
        }
      }
      document.addEventListener('click', (e) => {
        const el = e.target && e.target.closest && e.target.closest('[data-entity-id], [data-feature-id]');
        if (el) openByAttrs(el);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const el = document.activeElement;
          if (el && (el.hasAttribute('data-entity-id') || el.hasAttribute('data-feature-id'))) {
            e.preventDefault();
            openByAttrs(el);
          }
        }
        if (e.key === 'Escape') closeModal();
      });
      document.getElementById('modal-bg').addEventListener('click', (e) => {
        if (e.target && e.target.id === 'modal-bg') closeModal();
      });
    })();

    // --- Appendix A → card grid ------------------------------------------
    // Collect each "<h3><code>id</code> — Name</h3>" + following "<ul>" pair
    // under the appendix h2 and replace them with a card grid matching the
    // modal design. The whole card is clickable → opens the modal.
    function enhanceAppendix(features) {
      const article = document.querySelector('article');
      if (!article) return;
      // Find the appendix h2 heading
      const h2s = article.querySelectorAll('h2');
      let appH2 = null;
      for (const h of h2s) {
        if (/Appendix A/.test(h.textContent)) { appH2 = h; break; }
      }
      if (!appH2) return;

      // Walk siblings after the h2 up to the next h2, collecting h3+ul pairs.
      const grid = document.createElement('div');
      grid.className = 'appendix-grid';
      const toRemove = [];
      let node = appH2.nextElementSibling;
      while (node && node.tagName !== 'H2') {
        if (node.tagName === 'H3') {
          const h3 = node;
          const next = h3.nextElementSibling;
          const ul = next && next.tagName === 'UL' ? next : null;
          const idCode = h3.querySelector('code');
          const featureId = idCode ? idCode.textContent.trim() : '';
          const feat = features.find((f) => f && f.feature && f.feature.id === featureId);
          if (feat) grid.appendChild(buildAppendixCard(feat, h3, ul));
          toRemove.push(h3);
          if (ul) toRemove.push(ul);
          node = (ul || h3).nextElementSibling;
        } else {
          node = node.nextElementSibling;
        }
      }
      if (!grid.children.length) return;
      appH2.insertAdjacentElement('afterend', grid);
      toRemove.forEach((n) => n.remove());
    }

    function buildAppendixCard(feat, h3, ul) {
      const card = document.createElement('div');
      card.className = 'appendix-card status-' + feat.status;
      card.setAttribute('data-entity-kind', 'feature');
      card.setAttribute('data-entity-id', feat.feature.id);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.title = 'Click to see what passed / failed';
      // Nameline: feature-id chip + readable name
      const name = (feat.feature && feat.feature.name) || feat.feature.id;
      // Short summary from the engine ("PARTIAL — 2 pass, 1 fail, 1 needs-work")
      const trimmed = String(feat.summary || '').replace(/^(DONE|PARTIAL|NOT STARTED|UNKNOWN)\\s*(\\u2014|-)\\s*/i, '');
      const statusClass = feat.status === 'done' ? 'done' : feat.status === 'partial' ? 'partial' : feat.status === 'not_started' ? 'not' : 'unk';
      const annex = (feat.feature && feat.feature.annexure) || '';
      // Count failing / needs-work checks for the mini-stat line
      const checks = Array.isArray(feat.checks) ? feat.checks : [];
      const nFail = checks.filter((c) => c.status === 'fail').length;
      const nNeedsWork = checks.filter((c) => c.status === 'needs_work').length;
      const nPending = checks.filter((c) => c.status === 'manual_pending').length;
      const bits = [];
      if (nFail) bits.push(nFail + ' failing');
      if (nNeedsWork) bits.push(nNeedsWork + ' needs-work');
      if (nPending) bits.push(nPending + ' pending');
      const miss = bits.length ? bits.join(' · ') : 'All checks pass';
      card.innerHTML =
        '<div class="ap-head">'
          + '<span class="pill ' + statusClass + '">' + escH(feat.status.replace('_', ' ').toUpperCase()) + '</span>'
          + '<code class="ap-id">' + escH(feat.feature.id) + '</code>'
        + '</div>'
        + '<div class="ap-name">' + escH(name) + '</div>'
        + (annex ? '<div class="ap-annex">' + escH(annex) + '</div>' : '')
        + '<div class="ap-sum">' + escH(trimmed || miss) + '</div>'
        + '<div class="ap-miss">' + escH(miss) + '</div>';
      return card;
    }

    function escH(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function statusPill(s) {
      const cls = s === 'done' ? 'done' : s === 'partial' ? 'partial' : s === 'not_started' ? 'not' : 'unk';
      return '<span class="pill ' + cls + '">' + escH(s.replace('_', ' ').toUpperCase()) + '</span>';
    }

    function checkDescribe(c) {
      const t = c.check && c.check.type;
      if (t === 'file_exists') return 'file exists: <code>' + escH(c.check.path) + '</code>';
      if (t === 'grep') return 'grep <code>' + escH(c.check.pattern) + '</code> in <code>' + escH(c.check.path) + '</code>' + (c.check.min_matches ? ' (≥' + c.check.min_matches + ' matches)' : '');
      if (t === 'http_latency') return 'HTTP ' + escH(c.check.url) + ' (p avg ≤ ' + c.check.threshold_ms + 'ms, ' + (c.check.samples || 1) + ' samples)';
      if (t === 'http_status') return 'HTTP ' + escH(c.check.url) + ' → ' + escH(String(c.check.expect_status || 200));
      if (t === 'manual') return 'Manual: ' + escH(c.check.question || '');
      if (t === 'github_issue') return 'GitHub issue: <code>' + escH(c.check.issue) + '</code>';
      if (t === 'npm_script') return 'npm run ' + escH(c.check.script) + ' in <code>' + escH(c.check.cwd) + '</code>';
      return escH(t || 'unknown check');
    }

    function openModal(entity) {
      // Accept either the old flat shape (feature object with .feature/.status)
      // or the new wrapped shape {kind, data}.
      const kind = entity && entity.kind ? entity.kind : (entity && entity.metric ? 'metric' : 'feature');
      const row = entity && entity.data ? entity.data : entity;
      const header = kind === 'metric' ? row.metric : row.feature;
      const checks = row.checks || [];
      const status = kind === 'metric' ? (row.met ? 'done' : 'not_started') : row.status;
      const failed = checks.filter((c) => c.status === 'fail');
      const needsWork = checks.filter((c) => c.status === 'needs_work');
      const pending = checks.filter((c) => c.status === 'manual_pending');
      const passed = checks.filter((c) => c.status === 'pass');

      let html = '';
      html += '<h2 id="modal-title">' + escH(header.name) + '</h2>';
      const subBits = [];
      if (kind === 'metric') {
        subBits.push('Annexure C acceptance metric');
        if (header.target) subBits.push('Target: ' + header.target);
      } else {
        if (header.annexure) subBits.push(header.annexure);
      }
      subBits.push('<code>' + escH(header.id) + '</code>');
      if (header.required_for_mvp) subBits.push('required for MVP');
      html += '<div class="annex">' + subBits.join(' · ') + '</div>';
      // Strip the leading status word from the summary ("PARTIAL — 2 pass…" → "2 pass…")
      // so the pill + summary don't read "PARTIAL PARTIAL — …".
      const summaryText = kind === 'metric'
        ? (row.met ? 'All acceptance checks met' : 'Acceptance not yet met')
        : (row.summary || '');
      const trimmedSummary = String(summaryText).replace(/^(DONE|PARTIAL|NOT STARTED|UNKNOWN)\\s*(\\u2014|-)\\s*/i, '');
      // Acceptance metrics get MET/UNMET pills; features get DONE/PARTIAL/etc.
      const pillHtml = kind === 'metric'
        ? '<span class="pill ' + (row.met ? 'done' : 'not') + '">' + (row.met ? 'MET' : 'UNMET') + '</span>'
        : statusPill(status);
      html += '<div class="status-line">' + pillHtml + escH(trimmedSummary) + '</div>';

      // "What's missing" block — the main thing the user wanted
      const missingBits = [];
      if (failed.length) missingBits.push(failed.length + ' failing check' + (failed.length > 1 ? 's' : ''));
      if (needsWork.length) missingBits.push(needsWork.length + ' needs-work');
      if (pending.length) missingBits.push(pending.length + ' manual verdict pending');
      if (missingBits.length) {
        html += '<div class="what-missing"><strong>What\\'s missing:</strong> ' + escH(missingBits.join(' · ')) + '. Details below.</div>';
      } else if (status === 'done') {
        html += '<div class="what-missing ok"><strong>All checks passed.</strong> This '
              + (kind === 'metric' ? 'acceptance metric is met' : 'feature is Done')
              + '.</div>';
      }

      // Full check breakdown — ordered: fail > needs_work > manual_pending > pass > skip
      const order = { fail: 0, needs_work: 1, manual_pending: 2, pass: 3, skip: 4 };
      const sorted = checks.slice().sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
      for (const c of sorted) {
        html += '<div class="check">';
        html += '<div class="check-head">';
        html += '<span class="pill ' + c.status + '">' + escH(c.status.replace('_', ' ')) + '</span>';
        html += '<span class="type">' + escH(c.check.type) + '</span>';
        html += '</div>';
        html += '<div class="check-body">' + checkDescribe(c) + '</div>';
        if (c.detail) html += '<div class="check-detail">' + escH(c.detail) + '</div>';
        if (c.check && c.check.note) html += '<div class="check-note">' + escH(c.check.note) + '</div>';
        if (c.check && c.check.type === 'github_issue') {
          const url = 'https://github.com/' + String(c.check.issue).replace('#', '/issues/');
          html += '<div class="issue-link">→ <a href="' + url + '" target="_blank" rel="noopener">open issue on GitHub</a></div>';
        }
        html += '</div>';
      }

      document.getElementById('modal-content').innerHTML = html;
      document.getElementById('modal-bg').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      document.getElementById('modal-bg').classList.remove('open');
      document.body.style.overflow = '';
    }

    // --- Two-way scroll sync (contract ↔ report) --------------------------
    // When the user scrolls one column, scroll the other to the matching
    // section. Headings on the left have ids "s-N" / "s-N-N" (injected by
    // anchorContractSections); headings on the right have ids "rs-N" /
    // "rs-N-N" (injected by linkContractRefs). The number after the prefix
    // is the shared key.
    (function setupScrollSync() {
      const aside = document.querySelector('main.split > aside');
      const article = document.querySelector('main.split > article');
      if (!aside || !article) return;

      const leftHeadings = Array.from(aside.querySelectorAll('h2[id^="s-"], h3[id^="s-"]'));
      const rightHeadings = Array.from(article.querySelectorAll('h2[id^="rs-"], h3[id^="rs-"]'));
      if (!leftHeadings.length || !rightHeadings.length) return;

      // key → DOM element on each side
      const leftByKey = new Map(leftHeadings.map((h) => [h.id.replace(/^s-/, ''), h]));
      const rightByKey = new Map(rightHeadings.map((h) => [h.id.replace(/^rs-/, ''), h]));

      // Suppress reciprocal sync for a short window after any programmatic
      // scroll, so left→right→left doesn't ping-pong.
      let suppressUntil = 0;

      function topmost(headings, container) {
        // "active" heading = the last heading whose top sits above a line
        // just below the sticky header / aside top edge.
        const topLine = container === window ? 90 : (aside.getBoundingClientRect().top + 20);
        let active = headings[0];
        for (const h of headings) {
          const top = h.getBoundingClientRect().top;
          if (top <= topLine + 2) active = h;
          else break;
        }
        return active;
      }

      function syncRightToLeft() {
        if (Date.now() < suppressUntil) return;
        const active = topmost(rightHeadings, window);
        if (!active) return;
        const target = leftByKey.get(active.id.replace(/^rs-/, ''));
        if (!target) return;
        suppressUntil = Date.now() + 350;
        const asideTop = aside.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        aside.scrollTop += (targetTop - asideTop) - 10;
      }

      function syncLeftToRight() {
        if (Date.now() < suppressUntil) return;
        const active = topmost(leftHeadings, aside);
        if (!active) return;
        const target = rightByKey.get(active.id.replace(/^s-/, ''));
        if (!target) return;
        suppressUntil = Date.now() + 350;
        const y = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'instant' });
      }

      // Only run the sync when both columns are actually side-by-side
      // (aside is sticky + scrollable). On narrow viewports the layout
      // stacks and the aside scrolls with the page.
      function isSideBySide() {
        return getComputedStyle(aside).position === 'sticky';
      }

      let f1 = 0, f2 = 0;
      window.addEventListener('scroll', () => {
        if (!isSideBySide()) return;
        if (f1) cancelAnimationFrame(f1);
        f1 = requestAnimationFrame(syncRightToLeft);
      }, { passive: true });
      aside.addEventListener('scroll', () => {
        if (!isSideBySide()) return;
        if (f2) cancelAnimationFrame(f2);
        f2 = requestAnimationFrame(syncLeftToRight);
      }, { passive: true });
    })();
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

/**
 * Developer Docs browser: 30/70 split — the left pane lists every file in
 * C:/Lex Origin/developers-docs (recursive), the right pane renders the
 * selected one. Markdown is rendered to HTML; .docx and other binaries are
 * offered as downloads; .txt / .yaml / .json / .ts are shown as code.
 *
 * The viewer uses a hash in the URL (#file=path) so refresh keeps your
 * selection. Path-traversal safe: every requested path is resolved against
 * DEV_DOCS and refused if it escapes.
 */
function serveDevDocs(): { status: number; headers: Record<string, string>; body: string } {
  if (!existsSync(DEV_DOCS)) {
    return {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: layout("Developer Docs — not found", `<h1>404</h1><p><code>${escapeHtml(DEV_DOCS)}</code> does not exist on this host.</p>`, null),
    };
  }
  // Walk DEV_DOCS once, record a (path, size, mtime) tuple for every file.
  const files: Array<{ rel: string; size: number; mtime: string }> = [];
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const abs = join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(abs, rel);
      else if (entry.isFile()) {
        const s = statSync(abs);
        files.push({ rel, size: s.size, mtime: s.mtime.toISOString().slice(0, 10) });
      }
    }
  }
  walk(DEV_DOCS, "");
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  const listItems = files
    .map((f) => {
      const ext = (f.rel.split(".").pop() || "").toLowerCase();
      const icon = ext === "md" ? "📄" : ext === "docx" ? "📘" : ext === "pdf" ? "📕" : ext === "yaml" || ext === "yml" ? "⚙" : "📎";
      return `<li><a href="#file=${encodeURIComponent(f.rel)}" data-file="${escapeHtml(f.rel)}" title="${escapeHtml(f.rel)} · ${(f.size / 1024).toFixed(1)} KB">
        <span class="icon">${icon}</span><span class="name">${escapeHtml(f.rel)}</span>
      </a></li>`;
    })
    .join("\n");
  const body = `
  <main class="dev-docs">
    <aside class="dd-sidebar" aria-label="Developer docs file list">
      <div class="dd-search"><input type="search" id="dd-filter" placeholder="Filter ${files.length} files…" autocomplete="off" aria-label="Filter files"></div>
      <ul class="dd-list" id="dd-list">${listItems}</ul>
    </aside>
    <section class="dd-view" aria-label="File preview">
      <div class="dd-empty" id="dd-empty">
        <h1>Developer Docs</h1>
        <p>${files.length} files in <code>developers-docs/</code>. Pick one from the list to preview it here.</p>
      </div>
      <iframe class="dd-frame" id="dd-frame" title="File preview" hidden></iframe>
    </section>
  </main>
  <script>
    (function () {
      const list = document.getElementById('dd-list');
      const frame = document.getElementById('dd-frame');
      const empty = document.getElementById('dd-empty');
      const filter = document.getElementById('dd-filter');
      function show(rel) {
        if (!rel) {
          frame.hidden = true; empty.hidden = false;
          document.querySelectorAll('#dd-list a.active').forEach((a) => a.classList.remove('active'));
          return;
        }
        frame.src = '/dev-docs/view?file=' + encodeURIComponent(rel);
        frame.hidden = false; empty.hidden = true;
        document.querySelectorAll('#dd-list a').forEach((a) => {
          a.classList.toggle('active', a.getAttribute('data-file') === rel);
        });
        // Keep the active row in view
        const active = document.querySelector('#dd-list a.active');
        if (active) active.scrollIntoView({ block: 'nearest' });
      }
      function fromHash() {
        const m = (location.hash || '').match(/file=([^&]+)/);
        return m ? decodeURIComponent(m[1]) : '';
      }
      window.addEventListener('hashchange', () => show(fromHash()));
      filter.addEventListener('input', () => {
        const q = filter.value.toLowerCase().trim();
        document.querySelectorAll('#dd-list li').forEach((li) => {
          const n = li.querySelector('.name').textContent.toLowerCase();
          li.style.display = !q || n.includes(q) ? '' : 'none';
        });
      });
      show(fromHash());
    })();
  </script>`;
  return {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: layout("Developer Docs — Lex Origin", body, null, { bare: true }),
  };
}

/**
 * Content pane for the dev-docs iframe. Takes ?file=<relative>, resolves
 * against DEV_DOCS, refuses path-traversal, renders .md to HTML and other
 * known text formats as <pre><code>. Binaries get a download link.
 */
function serveDevDocsView(rel: string): { status: number; headers: Record<string, string>; body: string } {
  const abs = resolve(DEV_DOCS, rel);
  const relToDd = relative(DEV_DOCS, abs);
  if (relToDd.startsWith("..") || relToDd.startsWith(sep) || /^[A-Za-z]:/.test(relToDd)) {
    return { status: 400, headers: { "content-type": "text/html; charset=utf-8" }, body: devDocsFrame(`<h1>Bad path</h1>`) };
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    return { status: 404, headers: { "content-type": "text/html; charset=utf-8" }, body: devDocsFrame(`<h1>Not found</h1><p><code>${escapeHtml(rel)}</code></p>`) };
  }
  const ext = (rel.split(".").pop() || "").toLowerCase();
  if (ext === "md") {
    const html = marked.parse(readFileSync(abs, "utf8")) as string;
    return { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: devDocsFrame(`<article class="dd-md"><h1 class="dd-filename">${escapeHtml(rel)}</h1>${html}</article>`) };
  }
  if (ext === "txt" || ext === "yaml" || ext === "yml" || ext === "json" || ext === "ts" || ext === "js" || ext === "py") {
    const txt = readFileSync(abs, "utf8");
    return { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: devDocsFrame(`<h1 class="dd-filename">${escapeHtml(rel)}</h1><pre class="dd-code"><code>${escapeHtml(txt)}</code></pre>`) };
  }
  // Everything else (docx, pdf, images) → stream the raw file so the browser
  // can download / preview natively via the raw endpoint.
  const dlUrl = `/dev-docs/raw?file=${encodeURIComponent(rel)}`;
  return {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: devDocsFrame(`<h1 class="dd-filename">${escapeHtml(rel)}</h1>
      <p>Binary file (.${escapeHtml(ext)}) — browser preview isn't rendered here.</p>
      <p><a class="dd-download" href="${dlUrl}" download>⬇ Download ${escapeHtml(rel)}</a></p>
      ${ext === "pdf" ? `<iframe src="${dlUrl}" style="width:100%;height:70vh;border:1px solid #333;border-radius:6px"></iframe>` : ""}`),
  };
}

function serveDevDocsRaw(rel: string): { status: number; headers: Record<string, string>; body: Buffer | string } {
  const abs = resolve(DEV_DOCS, rel);
  const relToDd = relative(DEV_DOCS, abs);
  if (relToDd.startsWith("..") || relToDd.startsWith(sep) || /^[A-Za-z]:/.test(relToDd) || !existsSync(abs)) {
    return { status: 404, headers: { "content-type": "text/plain" }, body: "not found" };
  }
  const ext = (rel.split(".").pop() || "").toLowerCase();
  const ct = ext === "pdf" ? "application/pdf"
    : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : ext === "png" ? "image/png"
    : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : "application/octet-stream";
  return { status: 200, headers: { "content-type": ct, "content-disposition": `inline; filename="${rel.split("/").pop()}"` }, body: readFileSync(abs) };
}

/** Minimal doc frame shell — picks up its CSS from the parent via @import-free inheritance (same origin). */
function devDocsFrame(bodyHtml: string): string {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<style>
  :root { --bg: #0b0d10; --card: #141820; --border: #262c36; --text: #e6e8eb; --muted: #9aa3af; --accent: #8ab4ff; }
  @media (prefers-color-scheme: light) {
    :root { --bg:#ffffff; --card:#ffffff; --border:#e5e7eb; --text:#111827; --muted:#4b5563; --accent:#2563eb; }
  }
  body { margin: 0; padding: 24px 32px; background: var(--bg); color: var(--text); font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  h1, h2, h3 { line-height: 1.3; }
  h1 { font-size: 24px; }
  h2 { font-size: 18px; margin-top: 28px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
  h3 { font-size: 15px; margin-top: 20px; }
  code { background: rgba(127,127,127,0.14); padding: 1px 5px; border-radius: 4px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; }
  pre { background: rgba(127,127,127,0.08); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  table { border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid var(--border); padding: 6px 10px; }
  a { color: var(--accent); }
  .dd-filename { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; color: var(--muted); font-weight: 500; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .dd-download { display: inline-block; background: var(--accent); color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 500; }
  .dd-code { font-size: 12.5px; }
</style></head>
<body>${bodyHtml}</body></html>`;
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
    if (path === "/dev-docs") {
      const r = serveDevDocs();
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }
    if (path === "/dev-docs/view") {
      const r = serveDevDocsView(url.searchParams.get("file") || "");
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }
    if (path === "/dev-docs/raw") {
      const r = serveDevDocsRaw(url.searchParams.get("file") || "");
      res.writeHead(r.status, r.headers);
      res.end(r.body as any);
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
