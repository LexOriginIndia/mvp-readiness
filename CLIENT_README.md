# Lex Origin MVP — Readiness Tracker

**For the Client.** This repository is the always-current state of the
Platform relative to the signed Software Development & Confidentiality
Agreement dated 25 September 2025. Nothing in here is softened for
presentation.

## What to look at

- **[reports/latest.md](reports/latest.md)** — the current readiness report,
  regenerated automatically whenever an issue is closed, code lands on
  `main`, or on a daily schedule. Grouped by Annexure A sections. Shows
  Done / Partial / Not Started / Unknown counts and a per-feature table.
- **[Issues](../../issues)** — one open issue per feature that is not yet
  Done. Issue state drives the report: closing an issue flips the
  feature to Done on the next run. Labels: `status:*`, `section:*`,
  `priority:p0`, `acceptance-metric`.
- **[CLIENT_READINESS_REPORT_2026-10-05.md](CLIENT_READINESS_REPORT_2026-10-05.md)** —
  the formal readiness report dated 5 October 2026 (point-in-time
  snapshot; the live report at `reports/latest.md` supersedes it).

## How it stays current

```
         Client (or team) closes an issue in GitHub
                            ↓
    GitHub Action fires (on issue close), runs the readiness engine
                            ↓
       Engine checks the github_issue state via GitHub API
                            ↓
          Feature flips from Partial / Not Started → Done
                            ↓
    Action commits updated reports/latest.md back to the repo
                            ↓
            Everyone sees the new state in-repo
```

Any closed issue = that feature is Done, per Client acceptance.

## For the three contractually-valid resolutions

Each open issue offers three paths:

- **Build** — Contractor completes the work; Client closes the issue
  on acceptance
- **Waive** — Client comments "Waived — out of scope / deferred" and
  closes the issue. Documented in-thread.
- **Accept partial** — Client comments "Accepted as delivered" and
  closes the issue. Documented in-thread.

All three paths close the issue → feature flips to Done. The
difference is what's in the comment thread, which stays as the
contractual record.

## For a full-code audit

The GitHub Action only checks issue state + manual verdicts (it does
not have the other LexOrigin repos checked out). For the full
code-presence audit, the Contractor runs locally:

```bash
cd readiness
npm run readiness
```

Which inspects all repos under `C:/Lex Origin/` and refreshes the
report with real code evidence.

## Not displayed in this repo

Personal identifiers (PAN, Aadhaar, bank account, home address) from
the signed NDA/SDA are intentionally **omitted** from the public
`CONTRACT_REFERENCE.md` summary. The original signed document remains
in `Company Docs/Final NDA Arjun-Lex.docx` on the Contractor's local
workspace. Request a certified copy for any formal purpose.
