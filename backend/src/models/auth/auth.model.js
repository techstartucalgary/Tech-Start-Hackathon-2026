const sqlite3 = require('sqlite3').verbose();
const { db, dbPath } = require('../../config/database');
const { DAY, authError } = require('../../config/auth');

const run = (connection, sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.run(sql, params, function (error) {
      error ? reject(error) : resolve(this);
    });
  });
const get = (connection, sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.get(sql, params, (error, row) =>
      error ? reject(error) : resolve(row)
    );
  });
const iso = (time) => new Date(time).toISOString();

async function saveAttempt(attempt) {
  await run(db, 'DELETE FROM oauth_login_attempts WHERE expires_at <= ?', [
    iso(Date.now()),
  ]);
  await run(
    db,
    `INSERT INTO oauth_login_attempts (state_hash, code_verifier, nonce, expires_at)
    VALUES (?, ?, ?, ?)`,
    [
      attempt.stateHash,
      attempt.codeVerifier,
      attempt.nonce,
      iso(Date.now() + 10 * 60 * 1000),
    ]
  );
}

async function consumeAttempt(stateHash) {
  return get(
    db,
    'DELETE FROM oauth_login_attempts WHERE state_hash = ? RETURNING *',
    [stateHash]
  );
}

async function signInGoogle(profile, tokenHash, previousHash) {
  // A dedicated connection keeps unrelated requests out of this transaction.
  const connection = await new Promise((resolve, reject) => {
    const handle = new sqlite3.Database(dbPath, (error) =>
      error ? reject(error) : resolve(handle)
    );
  });
  connection.configure('busyTimeout', 5000);
  let started = false;
  try {
    await run(connection, 'PRAGMA foreign_keys = ON');
    await run(connection, 'BEGIN IMMEDIATE');
    started = true;
    let user = await get(
      connection,
      `SELECT users.id FROM users
      JOIN oauth_accounts ON users.id = oauth_accounts.user_id
      WHERE provider = 'google' AND provider_user_id = ?`,
      [profile.sub]
    );
    if (!user) {
      user = await get(
        connection,
        'SELECT id FROM users WHERE email = ? COLLATE NOCASE',
        [profile.email]
      );
      if (user && !profile.authoritativeEmail)
        throw authError('ACCOUNT_LINK_REQUIRED');
      if (!user) {
        const inserted = await run(
          connection,
          'INSERT INTO users (email, display_name) VALUES (?, ?)',
          [profile.email, profile.name]
        );
        user = { id: inserted.lastID };
      }
      await run(
        connection,
        `INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
        VALUES (?, 'google', ?)`,
        [user.id, profile.sub]
      );
    }
    const now = Date.now();
    await run(
      connection,
      'DELETE FROM sessions WHERE token_hash = ? OR expires_at <= ? OR absolute_expires_at <= ?',
      [previousHash, iso(now), iso(now)]
    );
    await run(
      connection,
      `INSERT INTO sessions (user_id, token_hash, expires_at, absolute_expires_at)
      VALUES (?, ?, ?, ?)`,
      [user.id, tokenHash, iso(now + 7 * DAY), iso(now + 30 * DAY)]
    );
    await run(connection, 'COMMIT');
    started = false;
  } catch (error) {
    if (started) await run(connection, 'ROLLBACK');
    throw error;
  } finally {
    await new Promise((resolve, reject) =>
      connection.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

async function findSession(tokenHash) {
  const now = iso(Date.now());
  await run(
    db,
    `UPDATE sessions SET expires_at = MIN(?, absolute_expires_at)
    WHERE token_hash = ? AND expires_at > ? AND absolute_expires_at > ?`,
    [iso(Date.now() + 7 * DAY), tokenHash, now, now]
  );
  return get(
    db,
    `SELECT users.id, email, display_name, role, sessions.expires_at FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE token_hash = ? AND expires_at > ? AND absolute_expires_at > ?`,
    [tokenHash, now, now]
  );
}

const deleteSession = (tokenHash) =>
  run(db, 'DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
module.exports = {
  saveAttempt,
  consumeAttempt,
  signInGoogle,
  findSession,
  deleteSession,
};
