# Database Tables and Relationships (SCRUM-11)

**Status: planned schema.** This document describes the tables, fields, keys, and
relationships needed for registration, hackathon enrollment, group membership,
and group permission checks.

The names and role rules follow [Luis's auth plan](https://github.com/techstartucalgary/Tech-Start-Hackathon-2026/blob/681edbc1d17d3f4337d89af3cac1629a52f01a05/docs/auth/ai-architecture-prompt.md).
The ticket's **owner** is stored as **`lead`** in that plan. Joining uses a request
that must be approved before the user becomes a `member`.

## Tables and fields

The database is SQLite. PK means primary key; FK means foreign key. Fields are
required unless marked nullable. Timestamps use UTC `TEXT` and default to
`CURRENT_TIMESTAMP` unless stated otherwise.

### `users`

Stores the registered account and its global role.

| Field           | Type           | Key / purpose                                                        |
| --------------- | -------------- | -------------------------------------------------------------------- |
| `id`            | INTEGER        | PK.                                                                  |
| `email`         | TEXT           | Unique, case-insensitive email address.                              |
| `password_hash` | TEXT, nullable | Hashed password; nullable for Google-only accounts in the auth plan. |
| `display_name`  | TEXT           | User's display name.                                                 |
| `role`          | TEXT           | `user` or `organizer`; defaults to `user`.                           |
| `created_at`    | TEXT           | Registration time.                                                   |

Registering creates a user account. Enrollment and group membership are stored
separately; neither is implied by registration.

### `hackathons`

Stores the event that users enroll in and groups belong to.

| Field  | Type    | Key / purpose   |
| ------ | ------- | --------------- |
| `id`   | INTEGER | PK.             |
| `name` | TEXT    | Hackathon name. |

### `hackathon_enrollments`

Connects a registered user to a hackathon.

| Field          | Type    | Key / purpose                                  |
| -------------- | ------- | ---------------------------------------------- |
| `hackathon_id` | INTEGER | Part of composite PK; FK -> `hackathons.id`.   |
| `user_id`      | INTEGER | Part of composite PK; FK -> `users.id`.        |
| `status`       | TEXT    | `active` or `withdrawn`; defaults to `active`. |
| `created_at`   | TEXT    | Enrollment time.                               |

**PK:** `(hackathon_id, user_id)`. This prevents duplicate enrollment records for
the same user and event. The backend requires an active enrollment before the
user creates or joins a group in that hackathon.

### `groups`

Stores each group and the hackathon it belongs to.

| Field          | Type    | Key / purpose          |
| -------------- | ------- | ---------------------- |
| `id`           | INTEGER | PK.                    |
| `hackathon_id` | INTEGER | FK -> `hackathons.id`. |
| `name`         | TEXT    | Group name.            |
| `created_at`   | TEXT    | Group creation time.   |

Add `UNIQUE(id, hackathon_id)` so memberships and requests can reference the group
and its event together. Ownership is stored in `group_members.role`, avoiding a
second ownership field that could disagree with the membership record.

### `group_members`

Stores accepted group membership and each user's role within the group.

| Field          | Type    | Key / purpose                                                           |
| -------------- | ------- | ----------------------------------------------------------------------- |
| `group_id`     | INTEGER | Part of composite PK and group FK below.                                |
| `user_id`      | INTEGER | Part of composite PK and enrollment FK below; also unique.              |
| `hackathon_id` | INTEGER | Connects the membership to the group's event and the user's enrollment. |
| `role`         | TEXT    | `lead` (owner) or `member`; defaults to `member`.                       |
| `joined_at`    | TEXT    | Time membership was created.                                            |

- **PK:** `(group_id, user_id)`.
- **FK:** `(group_id, hackathon_id)` -> `groups(id, hackathon_id)`.
- **FK:** `(hackathon_id, user_id)` ->
  `hackathon_enrollments(hackathon_id, user_id)`, which links to `users`.
- **Unique:** `user_id`, matching Luis's rule that a user belongs to at most one
  group across the application.
- **Unique partial index:** `group_id WHERE role = 'lead'` prevents multiple
  owners in one group. The backend must also ensure every group has an owner;
  this index alone does not prevent a group with zero owners.

The composite FKs ensure the group and enrollment refer to the same hackathon.
The backend separately checks that the enrollment is active.

### `group_join_requests`

Supports Luis's approval flow. A pending requester is not yet a group member.

| Field          | Type              | Key / purpose                                                                                                              |
| -------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`           | INTEGER           | PK.                                                                                                                        |
| `group_id`     | INTEGER           | Part of composite group FK below.                                                                                          |
| `user_id`      | INTEGER           | Requesting user; part of composite enrollment FK below.                                                                    |
| `hackathon_id` | INTEGER           | Connects the request to the group's event and the user's enrollment.                                                       |
| `status`       | TEXT              | `pending`, `approved`, `declined`, or `cancelled`; defaults to `pending`.                                                  |
| `decided_by`   | INTEGER, nullable | FK -> `users.id`; user who approved, declined, or cancelled the request. Null while pending or for automatic cancellation. |
| `created_at`   | TEXT              | Request creation time.                                                                                                     |
| `decided_at`   | TEXT, nullable    | Decision time; no default, null while pending.                                                                             |

- **FK:** `(group_id, hackathon_id)` -> `groups(id, hackathon_id)`.
- **FK:** `(hackathon_id, user_id)` ->
  `hackathon_enrollments(hackathon_id, user_id)`.
- **Unique partial index:** `(group_id, user_id) WHERE status = 'pending'`
  prevents duplicate pending requests by the same user to the same group.

An approved request results in a `group_members` row with role `member`.
Current membership is always read from `group_members`, not request history.

## Relationships

```mermaid
erDiagram
    users ||--o{ hackathon_enrollments : enrolls
    hackathons ||--o{ hackathon_enrollments : has
    hackathons ||--o{ groups : contains
    groups ||--|{ group_members : has
    users ||--o| group_members : belongs_to
    hackathon_enrollments ||--o| group_members : qualifies
    groups ||--o{ group_join_requests : receives
    users ||--o{ group_join_requests : requests
    hackathon_enrollments ||--o{ group_join_requests : qualifies
    users o|--o{ group_join_requests : decides
```

- Users and hackathons have a many-to-many relationship through enrollments.
- A hackathon has many groups; each group belongs to one hackathon.
- A group has one or more members, with exactly one owner (`lead`). Each user
  belongs to zero or one group under the current auth plan.
- Membership and join requests require enrollment in the group's hackathon.
- A group can receive many join requests. Each request belongs to one requesting
  user, with an optional reference to the user who decided it.

## Application flow

1. **Register:** create a `users` row with global role `user`.
2. **Enroll:** create an active `hackathon_enrollments` row connecting the user to
   the selected hackathon.
3. **Create a group:** confirm active enrollment and no existing membership.
   Create the `groups` row and the creator's `group_members` row with role `lead`
   in one transaction. The creator is now the owner.
4. **Join a group:** require active enrollment in the target group's hackathon,
   no existing membership, and no pending request to that group before creating
   a pending `group_join_requests` row. Only the target group's lead or an
   organizer with `group:members:manage:any` may approve a pending request.
   Recheck active enrollment and absence of another membership at approval,
   then insert a `group_members` row with role `member` and mark the request
   approved in one transaction. If the requester is no longer eligible, cancel
   the stale pending request and return `409`, as specified in the auth plan.
   Cancel the user's other pending requests in the transaction that makes them
   a member or creates their group.
5. **Identify the group:** for a modification request, load the target group by
   its ID and look up membership using both that group ID and the authenticated
   user's ID.
6. **Check roles and permissions:** read `users.role` and, when present, the
   target group's `group_members.role`; resolve the required permission using
   the mapping below.
7. **Allow or reject:** permit the modification only if the user has the required
   permission. Otherwise reject it without modifying the group.

## Group roles and permission checks

Following Luis's plan, global roles live in `users.role`, group roles live in
`group_members.role`, and role-to-permission mappings live in backend code.
Separate permission tables are not needed for this design. A requester has no
membership role until accepted.

For a group modification, the required permission is `group:update`:

| User's role and relationship to the target group               | Permission                   | Result                                         |
| -------------------------------------------------------------- | ---------------------------- | ---------------------------------------------- |
| Owner (`lead`) of this group                                   | `group:update`               | Allow.                                         |
| Regular `member` of this group                                 | No `group:update` permission | Reject.                                        |
| Regular user outside this group, including a pending requester | No membership or override    | Reject.                                        |
| Global `organizer`, whether or not a member                    | `group:update:any`           | Allow through the explicit organizer override. |

The backend performs these checks on every group modification request:

1. Identify the authenticated user; reject with `401` if not signed in. The
   acting user ID comes from authentication, not a user ID supplied in the body.
2. Load the target group; reject with `404` if it does not exist.
3. Load `group_members` by `(group_id, user_id)`. Reject with `403` if there is
   no membership and no explicit organizer override for the requested action.
4. Check the required permission using the current global and group roles.
   Reject with `403` if the permission is missing.
5. Validate the input (`400` for invalid input), then check the applicable
   current-state rules (`409` if blocked). Only then allow the update. This
   preserves the auth plan's check order: `401` -> `404` -> `403` -> `400` -> `409`.

Membership in a different group never grants permission over the target group.
