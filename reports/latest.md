# Lex Origin — MVP Readiness Report

_Generated: 2026-10-05 18:19:55 UTC — automated, do not edit by hand._

Source of truth: [`CONTRACT_REFERENCE.md`](../CONTRACT_REFERENCE.md). Spec: `readiness/spec/*.yaml`. Re-run: `npm run readiness` from `readiness/`.

## Headline

**Scope coverage (Annexure A):** 13 of 104 features Done · 68 Partial · 23 Not started · 0 Unknown.

**Acceptance metrics (Annexure C):** 0 of 12 met · 12 unmet · 0 unknown.

**Done-rate:** 13% of scope. UAT acceptance per Annexure C is a separate bar — see §4.

## Acceptance metrics — Annexure C

| Metric | Target | Status | Evidence |
|---|---|---|---|
| Average response time ≤ 2 seconds on key modules | ≤ 2 000 ms, averaged across 5 samples per key endpoint | ❌ Unmet | state=open · closed_at=null · title=[Annexure C] Average response time ≤ 2 seconds on key modules |
| System uptime ≥ 99% during test period | ≥ 99% rolling 30-day | ❌ Unmet | verdict_key=uptime-99-percent · verdict=fail · reviewed_on=2026-10-05 |
| Drafting turnaround ↓ 70% | 70% reduction vs. the manual baseline measured at kickoff | ❌ Unmet | verdict_key=drafting-turnaround-reduced-70 · verdict=fail · reviewed_on=2026-10-05 |
| Filing resubmission rate < 2% | < 2% of filings require resubmission | ❌ Unmet | verdict_key=filing-resubmission-rate-sub-2 · verdict=fail · reviewed_on=2026-10-05 |
| Case-law retrieval < 5 seconds | < 5 000 ms for a typical case-law search | ❌ Unmet | state=open · closed_at=null · title=[Annexure C] Case-law retrieval < 5 seconds |
| AI output accuracy ≥ 98% | ≥ 98% on a labelled eval set (drafting / review / compliance) | ❌ Unmet | verdict_key=ai-accuracy-98 · verdict=fail · reviewed_on=2026-10-05 |
| 0 critical bugs / crashes / unhandled exceptions | No open P0 / P1 defects at handover | ❌ Unmet | verdict_key=zero-critical-bugs · verdict=needs_work · reviewed_on=2026-10-05 |
| ≥ 1000 concurrent users supported (enterprise modules) | Load test passes 1000 concurrent users with response ≤2s | ❌ Unmet | verdict_key=concurrent-users-1000 · verdict=fail · reviewed_on=2026-10-05 |
| Penetration testing (VAPT) completed, open findings closed | VAPT engagement delivered + all critical/high findings closed | ❌ Unmet | verdict_key=vapt-complete · verdict=fail · reviewed_on=2026-10-05 |
| Client has full admin access (DBs, APIs, cloud credentials) | Formal access handover to Lex Origin complete | ❌ Unmet | verdict_key=admin-access-handover · verdict=needs_work · reviewed_on=2026-10-05 |
| IPR formally assigned, source + models + datasets handed over | Signed IP assignment per Clause 7 + repositories transferred | ❌ Unmet | verdict_key=ip-handover · verdict=needs_work · reviewed_on=2026-10-05 |
| Technical + user documentation + KT sessions | Playbooks, API docs, DB schemas, admin + user guides, training delivered | ❌ Unmet | verdict_key=documentation-complete · verdict=fail · reviewed_on=2026-10-05 |

## Scope — Annexure A, by section

### 3.1 Core AI Development — 5/23 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | RAG pipelines (retrieval-augmented generation) | 🟡 Partial | PARTIAL — 2 pass, 1 fail, 1 needs-work |
| 2 | AI-powered document drafting | 🟡 Partial | PARTIAL — 2 pass, 1 fail, 1 needs-work |
| 3 | AI document review (issue spotting, risk detection, clause suggestions, SWOT) | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 4 | Contract comparison — redlining, side-by-side, clause-change tracking | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 5 | Clause extraction + semantic difference engine | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 6 | Plain-language summaries of contracts, legal, financial docs | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 7 | Citation verification — auto-validate legal references | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 8 | Automated compliance check (Civil, Corporate, Criminal, Arbitration, MCA, SEBI, RBI, Labour, IT, GST) | 🟡 Partial | PARTIAL — 2 pass, 1 fail, 1 needs-work |
| 9 | AI mail generator, summarizer, reply maker (optional Gemini add-on) | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 10 | Duplicate-document elimination with full-file views on request | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 11 | Examination / cross / re-examination question generator | ⚪ Not started | NOT STARTED — 2 fail |
| 12 | Legal forecast — predict case favor/not-favor | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 13 | Legal adviser assistant (conversational) | 🟡 Partial | PARTIAL — 2 pass, 1 fail, 1 needs-work |
| 14 | Financial-software integration — Zoho Books, SAP, Tally | 🟡 Partial | PARTIAL — 2 pass, 2 fail |
| 15 | Case management infrastructure | ✅ Done | DONE — 2 pass |
| 16 | Litigation strategy (AI case analysis) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 17 | Team, employees, clients, financials dashboard for enterprise | 🟡 Partial | PARTIAL — 2 pass, 1 fail, 1 needs-work |
| 18 | Automated billing + time tracking | ✅ Done | DONE — 2 pass |
| 19 | Document management | ✅ Done | DONE — 1 pass |
| 20 | Voice translator for drafting application/appeals | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 21 | Translator — English + Hindi (local languages) | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 22 | Client management (CRM for a legal/CA practice) | ✅ Done | DONE — 1 pass |
| 23 | Compliance + filing workflow generator | ✅ Done | DONE — 2 pass |

### 3.10 External APIs / Sources — 1/8 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | SC + High Court APIs (case updates, judgments) | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 2 | MCA (filings, compliance updates) | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 3 | RBI (circulars, guidelines) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 4 | GST Portal (notifications, filings) | ✅ Done | DONE — 1 pass |
| 5 | Income Tax / CBDT | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 6 | SEBI (regulatory circulars) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 7 | Real-time / near-real-time synchronisation across all above sources | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 8 | E-sign providers — eMudhra, DigiSign, DocuSign | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |

### 3.11 AI-driven Notifications & Insights — 1/3 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Notification engine — regulatory/legal updates across APIs | ✅ Done | DONE — 2 pass |
| 2 | Personalised alerts per user (lawyer / CA / enterprise) | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 3 | Risk / deadline / law-change detection with actionable summaries | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |

### 3.12 Infrastructure — 3/6 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | AWS cloud hosting | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 2 | DB schemas — users, docs, templates | ✅ Done | DONE — 2 pass |
| 3 | Role-based access control | ✅ Done | DONE — 2 pass |
| 4 | Encryption (at rest + in transit) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 5 | Audit logging | ✅ Done | DONE — 2 pass |
| 6 | Penetration testing (VAPT) — external + internal | ⚪ Not started | NOT STARTED — 2 fail |

### 3.2 Corporate Law features — 0/7 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Due diligence analyzer (M&A docs, risk extraction) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 2 | Entity formation & governance assistant (incorporation, bylaws) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 3 | Regulatory change tracker | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 4 | Board meeting minutes generator | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 5 | Policy & HR handbook generator | ⚪ Not started | NOT STARTED — 2 fail |
| 6 | Cross-border law compliance checker | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 7 | List-of-documents generator (for licenses, entity opening, work completion) | ⚪ Not started | NOT STARTED — 2 fail |

### 3.3 Tax / Banking Law features — 0/5 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Tax return compliance checker | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 2 | Tax planning assistant (corporates) | ⚪ Not started | NOT STARTED — 2 fail |
| 3 | Audit risk analyzer | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 4 | Cross-border tax compliance checker | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 5 | Cross-border transfer pricing checker | ⚪ Not started | NOT STARTED — 2 fail |

### 3.4 Intellectual Property — 0/9 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Trademark Search AI (conflict detection) | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 2 | Patent drafting assistant (claim language) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 3 | Prior art finder | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 4 | IP portfolio manager (deadlines, renewals, filings) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 5 | Fair use analyzer | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 6 | Copyright infringement detector | ⚪ Not started | NOT STARTED — 2 fail |
| 7 | IP risk assessment tool | ⚪ Not started | NOT STARTED — 2 fail |
| 8 | Cross-border IP compliance checker | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 9 | Licensing agreement drafting assistant | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |

### 3.5 Data Privacy / Cybersecurity — 0/5 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Data protection compliance checker (DPDP, GDPR) | ⚪ Not started | NOT STARTED — 2 fail |
| 2 | Breach risk analyzer | ⚪ Not started | NOT STARTED — 2 fail |
| 3 | Privacy policy generator | ⚪ Not started | NOT STARTED — 2 fail |
| 4 | User rights explainer (plain language) | ⚪ Not started | NOT STARTED — 2 fail |
| 5 | Cookie policy generator | ⚪ Not started | NOT STARTED — 2 fail |

### 3.6 Immigration Law — 0/10 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Visa eligibility checker | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 2 | Immigration forms auto-filler | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 3 | Asylum case precedent summarizer | ⚪ Not started | NOT STARTED — 2 fail |
| 4 | Residency + work permit tracker | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 5 | Immigration pathway navigator | ⚪ Not started | NOT STARTED — 2 fail |
| 6 | Deportation defense assistant | ⚪ Not started | NOT STARTED — 2 fail |
| 7 | Naturalization test prep tool | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 8 | Family sponsorship eligibility checker | ⚪ Not started | NOT STARTED — 2 fail |
| 9 | Plain-language immigration rights explainer | ⚪ Not started | NOT STARTED — 2 fail |
| 10 | Immigration case-status notifier (forms, hearings, appeals) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |

### 3.7 Law Firm Owner — Enterprise — 2/22 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Workspace service type (Legal / Accounting / Both) + enforcement | ✅ Done | DONE — 4 pass |
| 2 | Owner dashboard — clients, matters, employees, task status | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 3 | Employee directory with workloads + performance | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 4 | Performance heatmap (R / Y / G productivity) | ⚪ Not started | NOT STARTED — 2 fail |
| 5 | Client & matter profitability view | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 6 | Task completion % vs. deadline | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 7 | Smart assignment engine (AI recommends, manual override) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 8 | Owner override button (reassign / escalate / mark urgent) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 9 | Instant assignment notifications with auto checklists | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 10 | Critical escalation alerts (missed deadlines, resignations) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 11 | Weekly summary reports | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 12 | Deadline reminders (4d small, 1-2mo big) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 13 | Risk & compliance alerts (post-completion detection) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 14 | Billable vs. non-billable hour tracking | ✅ Done | DONE — 1 pass |
| 15 | Productivity insights | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 16 | Governance rules (e.g., partner review for M&A drafts) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 17 | Automatic workload balancing suggestions | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 18 | Firm insights (productivity by attorney / practice / client) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 19 | Client profitability reports | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 20 | Future risk radar (regulatory changes, deadlines, disputes) | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 21 | Security: SOC 2 Type II, ISO 27001, GDPR, CCPA alignment | ⚪ Not started | NOT STARTED — 2 fail |
| 22 | Audit logs, data encryption, access controls | 🟡 Partial | PARTIAL — 2 pass, 1 fail, 1 needs-work |

### 3.8 Custom-Trained AI Models — 0/4 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Custom ML models fine-tuned on Indian law / tax / regulatory | ⚪ Not started | NOT STARTED — 2 fail |
| 2 | Continuous-learning pipeline (incremental ingestion) | ⚪ Not started | NOT STARTED — 2 fail |
| 3 | Historical datasets — Supreme Court, High Court, District Court, Tribunals | 🟡 Partial | PARTIAL — 1 fail, 1 needs-work |
| 4 | Specialised modules — Tax/GST/RBI, Corporate governance/MCA/SEBI | ⚪ Not started | NOT STARTED — 2 fail |

### 3.9 Document & Knowledge Libraries — 1/2 done

| # | Feature | Status | Summary |
|---|---|---|---|
| 1 | Centralised document & knowledge library | 🟡 Partial | PARTIAL — 1 pass, 1 fail, 1 needs-work |
| 2 | De-duplication, version tracking, automated categorisation | ✅ Done | DONE — 1 pass |

## Appendix A — Failing / partial checks (detail)

### `rag-pipelines` — RAG pipelines (retrieval-augmented generation)
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#1 OPEN: [3.1] RAG pipelines (retrieval-augmented generation)

### `ai-document-drafting` — AI-powered document drafting
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#2 OPEN: [3.1] AI-powered document drafting

### `ai-document-review` — AI document review (issue spotting, risk detection, clause suggestions, SWOT)
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#3 OPEN: [3.1] AI document review (issue spotting, risk detection, clause suggestions, SWOT)

### `ai-document-comparison` — Contract comparison — redlining, side-by-side, clause-change tracking
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: github issue LexOriginIndia/mvp-readiness#4 fetch failed: 503

### `clause-extraction` — Clause extraction + semantic difference engine
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#5 OPEN: [3.1] Clause extraction + semantic difference engine

### `plain-language-summaries` — Plain-language summaries of contracts, legal, financial docs
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#6 OPEN: [3.1] Plain-language summaries of contracts, legal, financial docs

### `citation-verification` — Citation verification — auto-validate legal references
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#7 OPEN: [3.1] Citation verification — auto-validate legal references

### `legal-compliance-check` — Automated compliance check (Civil, Corporate, Criminal, Arbitration, MCA, SEBI, RBI, Labour, IT, GST)
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#8 OPEN: [3.1] Automated compliance check (Civil, Corporate, Criminal, Arbitration, MCA, SEBI, RBI, Labour, IT, GST)

### `ai-mail-generator` — AI mail generator, summarizer, reply maker (optional Gemini add-on)
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#9 OPEN: [3.1] AI mail generator, summarizer, reply maker (optional Gemini add-on)

### `dedup-with-full-view` — Duplicate-document elimination with full-file views on request
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#10 OPEN: [3.1] Duplicate-document elimination with full-file views on request

### `examination-question-generator` — Examination / cross / re-examination question generator
- Status: ⚪ Not started
- Annexure: 3.1 Core AI Development
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No examination-question-generator module found in authservice or Documents API; feature not implemented.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#11 OPEN: [3.1] Examination / cross / re-examination question generator

### `legal-forecast` — Legal forecast — predict case favor/not-favor
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#12 OPEN: [3.1] Legal forecast — predict case favor/not-favor

### `legal-adviser-assistant` — Legal adviser assistant (conversational)
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#13 OPEN: [3.1] Legal adviser assistant (conversational)

### `financial-software-integration` — Financial-software integration — Zoho Books, SAP, Tally
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — Zoho Books (authservice/zoho-books) and Tally (authservice/tally) are present. SAP is listed in contract (Annexure A §3.1 Financial Software Integration) but no SAP module exists in the codebase. No written waiver on file.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#14 OPEN: [3.1] Financial-software integration — Zoho Books, SAP, Tally

### `litigation-strategy` — Litigation strategy (AI case analysis)
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#15 OPEN: [3.1] Litigation strategy (AI case analysis)

### `enterprise-mgmt-dashboard` — Team, employees, clients, financials dashboard for enterprise
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#16 OPEN: [3.1] Team, employees, clients, financials dashboard for enterprise

### `voice-translator-drafting` — Voice translator for drafting application/appeals
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#17 OPEN: [3.1] Voice translator for drafting application/appeals

### `hindi-english-translator` — Translator — English + Hindi (local languages)
- Status: 🟡 Partial
- Annexure: 3.1 Core AI Development
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#18 OPEN: [3.1] Translator — English + Hindi (local languages)

### `due-diligence-analyzer` — Due diligence analyzer (M&A docs, risk extraction)
- Status: 🟡 Partial
- Annexure: 3.2 Corporate Law features
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#19 OPEN: [3.2] Due diligence analyzer (M&A docs, risk extraction)

### `entity-formation-assistant` — Entity formation & governance assistant (incorporation, bylaws)
- Status: 🟡 Partial
- Annexure: 3.2 Corporate Law features
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#20 OPEN: [3.2] Entity formation & governance assistant (incorporation, bylaws)

### `regulatory-change-tracker` — Regulatory change tracker
- Status: 🟡 Partial
- Annexure: 3.2 Corporate Law features
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#21 OPEN: [3.2] Regulatory change tracker

### `board-meeting-minutes-generator` — Board meeting minutes generator
- Status: 🟡 Partial
- Annexure: 3.2 Corporate Law features
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#22 OPEN: [3.2] Board meeting minutes generator

### `policy-hr-handbook-generator` — Policy & HR handbook generator
- Status: ⚪ Not started
- Annexure: 3.2 Corporate Law features
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No HR-handbook generator module found. Payroll module covers PF/ESI/gratuity accounting, but not policy drafting.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#23 OPEN: [3.2] Policy & HR handbook generator

### `cross-border-law-compliance-checker` — Cross-border law compliance checker
- Status: 🟡 Partial
- Annexure: 3.2 Corporate Law features
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#24 OPEN: [3.2] Cross-border law compliance checker

### `documents-list-generator` — List-of-documents generator (for licenses, entity opening, work completion)
- Status: ⚪ Not started
- Annexure: 3.2 Corporate Law features
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No document-list generator module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#25 OPEN: [3.2] List-of-documents generator (for licenses, entity opening, work completion)

### `tax-return-compliance-checker` — Tax return compliance checker
- Status: 🟡 Partial
- Annexure: 3.3 Tax / Banking Law features
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#26 OPEN: [3.3] Tax return compliance checker

### `tax-planning-assistant` — Tax planning assistant (corporates)
- Status: ⚪ Not started
- Annexure: 3.3 Tax / Banking Law features
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No tax-planning assistant module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#27 OPEN: [3.3] Tax planning assistant (corporates)

### `audit-risk-analyzer` — Audit risk analyzer
- Status: 🟡 Partial
- Annexure: 3.3 Tax / Banking Law features
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#28 OPEN: [3.3] Audit risk analyzer

### `cross-border-tax-compliance-checker` — Cross-border tax compliance checker
- Status: 🟡 Partial
- Annexure: 3.3 Tax / Banking Law features
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#29 OPEN: [3.3] Cross-border tax compliance checker

### `cross-border-transfer-pricing-checker` — Cross-border transfer pricing checker
- Status: ⚪ Not started
- Annexure: 3.3 Tax / Banking Law features
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No transfer pricing module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#30 OPEN: [3.3] Cross-border transfer pricing checker

### `trademark-search-ai` — Trademark Search AI (conflict detection)
- Status: 🟡 Partial
- Annexure: 3.4 Intellectual Property
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#31 OPEN: [3.4] Trademark Search AI (conflict detection)

### `patent-drafting-assistant` — Patent drafting assistant (claim language)
- Status: 🟡 Partial
- Annexure: 3.4 Intellectual Property
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#32 OPEN: [3.4] Patent drafting assistant (claim language)

### `prior-art-finder` — Prior art finder
- Status: 🟡 Partial
- Annexure: 3.4 Intellectual Property
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#33 OPEN: [3.4] Prior art finder

### `ip-portfolio-manager` — IP portfolio manager (deadlines, renewals, filings)
- Status: 🟡 Partial
- Annexure: 3.4 Intellectual Property
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#34 OPEN: [3.4] IP portfolio manager (deadlines, renewals, filings)

### `fair-use-analyzer` — Fair use analyzer
- Status: 🟡 Partial
- Annexure: 3.4 Intellectual Property
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#35 OPEN: [3.4] Fair use analyzer

### `copyright-infringement-detector` — Copyright infringement detector
- Status: ⚪ Not started
- Annexure: 3.4 Intellectual Property
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No copyright-infringement detector module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#36 OPEN: [3.4] Copyright infringement detector

### `ip-risk-assessment-tool` — IP risk assessment tool
- Status: ⚪ Not started
- Annexure: 3.4 Intellectual Property
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No IP risk-assessment tool module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#37 OPEN: [3.4] IP risk assessment tool

### `cross-border-ip-compliance-checker` — Cross-border IP compliance checker
- Status: 🟡 Partial
- Annexure: 3.4 Intellectual Property
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#38 OPEN: [3.4] Cross-border IP compliance checker

### `licensing-agreement-drafting-assistant` — Licensing agreement drafting assistant
- Status: 🟡 Partial
- Annexure: 3.4 Intellectual Property
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#39 OPEN: [3.4] Licensing agreement drafting assistant

### `data-protection-compliance-checker` — Data protection compliance checker (DPDP, GDPR)
- Status: ⚪ Not started
- Annexure: 3.5 Data Privacy / Cybersecurity
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No DPDP/GDPR compliance checker module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#40 OPEN: [3.5] Data protection compliance checker (DPDP, GDPR)

### `breach-risk-analyzer` — Breach risk analyzer
- Status: ⚪ Not started
- Annexure: 3.5 Data Privacy / Cybersecurity
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No breach-risk analyzer module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#41 OPEN: [3.5] Breach risk analyzer

### `privacy-policy-generator` — Privacy policy generator
- Status: ⚪ Not started
- Annexure: 3.5 Data Privacy / Cybersecurity
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No privacy policy generator module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#42 OPEN: [3.5] Privacy policy generator

### `user-rights-explainer` — User rights explainer (plain language)
- Status: ⚪ Not started
- Annexure: 3.5 Data Privacy / Cybersecurity
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No user rights explainer module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#43 OPEN: [3.5] User rights explainer (plain language)

### `cookie-policy-generator` — Cookie policy generator
- Status: ⚪ Not started
- Annexure: 3.5 Data Privacy / Cybersecurity
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No cookie policy generator module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#44 OPEN: [3.5] Cookie policy generator

### `visa-eligibility-checker` — Visa eligibility checker
- Status: 🟡 Partial
- Annexure: 3.6 Immigration Law
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#45 OPEN: [3.6] Visa eligibility checker

### `immigration-forms-autofiller` — Immigration forms auto-filler
- Status: 🟡 Partial
- Annexure: 3.6 Immigration Law
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#46 OPEN: [3.6] Immigration forms auto-filler

### `asylum-precedent-summarizer` — Asylum case precedent summarizer
- Status: ⚪ Not started
- Annexure: 3.6 Immigration Law
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No asylum precedent summarizer module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#47 OPEN: [3.6] Asylum case precedent summarizer

### `residency-work-permit-tracker` — Residency + work permit tracker
- Status: 🟡 Partial
- Annexure: 3.6 Immigration Law
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#48 OPEN: [3.6] Residency + work permit tracker

### `immigration-pathway-navigator` — Immigration pathway navigator
- Status: ⚪ Not started
- Annexure: 3.6 Immigration Law
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No pathway navigator module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#49 OPEN: [3.6] Immigration pathway navigator

### `deportation-defense-assistant` — Deportation defense assistant
- Status: ⚪ Not started
- Annexure: 3.6 Immigration Law
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No deportation defense assistant module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#50 OPEN: [3.6] Deportation defense assistant

### `naturalization-test-prep` — Naturalization test prep tool
- Status: 🟡 Partial
- Annexure: 3.6 Immigration Law
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#51 OPEN: [3.6] Naturalization test prep tool

### `family-sponsorship-eligibility-checker` — Family sponsorship eligibility checker
- Status: ⚪ Not started
- Annexure: 3.6 Immigration Law
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No family sponsorship eligibility checker module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#52 OPEN: [3.6] Family sponsorship eligibility checker

### `immigration-rights-explainer` — Plain-language immigration rights explainer
- Status: ⚪ Not started
- Annexure: 3.6 Immigration Law
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No immigration-rights explainer module found.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#53 OPEN: [3.6] Plain-language immigration rights explainer

### `case-status-notifier` — Immigration case-status notifier (forms, hearings, appeals)
- Status: 🟡 Partial
- Annexure: 3.6 Immigration Law
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#54 OPEN: [3.6] Immigration case-status notifier (forms, hearings, appeals)

### `owner-dashboard` — Owner dashboard — clients, matters, employees, task status
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#55 OPEN: [3.7] Owner dashboard — clients, matters, employees, task status

### `employee-directory-workloads` — Employee directory with workloads + performance
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#56 OPEN: [3.7] Employee directory with workloads + performance

### `performance-heatmap` — Performance heatmap (R / Y / G productivity)
- Status: ⚪ Not started
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No performance-heatmap component identified in client-fe.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#57 OPEN: [3.7] Performance heatmap (R / Y / G productivity)

### `client-matter-profitability-view` — Client & matter profitability view
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#58 OPEN: [3.7] Client & matter profitability view

### `task-completion-vs-deadline` — Task completion % vs. deadline
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#59 OPEN: [3.7] Task completion % vs. deadline

### `smart-assignment-engine` — Smart assignment engine (AI recommends, manual override)
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#60 OPEN: [3.7] Smart assignment engine (AI recommends, manual override)

### `owner-override-button` — Owner override button (reassign / escalate / mark urgent)
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#61 OPEN: [3.7] Owner override button (reassign / escalate / mark urgent)

### `assignment-notifications-with-checklists` — Instant assignment notifications with auto checklists
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#62 OPEN: [3.7] Instant assignment notifications with auto checklists

### `critical-escalation-alerts` — Critical escalation alerts (missed deadlines, resignations)
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#63 OPEN: [3.7] Critical escalation alerts (missed deadlines, resignations)

### `weekly-summary-reports` — Weekly summary reports
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#64 OPEN: [3.7] Weekly summary reports

### `deadline-reminders` — Deadline reminders (4d small, 1-2mo big)
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#65 OPEN: [3.7] Deadline reminders (4d small, 1-2mo big)

### `risk-compliance-alerts` — Risk & compliance alerts (post-completion detection)
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#66 OPEN: [3.7] Risk & compliance alerts (post-completion detection)

### `productivity-insights` — Productivity insights
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#67 OPEN: [3.7] Productivity insights

### `governance-rules` — Governance rules (e.g., partner review for M&A drafts)
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#68 OPEN: [3.7] Governance rules (e.g., partner review for M&A drafts)

### `workload-balancing` — Automatic workload balancing suggestions
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#69 OPEN: [3.7] Automatic workload balancing suggestions

### `firm-insights` — Firm insights (productivity by attorney / practice / client)
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#70 OPEN: [3.7] Firm insights (productivity by attorney / practice / client)

### `client-profitability-reports` — Client profitability reports
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#71 OPEN: [3.7] Client profitability reports

### `future-risk-radar` — Future risk radar (regulatory changes, deadlines, disputes)
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#72 OPEN: [3.7] Future risk radar (regulatory changes, deadlines, disputes)

### `security-soc2-iso27001` — Security: SOC 2 Type II, ISO 27001, GDPR, CCPA alignment
- Status: ⚪ Not started
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No SOC 2 or ISO 27001 certification evidence on file. Not scheduled, not in progress. GDPR + CCPA mapping not documented. This is a hard contract commitment (§3.7).
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#73 OPEN: [3.7] Security: SOC 2 Type II, ISO 27001, GDPR, CCPA alignment

### `audit-logs-encryption-access-controls` — Audit logs, data encryption, access controls
- Status: 🟡 Partial
- Annexure: 3.7 Law Firm Owner — Enterprise
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#74 OPEN: [3.7] Audit logs, data encryption, access controls

### `custom-models-indian-law` — Custom ML models fine-tuned on Indian law / tax / regulatory
- Status: ⚪ Not started
- Annexure: 3.8 Custom-Trained AI Models
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No fine-tuned model artefacts, training scripts, or dataset manifests located. Platform uses general LLMs (OpenAI, Anthropic) via API, not custom-trained models as contract §3.8 requires.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#75 OPEN: [3.8] Custom ML models fine-tuned on Indian law / tax / regulatory

### `continuous-learning-pipeline` — Continuous-learning pipeline (incremental ingestion)
- Status: ⚪ Not started
- Annexure: 3.8 Custom-Trained AI Models
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No continuous-learning pipeline identified. Prism has sync scheduler for data ingestion but not for model retraining.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#76 OPEN: [3.8] Continuous-learning pipeline (incremental ingestion)

### `historical-court-datasets` — Historical datasets — Supreme Court, High Court, District Court, Tribunals
- Status: 🟡 Partial
- Annexure: 3.8 Custom-Trained AI Models
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#77 OPEN: [3.8] Historical datasets — Supreme Court, High Court, District Court, Tribunals

### `specialised-ai-tax-governance-modules` — Specialised modules — Tax/GST/RBI, Corporate governance/MCA/SEBI
- Status: ⚪ Not started
- Annexure: 3.8 Custom-Trained AI Models
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No domain-specialised models or domain-benchmark results on file.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#78 OPEN: [3.8] Specialised modules — Tax/GST/RBI, Corporate governance/MCA/SEBI

### `centralised-knowledge-library` — Centralised document & knowledge library
- Status: 🟡 Partial
- Annexure: 3.9 Document & Knowledge Libraries
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#79 OPEN: [3.9] Centralised document & knowledge library

### `api-supreme-high-court` — SC + High Court APIs (case updates, judgments)
- Status: 🟡 Partial
- Annexure: 3.10 External APIs / Sources
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#80 OPEN: [3.10] SC + High Court APIs (case updates, judgments)

### `api-mca` — MCA (filings, compliance updates)
- Status: 🟡 Partial
- Annexure: 3.10 External APIs / Sources
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#81 OPEN: [3.10] MCA (filings, compliance updates)

### `api-rbi` — RBI (circulars, guidelines)
- Status: 🟡 Partial
- Annexure: 3.10 External APIs / Sources
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#82 OPEN: [3.10] RBI (circulars, guidelines)

### `api-income-tax-cbdt` — Income Tax / CBDT
- Status: 🟡 Partial
- Annexure: 3.10 External APIs / Sources
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#83 OPEN: [3.10] Income Tax / CBDT

### `api-sebi` — SEBI (regulatory circulars)
- Status: 🟡 Partial
- Annexure: 3.10 External APIs / Sources
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#84 OPEN: [3.10] SEBI (regulatory circulars)

### `realtime-sync` — Real-time / near-real-time synchronisation across all above sources
- Status: 🟡 Partial
- Annexure: 3.10 External APIs / Sources
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#85 OPEN: [3.10] Real-time / near-real-time synchronisation across all above sources

### `esign-integration` — E-sign providers — eMudhra, DigiSign, DocuSign
- Status: 🟡 Partial
- Annexure: 3.10 External APIs / Sources
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#86 OPEN: [3.10] E-sign providers — eMudhra, DigiSign, DocuSign

### `personalised-alerts` — Personalised alerts per user (lawyer / CA / enterprise)
- Status: 🟡 Partial
- Annexure: 3.11 AI-driven Notifications & Insights
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#87 OPEN: [3.11] Personalised alerts per user (lawyer / CA / enterprise)

### `risk-deadline-detection` — Risk / deadline / law-change detection with actionable summaries
- Status: 🟡 Partial
- Annexure: 3.11 AI-driven Notifications & Insights
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#88 OPEN: [3.11] Risk / deadline / law-change detection with actionable summaries

### `aws-cloud-hosting` — AWS cloud hosting
- Status: 🟡 Partial
- Annexure: 3.12 Infrastructure
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#89 OPEN: [3.12] AWS cloud hosting

### `encryption` — Encryption (at rest + in transit)
- Status: 🟡 Partial
- Annexure: 3.12 Infrastructure
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#90 OPEN: [3.12] Encryption (at rest + in transit)

### `vapt-penetration-testing` — Penetration testing (VAPT) — external + internal
- Status: ⚪ Not started
- Annexure: 3.12 Infrastructure
- 🔸 `manual`: [manual, Claude Opus 4.7 on 2026-10-05] fail — No VAPT engagement on file. Not scheduled. Hard contract commitment under §3.12 + Annexure C.
- 🔸 `github_issue`: issue LexOriginIndia/mvp-readiness#91 OPEN: [3.12] Penetration testing (VAPT) — external + internal

