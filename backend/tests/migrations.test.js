const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { open, execute, all, close } = require('./helpers/sqlite');

const backendRoot = path.resolve(__dirname, '..');
const migrationFile = '20261101_000000_create_hackathon_tables.js';
let testRoot;
let databasePath;
let runner;

beforeEach(() => {
  testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'techstart-migrations-'));
  fs.mkdirSync(path.join(testRoot, 'scripts'));
  fs.mkdirSync(path.join(testRoot, 'migrations'));
  runner = path.join(testRoot, 'scripts', 'migrate.js');
  databasePath = path.join(testRoot, 'test.sqlite');
  fs.copyFileSync(path.join(backendRoot, 'scripts', 'migrate.js'), runner);
  fs.copyFileSync(
    path.join(backendRoot, 'migrations', migrationFile),
    path.join(testRoot, 'migrations', migrationFile)
  );
});

afterEach(() => {
  if (
    path.dirname(testRoot) !== path.resolve(os.tmpdir()) ||
    !path.basename(testRoot).startsWith('techstart-migrations-')
  ) {
    throw new Error('Refusing to remove a directory outside the test sandbox');
  }
  fs.rmSync(testRoot, { recursive: true, force: true });
});

const migrate = (...args) =>
  spawnSync(process.execPath, [runner, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    env: {
      ...process.env,
      DATABASE_PATH: databasePath,
      NODE_PATH: path.join(backendRoot, 'node_modules'),
    },
  });

const inspect = async (sql) => {
  const db = await open(databasePath);
  try {
    return await all(db, sql);
  } finally {
    await close(db);
  }
};

const addFixture = (upSql, downSql = 'SELECT 1;') => {
  fs.writeFileSync(
    path.join(testRoot, 'migrations', '99999999_fixture.js'),
    `
    const exec = (db, sql) => new Promise((resolve, reject) => {
      db.exec(sql, (error) => error ? reject(error) : resolve());
    });
    module.exports = {
      name: 'fixture',
      up: (db) => exec(db, ${JSON.stringify(upSql)}),
      down: (db) => exec(db, ${JSON.stringify(downSql)})
    };
  `
  );
};

test('CLI supports up, repeated up, status, down, reapply and reset', async () => {
  expect(migrate('status').stdout).toContain('create_hackathon_tables');
  expect(migrate('up').status).toBe(0);
  expect(migrate('up').status).toBe(0);
  expect(await inspect('SELECT name FROM schema_migrations')).toEqual([
    { name: 'create_hackathon_tables' },
  ]);
  expect(migrate('status').stdout).toContain('Pending migrations:\n  (none)');
  expect(migrate('down').status).toBe(0);
  expect(
    await inspect(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    )
  ).toEqual([]);
  expect(await inspect('SELECT name FROM schema_migrations')).toEqual([]);
  expect(migrate('up').status).toBe(0);
  expect(migrate('reset').status).toBe(0);
  expect(await inspect('SELECT name FROM schema_migrations')).toEqual([]);
});

test('failed up rolls back partial schema changes and its migration record', async () => {
  addFixture(
    'CREATE TABLE partial_table (id INTEGER); INSERT INTO nonexistent_table VALUES (1);'
  );
  const result = migrate('up');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('nonexistent_table');
  expect(
    await inspect("SELECT name FROM sqlite_master WHERE name = 'partial_table'")
  ).toEqual([]);
  expect(await inspect('SELECT name FROM schema_migrations')).toEqual([
    { name: 'create_hackathon_tables' },
  ]);
});

test('failure to record a migration also rolls back its schema changes', async () => {
  expect(migrate('status').status).toBe(0);
  const db = await open(databasePath);
  try {
    await execute(
      db,
      `CREATE TRIGGER reject_migration_record BEFORE INSERT ON schema_migrations
      BEGIN SELECT RAISE(ABORT, 'record rejected'); END;`
    );
  } finally {
    await close(db);
  }
  expect(migrate('up').status).toBe(1);
  expect(
    await inspect("SELECT name FROM sqlite_master WHERE name = 'users'")
  ).toEqual([]);
  expect(await inspect('SELECT name FROM schema_migrations')).toEqual([]);
});

test.each(['down', 'reset'])(
  'failed %s restores dropped tables and keeps the migration record',
  async (command) => {
    addFixture(
      'CREATE TABLE rollback_probe (id INTEGER); INSERT INTO rollback_probe VALUES (1);',
      'DROP TABLE rollback_probe; SELECT * FROM nonexistent_table;'
    );
    expect(migrate('up').status).toBe(0);
    expect(migrate(command).status).toBe(1);
    expect(await inspect('SELECT * FROM rollback_probe')).toEqual([{ id: 1 }]);
    expect(
      await inspect("SELECT name FROM schema_migrations WHERE name = 'fixture'")
    ).toEqual([{ name: 'fixture' }]);
  }
);

test('the CLI enforces foreign keys on its own connection', async () => {
  addFixture('INSERT INTO hackathon_enrollments (user_id) VALUES (999);');
  const result = migrate('up');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('FOREIGN KEY constraint failed');
  expect(await inspect('SELECT * FROM hackathon_enrollments')).toEqual([]);
});
