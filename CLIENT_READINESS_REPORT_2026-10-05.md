# Lex Origin MVP — Readiness Report

**To:** Lex Origin Consulting Private Limited
**From:** Arjun Kumar (Contractor)
**Date:** 5 October 2026
**Reference:** Software Development & Confidentiality Agreement dated 25 September 2025, including Annexures A (Scope), B (Timeline), C (Acceptance Test Plan)

This report describes the state of the Platform as of today, measured against the signed contract. It is produced by an automated readiness engine (`readiness/` in the project workspace), re-runnable at any time, with every claim traceable to specific files, endpoints, or dated evidence. Nothing in this report has been softened for presentation; the engine is designed to prevent that.

---

## 1. Executive summary

- **Scope coverage (Annexure A, 104 contract-named features):**
  **13 provably Done · 68 Partial (code exists, output quality pending verification) · 23 Not Started.**
- **Acceptance metrics (Annexure C, 12 hard criteria):**
  **0 of 12 currently met.** Several are blocked on external artefacts (SOC 2 certification, VAPT engagement, documented uptime data, labelled AI eval set) that have not yet been commissioned.
- **Schedule:** The signed timeline (Annexure B) targeted MVP delivery by **~25 March 2026**. Today is **5 October 2026** — the project is approximately **six months beyond** the contractual window.
- **Engineering effort delivered to date:**
  **~165,000 lines of Python backend** across the Documents API and Prism services (with real OpenAI + Anthropic + RAG integrations), **90+ NestJS modules** in authservice, **42 workspace dashboard pages** in the client frontend, and multiple government-data scrapers (RBI, SEBI, MCA). The platform is substantial; it is not a prototype.
- **What this means for acceptance:** The Platform **cannot pass Annexure C as written today.** This report lays out what remains, with options for how to close the gap.

---

## 2. What is Done — provably working

The following 13 items pass all automated checks and have been verified by code review:

**Platform plumbing**
- Workspace management, including the newly added Legal / Accounting / Both workspace-type gating
- User authentication (email/password, Google OAuth, Microsoft OAuth)
- Role-based access control with per-workspace permissions
- Multi-tenant data isolation (recent IDOR hardening pass, see §6)

**Backend services operational**
- Documents API (document management, templates, blocks)
- Compliance Calendar (GSTR / TDS / ITR / ROC deadline tracking)
- Payroll (employees, salary runs, PF/ESI/PT/TDS, payslips)
- Accounting (double-entry bookkeeping, ledgers, vouchers)
- Bank accounts
- Audit infrastructure
- Cases controller (with practice-type guard)
- User activity history (audit log)

---

## 3. What is Partial — code built, output quality not yet independently verified

Sixty-eight features have real implementations in the codebase but have not yet been walked through by a legal or accounting professional to confirm that the output is production-quality by the standards set in Annexure C (≥98% AI accuracy, usable without major re-work).

Grouped by contract section:

**§3.1 Core AI (22 of 23)** — RAG pipelines, document drafting, review, comparison, clause extraction, plain-language summaries, citation verification, legal compliance check, mail generator, deduplication, legal forecast, legal adviser assistant, case management, enterprise dashboard, billing + time tracking, voice translator, Hindi translation, client management, compliance workflow generator. All backed by substantial Python AI code (Documents API: 116,912 LOC with 188 OpenAI + 229 Anthropic client references; Prism: 47,846 LOC with 579 RAG terms + 220 OpenAI + 150 Anthropic references).

**§3.2 Corporate Law (3 of 7)** — Entity-formation assistant, regulatory change tracker, due-diligence analyzer. Four others not started (see §4).

**§3.3 Tax / Banking (2 of 5)** — Tax return compliance checker, audit risk analyzer, cross-border law/tax (via FEMA-CMA module). Transfer pricing and corporate tax planning assistant not started.

**§3.4 Intellectual Property (6 of 9)** — Trademark search (with similarity scoring), patent assistance (novelty check, IPC suggestion), prior-art finder, IP portfolio manager, fair-use analyzer (dedicated 4-factor endpoint), licensing agreement drafting, cross-border IP (via PCT/WIPO jurisdictions in schema). Copyright infringement detector + IP risk assessment tool not started.

**§3.6 Immigration (5 of 10)** — Visa eligibility, forms autofiller, residency/work-permit tracker, naturalization test prep, case status notifier. All backed by the immigration module (1,809 LOC, 26 endpoints including USCIS integration). Five tools (asylum, deportation, pathway navigator, family sponsorship, rights explainer) not started.

**§3.7 Enterprise / Firm Owner (14 of 20)** — Owner dashboard, employee directory, task-completion tracking, assignment notifications, escalation alerts, weekly reports, deadline reminders, risk/compliance alerts, productivity insights, governance rules, workload balancing, firm insights, client profitability, future risk radar, billable/non-billable tracking. Two gaps: performance heatmap not built, SOC 2 + ISO 27001 not certified.

**§3.9 Document & Knowledge Libraries (2 of 2)** — Centralised library, de-duplication + version tracking.

**§3.10 External APIs (7 of 8)** — Supreme Court / High Court (ecourts), MCA (government-apis), **RBI (411-LOC dedicated scraper)**, GST (sandbox.co.in), Income Tax / CBDT, **SEBI (472-LOC dedicated scraper)**, e-sign flow, real-time sync infrastructure.

**§3.11 AI Notifications (3 of 3)** — Notification engine, personalised alerts, risk-deadline detection.

**§3.12 Infrastructure (4 of 6)** — AWS/Railway cloud hosting (see §5 note on AWS vs Railway), DB schemas, role-based access, audit logging, encryption. VAPT not engaged.

The Partial status is honest — it means the engineering effort has been invested, but no legal or accounting professional has sat down with the UI and confirmed that a working lawyer or CA would accept the outputs. Resolving these to Done requires either a client-side walkthrough (we have prepared a structured checklist) or an internal UAT pass by domain-expert reviewers.

---

## 4. What is Not Started — identified gaps

Twenty-three contract-named features currently have no implementation in the codebase. These are the real items for discussion:

**AI features to build (10)**
- Examination / cross-examination / re-examination question generator (§3.1)
- Board meeting minutes **generator** — the data model exists, the AI generation endpoint does not (§3.2)
- Policy & HR handbook generator (§3.2)
- Required-documents list generator (§3.2)
- Tax planning assistant for corporates (§3.3) — personal section 80 declarations exist in payroll; a corporate-level planner does not
- Cross-border transfer-pricing checker (§3.3) — no ALP methods (CUP, RPM, CPM, TNMM, PSM)
- Copyright infringement detector (§3.4)
- IP risk assessment tool (§3.4)
- Performance heatmap (R/Y/G productivity view) (§3.7)
- Breach risk analyzer (§3.5)

**Data privacy family (4)** — Required by §3.5
- Data protection compliance checker (DPDP + GDPR)
- Privacy policy generator
- User rights explainer (plain language)
- Cookie policy generator

**Immigration tools (5)** — Required by §3.6
- Asylum case precedent summarizer
- Immigration pathway navigator
- Deportation defense assistant
- Family sponsorship eligibility checker
- Plain-language immigration rights explainer

**Custom-trained AI models (3)** — Required by §3.8
- Fine-tuned ML models specific to Indian law / tax / regulatory
- Continuous-learning pipeline for incremental data ingestion
- Specialised domain modules (Tax/GST/RBI; Corporate governance/MCA/SEBI)

> The Platform currently uses general-purpose LLMs (OpenAI GPT-4, Anthropic Claude, Google Gemini) via API, not fine-tuned models trained on Indian law corpora. Delivering §3.8 as written requires either (a) a model-training programme with labelled Indian legal data, or (b) a written amendment acknowledging that general-LLM + RAG against the Indian corpus (which is partly built) satisfies the intent.

**External artefacts not yet commissioned (1)**
- VAPT (penetration testing) engagement — required by §3.12 + Annexure C

---

## 5. Items that need written clarification

Three specific gaps between the contract text and the delivered Platform require explicit discussion rather than silent progress:

**(a) Hosting on AWS (§3.12).** The contract names AWS as the hosting target. The current deployment target is Railway (and will remain so unless the Client chooses to migrate). Please confirm whether (i) migration to AWS is required before UAT, or (ii) a written amendment accepts Railway as the hosting substrate.

**(b) Financial-software integration — SAP (§3.1).** The contract lists Zoho Books, SAP, and Tally. Zoho Books and Tally are integrated and operational. SAP has no implementation. Please confirm whether SAP is required for UAT or waived.

**(c) Custom-trained AI models (§3.8).** As noted in §4 above — the Platform uses general-purpose LLMs via API rather than fine-tuned Indian-law models. This is a material difference from the contract text and should be acknowledged in writing one way or the other.

---

## 6. Security posture

A security hardening pass was completed in September–October 2026, covering 30+ identified gaps. Items of note:

- **Fixed:** Token storage (refresh tokens are SHA-256-hashed in DB), per-route rate limiting on credential endpoints, OAuth refresh-token cookie delivery (removed from URL), hardcoded JWT fallback secrets eliminated across 8 files, cryptographic PRNG for OTPs (replaced `Math.random()` with `crypto.randomInt()`), cross-workspace IDOR enforcement (`AppointmentEntitlementGuard` on all client-scoped routes, including team-member assignment check), workspace-type enforcement via new `PracticeTypeGuard` on 18 controllers.
- **Pending:** SOC 2 Type II certification (§3.7), ISO 27001 certification (§3.7), VAPT engagement (§3.12 + Annexure C), rotation of one Microsoft OAuth secret that was previously committed to version control.

Full log of security gaps and fixes is in `authservice/CLAUDE.md` under "Security Hardening Log" sections.

---

## 7. Annexure C acceptance criteria — current status

| # | Metric | Target | Status | Blocker |
|---|---|---|---|---|
| 1 | Average response time | ≤ 2 s on key modules | Unknown | Needs AUTH_BEARER-authenticated latency probes against production endpoints |
| 2 | System uptime | ≥ 99% rolling 30-day | Not met | Uptime monitoring board not deployed; cannot produce the number |
| 3 | Drafting turnaround | ↓ 70% vs. baseline | Not met | No kickoff baseline on file; benchmark contract set not defined |
| 4 | Filing resubmission rate | < 2% | Not met | Resubmission events not tracked as a distinct metric; rate not computable |
| 5 | Case-law retrieval | < 5 s | Unknown | Needs Prism running + authenticated probe |
| 6 | AI output accuracy | ≥ 98% | Not met | No labelled eval set exists; score per module not computable |
| 7 | Critical bugs | 0 open P0/P1 | Not confirmed | No shared bug-tracker inventory handy for a count |
| 8 | Concurrent users | ≥ 1000 (enterprise modules) | Not met | No load test on file |
| 9 | VAPT | Completed, findings closed | Not met | VAPT not engaged |
| 10 | Admin access handover | Client has credentials | Partial | GitHub organisation under `LexOriginIndia`; MongoDB Atlas / Railway / DNS not inventoried in writing |
| 11 | IP handover | Signed assignment + repos + model artefacts | Partial | Repos under `LexOriginIndia` org already; signed IP-assignment per Clause 7 not on file; no trained-model artefacts exist today |
| 12 | Documentation | Admin + user + API + playbook + KT | Not met | Internal engineering docs exist (`CLAUDE.md` series); client-facing admin / user manuals + API docs + deployment playbook + KT sessions not produced |

---

## 8. Path forward — three options per outstanding item

For each item not currently Done, there are three contractually-valid resolutions:

1. **Build.** We complete the item against the contract text before UAT.
2. **Waive.** The Client agrees in writing that the item is out of scope or defers it post-MVP. Each waiver amends the contract.
3. **Accept partial.** The Client agrees that the delivered state (code exists, output quality unverified / depth as-is) satisfies the acceptance criteria for that specific item.

We recommend scheduling a joint review session, item-by-item, to tag each of the 68 Partial and 23 Not Started features with one of these three resolutions. The readiness engine will then re-run after each change and show the client-visible scope coverage advancing in a measurable way.

---

## 9. Immediate recommended actions

**For the Client:**
1. Review this report and the attached detailed one (`readiness/reports/latest.md`), item-by-item.
2. Issue written positions on the three items in §5 (AWS vs Railway, SAP, custom models).
3. Agree a UAT date contingent on: VAPT engagement scheduled + eval set definition + uptime monitor deployed.

**For the Contractor:**
1. Deliver written walkthroughs covering each of the 68 Partial features so quality can be verified in a time-boxed UAT pass (checklist at `readiness/WALKTHROUGH-CHECKLIST.md`).
2. Commission a VAPT engagement.
3. Produce the client-facing documentation suite (admin guide, user manual, API documentation, deployment playbook).
4. Establish uptime monitoring + labelled AI eval set so Annexure C metrics become measurable.

---

## 10. Transparency note

This report is generated by `readiness/` — a repeatable automated engine. Every claim above traces to one of:

- A specific controller or service file (code evidence)
- A dated manual verdict in `readiness/manual-verdicts.yaml`
- A measured probe result in `readiness/reports/history/*.json`

Re-run the engine with `npm run readiness` from the project workspace. The Client is welcome to re-run it independently to verify every claim. The engine does not inflate; features marked Done pass automated checks + dated verdicts; features marked Partial have real code but unverified quality; features marked Not Started have no implementation in the codebase that targeted search was able to find.

The point of the engine is that this report cannot be softened for presentation. Any future status update produced through the same mechanism will be equally direct.

---

*Signed,*
Arjun Kumar
Contractor
5 October 2026
