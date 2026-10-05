# Contract Reference — Lex Origin MVP

**Always load this before answering any readiness, status, scope,
delivery, or acceptance question.** Treat it as the single source of
truth for what we committed to deliver and against what standard it is
measured.

Source document: the signed "Software Development & Confidentiality
Agreement" between **Lex Origin Consulting Private Limited** (Client)
and the Contractor. The signed PDF/DOCX is the authoritative source.

Personal identifiers (PAN, Aadhaar, home address, bank account) and
commercially sensitive terms (monetary values, exact kickoff date,
individual-level contact details) are intentionally omitted from this
public reference. Refer to the signed PDF/DOCX for anything redacted.

---

## 1. Headline terms

| Term | Value |
|---|---|
| Total contract value | *(redacted — see signed SDA)* |
| Payment structure | 6 equal monthly instalments on a fixed day of each month, TDS deducted |
| Development duration | **6 months from kickoff** (originally scheduled to complete at the end of Month 6) |
| Post-delivery coverage | **2 years** maintenance & support included in the contract value |
| Governing law | India, exclusive jurisdiction of New Delhi courts |
| Non-solicitation period | 12 months after agreement completion |

**Payment conditional on milestone acceptance** — if a milestone is
not completed and accepted in its month, the Client is not obligated
to pay that month's instalment until the milestone is accepted.
Contractor bears the cost of extra resources needed to catch up.

---

## 2. Timeline — Annexure B (6 phases, 1 per month)

| Phase | Target month | Deliverable |
|---|---|---|
| 1. Foundation | Month 1 | Env setup, infra, Git + CI/CD, DB schemas (templates / docs / clauses / integrations), initial DMS integration + upload APIs |
| 2. Core AI Drafting | Month 2 | Standard template drafting + bespoke RAG+LLM drafting engine, DOCX/PDF export, drafting APIs + frontend |
| 3. Custom AI Models | Month 3 | Indian-law/tax/judgment-trained models, Document & Knowledge Library, clause classification + risk tagging |
| 4. API Integrations | Month 4 | MCA, RBI, GST, SEBI, Courts (SC/HC/Tribunals) — real-time ingestion + normalisation, auto-updating repos |
| 5. AI Notifications | Month 5 | Notification Engine, personalised alert delivery, accuracy/timeliness testing |
| 6. QA, UAT, Handover | Month 6 | End-to-end integration, QA + security audits + compliance validation, UAT, final handover |

**Current state vs. plan** — the original 6-month window has closed;
everything beyond Month 6 is overrun relative to Annexure B. Use the
acceptance checklist in §4 to describe status honestly rather than
measuring from a shifted timeline.

---

## 3. Scope of Work — Annexure A

### 3.1 Core AI Development
- RAG pipelines
- AI-powered document drafting / review / comparison
- Clause extraction, contract risk analysis, semantic difference engine
- Plain-language summaries of contracts, legal and financial docs
- Document Review & Analysis — issue spotting, risk detection, clause
  suggestions, SWOT-style contract analysis
- Contract Comparison — redlining, side-by-side, clause change tracking
- Citation Verification — automatic validation of legal references
- Legal Compliance Check — Civil / Corporate / Criminal / Arbitration /
  MCA / SEBI / RBI / Labour / Income Tax / GST / "other relevant laws"
- AI Mail generator / summarizer / reply (Gemini add-on optional)
- Duplication-document elimination (with full file views on request)
- Examination / cross-examination / re-examination question generator
- Legal forecast (case favour/not-favour assessment)
- Legal adviser Assistant
- Financial Software Integration — Zoho Books, SAP, Tally
- Case management infrastructure
- Litigation strategy (case analysis)
- Team / employees / clients / financials dashboard for enterprise
- Automated billing + time tracking
- Document management
- Voice Translator for application/appeal drafting
- Translator in local language (English + Hindi)
- Client Management
- Compliances and Filing workflow generator

### 3.2 Corporate Law features
Due diligence analyzer · Entity formation & governance assistant ·
Regulatory change tracker · Board meeting minutes generator ·
Policy & HR handbook generator · Cross-border law compliance checker ·
List-of-documents generator

### 3.3 Tax / Banking Law features
Tax return compliance checker · Tax planning assistant (corporates) ·
Audit risk analyzer · Cross-border tax compliance checker ·
Cross-border transfer pricing checker

### 3.4 Intellectual Property features
Trademark Search AI · Patent Drafting Assistant · Prior Art Finder ·
IP Portfolio Manager · Fair use analyzer · Copyright Infringement
Detector · IP Risk Assessment Tool · Cross-Border IP Compliance Checker ·
Licensing Agreement Drafting Assistant

### 3.5 Data Privacy / Cybersecurity features
DPDP + GDPR compliance checker · Breach risk analyzer ·
Privacy policy generator · User rights explainer (plain language) ·
Cookie policy generator

### 3.6 Immigration Law features
Visa eligibility checker · Immigration forms auto-filler ·
Asylum case precedent summarizer · Residency & work permit tracker ·
Immigration pathway navigator · Deportation defense assistant ·
Naturalization test prep · Family sponsorship eligibility checker ·
Immigration rights explainer (plain language) ·
Case status notifier (forms, hearings, appeals)

### 3.7 Law Firm Owner — Enterprise Subscription
Owner Dashboard (clients + matters + employee list w/ roles/payroll/positions
+ task status w/ deadlines/progress/risks) · Employee Directory w/ workloads ·
Performance Heatmap (R/Y/G) · Client & matter profitability view ·
Task completion % vs. deadline · Smart Assignment Engine (AI + manual
override) · Owner Override Button · Instant assignment notifications with
auto checklists · Critical Escalation Alerts · Weekly Summary Reports ·
Deadline Reminders (4d small / 1-2mo big) · Risk & Compliance Alerts ·
Billable vs non-billable hour tracking · Productivity insights ·
Governance rules (e.g., partner review for M&A drafts) · Automatic
workload balancing · Firm Insights (by attorney/practice/client) ·
Client Profitability Reports · Future Risk Radar ·
**Security & Compliance: SOC 2 Type II, ISO 27001, GDPR, CCPA alignment;
audit logs; data encryption; access controls.**

### 3.8 Custom-Trained AI Models
- Fine-tuned on Indian law / tax / regulatory / compliance
- Continuous-learning pipeline for incremental ingestion
- Industry compliance frameworks: DPDP, RBI, SEBI, GST,
  **SOC 2 Type 2, ISO 27001**, other applicable
- Historical datasets: Supreme Court, High Court, District Court,
  Tribunals
- Specialised AI modules: Tax / GST rulings / RBI; Corporate
  governance / MCA filings / SEBI

### 3.9 Document & Knowledge Libraries
Centralised, structured ingestion of legal documents, case law,
contracts, compliance filings, tax rulings, RBI circulars, GST
guidelines, SEBI notifications, policy updates from ministries;
de-duplication, version tracking, automated categorisation.

### 3.10 External APIs / Sources
- Supreme Court & High Court APIs/sites (case updates, judgments)
- MCA (filings, compliance updates)
- RBI (circulars, guidelines)
- GST Portal (notifications, updates)
- Income Tax / CBDT
- SEBI (regulatory circulars)
- **Real-time / near-real-time synchronisation**
- e-sign providers: eMudhra, DigiSign, DocuSign

### 3.11 AI-driven Notifications & Insights
Monitor regulatory/legal updates across connected APIs; personalised
context-driven alerts per user (lawyer / CA / enterprise) based on
active cases, clients, compliance obligations; risk / deadline /
law-change detection; actionable summaries
(e.g. *"RBI circular on NBFC liquidity — relevant to your client portfolio"*).

### 3.12 Infrastructure
- Cloud hosting on **AWS**
- DB schemas: users, docs, templates
- Role-based access, encryption, audit logging
- **Penetration Testing (VAPT)** — external + internal

---

## 4. Acceptance criteria — Annexure C

### 4.1 Functional
- Every module in Annexure A **developed, tested, integrated into a
  single functional platform**
- All workflows, document management, AI functionalities operate as
  specified
- All API integrations fetch and display correct real-time data
- Automated notifications and alerts function for every user role
- Dashboards display accurate analytics and reports

### 4.2 Technical
- Deployed on approved production environment (AWS or Client-approved)
- Lex Origin has **full administrative access**: DBs, APIs, cloud infra
  credentials
- DB schemas and APIs perform correctly and securely
- **Concurrency: ≥ 1000 concurrent users** on enterprise modules
- Security hardening: encryption, audit logs, access controls,
  **VAPT completed**

### 4.3 Performance & Reliability (hard numbers)
| Metric | Target |
|---|---|
| Average response time on key modules | **≤ 2 seconds** |
| System uptime during test period | **≥ 99 %** |
| Drafting turnaround improvement | **↓ 70 %** |
| Filing resubmission rate | **< 2 %** |
| Case-law retrieval | **< 5 seconds** |
| AI output accuracy | **≥ 98 %** |
| Critical bugs / crashes / unhandled exceptions | **0** |

### 4.4 Deployment & access
- MVP deployed in agreed prod env
- Client has admin access including DBs, APIs, cloud credentials

### 4.5 Documentation & training
- Technical: system design, APIs, DB schemas, deployment playbooks
- User: admin guide, usage manual
- Training/KT sessions for Client's nominated team

### 4.6 IP handover
- Source code, trained AI models, datasets, libraries, config files,
  related deliverables handed over
- All IPR formally assigned to Client, free of encumbrances
- IP assignment executed per Clause 7

### 4.7 UAT sign-off
- MVP passes UAT per mutually agreed test cases
- Formal sign-off certificate from Client

### 4.8 Defect management
- Logged in a shared sheet
- **Critical defects** (crash / data loss / security breach) must be
  resolved before acceptance; any post-handover critical defect to be
  cured within reasonable time
- **Minor defects**: resolved within a **15-day stabilisation period**
  at no extra cost
- Client may reject deliverables if defects aren't satisfactorily
  resolved

### 4.9 User-group service capability (MVP is "complete" only when it
serves all of these)
- **Chartered Accountants** — tax compliance workflows, GST / RBI /
  Income Tax updates, AI assistance for filings / checklists /
  tax-related docs, auto notifications for tax-law updates & due dates
- **Lawyers** — research, case management, drafting; AI contract review
  w/ risk detection, clause comparison, precedent mapping; real-time
  SC / HC / regulatory updates
- **Agencies / Corporates / Enterprises** — compliance dashboards for
  employees, clients, financials; document libraries w/ de-dup,
  storage, change tracking; AI alerts for regulatory risks /
  governance / deadlines; billing, time-tracking, client-profitability
  insights for agencies and firms
- **General** — unified platform, secure logins, role-based access,
  Government / Public API integration, scalable architecture for
  enterprise usage post-MVP

---

## 5. Non-functional obligations the Contractor is on the hook for

- **Confidentiality**: 10-year survival after termination; AI models
  trained/derived from Client data are returnable/destructible
- **IP**: all Developments are "work made for hire" or irrevocably
  assigned from moment of creation
- **Return/destruction**: on request or termination, all Confidential
  Information, including all trained models, erased within 7 days;
  signed certificate required
- **Compelled disclosure**: prior written notice to Client to allow
  protective order
- **Breach notification**: immediate written notice on any
  unauthorised use/disclosure
- **Designated Employees**: a list to be provided; obligations survive
  their departure; third parties need written consent + their own
  undertaking
- **Communications**: official company email IDs only; sub-contractor
  NDAs if required by Client
- **Non-solicitation**: 12 months post-engagement, both ways
- **No publicity**: no press release / public mention without prior
  written approval of the other party

### Liability
- **Uncapped** for: breach of confidentiality, IP infringement, gross
  negligence, fraud / wilful misconduct, violation of law
- **Capped at contract value** for all other claims

---

## 6. How to use this file

**Whenever answering a readiness or status question**, map the
current state of the code / infra against §3 (scope) and §4
(acceptance). Report in three buckets:

1. **Done** — delivered, deployable, meets the §4 metric
2. **Partial** — exists but doesn't yet meet the §4 metric or is
   missing sub-features from §3
3. **Not started** — no implementation yet

Do not describe anything as "complete" unless it satisfies the
Annexure C hard numbers (≤2s response, ≥99% uptime, ≥98% AI accuracy,
0 critical bugs, 1000 concurrent users supported). "Works in dev"
is not acceptance.

For any claim about delivery, cite file paths / commits / test runs
so the Client can verify independently.

Last synced from source NDA: 2026-10-05.
