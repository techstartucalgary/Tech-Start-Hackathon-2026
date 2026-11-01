const migration = require('../migrations/20261101_000000_create_hackathon_tables');
const { open, execute, run, all, close } = require('./helpers/sqlite');

let db;

beforeEach(async () => {
  db = await open();
  await execute(db, 'PRAGMA foreign_keys = ON;');
  await migration.up(db);
  await execute(
    db,
    `
    INSERT INTO users (id, email, display_name) VALUES
      (1, 'lead@example.com', 'Lead'),
      (2, 'member@example.com', 'Member'),
      (3, 'requester@example.com', 'Requester'),
      (4, 'outsider@example.com', 'Outsider');
    INSERT INTO hackathons (id, name) VALUES (1, 'First event'), (2, 'Second event');
    INSERT INTO hackathon_enrollments (hackathon_id, user_id)
      VALUES (1, 1), (1, 2), (1, 3), (2, 2);
    INSERT INTO groups (id, hackathon_id, name)
      VALUES (1, 1, 'First group'), (2, 1, 'Second group'), (3, 2, 'Other event');
    INSERT INTO group_members (group_id, user_id, hackathon_id, role)
      VALUES (1, 1, 1, 'lead');
    `
  );
});

afterEach(async () => {
  if (db) await close(db);
});

test('stores registration, enrollment, a lead and an approved member separately', async () => {
  expect(
    await all(db, 'SELECT role, password_hash FROM users WHERE id = 2')
  ).toEqual([{ role: 'user', password_hash: null }]);
  await run(
    db,
    'INSERT INTO group_join_requests (group_id, user_id, hackathon_id) VALUES (1, 2, 1)'
  );
  expect(
    await all(db, 'SELECT * FROM group_members WHERE user_id = 2')
  ).toEqual([]);

  await execute(
    db,
    `BEGIN;
     INSERT INTO group_members (group_id, user_id, hackathon_id) VALUES (1, 2, 1);
     UPDATE group_join_requests SET status = 'approved', decided_by = 1,
       decided_at = CURRENT_TIMESTAMP WHERE user_id = 2;
     COMMIT;`
  );

  expect(
    await all(db, 'SELECT user_id, role FROM group_members ORDER BY user_id')
  ).toEqual([
    { user_id: 1, role: 'lead' },
    { user_id: 2, role: 'member' },
  ]);
  expect(await all(db, 'PRAGMA foreign_key_check')).toEqual([]);
});

test('rejects duplicate emails regardless of ASCII letter case', async () => {
  await expect(
    run(
      db,
      "INSERT INTO users (email, display_name) VALUES ('LEAD@example.com', 'Duplicate')"
    )
  ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT' });
});

test.each([
  "INSERT INTO users (email) VALUES ('missing-name@example.com')",
  "UPDATE users SET role = 'admin' WHERE id = 1",
  'UPDATE users SET role = NULL WHERE id = 1',
  "UPDATE hackathon_enrollments SET status = 'invalid' WHERE user_id = 1",
  "UPDATE group_members SET role = 'owner' WHERE user_id = 1",
  'INSERT INTO hackathon_enrollments (hackathon_id, user_id) VALUES (1, 1)',
  'INSERT INTO hackathon_enrollments (hackathon_id, user_id) VALUES (99, 1)',
  'INSERT INTO hackathon_enrollments (hackathon_id, user_id) VALUES (1, 99)',
])(
  'rejects missing fields, invalid roles/statuses and invalid enrollments: %s',
  async (sql) => {
    await expect(run(db, sql)).rejects.toMatchObject({
      code: 'SQLITE_CONSTRAINT',
    });
  }
);

test('allows only one group per user, including across hackathons', async () => {
  await run(
    db,
    'INSERT INTO group_members (group_id, user_id, hackathon_id) VALUES (1, 2, 1)'
  );
  await expect(
    run(
      db,
      'INSERT INTO group_members (group_id, user_id, hackathon_id) VALUES (2, 2, 1)'
    )
  ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT' });
  await expect(
    run(
      db,
      'INSERT INTO group_members (group_id, user_id, hackathon_id) VALUES (3, 2, 2)'
    )
  ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT' });
});

test('rejects a second lead and permits transferring the lead within a transaction', async () => {
  await run(
    db,
    'INSERT INTO group_members (group_id, user_id, hackathon_id) VALUES (1, 2, 1)'
  );
  await expect(
    run(db, "UPDATE group_members SET role = 'lead' WHERE user_id = 2")
  ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT' });
  await execute(
    db,
    `BEGIN;
    UPDATE group_members SET role = 'member' WHERE user_id = 1;
    UPDATE group_members SET role = 'lead' WHERE user_id = 2;
    COMMIT;`
  );
  expect(
    await all(db, "SELECT user_id FROM group_members WHERE role = 'lead'")
  ).toEqual([{ user_id: 2 }]);
});

test.each(['group_members', 'group_join_requests'])(
  '%s requires enrollment in the target group’s hackathon',
  async (table) => {
    // User 4 has no enrollment; user 3 is only enrolled in hackathon 1.
    for (const values of [
      '(1, 4, 1)',
      '(3, 3, 2)',
      '(3, 3, 1)',
      '(99, 3, 1)',
    ]) {
      await expect(
        run(
          db,
          `INSERT INTO ${table} (group_id, user_id, hackathon_id) VALUES ${values}`
        )
      ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT' });
    }
  }
);

test('permits requests from multiple users but only one pending request per user and group', async () => {
  await execute(
    db,
    `INSERT INTO group_join_requests (group_id, user_id, hackathon_id)
    VALUES (1, 2, 1), (1, 3, 1), (2, 2, 1);`
  );
  await expect(
    run(
      db,
      'INSERT INTO group_join_requests (group_id, user_id, hackathon_id) VALUES (1, 2, 1)'
    )
  ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT' });
  await run(
    db,
    "UPDATE group_join_requests SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP WHERE group_id = 1 AND user_id = 2"
  );
  await run(
    db,
    'INSERT INTO group_join_requests (group_id, user_id, hackathon_id) VALUES (1, 2, 1)'
  );
  expect(
    await all(db, 'SELECT COUNT(*) AS count FROM group_join_requests')
  ).toEqual([{ count: 4 }]);
});

test.each([
  "status = 'unknown'",
  'decided_at = CURRENT_TIMESTAMP',
  'decided_by = 1',
  "status = 'approved', decided_at = CURRENT_TIMESTAMP",
  "status = 'declined', decided_by = 1",
  "status = 'approved', decided_by = 99, decided_at = CURRENT_TIMESTAMP",
])('rejects inconsistent request decisions: %s', async (assignment) => {
  await run(
    db,
    'INSERT INTO group_join_requests (group_id, user_id, hackathon_id) VALUES (1, 2, 1)'
  );
  await expect(
    run(db, `UPDATE group_join_requests SET ${assignment}`)
  ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT' });
});

test.each([
  'DELETE FROM users WHERE id = 1',
  'DELETE FROM hackathons WHERE id = 1',
  'DELETE FROM hackathon_enrollments WHERE hackathon_id = 1 AND user_id = 1',
  'DELETE FROM groups WHERE id = 1',
  'UPDATE groups SET hackathon_id = 2 WHERE id = 1',
])('prevents orphaning existing membership: %s', async (sql) => {
  await expect(run(db, sql)).rejects.toMatchObject({
    code: 'SQLITE_CONSTRAINT',
  });
});

test('rolls back populated tables in dependency order and can be applied again', async () => {
  await run(
    db,
    'INSERT INTO group_join_requests (group_id, user_id, hackathon_id) VALUES (1, 2, 1)'
  );
  await execute(
    db,
    'CREATE TABLE health_checks (id INTEGER PRIMARY KEY); INSERT INTO health_checks VALUES (1);'
  );
  await migration.down(db);
  expect(
    await all(db, "SELECT name FROM sqlite_master WHERE type = 'table'")
  ).toEqual([{ name: 'health_checks' }]);
  expect(await all(db, 'SELECT * FROM health_checks')).toEqual([{ id: 1 }]);
  await migration.up(db);
  expect(await all(db, 'SELECT * FROM users')).toEqual([]);
  expect(await all(db, 'PRAGMA foreign_key_check')).toEqual([]);
});
