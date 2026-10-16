# Auth Spec: Authentication & Authorization

*The authentication and authorization architecture for the hackathon app. For the plain-language version, read [overview.md](overview.md).*

| | |
|---|---|
| **Status** | Proposed. **Nothing in this file is implemented yet.** Every file, table, endpoint and middleware named here is planned. Check the code before importing anything. |
| **Version** | 3.0 (see [Changelog](#14-changelog)) |
| **Authority** | This file is the source of truth for auth. If [overview.md](overview.md) or any other doc disagrees, this file wins. |
| **Scope** | Covers the acceptance criteria of the *Plan Authentication & Authorization Architecture* ticket. Anything beyond that is listed as a **TODO** in [§12](#12-todos-outside-this-ticket). |

## Overview

This spec adds authentication and authorization to the architecture in the README (Next.js → Express → SQLite, with routes → controllers → services → models). It **doesn't change that architecture**. It adds middleware in the Express layer and a few tables in SQLite.

### High-level flow

```text
┌──────────────────────┐
│       Next.js        │
│   Frontend / UI      │
└──────────┬───────────┘
           │ HTTP requests + sid cookie
           │ (through the Next.js /api proxy)
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
│                      │
│ users                │
│ sessions             │
│ hackathon_enrollments│
│ groups               │
│ group_members        │
└──────────────────────┘
```

### Where this spec differs from the README

The README predates this design and is intentionally left unchanged. Where they differ about auth, **this spec is correct**:

| README says | This spec says | Ref |
|---|---|---|
| Add "User authentication (e.g., JWT, OAuth)" | **Server-side sessions with an HttpOnly cookie.** JWT is rejected. OAuth can be added later on top of sessions. | D-03, §11 |
| The backend uses "`cors` with explicit options" | The code currently uses `origin: true`, which must become an allowlist before auth ships. | D-08 |
| "Authentication / Authorization" sits inside the Express box | Matches: auth is Express middleware. | §7, §9 |

## Contents

- [Overview](#overview)

0. [Ground rules](#0-ground-rules)
1. [Decision log](#1-decision-log)
2. [Vocabulary](#2-vocabulary)
3. [Invariants](#3-invariants)
4. [Data model (auth level)](#4-data-model-auth-level)
5. [Register, sign in, sign out](#5-register-sign-in-sign-out)
6. [Identifying users and maintaining state](#6-identifying-users-and-maintaining-state)
7. [Authorization model](#7-authorization-model)
8. [Authorization rules](#8-authorization-rules)
9. [Group authorization flow](#9-group-authorization-flow)
10. [Handling unauthorized requests](#10-handling-unauthorized-requests)
11. [Supporting more roles and permissions](#11-supporting-more-roles-and-permissions)
12. [TODOs outside this ticket](#12-todos-outside-this-ticket)
13. [Open questions](#13-open-questions)
14. [Changelog](#14-changelog)

---

## 0. Ground rules

**Status labels** used in this file:

- **DECIDED:** follow it. Changing it needs a PR that edits this file first.
- **DEFAULT:** follow it until the team decides otherwise (see §13).
- **TODO:** deliberately not designed here. Don't invent a design for it; it gets its own ticket (§12).

**Rules for anyone (or any AI tool) building on this:**

1. **Don't silently contradict a DECIDED item.** Common examples that come up in generic tutorials but are rejected here: JWTs, tokens in `localStorage`, wildcard (`'*'`) permissions, `cors({ origin: true })`.
2. **Use the exact names in this file** for roles, permissions, middleware and tables.
3. **The acting user always comes from the session** (`req.user.id`), never from the request body, query or params.
4. **The backend is the only security boundary.** Hiding a button in the UI is a convenience, not a check.
5. **When in doubt, deny.** Unknown roles, unknown permissions and unlisted routes are rejected by default.

---

## 1. Decision log

| ID | Decision | Status | Why |
|---|---|---|---|
| D-01 | Users sign in with **email + password**. | DEFAULT | Fastest to build. The Figma also shows *Continue with Google*, which is open (§13 Q1) and fits on top of sessions (§11). |
| D-02 | Passwords are hashed with **bcrypt** (cost 12) and must be **8–72 bytes**. | DECIDED | bcrypt ignores bytes past 72, so longer input is rejected instead of silently truncated. |
| D-03 | Auth state lives in **server-side sessions** stored in the database. | DECIDED | Signing out and role changes take effect immediately. **Rejected: JWT**, which can't be revoked early and goes stale when roles change. |
| D-04 | The session token is 32 random bytes. The database stores only **its SHA-256 hash**. | DECIDED | A leaked database doesn't give anyone working sessions. No signing secret is needed. |
| D-05 | The token lives in a cookie named `sid`: `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production. | DECIDED | Page JavaScript can't read it, which limits XSS damage. **Rejected: tokens in `localStorage` or `Authorization` headers from the browser.** |
| D-06 | Sessions expire after **7 days without use** (renewed while active) and after **30 days** regardless. | DECIDED | Users stay signed in through the event, but a stolen token can't live forever. |
| D-07 | The browser reaches the backend through a **Next.js `/api` rewrite**, so it only talks to one origin. | DECIDED | Keeps the cookie first-party in every environment. |
| D-08 | CORS uses an **explicit allowlist** of origins from config. The current `origin: true` is removed. | DECIDED | `origin: true` plus credentials would let any website make signed-in requests. |
| D-09 | CSRF protection: `SameSite=Lax`, **plus** rejecting state-changing requests whose `Origin` isn't on the allowlist. | DECIDED | Two layers, with no CSRF tokens to manage. |
| D-10 | Authorization is **permission-based**. Routes ask for a permission (e.g. `group:update`), never a role. Roles are bundles of permissions defined in one place. | DECIDED | New roles can be added without touching routes. |
| D-11 | **No wildcard permissions.** Every role's permissions are listed explicitly. | DECIDED | A wildcard silently grants every future permission. |
| D-12 | Global roles are `user`, `organizer`, `admin`. "Participant" is **not** a role; it means the user has enrolled. | DECIDED | Keeps "what you're allowed to do" separate from "what you signed up for". |
| D-13 | All group actions are authorized by **one middleware**, `authorizeGroupAction(permission)`, which follows the ticket's flow (§9). | DECIDED | One implementation, so the checks can't drift apart. |
| D-14 | Staff act on groups they're not in **only** through permissions ending in `:any` (e.g. `group:update:any`). | DECIDED | Staff overrides are explicit and easy to audit. |
| D-15 | Checks run in a fixed order: **401 → 404 → 403 → 400 → 409** (§10.1). | DECIDED | Predictable responses. Signed-out callers learn nothing else. |
| D-16 | Every error uses one shape: `{ success: false, error: { code, message } }`. | DECIDED | The frontend branches on `code`, never on message text. |
| D-17 | `GET /api/auth/me` is public. It returns `{ user: null }` when signed out. | DECIDED | The frontend can check sign-in state without a 401 triggering redirects. |
| D-18 | A user can be in **at most one group**. | DECIDED | Agreed by the team 2026-10-16. |
| D-19 | Registering and enrolling in the hackathon are **separate steps**. | DECIDED | Agreed by the team 2026-10-16. |
| D-20 | **Staff can compete.** Organizers and admins can enroll and be in groups. Their `:any` overrides still apply. | DECIDED | Agreed by the team 2026-10-16. |
| D-21 | All signed-in users can see every group and its members. | DECIDED | Agreed by the team 2026-10-16. This is why a missing group returns 404 before the membership check. |

---

## 2. Vocabulary

| Term | Meaning | Don't use |
|---|---|---|
| `user` | An account (table `users`). Also the default role. | account, profile |
| Role | `users.role`: one of `user`, `organizer`, `admin` | `isAdmin`, participant (as a role) |
| Participant | A user with an active enrollment | — |
| `group` | A team (tables `groups`, `group_members`). UI text may say "team". | `team` in code, API or DB |
| Group role | `group_members.role`: `owner` or `member`. The UI shows the owner as "Lead". | leader, captain |
| Session / `sid` | The server's record of a sign-in, and the cookie that points to it | JWT, token table |
| Permission | A string like `group:update`, or `group:update:any` for staff overrides | `canEdit`-style booleans |
| `req.user` | The acting user, set from the session | `req.body.userId` |
| `req.group` / `req.membership` | The target group, and the acting user's row in it (`null` if not a member) | — |

---

## 3. Invariants

These must be true after every request.

| ID | Rule |
|---|---|
| INV-01 | Every user has exactly one role from §7.1. |
| INV-02 | A user is in at most one group (D-18). |
| INV-03 | Only enrolled users can be group members. |
| INV-04 | Every group has exactly one `owner`. |
| INV-05 | The acting user always comes from the session. |
| INV-06 | Passwords and session tokens are never stored, logged or returned in plain text. |
| INV-07 | A user's role is only changed by someone holding `user:role:update`, never through registration or profile input. |
| INV-08 | Every route requires sign-in unless it's on the public list (§8.1). |
| INV-09 | Every authorization decision is made in the backend. |

---

## 4. Data model (auth level)

Only the tables and columns auth depends on. **TODO:** full schema and migrations (§12).

| Table | Columns auth relies on |
|---|---|
| `users` | `id`, `email` (unique, case-insensitive), `password_hash`, `display_name`, `role` (`user` / `organizer` / `admin`, default `user`) |
| `sessions` | `id`, `user_id`, `token_hash` (unique), `expires_at` (sliding), `absolute_expires_at` (fixed) |
| `hackathon_enrollments` | `user_id`, `status` (`active` / `withdrawn`) |
| `groups` | `id`, `name` |
| `group_members` | `group_id`, `user_id`, `role` (`owner` / `member`). One row per user (INV-02), one owner per group (INV-04). |

- Ownership lives **only** in `group_members.role`. Never infer it from who created the group.
- All tables are created through migrations, never by hand.

---

## 5. Register, sign in, sign out

| Endpoint | Public? | Does |
|---|---|---|
| `POST /api/auth/register` `{ email, password, displayName }` | Yes | Creates the account with role `user`, then signs in. |
| `POST /api/auth/login` `{ email, password }` | Yes | Checks the password and creates a new session. |
| `POST /api/auth/logout` | Yes | Deletes the current session and clears the cookie. Always succeeds. |
| `GET /api/auth/me` | Yes (D-17) | Returns the current user, or `null`. |

**Register:**

- Validate the input (email format, password 8–72 bytes, display name 1–50 characters).
- Ignore any `role` field (INV-07).
- Reject an email that's already registered.
- Hash the password, create the user, then create a session.

**Sign in:**

- Rate-limited (**TODO:** exact limits, §12).
- Unknown email and wrong password return the **same** error, `401 INVALID_CREDENTIALS`, and take about the same time, so nobody can discover which emails have accounts.
- Every successful sign-in creates a **new** session. Any session cookie the request already carried is deleted, which prevents session fixation.

**Sign out:**

- Delete the session row and clear the cookie.

**API responses** never include `password_hash`, session rows or token hashes.

---

## 6. Identifying users and maintaining state

HTTP doesn't remember anything between requests, so the `sid` cookie ties them together:

1. Sign-in creates a `sessions` row and sets `sid` to the raw token.
2. The browser sends `sid` with every request automatically. The frontend uses `credentials: 'include'`, and the `/api` proxy makes it same-origin anyway (D-07).
3. On every request, the global `authenticate` middleware:
   - hashes the cookie value,
   - finds a session that hasn't hit either expiry,
   - joins the current `users` row, and
   - sets `req.user = { id, email, displayName, role }`.

   If there's no valid session, `req.user = null`. `authenticate` **never rejects** a request. It only identifies the user.
4. Activity renews the 7-day expiry, capped at the 30-day limit (D-06).
5. The role is read fresh on every request, so role changes apply immediately (D-03).

---

## 7. Authorization model

### 7.1 Roles

**Global roles** (`users.role`):

| Role | Can |
|---|---|
| `user` | Enroll; create or join a group; act in their own group according to their group role. |
| `organizer` | Everything a `user` can (D-20), plus viewing all enrollments and moderating any group through `:any` permissions. |
| `admin` | Everything an `organizer` can, plus changing users' roles. |

**Group roles** (`group_members.role`), which apply **only inside that group**:

| Role | Can |
|---|---|
| `owner` | Edit the group, manage members, transfer ownership, delete the group, leave. |
| `member` | Leave. |

### 7.2 Permissions

Permission names follow `<resource>:<action>`. They come in three kinds:

- **Global:** doesn't need a group.
- **Group-scoped:** about one specific group, and granted **only** by a group role.
- **Override:** `<permission>:any`, a staff version of a group-scoped permission that works on any group. Granted only by a global role.

| Permission | Kind | Granted to |
|---|---|---|
| `hackathon:enroll` | global | `user`, `organizer`, `admin` (enroll and withdraw) |
| `group:view` | global | `user`, `organizer`, `admin` |
| `group:create` | global | `user`, `organizer`, `admin` |
| `group:join` | global | `user`, `organizer`, `admin` |
| `group:update` | group-scoped | `owner` |
| `group:members:manage` | group-scoped | `owner` |
| `group:transfer` | group-scoped | `owner` |
| `group:delete` | group-scoped | `owner` |
| `group:leave` | group-scoped | `owner`, `member` (no `:any` version) |
| `group:update:any` | override | `organizer`, `admin` |
| `group:members:manage:any` | override | `organizer`, `admin` |
| `group:transfer:any` | override | `organizer`, `admin` |
| `group:delete:any` | override | `organizer`, `admin` |
| `enrollment:view:any` | global | `organizer`, `admin` |
| `user:role:update` | global | `admin` |

**Rules for the role → permission lists** (checked when the server starts):

1. Global roles may hold only global permissions and `:any` overrides, never a bare group-scoped permission. Otherwise one role could edit *every* group without any trace of an override.
2. Group roles may hold only group-scoped permissions.
3. Every permission must appear in the table above.

`group:members:manage` covers everything the ticket calls "managing group members" (approving people, inviting people, removing members). **TODO:** split it into finer permissions once the group-joining design exists (§12).

### 7.3 `can()`, the single policy function

Every permission decision goes through one function:

```js
function can(user, permission, membership = null) {
  if (!user) return false;
  const globalPerms = GLOBAL_ROLE_PERMISSIONS[user.role] ?? [];     // unknown role → nothing
  if (!GROUP_SCOPED.has(permission)) return globalPerms.includes(permission);
  if (globalPerms.includes(`${permission}:any`)) return true;       // staff override (D-14)
  if (!membership) return false;                                   // not in this group
  return (GROUP_ROLE_PERMISSIONS[membership.role] ?? []).includes(permission);
}
```

`membership` must be the acting user's row in **the target group**, never a different group.

### 7.4 Middleware

| Middleware | Checks | Fails with |
|---|---|---|
| `authenticate` | Global. Cookie → `req.user` (or `null`). | Never fails. |
| `requireAuth` | Applied to every non-public **router**: `req.user` must exist. | `401` |
| `requirePermission(p)` | Global permissions only: `can(req.user, p)`. | `403` |
| `requireEnrollment` | The acting user has an active enrollment. | `403` |
| `authorizeGroupAction(p)` | Group-scoped permissions only. Runs the flow in §9 and sets `req.group` and `req.membership`. | `404` / `403` |

---

## 8. Authorization rules

### 8.1 Public routes (the complete list)

`GET /api`, `GET /api/health`, `/swagger-ui`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

**Everything else requires a signed-in user.** A new public route must be added to this list in the same PR.

### 8.2 Who can do what

"Owner" and "member" refer to the target group. The staff columns describe staff who aren't in that group. Staff who are in a group also get their group role's permissions (D-20).

| Action (from the ticket) | Permission | Not in group | Member | Owner | Organizer | Admin |
|---|---|---|---|---|---|---|
| Enroll in the hackathon | `hackathon:enroll` | ✅ | — already enrolled | — already enrolled | ✅ | ✅ |
| Create a group | `group:create` + enrolled | ✅ if not in a group | ❌ already in one | ❌ already in one | ✅ if enrolled, not in a group | ✅ if enrolled, not in a group |
| Join a group | `group:join` + enrolled | ✅ if not in a group (**TODO:** how joining works, §12) | ❌ already in one | ❌ already in one | ✅ if enrolled, not in a group | ✅ if enrolled, not in a group |
| Modify a group | `group:update` | ❌ 403 not a member | ❌ 403 | ✅ | ✅ | ✅ |
| Leave a group | `group:leave` | ❌ 403 not a member | ✅ | ✅ after transferring ownership, or if last member | ❌ 403 not a member | ❌ 403 not a member |
| Manage group members | `group:members:manage` | ❌ 403 not a member | ❌ 403 | ✅ | ✅ | ✅ |
| Transfer ownership | `group:transfer` | ❌ 403 not a member | ❌ 403 | ✅ | ✅ | ✅ |
| Delete a group | `group:delete` | ❌ 403 not a member | ❌ 403 | ✅ | ✅ | ✅ |
| View groups | `group:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all enrollments | `enrollment:view:any` | ❌ | ❌ | ❌ | ✅ | ✅ |
| Change a user's role | `user:role:update` | ❌ | ❌ | ❌ | ❌ | ✅ (not their own) |

### 8.3 Rules checked after authorization

Authorization answers "may this user try this?". A few rules depend on the current data and are checked by services afterwards. They're listed because they protect the invariants:

- **One group per user (INV-02).** Creating or joining while already in a group fails with `409`.
- **Enrollment (INV-03).** Withdrawing while in a group fails with `409`; leave the group first.
- **One owner (INV-04).**
  - The owner can't leave while other members remain; they transfer ownership first.
  - If the owner is the last member, leaving deletes the group.
  - The owner can't be removed from their own group.
- **Own role.** Admins can't change their own role, so the last admin can't lock themselves out.

**TODO:** the full rule list for group features (§12).

---

## 9. Group authorization flow

Every action **inside** a group (modify, manage members, transfer, leave, delete) follows the ticket's flow. It's implemented once, in `authorizeGroupAction(permission)`:

```text
                    ┌──────────────────────────────┐
                    │    User is authenticated     │ : requireAuth
                    └──────────────┬───────────────┘   → 401 if not signed in
                                   ↓
                    ┌──────────────────────────────┐
                    │ User requests to modify      │ : load group :groupId
                    │ Group A                      │   → 404 if it doesn't exist
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │ Backend verifies User        │ : req.membership exists?
                    │ belongs to Group A           │   → 403 NOT_GROUP_MEMBER
                    └──────────────┬───────────────┘   (staff with :any skip this)
                                   ↓
                    ┌──────────────────────────────┐
                    │ Backend verifies User has    │ : can(user, permission,
                    │ permission to modify Group A │   membership) → 403 FORBIDDEN
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │    Allow / Reject request    │ : validate input → 400
                    └──────────────────────────────┘   service rules (§8.3) → 409
```

Example wiring:

```js
router.use(requireAuth);                                // INV-08: router level
router.patch('/:groupId',
  authorizeGroupAction('group:update'),
  groupController.update);
```

Actions from **outside** a group (create, join) can't use this flow, because the user isn't a member yet. They use `requirePermission` + `requireEnrollment` instead.

---

## 10. Handling unauthorized requests

### 10.1 Status codes, in check order (D-15)

| Order | Status | Meaning | Example `code` |
|---|---|---|---|
| 1 | `401` | Not signed in, session expired, or wrong credentials at login | `AUTH_REQUIRED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS` |
| 2 | `404` | The target doesn't exist | `GROUP_NOT_FOUND` |
| 3 | `403` | Signed in, but not allowed | `NOT_GROUP_MEMBER`, `FORBIDDEN`, `NOT_ENROLLED`, `CSRF_ORIGIN_REJECTED` |
| 4 | `400` | Invalid input | `VALIDATION_ERROR` |
| 5 | `409` | Allowed, but blocked by the current state | `ALREADY_IN_GROUP`, `OWNER_MUST_TRANSFER` |
| — | `429` | Too many attempts | `RATE_LIMITED` |
| — | `500` | Unexpected error, no details exposed | `INTERNAL_ERROR` |

The 404 can come before the 403 because groups are visible to every signed-in user (D-21). If groups ever become private, non-members should get 404 instead, so group existence isn't leaked.

**TODO:** the complete error-code list (§12).

### 10.2 Response shape (D-16)

```json
{ "success": false, "error": { "code": "NOT_GROUP_MEMBER", "message": "You must be a member of this group to do that." } }
```

### 10.3 How the backend handles them

- **Where errors come from:** middleware and services throw a typed error (status + code). The central error handler in `app.js` is the only place that writes error responses.
- **Unknown errors** become `500 INTERNAL_ERROR`. The details are logged, never returned.
- **Logging:** `401` and `403` are logged at `warn` with user id, route and code. Passwords, cookies and tokens are never logged.
- **Frontend:** a `401` sends the user to the sign-in page, and a `403` shows a "no permission" message.

---

## 11. Supporting more roles and permissions

The design grows without rewriting routes:

| Need | How |
|---|---|
| New global role (e.g. `judge`) | Add it to the allowed `users.role` values and give it a permission list. Routes don't change. |
| New permission (e.g. `submission:score`) | Add it to §7.2, grant it to roles, and protect the route with `requirePermission` or `authorizeGroupAction`. |
| New group role (e.g. `co_owner`) | Add it to `group_members.role` and give it a permission list. Revisit INV-04. |
| Roles editable without a deploy | Move the permission lists into database tables. Only `can()`'s data source changes. |
| Google sign-in / OAuth | Add a `user_identities` table and make `password_hash` optional. After the provider callback, create a session exactly as in §5, so everything downstream stays the same. |

---

## 12. TODOs outside this ticket

These came up during design but aren't part of this ticket's acceptance criteria. Each should get its own ticket.

| TODO | Notes to carry forward |
|---|---|
| **How joining a group works** | The Figma shows three group types (Open group / Request to join / Invite only), an invite link/code, and "Invite member". The design should keep consent: nobody ends up in a group without their own action. Invite codes need enough randomness (the mock's `PRAIRIE-5X8` has only three random characters, which is guessable). This will likely split `group:members:manage` into finer permissions. |
| **Group capacity** | The Figma shows a 3–6 "Team capacity" picker. |
| **Full database schema and migrations** | Expand §4 into real tables and migrations. |
| **Backend conventions** | Async error handling in Express 4; transactions on the single shared SQLite connection; one timestamp format; a validation library; enabling SQLite foreign keys. |
| **Complete error-code list** | Expand §10.1 as the features are built. |
| **Rate-limit values** | Exact limits for login, register and any code-based joining. |
| **Frontend auth wiring** | The fetch helper, the auth context, connecting the login/register card, and the `/api` rewrite config. |
| **Implementation tickets** | Break the build into tickets (sessions → permissions → enrollment → groups → frontend → tests). |
| **Roster deadline** | The Figma shows a "Confirm team roster" deadline, and invite links that expire at it. |

---

## 13. Open questions

| # | Question | Current default |
|---|---|---|
| Q1 | The Figma shows **Continue with Google**. Is it in the first build? | Email + password only (D-01). Google fits on top later (§11). |
| Q2 | Which joining options from the Figma are in the first build? | Undecided. Tracked in §12. |

---

## 14. Changelog

| Version | Date | Change |
|---|---|---|
| 3.0 | 2026-10-16 | Cut back to this ticket's acceptance criteria. Group-joining design, the full schema, implementation conventions, the full error catalog, pitfalls and implementation tickets moved to TODOs (§12). Renumbered sections. Decision IDs D-01 to D-16 kept their meaning; D-17 onward were renumbered. |
| 1.0–2.3 | 2026-10-16 | Earlier drafts with implementation and group-feature detail. |
