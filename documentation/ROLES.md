# Roles and User Registration

This explains how access control works in Validata: the role system, how a new user goes from
signing up to having real access, and how a few related concepts (account status, per-study
membership, delegation) fit together without overlapping each other.

For a screen-by-screen walkthrough see [`MENTOR.md`](MENTOR.md) or [`INVESTIGATOR.md`](INVESTIGATOR.md).
For the database tables behind all of this see [`SCHEMA.md`](SCHEMA.md).

---

## Two separate ideas: role and status

Every user has two independent fields on their profile, and it's easy to conflate them:

- **Role** — *what kind of user they are* (mentor, investigator, data manager, ...). This decides
  what buttons and pages they can use.
- **Status** — *where they are in the account lifecycle* (`wait_email_confirm`, `wait_approval`,
  `active`, `suspended`, `deleted`). This decides whether they can log in at all.

These aren't fully independent, though: `wait_email_confirm` and `wait_approval` are **exclusive to
the `applicant` role** — a database constraint (`profiles_applicant_status_exclusive`), not just an
application convention, guarantees a row can never be "half approved" (an operational role stuck in
a pending status, or an applicant marked active). Every non-applicant role is always `active`,
`suspended`, or `deleted` — and those three are genuinely distinct states, not two labels for the
same thing: `deleted` is its own status value, not "suspended plus a flag somewhere," so a mentor
(or the code) can always tell them apart just by reading `status`.

---

## The 10 roles

| Role | What they're for |
|---|---|
| `applicant` | A new registration, before it's reviewed. Fully blocked from the application — every read and write, via RLS and the API — and redirected to an onboarding screen instead of the dashboard. Only ever carries `wait_email_confirm` or `wait_approval` status; never operational. |
| `admin` | Sits above mentor for account safety: same global access, plus the only role that can manage other mentor/admin accounts (so two mentors can't lock each other out or demote each other) |
| `mentor` | Highest operational authority — the professor/PI and developers |
| `investigator` | PI / sub-investigator; enters and corrects data, signs off, can delegate duties |
| `site_coordinator` | Site research coordinator; enters data |
| `data_manager` | Data entry, correction, and query resolution; cannot sign off |
| `monitor` | Read-only oversight, plus can raise/resolve data queries |
| `auditor` | Read-only access to the audit trail and signatures |
| `irb_reviewer` | Read-only access to consent records |
| `team_member` | What an approved applicant becomes automatically — a real, permanent, `active` account that can log in and see the app shell, but has no operational access yet. Stays this way until a mentor/admin assigns a real role. |

Every permission check in the app (both the UI and the database) is built from a small number of
named sets rather than checking role names one-by-one, so the two layers can't quietly drift apart:

| Set | Roles | Grants |
|---|---|---|
| `ADMIN_ROLES` | admin, mentor | Study lock/unlock, user approval, system inventory |
| `EDIT_ROLES` | admin, mentor, investigator, site_coordinator, data_manager | Create/edit participants and measurements |
| `OVERSIGHT_ROLES` | monitor, auditor, irb_reviewer | Read-only oversight |
| `READABLE_ROLES` | `EDIT_ROLES` + `OVERSIGHT_ROLES` | View study data and compliance screens |
| `SIGNING_ROLES` | admin, mentor, investigator | Electronic sign-off |
| `DELEGATION_ROLES` | admin, mentor, investigator | Create/revoke delegation records |
| `QUERY_MUTATE_ROLES` | admin, mentor, investigator, data_manager, monitor | Answer/resolve/close queries |

Neither `applicant` nor `team_member` is in any of these sets. `applicant` is blocked from
everything by role alone (RLS and API routes reject it outright, independent of status). `team_member`
is a real, permanent role, just one with nothing granted yet — the Participants/Analysis/Queries
sidebar sections are hidden for a `team_member` (their underlying data is always empty for a role
outside `READABLE_ROLES`), and Study Overview — the one screen with no role-gated data, so it's
also the app's default landing page — shows a note explaining that a mentor needs to assign a role.
Someone stays `team_member` until a mentor/admin assigns them something else.

---

## How registration actually works

1. **Sign-up** — a new user creates an account. A database trigger fires immediately and gives them
   `role = 'applicant'` and `status = 'wait_email_confirm'`, plus a `candidate_expires_at` timestamp
   set to 30 days out. Nobody chooses this — it's automatic and the same for everyone. While
   unconfirmed, the account is fully blocked and shows up in **User Registry** only as an
   informational, non-actionable "Unconfirmed Sign-ups" entry.
2. **Email confirmation** — once the applicant confirms their email address, a second trigger
   advances them to `status = 'wait_approval'` and **resets the 30-day expiry**, so the mentor gets
   a fresh window to review from the moment there's actually something to review. This is when the
   account first appears in the **Pending Approvals** queue with an actionable approve/reject pair
   of buttons, and in the sidebar's pending-count badge.
3. **A mentor/admin reviews it**, and picks one of two outcomes:
   - **Approve** — sets `role = 'team_member'` and `status = 'active'` **together, in one change**
     (the DB constraint above rejects setting only one of the two). A mentor/admin can then assign
     the person's real operational role separately, whenever they're ready to. The account is now
     permanent, same as any other ever-approved user — kept forever, soft-delete only.
   - **Reject** — immediately and permanently deletes the account. This isn't a soft-delete: it
     hard-deletes the underlying auth user (which cascades to the profile), the same effect as if
     the applicant had expired, just triggered manually. Available at either applicant stage
     (unconfirmed or awaiting approval).
4. **If nobody does anything** — a scheduled job runs once a day and deletes any applicant (in
   either status) whose 30-day window has passed. This is the same hard-delete as a manual reject,
   just automatic. It exists so an abandoned/unreviewed sign-up doesn't sit in the system forever.

So the applicant statuses are the only ones with an expiry attached. Once an account is `active`
(i.e. `role <> 'applicant'`), it has no timer — it stays until someone deliberately changes or
removes it, and removal from that point on is always a soft-delete: **never-approved accounts are
hard-deleted; ever-approved accounts are retained permanently.**

---

## Suspending vs. deleting an already-approved account

Once someone is past onboarding (`role <> 'applicant'`), `status` can be `active`, `suspended`, or
`deleted` — three genuinely distinct states, each its own value in the `status` column. `deleted` is
**not** "suspended plus a flag" — it's the authoritative signal on its own, so nothing needs to
cross-reference another column to tell a deleted account apart from a merely-suspended one.
**User Registry** has three related actions built on this:

- **Suspend / Unsuspend** — toggles `status` between `active` and `suspended` only. The account
  stays visible in the main table the whole time, just tagged `suspended`.
- **Delete** (the trash-can action) — for an already-approved account this is **always a
  soft-delete**, never the hard delete that applies to rejecting/expiring an *applicant*. It sets
  `status = 'deleted'`, plus a `deleted_at` timestamp recording *when* (an audit detail, not the
  thing that makes it deleted). The row is never removed from the database. It disappears from the
  main table and instead shows up in the **Deleted Archives** overlay (the button next to
  Export/Refresh at the top of User Registry), which lists every `status = 'deleted'` account.
- **Reactivate** — the button inside Deleted Archives. Sets `status = 'active'` and clears
  `deleted_at` back to `NULL`, restoring the account to the main table exactly as it was before
  deletion (same role, same history).

So "Delete" on a real account is fully reversible via Reactivate — it behaves nothing like an
applicant reject/expiry, which is a genuine, permanent hard delete of the row.

---

## Per-study access (separate from role)

Having a role doesn't automatically mean you can see every study. `mentor` and `admin` are global —
they can access any study. Every other role must additionally be added as a member of a specific
study (via **Study Management**) before they can read or write its data. This is what lets one
investigator be scoped to Study A while another is scoped to Study B, even though they hold the
same role.

A study member's row also stores a snapshot of what their role was *at the moment they were added*
to that study. That snapshot never updates afterward — it's historical context only. Anything about
what a person is currently allowed to do always comes from their live role, never from that
snapshot.

---

## Delegation is not a role change

The **Delegation Log** looks related to roles, but it does not grant any access. Creating a
delegation entry just writes down, in free text, "this person is authorized
to do this task, from this date to that date" — a paper trail for accountability. Nothing in the
app checks the delegation table before letting someone do something; what a person can actually do
is governed entirely by their role, as described above. If you want someone to actually gain data-entry
or sign-off rights, that requires changing their role in **User Registry** — delegating a duty to
them does not do this on its own.
