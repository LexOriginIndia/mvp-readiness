# Lex Origin — Readiness Engine

Automated readiness-check engine for the Lex Origin MVP. Reads the
signed contract spec (Annexure A scope + Annexure C acceptance), probes
the running platform (file presence, controller decorators, HTTP
endpoints, response latency), and emits a client-shareable Markdown
report + machine-readable JSON for regression tracking.

The point: **you don't re-generate a status report by hand every week**.
Change the code, run `npm run readiness`, and the report regenerates
with evidence against the signed scope.

---

## Install

```bash
cd readiness
npm install
```

## Run

```bash
npm run readiness             # full run — scope + acceptance
npm run readiness:scope       # only Annexure A scope
npm run readiness:acceptance  # only Annexure C hard metrics
npm run readiness:verbose     # extra per-check logging
```

Output:
- `reports/latest.md`   — polished client-shareable report
- `reports/latest.json` — machine detail (same data, for diff tools)
- `reports/history/<yyyy-mm-dd>.json` — dated snapshot for
  regression / improvement tracking across runs

## Environment variables

| Var | Purpose |
|---|---|
| `LEX_ORIGIN_ROOT` | Repo root path (default `C:/Lex Origin`). Override for CI. |
| `AUTH_BEARER` | Bearer token used by `http_*` checks that declare `bearer_env: AUTH_BEARER`. Not set → those checks `skip` (not `fail`). |

Static-analysis-only runs (no services up, no token) still produce a
useful report — anything that depends on a running service shows as
`skip`, scope coverage by file/grep still works.

---

## How a feature is marked

```
all pass + no manual-pending   →   ✅ Done
any fail OR all skip           →   look at individual checks
some pass + some fail/pending  →   🟡 Partial
all fail (no pass, no pending) →   ⚪ Not started
no effective checks            →   ❓ Unknown
```

A feature's status is derived strictly from its checks — no judgement
calls in the engine. If the engine's calling something "done" when it
shouldn't, the fix is to tighten the check, not override.

---

## Primitive check types

### `file_exists`
```yaml
- type: file_exists
  path: authservice/src/payroll/payroll.controller.ts
  must_exist: true    # default true; set false to assert absence
```

### `grep`
```yaml
- type: grep
  path: authservice/src/cases/case/case.controller.ts
  pattern: "@RequirePracticeType"
  must_exist: true    # default true
  min_matches: 1      # how many files must match
```

Regex is JS flavor. Pattern is matched against each file's whole
contents (not line-by-line). Walks directories recursively, skipping
`node_modules`, `.next`, `.git`, `dist`, `build`, `venv`,
`__pycache__`, `coverage`.

### `http_status`
```yaml
- type: http_status
  url: http://localhost:8004/api/v1/payroll
  expect_status: 403
  method: GET          # default GET
  bearer_env: AUTH_BEARER
  timeout_ms: 5000     # default 5000
```

### `http_latency`
```yaml
- type: http_latency
  url: http://localhost:8010/api/v1/case-law/search?q=cheque+bounce
  threshold_ms: 5000   # Annexure C target
  samples: 5           # default 5
  bearer_env: AUTH_BEARER
```

Reports `avg_ms`, `p95_ms`, `samples`. Marks pass if `avg_ms ≤
threshold_ms`.

### `manual`
```yaml
- type: manual
  question: "Does the RAG pipeline cite real sources?"
  review_cadence_days: 30   # default 30
```

Looks up a verdict in `manual-verdicts.yaml` keyed by feature-id +
question hash. If missing or older than the cadence, status is
`manual_pending`.

---

## Adding a verdict for a manual check

Edit `manual-verdicts.yaml`:

```yaml
verdicts:
  - feature_id: rag-pipelines
    question: "Does the RAG pipeline retrieve and ground answers from the Indian legal corpus? Give a sample query + top-3 citations."
    verdict: pass
    evidence: "See runbook screenshot at docs/evidence/rag-citations-2026-10-05.png — 3 of 3 citations verified against Indian Kanoon."
    reviewed_by: "Arjun"
    reviewed_on: "2026-10-05"
```

Then re-run `npm run readiness`. The engine marks it pass until it
goes stale (older than `review_cadence_days`), at which point it
re-surfaces as `manual_pending`.

---

## Adding a new feature or check

1. Open `spec/annexure-a-scope.yaml` (or `annexure-c-acceptance.yaml`).
2. Append a feature:
   ```yaml
   - id: my-new-feature                    # stable kebab-case
     name: "What the client reads"
     annexure: "3.X Section name"
     required_for_mvp: true
     checks:
       - type: file_exists
         path: path/to/file
       - type: manual
         question: "..."
   ```
3. Re-run `npm run readiness`.

---

## Status override (last-resort escape hatch)

For items that genuinely can't be probed by this box — e.g. "VAPT
report delivered", "IP assignment signed":

```yaml
- id: ip-handover
  name: "IPR formally assigned"
  annexure: "3.7 Law Firm Owner — Enterprise"
  checks: []
  status_override:
    status: done
    reason: "Signed IP assignment on file at Company Docs/IP-Assignment-2026-10-05.pdf"
    set_by: "Arjun"
    set_on: "2026-10-05"
```

Overrides are noisy by design — they show up explicitly in the report
("OVERRIDE: done — reason…") so the Client can tell "I automated this"
from "I asserted this".

---

## Regression tracking

Each run writes `reports/history/YYYY-MM-DD.json`. The next run
compares against the most recent prior snapshot and prints
regressions (features that got worse) + improvements (features that
got better) in the report's "Change since last run" section.

Commit `reports/history/*.json` to git if you want the client-side
delta to live alongside the code history. The latest `.md` and `.json`
are in `.gitignore` so they regenerate cleanly.

---

## When this engine is NOT the right answer

- You need to measure **AI output quality** — that's a labelled eval
  set + human review, not a check. The engine tracks whether you've
  done the review (manual check with cadence).
- You need to confirm **client sign-off** — contractual, not a probe.
  Use `status_override` with a reference to the signed doc.
- You need **long-horizon uptime / SLO data** — hook up to Grafana,
  Railway metrics, CloudWatch; that is Tier 2.

---

## File layout

```
readiness/
├── spec/
│   ├── annexure-a-scope.yaml       # ~55 scope features
│   ├── annexure-c-acceptance.yaml  # 12 hard metrics
│   └── annexure-b-timeline.yaml    # 6 phases (reference only for now)
├── src/
│   ├── types.ts                    # shared TS types
│   ├── primitives.ts               # check implementations
│   ├── runner.ts                   # entry — npm run readiness
│   └── report.ts                   # markdown rendering
├── reports/
│   ├── latest.md                   # regenerated each run
│   ├── latest.json                 # regenerated each run
│   └── history/                    # dated snapshots (keep in git)
├── manual-verdicts.yaml            # the human judgement calls
├── package.json
├── tsconfig.json
└── README.md
```
