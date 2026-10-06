# Database Migrations

This directory is reserved for database schema migrations.

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
      db.run('DROP TABLE IF EXISTS users', (err) => (err ? reject(err) : resolve()));
    });
  },
};

module.exports = migration;
```

## Best practices

1. **One change per migration** - Keep migrations focused and testable
2. **Write both up and down** - Always include rollback logic
3. **Use transactions** - Wrap multiple statements when possible
4. **Test rollbacks** - Not just the upgrade path
5. **Version control migrations** - Commit them with your code
6. **Never edit old migrations** - Create a new one to fix mistakes

## Schema versioning

The migration runner records applied migration names in a `schema_migrations` table so it can track what is already applied and which migration names are ready for rollback.
