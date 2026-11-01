const execute = (db, sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });

module.exports = {
  name: 'create_hackathon_tables',

  // The migration runner owns the transaction, including schema_migrations.
  up: async (db) => {
    await execute(
      db,
      `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'organizer')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE hackathons (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE hackathon_enrollments (
        hackathon_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'withdrawn')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (hackathon_id, user_id),
        FOREIGN KEY (hackathon_id) REFERENCES hackathons(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX hackathon_enrollments_user_id
        ON hackathon_enrollments(user_id);

      CREATE TABLE groups (
        id INTEGER PRIMARY KEY,
        hackathon_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (id, hackathon_id),
        FOREIGN KEY (hackathon_id) REFERENCES hackathons(id)
      );

      CREATE INDEX groups_hackathon_id ON groups(hackathon_id);

      CREATE TABLE group_members (
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL UNIQUE,
        hackathon_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
        joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, user_id),
        FOREIGN KEY (group_id, hackathon_id) REFERENCES groups(id, hackathon_id),
        FOREIGN KEY (hackathon_id, user_id)
          REFERENCES hackathon_enrollments(hackathon_id, user_id)
      );

      CREATE UNIQUE INDEX group_members_one_lead
        ON group_members(group_id) WHERE role = 'lead';

      CREATE TABLE group_join_requests (
        id INTEGER PRIMARY KEY,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        hackathon_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
        decided_by INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        decided_at TEXT,
        FOREIGN KEY (group_id, hackathon_id) REFERENCES groups(id, hackathon_id),
        FOREIGN KEY (hackathon_id, user_id)
          REFERENCES hackathon_enrollments(hackathon_id, user_id),
        FOREIGN KEY (decided_by) REFERENCES users(id),
        CHECK (
          (status = 'pending' AND decided_at IS NULL AND decided_by IS NULL)
          OR (status <> 'pending' AND decided_at IS NOT NULL)
        ),
        CHECK (status NOT IN ('approved', 'declined') OR decided_by IS NOT NULL)
      );

      CREATE UNIQUE INDEX group_join_requests_one_pending
        ON group_join_requests(group_id, user_id) WHERE status = 'pending';
      CREATE INDEX group_join_requests_group_status
        ON group_join_requests(group_id, status);
      CREATE INDEX group_join_requests_user_status
        ON group_join_requests(user_id, status);
      CREATE INDEX group_join_requests_enrollment
        ON group_join_requests(hackathon_id, user_id);
      CREATE INDEX group_join_requests_decided_by ON group_join_requests(decided_by);
      `
    );
  },

  down: async (db) => {
    await execute(
      db,
      `
      DROP TABLE group_join_requests;
      DROP TABLE group_members;
      DROP TABLE groups;
      DROP TABLE hackathon_enrollments;
      DROP TABLE hackathons;
      DROP TABLE users;
      `
    );
  },
};
