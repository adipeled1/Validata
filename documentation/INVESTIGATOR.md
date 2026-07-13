# Investigator Guide to Validata

This is a plain-language walkthrough of every screen an **investigator** sees in Validata, what you can do on it, and — most importantly — **which actions cannot be undone**. Validata is an electronic data capture (EDC) system for clinical/research studies, so several actions are deliberately irreversible: that's not a bug, it's how the audit trail stays trustworthy. When in doubt, treat "Are you sure?" modals as real warnings.

Legend used throughout:
- ✓ **Reversible** — you can edit or undo it later.
- ✗ **Irreversible** — once done, it's permanent and/or logged forever in the audit trail. There is usually no "undo" button; fixing a mistake means creating a *new* correcting entry, not erasing the old one.

As an investigator you have full data-entry and sign-off rights, and you can also manage delegations, but you won't see the **Administration** or **System** sections — study creation, locking, user approval, and system inventory are limited to mentors/admins.

---

## 1. The screen frame: top bar, bottom bar, side panel

### Side panel (left sidebar)
This is your main navigation, grouped by purpose:

- **Study switcher** (top of sidebar) — a dropdown to change which study you're currently viewing. Every screen after this reflects whichever study is selected here. Switching studies is just a view change — completely safe, reversible, doesn't touch data.
- **Participants & Data** — Participant Registry, Data Collection
- **Overview & Analysis** — Study Overview, Results Table, Analysis & Reporting
- **Query Management** — Queries
- **Compliance** — Audit Trail, Electronic Signatures, Consent Records, Adverse Events
- **Delegation** — Delegation Log

### Bottom status bar
Left to right:
- **Status indicator** — a small dot showing the app/session is connected.
- **Study name** — display only.
- **Your email** — identifies who's logged in.
- **Your role name** — display only.
- **Lock indicator (🔐 Locked / 🔓 Unlocked)** — shows whether the current study's data entry is frozen. Not clickable — only mentors/admins can lock or unlock a study.
- **Last sync time** — when data was last refreshed from the server, in UTC.
- **Study Log panel toggle** (shortcut `Ctrl+\``) — opens a side panel of recent activity/audit events without leaving your current screen.
- **Theme toggle** (sun/moon icon) — light/dark mode, purely cosmetic.
- **Logout** — signs you out. Reversible (just log back in), but note it ends your session immediately — finish saving any open forms first.

None of the top/bottom bar controls modify study data by themselves; they're navigation and display only.

---

## 2. Participants & Data

### Participant Registry (`/participants`)
- **Add Participant** ✓ — creates a new participant record. You can edit fields like age/gender/health status afterward.
- **Drop Participant** ✗ — this is a hard action: it invalidates the participant **and all of their measurements**. A modal forces you to enter a reason, and that reason is permanently logged. There is no "undo drop" button in the UI.
- **Toggle Completed** ✓ — flips a completion flag, freely reversible.
- **Export** — downloads a CSV; doesn't touch the underlying data at all.
- **Search/Filter** — view-only, no data risk.

### Data Collection (`/data-collection`)
- **Log Measurement** ✓ — manually enter a single measurement (goniometer angle, AI-estimated angle, notes, test date). Can be edited later from the Results screen.
- **Upload File (CSV import)** — bulk-creates measurements, one row = one insert. Each imported row becomes its own record and can be corrected individually afterward, but there's no single "undo this import" button that removes the whole batch at once.
- **Download Template** — just gives you the expected CSV format, no data effect.

---

## 3. Overview & Analysis

### Study Overview (`/study-overview`)
Read-only dashboard: recent activity, open query count, current lock state. Nothing here can be changed; it just links you to Queries and Audit Trail.

### Results Table (`/results`)
- **Mark Invalid** ✗ — the closest thing Validata has to "deleting" a measurement, but it's actually a **soft-delete**: the record isn't erased, it's flagged invalid and excluded from all statistics/analysis. A reason is required and gets written to the audit trail. There is no "mark valid again" button — once flagged invalid, it stays invalid on that record permanently.

### Analysis & Reporting (`/analysis`)
- **Generate Report** ✓ — computes statistics (RMSE/MAE, Bland-Altman plots, pass rates) on the currently-valid measurements. You can regenerate this as often as you like; it doesn't change underlying data.
- **Endorse Analysis** ✗ — **this is a real electronic signature, and it is the most consequential button available to you.** Clicking it:
  1. Prompts you to re-enter your password (re-authentication, not just your existing session).
  2. Creates a one-time-use token that's immediately consumed once you sign.
  3. Writes a permanent record: your email, what you signed off on, what it means, and the UTC timestamp.
  4. **Cannot be edited or deleted afterward.** An electronic signature has to mean what it says, forever.

  As an investigator, this is your formal sign-off on the analysis — only click it when you actually intend to endorse the data as final. There's no "unsign."

---

## 4. Query Management (`/queries`)
Queries are the flagging/discussion mechanism for questionable data points. Status flows one direction: **Open → Answered → Resolved → Closed**.
- **Raise Query** ✓ — flags a specific data field as needing clarification.
- **Answer Query** ✓ — respond to a flag someone else raised.
- **Resolve** ✓ — marks the discussion as settled.
- **Close** ✓ — final state.

All of these are individually reversible in the sense that you can keep editing/adding text before closing, but each status change is written to the audit trail, so the history of "who said what, when" is permanent even though the query's current status can keep moving forward.

---

## 5. Compliance screens

### Audit Trail (`/audit-log`)
You'll see this link in the sidebar, but the audit trail itself is restricted to mentors, admins, monitors, and auditors — opening it shows "You do not have access." This is expected, not an error.

### Electronic Signatures (`/signatures`)
Read-only register of every signature ever created (see "Endorse Analysis" above). You can view and export this list — there is no edit or delete action anywhere in the UI for signatures.

### Consent Records (`/consent-records`) — how consent actually works here
This is the part worth explaining carefully, since it's easy to expect a "signature pad" and not find one. **Validata does not capture a drawn or cryptographic signature for participant consent.** Instead there are two separate, related things on this screen:

**A. Consent Form Versions** (the *document*) — this part is mentor/admin only. You can view which form versions exist and their IRB approval dates, but you cannot create a new version yourself.

**B. Consent Records** (the *event*, available to you as an investigator)
- **+ New Record** ✗ — this is what actually represents "this participant gave consent." It captures:
  - which participant
  - which form version they consented to
  - the **method**: written / electronic / verbal-with-witness
  - whether a copy of the form was delivered to them (checkbox)
  - a witness name/email, if applicable
  - free-text notes
  - the timestamp (UTC) and who recorded it (you)

  In other words, the "signature" here is really an **attestation record**: it documents that consent happened, how, and who is vouching for it — not a captured signature image or biometric mark. Once recorded, there's no delete/edit option; if a consent record was entered incorrectly, the fix is to add a note or a new record explaining the correction, not to erase the original.

### Adverse Events (`/adverse-events`)
- **+ New Adverse Event** ✓ — logs an AE/SAE/SUSAR with severity, causality, expectedness, dates, description. Editable until formally submitted.
- **Mark as Submitted to Authority** — sets a submission timestamp for regulatory tracking. Treat this as effectively final: it's meant to reflect a real-world regulatory filing that has already happened, not something to toggle experimentally.

---

## 6. Delegation

### Delegation Log (`/delegation-log`)
As an investigator you can both view and create delegations — this is one of the few things you can do that site coordinators and data managers can't.
- **+ New Delegation** ✓ — records that you've authorized someone (e.g. a site coordinator) to carry out a specific task for a date range. It's a paper trail for accountability only — it does **not** change that person's role or grant them any new access in the system. If someone genuinely needs different permissions, that has to be done separately in User Registry by a mentor/admin.
- **Revoke Delegation** — only available while a delegation is still active; once its date range has already ended naturally, there's nothing to revoke.

---

## Quick reference: the irreversible actions list

If you only remember one section, remember this one — these are the actions with no "undo" in the UI:

1. **Drop Participant** — invalidates the participant and all their measurements.
2. **Mark Measurement Invalid** — soft-deletes a measurement permanently (excluded from analysis forever, flag can't be cleared in the UI).
3. **Endorse Analysis** — creates a permanent, re-authenticated electronic signature. No un-sign.
4. **New Consent Record** — permanent attestation that consent occurred; no delete/edit, only new corrective records.
5. Every audit-trail-logged action is permanently visible in the Audit Trail (even though you personally can't view that screen) — the history of it having happened cannot be erased.

When you're unsure whether something can be undone, assume it can't until you've verified otherwise — that's the safer default in a system like this one.
