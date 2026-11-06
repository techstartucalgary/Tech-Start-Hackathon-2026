const sqlite3 = require('sqlite3').verbose();

const open = (filename = ':memory:') =>
  new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filename, (error) =>
      error ? reject(error) : resolve(db)
    );
  });

const execute = (db, sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });

const run = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      return error ? reject(error) : resolve(this);
    });
  });

const all = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) =>
      error ? reject(error) : resolve(rows)
    );
  });

const close = (db) =>
  new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });

module.exports = { open, execute, run, all, close };
