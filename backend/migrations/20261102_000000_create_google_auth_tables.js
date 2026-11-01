const execute = (db, sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });

module.exports = {
  name: 'create_google_auth_tables',
  up: (db) =>
    execute(
      db,
      `
    CREATE TABLE oauth_accounts (
      user_id INTEGER NOT NULL REFERENCES users(id),
      provider TEXT NOT NULL CHECK (provider = 'google'),
      provider_user_id TEXT NOT NULL,
      PRIMARY KEY (provider, provider_user_id)
    );
    CREATE INDEX oauth_accounts_user ON oauth_accounts(user_id);
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      absolute_expires_at TEXT NOT NULL
    );
    CREATE INDEX sessions_user ON sessions(user_id);
    CREATE TABLE oauth_login_attempts (
      state_hash TEXT PRIMARY KEY NOT NULL,
      code_verifier TEXT NOT NULL,
      nonce TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `
    ),
  down: (db) =>
    execute(
      db,
      `
    DROP TABLE oauth_login_attempts;
    DROP TABLE sessions;
    DROP TABLE oauth_accounts;
  `
    ),
};
