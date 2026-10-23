const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logger } = require('./logger');

const dbPath = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Database connection failed', { err: err.message });
    }
    return;
  }

  // Successful connection is intentionally silent; the application logs when
  // database initialization completes to avoid duplicate startup messages.
});

const initializeDatabase = () =>
  new Promise((resolve, reject) => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS health_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });

module.exports = {
  db,
  initializeDatabase,
};
