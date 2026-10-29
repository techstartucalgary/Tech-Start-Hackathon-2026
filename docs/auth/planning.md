# Auth Planning

A plain-language summary of how users will sign in and what they'll be allowed to do, built with:

- Sign-in: email + password (hashed with bcrypt), or Continue with Google
- Staying signed in: server-side sessions in SQLite + an HttpOnly `sid` cookie
- Permissions: roles mapped to named permissions, checked by Express middleware

Each numbered section below matches the section with the same number in [ai-architecture-prompt.md](ai-architecture-prompt.md), which has the exact rules for AI tools and developers.

> **Status:** planned design, nothing is built yet.
>
> **Keep both files in sync.** If the plan changes, update **this file and ai-architecture-prompt.md in the same PR**, so AI tools never build from an outdated plan. If they ever disagree, ai-architecture-prompt.md wins until this file is fixed.

## Overview

This plan adds auth to the architecture described in the README **without changing its shape**. The frontend still talks to Express, and Express still talks to SQLite. Auth adds a few checkpoints (middleware) in the Express layer and a few tables in the database.

### High-level flow

```text
┌──────────────────────┐
│       Next.js        │
│   Frontend / UI      │
└──────────┬───────────┘
           │ HTTP requests + sid cookie
           ▼
┌──────────────────────┐
│       Express        │
│     Backend API      │
│                      │
│ authenticate         │  ← who are you?
│ requireAuth          │  ← must be signed in
│ authorizeGroupAction │  ← are you allowed?
│ Routes               │
│ Controllers          │
│ Services             │
│ Models               │
└──────────┬───────────┘
           │ SQL queries
           ▼
┌──────────────────────┐
│       SQLite         │
│      Database        │
└──────────────────────┘
```

---

## 0. Ground rules · [§0](ai-architecture-prompt.md#0-ground-rules)

- **Labels:**
  - **DECIDED:** follow it.
  - **DEFAULT:** follow it until the team decides otherwise.
  - **TODO:** not designed yet; it gets its own ticket.
- **Rejected approaches:** don't use JWTs, `localStorage` tokens, "allow everything" permissions, or `cors({ origin: true })`.
- **Identity:** the acting user always comes from the session, never from what the client sends.
- **Security:** the backend makes every decision. When in doubt, deny.

## 1. Decision log · [§1](ai-architecture-prompt.md#1-decision-log)

- **Sessions over JWTs:** sessions live in the database, and the browser holds a random token in an HttpOnly cookie. Signing out and role changes take effect immediately.
- **Expiry:** sessions expire after 7 days unused, or 30 days at most.
- **Same-origin calls:** the browser talks to the backend through a Next.js `/api` proxy. CORS uses an allowlist, plus an Origin check against CSRF.
- **Permissions, not roles:** the code checks permissions, so new roles can be added later without touching routes.
- **One staff role:** `organizer`. There's no separate admin role.
- **Staff overrides:** organizers act on other groups only through permissions ending in `:any`.
- **Agreed with the team:**
  - one group per user
  - registering and enrolling are separate steps
  - staff can compete
  - everyone signed in can see all groups
  - Google sign-in is in the first build
  - you join a group by requesting, and the group's lead approves

## 2. Vocabulary · [§2](ai-architecture-prompt.md#2-vocabulary)

| Term | Meaning |
|---|---|
| `user` | An account, and the default role. |
| Participant | A user who has enrolled. This is not a role. |
| `group` | A team. UI text can say "team"; code says "group". |
| Lead | Started the group (or was handed the role) and approves who joins. One per group. |
| Member | Someone who has been **accepted** into the group. |
| Requester | Someone who asked to join and is still waiting. Not a member yet. |
| Staff | Users with the `organizer` role. |
| Session / `sid` | The server's record of who's signed in, and the cookie that points to it. |
| Join request | A request to join a group: pending, approved, declined or cancelled. |

## 3. Invariants · [§3](ai-architecture-prompt.md#3-invariants)

Always true:

- **Groups:**
  - Every user has exactly one role.
  - A user is in at most one group, and only enrolled users can be in one.
  - Every group has exactly one lead.
  - Nobody joins a group unless their own request is approved (or they created it).
  - At most one pending request per group, and none once you're in a group.
- **Identity and access:**
  - The acting user comes from the session.
  - Passwords and tokens are never stored or logged in plain text.
  - Only an organizer can change someone's role.
- **Routes:**
  - Every route needs sign-in unless it's on the public list.
  - All permission checks happen in the backend.

## 4. Data model · [§4](ai-architecture-prompt.md#4-data-model-auth-level)

| Table | What auth needs from it |
|---|---|
| `users` | **Every person**, however they sign in: email, password hash (empty for Google-only accounts), role |
| `sessions` | Hashed token and expiry times |
| `oauth_accounts` | A Google login linked to a person in `users` (by Google's user id) |
| `hackathon_enrollments` | Whether the user is enrolled |
| `groups` | The group |
| `group_members` | Who's in which group, as lead or member |
| `group_join_requests` | Requesters and the status of their requests |

There's one `users` table rather than `email_users` + `google_users`, because one person can sign in both ways, and everything else (sessions, groups) points to one user.

The full schema is a TODO.

## 5. Register, sign in, sign out · [§5](ai-architecture-prompt.md#5-register-sign-in-sign-out)

| Endpoint | Does |
|---|---|
| `POST /api/auth/register` | Create an account (role `user`) and sign in |
| `POST /api/auth/login` | Sign in with email and password |
| `GET /api/auth/google` | Start "Continue with Google" |
| `GET /api/auth/google/callback` | Google sends the user back here; the backend checks it and signs them in |
| `POST /api/auth/logout` | Sign out (always succeeds) |
| `GET /api/auth/me` | The current user, or `null` |

- **Rate limit:** login is rate-limited.
- **Same error:** a wrong email and a wrong password get the same error.
- **Fresh session:** every sign-in creates a new session.
- **Google sign-in:**
  - **Who it is:** the backend talks to Google directly and identifies the account by Google's user id, not just the email.
  - **Existing accounts:** if the Google email is verified and matches an existing account, the two are linked instead of creating a duplicate.
  - **New accounts:** otherwise a new account is created, with no password.
  - **Same session:** either way, the user ends up with the same kind of session as an email sign-in.

## 6. Staying signed in · [§6](ai-architecture-prompt.md#6-identifying-users-and-maintaining-state)

This is the README's request lifecycle with the auth steps added (**bold**):

1. The browser loads the frontend page.
2. The frontend calls the backend, and the browser sends the `sid` cookie automatically.
3. The Express server receives the request.
4. **`authenticate` looks up the session and sets `req.user` (or `null`).**
5. `routes/*.js` match the URL.
6. **`requireAuth` rejects the request if nobody is signed in (401).**
7. **Permission middleware checks the user is allowed (403 if not).**
8. `controllers/*.js` handle the request and response.
9. `services/*.js` contain business logic.
10. `models/*.js` interact with the database.
11. SQLite returns or stores data.
12. The controller sends a JSON response back to the frontend.

The role is re-read from the database on every request, so changes apply right away.

## 7. Roles and permissions · [§7](ai-architecture-prompt.md#7-authorization-model)

- **Global roles:**
  - `user`: enroll, create a group or request to join one.
  - `organizer`: the same, plus viewing enrollments, moderating any group and changing roles. The first organizer is set up by a seed script.
- **Group roles:**
  - `lead`: edit, manage members (approve or decline requesters, remove members), hand the lead role to another member, delete, leave.
  - `member`: leave.
- **How checks work:** roles are bundles of named permissions, and one function, `can()`, makes every decision.

## 8. Who can do what · [§8](ai-architecture-prompt.md#8-authorization-rules)

| Action | Allowed for |
|---|---|
| Health, docs, register, sign in/out (including Google), `/me` | Everyone |
| View groups | Anyone signed in |
| Enroll | Anyone signed in |
| Create a group | Enrolled users not already in a group |
| Request to join a group | Enrolled users not already in a group (one pending request per group) |
| Approve or decline requesters | The group's lead, or an organizer |
| Modify, manage members, hand over the lead role, delete | The group's lead, or an organizer |
| Leave | Members. The lead must hand the lead role to a member first, unless they're the last member. |
| Change a user's role | Organizers (not their own) |

## 9. Group check flow · [§9](ai-architecture-prompt.md#9-group-authorization-flow)

```text
                    ┌──────────────────────────────┐
                    │    User is authenticated     │ : 401 if not
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │ User requests to modify      │ : 404 if the group
                    │ Group A                      │   doesn't exist
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │ Backend verifies User        │ : 403 if not a member
                    │ belongs to Group A           │   (organizers skip this)
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │ Backend verifies User has    │ : 403 if their role
                    │ permission to modify Group A │   doesn't allow it
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │    Allow / Reject request    │ : 400 bad input,
                    └──────────────────────────────┘   409 blocked by state
```

One middleware, `authorizeGroupAction`, does this for every action inside a group.

## 10. Errors · [§10](ai-architecture-prompt.md#10-handling-unauthorized-requests)

| Status | Meaning |
|---|---|
| 401 | Not signed in |
| 404 | Doesn't exist |
| 403 | Signed in, but not allowed |
| 400 | Bad input |
| 409 | Allowed, but blocked right now |

Every error has the shape `{ success: false, error: { code, message } }`. On the frontend, a 401 sends the user to sign in and a 403 shows a "no permission" message.

Rejections are also written to our existing logger (`backend/src/config/logger.js`) with the user, route and error `code`, so we can trace what was blocked and why.

## 11. Growing later · [§11](ai-architecture-prompt.md#11-supporting-more-roles-and-permissions)

- **New roles or permissions:** add them to one list. Routes don't change.
- **Other sign-in providers** (e.g. GitHub): same pattern as Google, with sessions unchanged.
- **Other ways to join** (e.g. invite links): can be added later, as long as nobody joins without their own action.

## 12. TODOs · [§12](ai-architecture-prompt.md#12-todos-outside-this-ticket)

These are left for their own tickets:

- join request details (messages, notifications, expiry)
- Google Cloud setup and choosing a library
- group capacity
- the full schema
- backend conventions
- the full error list
- rate-limit values
- frontend wiring
- a seed script for the first organizer
- implementation tickets
- the roster deadline

## 13. Open questions · [§13](ai-architecture-prompt.md#13-open-questions)

None right now. Both were answered on 2026-10-18:

- **Google sign-in in the first build?** Yes.
- **How do people join a group?** By requesting; the group's lead approves.

## Notes

- The README was written before this design and is left unchanged on purpose. Where they differ about auth, these docs are correct:
  - the README suggests JWT, but the design uses sessions (Google sign-in also ends in a session);
  - the README says CORS has "explicit options", but the code currently uses `origin: true`, which must be fixed.
