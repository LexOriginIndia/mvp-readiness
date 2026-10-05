# UI Walkthrough Checklist — upgrade Partials to Done/Fail

Open this on one monitor, the app on another. One session = ~2–3 hours
of focused clicking.  Each item: do the test, record a one-line verdict
+ evidence, move on.  I'll ingest the filled-in checklist into
`manual-verdicts.yaml` in one pass afterwards.

## How to use

For each item below:
1. Navigate the "Where" column
2. Do the "Test" column
3. Decide: ✅ Pass / ⚠ Needs work / ❌ Fail
4. In the "Verdict + evidence" column, write **one line**: e.g.
   `pass — generated an NDA from template, 3 clauses customised correctly`
   or
   `needs_work — editor loads but AI suggestions returned 500 on 2026-10-05`
   or
   `fail — module not accessible from menu for workspace type=legal`
5. When done, send me the filled markdown and I'll apply it.

Login as workspace owner. Use a workspace with `practiceType: 'hybrid'`
so every module is visible.  Repeat key items in a `legal` and
`accounting` workspace at the end to confirm practice-type gating.

---

## Screen 1 — Dashboard home (/workspace/dashboard)

| ID | Test | Verdict + evidence |
|---|---|---|
| `enterprise-mgmt-dashboard` | Can you see team, employees, clients, and financials each surfaced on the dashboard (either tiles, widgets, or shortcut links)? | |
| `owner-dashboard` | As a partner, can you reach a view that shows clients + matters + employees + task status without more than one click? | |
| `productivity-insights` | Open `/workspace/dashboard/analytics` — does it show per-attorney / per-practice / per-client slices with real data (not placeholders)? | |
| `firm-insights` | Open `/workspace/dashboard/mis` and `/workspace/dashboard/ca-reports` + `/lawyer-reports` + `/enterprise-reports` — are reports populated with real workspace data, not demo? | |
| `client-matter-profitability-view` | Analytics / MIS — is there a client-level profitability view AND a matter-level one? Does it reconcile with billing + timesheet totals? | |

---

## Screen 2 — AI chat / Legal adviser (floating chat button + /lexo-prism)

| ID | Test | Verdict + evidence |
|---|---|---|
| `legal-adviser-assistant` | Open the chat. Ask "What is Section 138 of the NI Act?" — response arrives, is accurate, cites a source? | |
| `legal-adviser-assistant` (2) | Follow-up: "What's the limitation period for filing a complaint under it?" — does the chat remember the previous question's context? | |
| `rag-pipelines` | Ask something that should hit the Indian corpus: "Find landmark cheque-bounce cases in Delhi HC". Top-3 results shown with case names + citations? | |
| `citation-verification` | Paste a draft with a fake citation: "Hon'ble Supreme Court in M/s Fakely Fake vs Also Fake (2019) 7 SCC 999 held..." — does any part of the system flag it as unverified? | |

---

## Screen 3 — Documents / drafting (/workspace/dashboard/documents)

| ID | Test | Verdict + evidence |
|---|---|---|
| `ai-document-drafting` | Pick a template (e.g. NDA). Fill variables. Generate a draft. Is the output production-usable (no major re-write needed)? | |
| `plain-language-summaries` | Upload an existing contract (PDF or DOCX). Request a plain-language summary. Is it understandable to a non-lawyer? | |
| `ai-document-review` | Upload a contract with a known risky clause (e.g. unlimited liability + no indemnity). Does review flag it? | |
| `clause-extraction` | On a contract, trigger clause extraction. Are standard sections (parties, term, indemnity, termination, jurisdiction) correctly identified? | |
| `ai-document-comparison` | Upload v1 and v2 of the same contract (change 3 clauses). Does the comparison UI show accurate redlines at the clause level? | |
| `dedup-with-full-view` | Upload the same contract twice. Is it detected as duplicate? Can you still open both copies on request? | |
| `document-management` | Browse the document vault — tagging, search, filter all work? Can you organise files into folders? | |

---

## Screen 4 — Cases / Litigation (/workspace/dashboard/cases) [legal + hybrid only]

| ID | Test | Verdict + evidence |
|---|---|---|
| `case-management-infrastructure` | Create a new case end-to-end: parties, court, case type, timeline events, legal sections, compliance items. All fields save and reload? | |
| `legal-forecast` | On a case detail page, is there a prediction / outcome / duration section? If yes, does the number have reasoning behind it? | |
| `litigation-strategy` | Is there an AI-driven case-analysis / strategy recommendation anywhere on the case view? | |

---

## Screen 5 — Compliance / Tax (/compliance, /compliance-jobs, /tax, /notices)

| ID | Test | Verdict + evidence |
|---|---|---|
| `legal-compliance-check` | Upload a sample contract on the compliance screen. Which of the ten law categories does it evaluate against? (Civil / Corporate / Criminal / Arbitration / MCA / SEBI / RBI / Labour / IT / GST) | |
| `regulatory-change-tracker` | Is there a "latest circulars" / "regulatory updates" feed anywhere? If yes, is the most-recent entry within the last 7 days? | |
| `tax-return-compliance-checker` | On the tax module, can you upload or draft an ITR and get rule-based flags with specific Income Tax Act section references? | |
| `audit-risk-analyzer` | Open the audit module — can you upload transactions or ledger and get anomaly flags (not just totals)? | |

---

## Screen 6 — Cross-border (/compliance?category=fema or similar)

| ID | Test | Verdict + evidence |
|---|---|---|
| `cross-border-law-compliance-checker` | Find the FEMA-CMA screen. Can you register a FEMA transaction (FDI / ODI / ECB / LRS / Liaison)? Deadlines auto-populated? | |
| `cross-border-tax-compliance-checker` | On the same FEMA entry, is tax treatment surfaced (TDS on remittance, LRS limits, ECB caps)? | |

---

## Screen 7 — IP (/workspace/dashboard/ip)

| ID | Test | Verdict + evidence |
|---|---|---|
| `trademark-search-ai` | Can you search for a trademark name? Does it return similarity scores against the Indian registry? | |
| `fair-use-analyzer` | Submit a sample use case — does it score against the four factors with reasoning? | |
| `ip-portfolio-manager` | Can you see all your IP assets with upcoming renewal deadlines in one list? | |
| `licensing-agreement-drafting-assistant` | Can you generate a licensing agreement (royalty / distribution / usage rights) from a form? | |

---

## Screen 8 — Immigration (likely linked from solutions page or a dedicated route)

| ID | Test | Verdict + evidence |
|---|---|---|
| `visa-eligibility-checker` | Find the visa eligibility checker. Enter a profile — does it return eligible visa categories? Which countries supported? | |
| `naturalization-test-prep` | Does the naturalization test module have practice questions? For which country? | |

---

## Screen 9 — Enterprise / Governance / Risk (/enterprise-*, /governance)

| ID | Test | Verdict + evidence |
|---|---|---|
| `governance-rules` | Open `/governance` — can you define a rule like "all M&A drafts require partner review"? Does it actually fire when such a draft is created? | |
| `future-risk-radar` | Open `/enterprise-risk` — are forecasts shown (forward-looking) or just a static risk register? | |
| `smart-assignment-engine` | On a new case or work order, when assigning, does the system suggest team members based on expertise + workload? | |
| `workload-balancing` | On the assignment UI, are workload-balancing suggestions visible? | |
| `owner-override-button` | On an assignment, can you reassign + escalate + mark urgent in-UI? | |
| `assignment-notifications-with-checklists` | When you assign a task, does the assignee get a notification AND an auto-generated checklist for that task type? | |
| `critical-escalation-alerts` | Simulate a missed deadline (adjust task date to yesterday + mark incomplete). Does an escalation alert fire? | |
| `weekly-summary-reports` | Is there a Settings page where weekly reports can be configured? Have any gone out? | |
| `deadline-reminders` | Check deadline-reminder settings: does the cadence respect task size (4d for small, 1–2mo for big) or is it uniform? | |
| `risk-compliance-alerts` | For a completed filing, can the system raise a post-completion alert (e.g. follow-up compliance detected)? | |

---

## Screen 10 — Enterprise sub-pages (/my-business, /enterprise-org, /enterprise-providers)

| ID | Test | Verdict + evidence |
|---|---|---|
| `entity-formation-assistant` | Open `/my-business` — is there a guided incorporation flow (company registration, bylaws, compliance setup)? | |
| `employee-directory-workloads` | Open `/users` or `/workspace/dashboard/users` — does the directory show per-employee current workload (number of active tasks / cases / hours)? | |

---

## Screen 11 — Email / Communications

| ID | Test | Verdict + evidence |
|---|---|---|
| `ai-mail-generator` | Can you compose, summarize, and generate a reply to an email from inside the product? All three flows work? | |

---

## Screen 12 — Translation / Voice

| ID | Test | Verdict + evidence |
|---|---|---|
| `voice-translator-drafting` | Open voice-translator. Record a Hindi/English sample — does it transcribe and translate accurately enough to use as a draft? | |
| `hindi-english-translator` | Toggle UI language to Hindi — is every menu item translated, or are many still English? | |

---

## Screen 13 — Financial integrations (/connectors)

| ID | Test | Verdict + evidence |
|---|---|---|
| `financial-software-integration` | Can you connect Zoho Books? Tally? What's the status column show? (SAP not in codebase — see fail note.) | |

---

## Screen 14 — e-Sign (/esign, /sign)

| ID | Test | Verdict + evidence |
|---|---|---|
| `esign-integration` | Send a document for e-signature. Which provider actually processes it? Does the signed PDF come back? | |

---

## Screen 15 — Notifications

| ID | Test | Verdict + evidence |
|---|---|---|
| `personalised-alerts` | Open notification preferences — can you choose per-topic? Do the alerts you receive actually filter to only your active cases/clients? | |
| `risk-deadline-detection` | Open any received alert — does it carry "relevant to your [X]" context, or is it a generic headline? | |

---

## Screen 16 — External API freshness (/api/v1/docs on Swagger)

| ID | Test | Verdict + evidence |
|---|---|---|
| `api-supreme-high-court` | On the ecourts/case-law view, pull a case for a known pending matter. Does the status match what you'd see on the actual court portal? | |
| `api-mca` | Pull company master data for a known CIN. Does it match the MCA public site? Is the "last synced" timestamp visible? | |
| `api-income-tax-cbdt` | On the tax module, can you fetch AIS/26AS for a sample PAN? Is the data current? | |
| `historical-court-datasets` | On case-law search, which courts and year ranges are indexed? Documented anywhere in-product? | |
| `centralised-knowledge-library` | Try one search that spans case law + contracts + tax rulings + circulars. Can one query hit all four corpora? | |

---

## Screen 17 — Infra / Hosting

| ID | Test | Verdict + evidence |
|---|---|---|
| `aws-cloud-hosting` | Where is prod actually deployed (Railway? AWS? EC2? ECS?). Documented anywhere? | |
| `encryption` | Open MongoDB Atlas / Postgres console: is encryption-at-rest ON? Are PII fields column-encrypted at the schema level? | |
| `audit-logs-encryption-access-controls` | Trigger a few actions as a team member and as an owner. Do audit logs show both? Can you query them? | |
| `admin-access-handover` | Does the Client already have co-ownership on: MongoDB Atlas, PostgreSQL, Railway (or AWS), GitHub orgs, DNS, domain? | |

---

## Screen 18 — Acceptance metrics (hard numbers from Annexure C)

These are the contract bars. All of them stay unmet until you have data.

| ID | Test | Verdict + evidence |
|---|---|---|
| `uptime-99-percent` | What's the uptime dashboard URL? What's rolling-30-day uptime right now? | |
| `drafting-turnaround-reduced-70` | Is there a kickoff baseline for "drafting time per contract" that you can compare today's time against? | |
| `filing-resubmission-rate-sub-2` | Can you compute (filings resubmitted / total filings) over last 30 days from the data in the DB? | |
| `ai-accuracy-98` | Is there a labelled eval set for AI output quality? If no, what would it take to build one? | |
| `zero-critical-bugs` | Open the bug tracker — how many P0 + P1 are currently open? | |
| `concurrent-users-1000` | Has any load test ever been run? Tool + date + max users sustained with p95 ≤2s? | |
| `vapt-penetration-testing` | Any vendor scheduled or engaged? If yes, name + date + open-findings count by severity. | |
| `ip-handover` | Is the signed IP-assignment doc per Clause 7 on file? Any trained-model artefacts to transfer? (If no custom models exist, note that.) | |
| `documentation-complete` | Which docs exist and are dated: admin guide, user manual, API docs (Swagger counts), deployment playbook, KT session notes? | |

---

## When you're done

Save this file (filled in). I'll ingest the "Verdict + evidence" column
into `manual-verdicts.yaml` with your name as `reviewed_by` and today's
date, re-run `npm run readiness`, and the real done-rate will show in
`reports/latest.md`.

The things you mark **pass** will go green. The things you mark
**fail** will accurately be red. The engine stops being guesswork and
becomes a defensible status document.
