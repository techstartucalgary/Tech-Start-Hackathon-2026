const { run, all, close } = require('./helpers/sqlite');

test('application initialization enables foreign keys and preserves the health table', async () => {
  const previousPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = ':memory:';
  let connection;
  try {
    jest.isolateModules(() => {
      connection = require('../src/config/database');
    });
    await connection.initializeDatabase();
    await connection.initializeDatabase();
    expect(await all(connection.db, 'PRAGMA foreign_keys')).toEqual([
      { foreign_keys: 1 },
    ]);
    await run(
      connection.db,
      "INSERT INTO health_checks (status) VALUES ('ok')"
    );
    expect(
      await all(connection.db, 'SELECT status FROM health_checks')
    ).toEqual([{ status: 'ok' }]);
  } finally {
    if (connection) await close(connection.db);
    if (previousPath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousPath;
  }
});
