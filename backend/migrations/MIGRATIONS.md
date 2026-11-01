# Database Migrations

This directory contains versioned database schema migrations.

## Why migrations matter

As your database schema evolves, migrations provide:

- **Version control** for schema changes
- **Rollback capability** for failed deployments
- **Audit trail** of what changed and when
- **Multi-environment safety** (dev, staging, prod)

## SQLite migration workflow

The project now includes a lightweight migration runner for SQLite.

### Create a migration

```bash
cd backend
npm run migrate:create -- create_users_table
```

This creates a file in `backend/migrations/` with a timestamped name, for example:

```bash
migrations/20261004_120000_create_users_table.js
```

### Run all pending migrations

```bash
cd backend
npm run migrate:up
```

### Check migration status

```bash
cd backend
npm run migrate:status
```

### Revert to a specific migration name

```bash
cd backend
npm run migrate:down -- create_users_table
```

This reverts all migrations applied after the named migration, effectively moving the database back to that migration point.

### Revert the most recent migration

```bash
cd backend
npm run migrate:down
```

### Revert all migrations

```bash
cd backend
npm run migrate:reset
```

## Migration file structure

Each migration file exports an object with `name`, `up`, and `down` functions:

```javascript
const migration = {
  name: 'create_users_table',

  up: async (db) => {
    await new Promise((resolve, reject) => {
      db.run(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => (err ? reject(err) : resolve())
      );
    });
  },

  down: async (db) => {
    await new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS users', (err) =>
        err ? reject(err) : resolve()
      );
    });
  },
};

module.exports = migration;
```

## Best practices

1. **One change per migration** - Keep migrations focused and testable
2. **Write both up and down** - Always include rollback logic
3. **Use the runner's transaction** - Each migration and its history record commit together. Do not open another transaction inside `up` or `down`.
4. **Test rollbacks** - Not just the upgrade path
5. **Version control migrations** - Commit them with your code
6. **Never edit old migrations** - Create a new one to fix mistakes

## Schema versioning

The migration runner records applied migration names in a `schema_migrations` table so it can track what is already applied and which migration names are ready for rollback.

## Hackathon database tables

`20261101_000000_create_hackathon_tables.js` implements the five tables documented
in [SCRUM-11 / PR #14](https://github.com/techstartucalgary/Tech-Start-Hackathon-2026/pull/14):
`users`, `hackathon_enrollments`, `groups`, `group_members`, and
`group_join_requests`. Run `npm run migrate:up` before using these tables. App
startup continues to initialize only the existing health-check table.

This application serves one hackathon. Enrollment uses `user_id` as its primary
key and a foreign key to `users.id`; withdrawal and re-enrollment update that
user's existing row. There is no `hackathons` table or `hackathon_id` field.
The enrollment table uses [`WITHOUT ROWID`](https://www.sqlite.org/withoutrowid.html)
so SQLite requires an explicit user ID instead of generating one.

The schema enforces required fields, allowed roles and statuses, case-insensitive
ASCII email uniqueness, one enrollment and one group per user, at most one
`lead` per group, and one pending request per user/group pair. Memberships and
requests reference `groups.id` and `hackathon_enrollments.user_id` directly.
Completed requests need a decision time; approvals and declines also
need a deciding user. Automatic cancellation may leave `decided_by` null.

The application initializer and migration runner both enable SQLite foreign keys.
Foreign keys use SQLite's default `NO ACTION`: deleting a referenced user,
enrollment, or group fails while dependent rows remain. Group deletion
must explicitly remove its requests and memberships in the same transaction.

Service-layer rules still need to enforce active enrollment, creation/transfer of
exactly one lead, approval permissions, and cancellation of other pending requests
when a user joins or creates a group. The unique lead index only prevents multiple
leads; it cannot ensure that a group always has one. This migration does not
implement authentication, API endpoints, or the permission middleware.

### Earlier PR #15 checkouts

The initial migration was simplified while PR #15 was still unmerged. If you
already applied its earlier multi-event version, `migrate:up` will not rerun it.
Use a fresh database via `DATABASE_PATH` to try this version without changing
your existing data. For a disposable test database, you can instead run
`migrate:down` from the earlier checkout before pulling this revision, then run
`migrate:up`. Do not use the revised rollback against the earlier schema.

### Isolated databases and validation

Both the app and migration CLI accept `DATABASE_PATH`. Set it to an absolute
SQLite file path to use a separate database; the default remains
`backend/database.sqlite`. Tests use in-memory or temporary databases and do not
touch the development database.

Run the backend checks from `backend/`:

```bash
npm run lint
npm exec -- eslint migrations/*.js scripts/migrate.js tests/
npm exec -- prettier --check src/config/database.js scripts/migrate.js migrations/ tests/
npm test -- --runInBand
```

Tests cover the enrollment/group relationships, duplicate and invalid data,
lead transfer, request history, applying migrations twice, and recovery after
failed upgrades or rollbacks. `migrate:down` and `migrate:reset` remove the affected
tables and their data; they are intended for disposable development/test data or
a deliberate rollback with backups.
