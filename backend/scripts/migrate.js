#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const projectRoot = path.resolve(__dirname, '..');
const databasePath = path.resolve(projectRoot, 'database.sqlite');
const migrationsDir = path.resolve(projectRoot, 'migrations');
const migrationTable = 'schema_migrations';

const db = new sqlite3.Database(databasePath);

const runSql = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) {
      reject(err);
      return;
    }

    resolve(this);
  });
});

const ensureMigrationTable = async () => {
  await runSql(`
    CREATE TABLE IF NOT EXISTS ${migrationTable} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const loadMigrationModules = () => {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const migrationModules = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort()
    .map((file) => {
      const migrationPath = path.join(migrationsDir, file);
      const migration = require(migrationPath);
      const name = migration.name || path.basename(file, '.js');

      return {
        ...migration,
        file,
        name,
      };
    });

  const seenNames = new Map();
  for (const migration of migrationModules) {
    if (seenNames.has(migration.name)) {
      throw new Error(
        `Duplicate migration name detected: ${migration.name} (files ${seenNames.get(migration.name)} and ${migration.file})`
      );
    }

    seenNames.set(migration.name, migration.file);
  }

  return migrationModules;
};

const getAppliedMigrations = async () => {
  const rows = await new Promise((resolve, reject) => {
    db.all(
      `SELECT name FROM ${migrationTable} ORDER BY id ASC`,
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(result);
      }
    );
  });

  return rows.map((row) => row.name);
};

const markMigrationApplied = async (name) => {
  await runSql(
    `INSERT INTO ${migrationTable} (name) VALUES (?)`,
    [name]
  );
};

const markMigrationReverted = async (name) => {
  await runSql(
    `DELETE FROM ${migrationTable} WHERE name = ?`,
    [name]
  );
};

const createMigrationTemplate = (rawName) => {
  const cleanedName = rawName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  if (!cleanedName) {
    throw new Error('A migration name is required. Example: create_users_table');
  }

  const existingMigrations = loadMigrationModules();
  if (existingMigrations.some((migration) => migration.name === cleanedName)) {
    throw new Error(`Migration name already exists: ${cleanedName}`);
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .slice(0, 14);

  const fileName = `${timestamp}_${cleanedName}.js`;
  const migrationPath = path.join(migrationsDir, fileName);

  if (fs.existsSync(migrationPath)) {
    throw new Error(`Migration already exists: ${fileName}`);
  }

  const template = `const migration = {
  name: '${cleanedName}',

  up: async (db) => {
    const runSql = (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(this);
      });
    });

    await runSql(\`
      CREATE TABLE IF NOT EXISTS your_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    \`);
  },

  down: async (db) => {
    const runSql = (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(this);
      });
    });

    await runSql('DROP TABLE IF EXISTS your_table;');
  },
};

module.exports = migration;
`;

  fs.mkdirSync(migrationsDir, { recursive: true });
  fs.writeFileSync(migrationPath, template);

  return fileName;
};

const runPendingMigrations = async () => {
  await ensureMigrationTable();

  const migrationModules = loadMigrationModules();
  const applied = new Set(await getAppliedMigrations());

  if (migrationModules.length === 0) {
    console.log('No migrations found in ./migrations');
    return;
  }

  for (const migration of migrationModules) {
    if (applied.has(migration.name)) {
      continue;
    }

    console.log(`Applying migration: ${migration.name}`);
    await migration.up(db);
    await markMigrationApplied(migration.name);
  }

  console.log('All pending migrations have been applied.');
};

const revertMigrations = async (targetName) => {
  await ensureMigrationTable();

  const migrationModules = loadMigrationModules();
  const migrationMap = new Map(migrationModules.map((migration) => [migration.name, migration]));
  const applied = await getAppliedMigrations();

  if (applied.length === 0) {
    console.log('No migrations are currently applied.');
    return;
  }

  let migrationNamesToRevert = [];

  if (targetName) {
    const targetIndex = applied.indexOf(targetName);

    if (targetIndex === -1) {
      throw new Error(`Migration not found in applied list: ${targetName}`);
    }

    migrationNamesToRevert = applied.slice(targetIndex + 1);
  } else {
    migrationNamesToRevert = [applied[applied.length - 1]];
  }

  if (migrationNamesToRevert.length === 0) {
    console.log(`Already at migration point: ${targetName || 'latest'}`);
    return;
  }

  for (let index = migrationNamesToRevert.length - 1; index >= 0; index -= 1) {
    const name = migrationNamesToRevert[index];
    const migration = migrationMap.get(name);

    if (!migration) {
      throw new Error(`Migration definition not found for: ${name}`);
    }

    console.log(`Reverting migration: ${name}`);
    await migration.down(db);
    await markMigrationReverted(name);
  }

  console.log('Migration rollback completed.');
};

const resetMigrations = async () => {
  await ensureMigrationTable();

  const applied = await getAppliedMigrations();

  if (applied.length === 0) {
    console.log('No migrations are currently applied.');
    return;
  }

  for (let index = applied.length - 1; index >= 0; index -= 1) {
    const migrationName = applied[index];
    const migration = loadMigrationModules().find((item) => item.name === migrationName);

    if (!migration) {
      throw new Error(`Migration definition not found for: ${migrationName}`);
    }

    console.log(`Reverting migration: ${migrationName}`);
    await migration.down(db);
    await markMigrationReverted(migrationName);
  }

  console.log('All migrations have been reverted.');
};

const showStatus = async () => {
  await ensureMigrationTable();

  const applied = await getAppliedMigrations();
  const pending = loadMigrationModules()
    .filter((migration) => !applied.includes(migration.name))
    .map((migration) => migration.name);

  console.log('Applied migrations:');
  if (applied.length === 0) {
    console.log('  (none)');
  } else {
    applied.forEach((name) => console.log(`  - ${name}`));
  }

  console.log('\nPending migrations:');
  if (pending.length === 0) {
    console.log('  (none)');
  } else {
    pending.forEach((name) => console.log(`  - ${name}`));
  }
};

const command = process.argv[2];
const argValue = process.argv.slice(3).join(' ');

(async () => {
  try {
    switch (command) {
      case 'create':
        if (!argValue) {
          throw new Error('Please provide a migration name, for example: npm run migrate:create -- create_users_table');
        }

        const fileName = createMigrationTemplate(argValue);
        console.log(`Migration created: ${fileName}`);
        break;

      case 'up':
        await runPendingMigrations();
        break;

      case 'down':
        await revertMigrations(argValue || undefined);
        break;

      case 'reset':
        await resetMigrations();
        break;

      case 'status':
        await showStatus();
        break;

      default:
        console.log('Usage: node scripts/migrate.js <create|up|down|reset|status> [migration-name]');
        console.log('Examples:');
        console.log('  node scripts/migrate.js create create_users_table');
        console.log('  node scripts/migrate.js up');
        console.log('  node scripts/migrate.js down create_users_table');
        console.log('  node scripts/migrate.js reset');
        console.log('  node scripts/migrate.js status');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Migration error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
