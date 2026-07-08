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
- **Status** — *where they are in the account lifecycle* (candidate, pending, active, suspended).
  This decides whether they can log in at all.

A user can be `role = investigator` and `status = active` (a normal working account), or
`role = team_member` and `status = candidate` (someone who just signed up and hasn't been reviewed
yet). Role and status change independently of each other.

---

## The 9 roles

| Role | What they're for |
|---|---|
| `admin` | Sits above mentor for account safety: same global access, plus the only role that can manage other mentor/admin accounts (so two mentors can't lock each other out or demote each other) |
| `mentor` | Highest operational authority — the professor/PI and developers |
| `investigator` | PI / sub-investigator; enters and corrects data, signs off, can delegate duties |
| `site_coordinator` | Site research coordinator; enters data |
| `data_manager` | Data entry, correction, and query resolution; cannot sign off |
| `monitor` | Read-only oversight, plus can raise/resolve data queries |
| `auditor` | Read-only access to the audit trail and signatures |
| `irb_reviewer` | Read-only access to consent records |
| `team_member` | The default role for a brand-new registration — minimal access until someone assigns a real role |

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

`team_member` isn't in any of these sets — it's a real, permanent role, just one with nothing
granted yet. Someone stays `team_member` until a mentor/admin assigns them something else.

---

## How registration actually works

1. **Sign-up** — a new user creates an account. A database trigger fires immediately and gives them
   `role = 'team_member'` and `status = 'candidate'`, plus a `candidate_expires_at` timestamp set to
   30 days out. Nobody chooses this — it's automatic and the same for everyone.
2. **Waiting for review** — while `status = 'candidate'`, the account can't get past the login
   screen into the dashboard. It shows up in the mentor/admin's **User Registry** with a pending-count
   badge.
3. **A mentor/admin reviews it**, and picks one of two outcomes:
   - **Approve** — sets `status = 'active'` (and typically assigns the person's real role at the
     same time, e.g. `investigator`). The account is now permanent, same as any other user.
   - **Reject** — immediately and permanently deletes the account. This isn't a soft-delete: it
     hard-deletes the underlying auth user (which cascades to the profile), the same effect as if
     the candidate had expired, just triggered manually.
4. **If nobody does anything** — a scheduled job runs once a day and deletes any candidate whose
   30-day window has passed. This is the same hard-delete as a manual reject, just automatic. It
   exists so an abandoned/unreviewed sign-up doesn't sit in the system forever.

So `candidate` is the only status with an expiry attached to it. Once an account is `active`, it
has no timer — it stays until someone deliberately changes or removes it.

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
