# Mentor Guide to Validata

This is a plain-language walkthrough of every screen a **mentor** sees in Validata, what you can do on it, and — most importantly — **which actions cannot be undone**. Validata is an electronic data capture (EDC) system for clinical/research studies, so several actions are deliberately irreversible: that's not a bug, it's how the audit trail stays trustworthy. When in doubt, treat "Are you sure?" modals as real warnings.

Legend used throughout:
- ✓ **Reversible** — you can edit or undo it later.
- ✗ **Irreversible** — once done, it's permanent and/or logged forever in the audit trail. There is usually no "undo" button; fixing a mistake means creating a *new* correcting entry, not erasing the old one.

---

## 1. The screen frame: top bar, bottom bar, side panel

### Side panel (left sidebar)
This is your main navigation. It's grouped by purpose:

- **Study switcher** (top of sidebar) — a dropdown to change which study you're currently viewing. Every screen after this reflects whichever study is selected here. Switching studies is just a view change — completely safe, reversible, doesn't touch data.
- **Participants & Data** — Participant Registry, Data Collection, Results Table
- **Analysis & Results** — Study Overview, Analysis & Reporting
- **Query Management** — Queries
- **Compliance** — Audit Trail, Electronic Signatures, Consent Records, Adverse Events
- **Administration** (mentor/admin only) — Study Management, User Registry
- **Delegation** (mentor/admin/investigator) — Delegation Log
- **System** (mentor/admin only) — System Inventory

The **User Registry** link shows a small badge with the number of pending account requests waiting on you.

### Bottom status bar
Left to right:
- **Status indicator** — a small dot showing the app/session is connected.
- **Study name** — clickable if you're an admin/mentor; jumps you to Study Management.
- **Your email** — just identifies who's logged in.
- **Your role name** — clickable if you're an admin/mentor; jumps you to User Registry.
- **Lock indicator (🔐 Locked / 🔓 Unlocked)** — shows whether the current study's data entry is frozen. Clickable for admins/mentors, jumps to Study Management where the actual lock/unlock toggle lives.
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
- **Upload File (CSV import)** — bulk-creates measurements, one row = one insert. Each imported row becomes its own record and can be edited individually afterward, same as a manual entry — so the import itself is reversible in the sense that mistakes can be corrected row-by-row, but there's no single "undo this import" button that removes the whole batch at once.
- **Download Template** — just gives you the expected CSV format, no data effect.

### Results Table (`/results`)
- **Mark Invalid** ✗ — this is the closest thing Validata has to "deleting" a measurement, but it's actually a **soft-delete**: the record isn't erased, it's flagged `is_valid = false` and excluded from all statistics/analysis. A reason is required and gets written to the audit trail. There is no "mark valid again" button in the UI — once flagged invalid, it stays invalid on the record permanently (the historical fact that it was invalidated, when, and why is preserved forever, which is the point of an audit trail).

---

## 3. Analysis & Results

### Study Overview (`/study-overview`)
Read-only dashboard: recent audit events, open query count, current lock state. Nothing here can be changed; it just links you to Queries, Audit Log, and Study Management.

### Analysis & Reporting (`/analysis`)
- **Generate Report** ✓ — computes statistics (RMSE/MAE, Bland-Altman plots, pass rates) on the currently-valid measurements. You can regenerate this as often as you like; it doesn't change underlying data.
- **Endorse Analysis** ✗ — **this is a real electronic signature, and it is the most consequential button in the app.** Clicking it:
  1. Prompts you to re-enter your password (re-authentication, not just your existing session).
  2. Creates a one-time-use token that's immediately consumed once you sign.
  3. Writes a permanent record to the `signatures` table: your email, what you signed off on, what it means, and the UTC timestamp.
  4. **Cannot be edited or deleted afterward** — signatures are permanent by design; there's no route to change or remove one. An electronic signature has to mean what it says, forever.

  Only sign off on an analysis when you actually intend to endorse it as final — there's no "unsign."

---

## 4. Query Management (`/queries`)
Queries are the flagging/discussion mechanism for questionable data points. Status flows one direction: **Open → Answered → Resolved → Closed**.
- **Raise Query** ✓ — flags a specific data field as needing clarification.
- **Answer Query** ✓ — someone responds to the flag.
- **Resolve** ✓ — marks the discussion as settled.
- **Close** ✓ — final state.

All of these are individually reversible in the sense that you can keep editing/adding text before closing, but each status change is written to the audit trail, so the history of "who said what, when" is permanent even though the query's current status can keep moving forward.

---

## 5. Compliance screens

### Audit Trail (`/audit-log`)
Read-only, immutable log of every INSERT/UPDATE/DELETE/lock/sign-off action across the whole study, with who did it, when (UTC), and why (where a reason was required). You can filter and export, but you cannot alter it — that's the entire point of an audit trail.

### Electronic Signatures (`/signatures`)
Read-only register of every signature ever created (see "Endorse Analysis" above). You can only view and export this list — there is no edit or delete action anywhere in the UI or API for signatures.

### Consent Records (`/consent-records`) — how consent actually works here
This is the part worth explaining carefully, since it's easy to expect a "signature pad" and not find one. **Validata does not capture a drawn or cryptographic signature for participant consent.** Instead there are two separate, related things on this screen:

**A. Consent Form Versions** (the *document*, mentor/admin only)
- **+ New Form Version** ✗ — registers a version of the consent form itself: a version label, the IRB approval date, and a content hash (a fingerprint of the document text, so you can later prove which exact wording a participant agreed to). There is no delete option — once a version exists, it's part of the permanent protocol history.

**B. Consent Records** (the *event*, available to anyone with edit rights — investigators, site coordinators, data managers, admin, mentor)
- **+ New Record** ✗ — this is what actually represents "this participant gave consent." It captures:
  - which participant
  - which form version they consented to
  - the **method**: written / electronic / verbal-with-witness
  - whether a copy of the form was delivered to them (checkbox)
  - a witness name/email, if applicable
  - free-text notes
  - the timestamp (UTC) and who recorded it (you)

  In other words, the "signature" here is really an **attestation record**: it documents that consent happened, how, and who is vouching for it — not a captured signature image or biometric mark. Once recorded, there's no delete/edit endpoint; if a consent record was entered incorrectly, the fix is to add a note/new record explaining the correction, not to erase the original (same audit-trail logic as everything else in this app).

If your study actually needs a scanned/drawn signature or a cryptographic e-signature *from the participant*, that is not currently implemented — what exists is investigator/staff attestation that a consent conversation took place.

### Adverse Events (`/adverse-events`)
- **+ New Adverse Event** ✓ — logs an AE/SAE/SUSAR with severity, causality, expectedness, dates, description. Editable until formally submitted.
- **Mark as Submitted to Authority** — sets a submission timestamp for regulatory tracking. Treat this as effectively final: it's meant to reflect a real-world regulatory filing that has already happened, not something to toggle experimentally.

---

## 6. Administration (mentor/admin only)

### Study Management (`/study-management`)
- **Create Study** ✓
- **Update Recruitment Goal** ✓ — just a target number, freely editable.
- **Toggle Lock / Unlock** — freezes/unfreezes the study for further data entry. The state itself can be flipped back and forth, but every lock/unlock transition is written to the audit trail (so you can always see when and by whom the study was frozen).
- **Delete Study** ✗ — this is a **soft delete**, not a hard delete: the study record isn't erased, it's flagged `deleted_at` and moves into the "Deleted Studies — Retention" panel below, where it's kept for a minimum of 15 years before physical destruction can even be requested. All of the study's participants, measurements, and other records are preserved intact — nothing is dropped from the database and there is no cascading data loss. There is, however, no "undo" button in the UI: once deleted, a study stays in the retention panel and only leaves it via the separate, audited destruction-request workflow (mentor/admin only, requires the study to already be soft-deleted, unheld, and at least 15 years old). Treat it as "archive, not destroy" — but still not something to click casually, since it does remove the study from every normal working view immediately.

### User Registry (`/user-registry`)
- **Approve/Reject applicant accounts** — a new sign-up first appears inside the "Unconfirmed Sign-ups" modal (read-only) until they confirm their email; once confirmed it moves to the main page's actionable "Pending Approvals" queue. Approving sets their role to `team_member` and status to `active` in one step (they can then be assigned a real operational role separately); rejecting hard-deletes the account on the spot, same as if it had simply expired unreviewed. There is no undo on either action. See `ROLES_AND_REGISTRATION.md` for the full lifecycle.
- **Change role/status** — a direct edit on the person's profile, made right here with a mandatory reason field. This is not related to the Delegation Log below — delegation never changes anyone's actual role.
- **Suspend / Unsuspend** ✓ — toggles an already-approved account's status between `active` and `suspended`. Fully reversible, and doesn't touch anything else about the account.
- **Delete** — for an already-approved account, this is **not** the same hard delete as rejecting an applicant. It's a **soft delete**: the account's status is set to its own `deleted` value (a distinct state, not a repurposed "suspended"), with a `deleted_at` timestamp recording when. It then moves out of the main table into the **Deleted Archives** overlay (the button next to Export/Refresh, top right). Nothing is removed from the database.
- **Reactivate** ✓ — the button inside Deleted Archives. Restores a soft-deleted account to `active`, clears `deleted_at`, and puts it back in the main table exactly as it was — same role, same history. So an approved account's "Delete" is fully undoable via this, unlike an applicant reject/expiry, which is permanent.

---

## 7. Delegation (mentor/admin/investigator)

### Delegation Log (`/delegation-log`)
- **+ New Delegation** ✓ — assigns a task to someone for a date range: a permanent record of who was authorized to do what, and when. This is documentation only — it doesn't change anyone's actual role or permissions in the system.
- **Revoke Delegation** — only available for currently-active delegations; once a delegation's date range has already ended naturally, there's nothing to revoke (it's just historical record at that point).

---

## 8. System Inventory (`/system-inventory`)
Read-only. Lists the technical components behind the app (Next.js, Supabase, Vercel, Auth, Zod validation) for reference. Nothing to click, nothing to break.

---

## Quick reference: the irreversible actions list

If you only remember one section, remember this one — these are the actions with no "undo" in the UI:

1. **Drop Participant** — invalidates the participant and all their measurements.
2. **Mark Measurement Invalid** — soft-deletes a measurement permanently (excluded from analysis forever, flag can't be cleared in the UI).
3. **Endorse Analysis** — creates a permanent, re-authenticated electronic signature. No un-sign.
4. **New Consent Form Version** — permanent protocol document version, no delete.
5. **New Consent Record** — permanent attestation that consent occurred; no delete/edit, only new corrective records.
6. **Delete Study** — soft delete (moves to the Deleted Studies — Retention panel; all data preserved for a minimum of 15 years). Not reversible from the UI, but not destructive either — actual data destruction requires the separate, audited destruction-request workflow.
7. Every audit-trail-logged action (locks, role changes, status changes) is permanently visible in the Audit Trail even if the *current state* can be changed back — the history of it having happened cannot be erased.

When you're unsure whether something can be undone, assume it can't until you've verified otherwise — that's the safer default in a compliance-driven system like this one.
