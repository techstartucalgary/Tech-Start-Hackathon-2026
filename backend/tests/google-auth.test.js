const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const { execute, run, all, close } = require('./helpers/sqlite');
const baseMigration = require('../migrations/20261101_000000_create_hackathon_tables');
const authMigration = require('../migrations/20261102_000000_create_google_auth_tables');

let app, db, testRoot, claims, exchange, verify, logs;
const originalEnv = { ...process.env };
const digest = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

beforeAll(async () => {
  testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'techstart-google-auth-'));
  process.env.DATABASE_PATH = path.join(testRoot, 'auth.sqlite');
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.GOOGLE_REDIRECT_URI =
    'http://localhost:3000/api/auth/google/callback';
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  db = require('../src/config/database').db;
  await execute(db, 'PRAGMA foreign_keys = ON');
  await baseMigration.up(db);
  await authMigration.up(db);
  app = require('../src/app');
});

beforeEach(async () => {
  await execute(
    db,
    'DELETE FROM oauth_login_attempts; DELETE FROM sessions; DELETE FROM oauth_accounts; DELETE FROM users;'
  );
  claims = {
    sub: 'google-person-1',
    email: 'person@gmail.com',
    email_verified: true,
    name: 'Test Person',
  };
  exchange = jest
    .spyOn(OAuth2Client.prototype, 'getToken')
    .mockResolvedValue({ tokens: { id_token: 'private-google-token' } });
  verify = jest
    .spyOn(OAuth2Client.prototype, 'verifyIdToken')
    .mockImplementation(async () => ({ getPayload: () => claims }));
  logs = jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
  await close(db);
  if (
    path.dirname(testRoot) !== os.tmpdir() ||
    !path.basename(testRoot).startsWith('techstart-google-auth-')
  )
    throw new Error('Invalid test directory');
  fs.rmSync(testRoot, { recursive: true, force: true });
  process.env = originalEnv;
});

async function begin() {
  const response = await request(app).get('/api/auth/google').expect(302);
  const url = new URL(response.headers.location);
  claims.nonce = url.searchParams.get('nonce');
  return {
    response,
    url,
    state: url.searchParams.get('state'),
    cookie: response.headers['set-cookie'][0].split(';')[0],
  };
}
const complete = (flow, query = {}) =>
  request(app)
    .get('/api/auth/google/callback')
    .query({ state: flow.state, code: 'private-code', ...query })
    .set('Cookie', flow.cookie);
const sessionCookie = (response) =>
  response.headers['set-cookie']
    .find((cookie) => cookie.startsWith('sid='))
    .split(';')[0];

test('uses state, nonce and S256 PKCE; persists only the state hash', async () => {
  const flow = await begin();
  expect(flow.url.origin).toBe('https://accounts.google.com');
  expect(flow.url.searchParams.get('scope')).toBe('openid email profile');
  expect(flow.url.searchParams.get('code_challenge_method')).toBe('S256');
  const [attempt] = await all(db, 'SELECT * FROM oauth_login_attempts');
  expect(attempt.state_hash).toBe(digest(flow.state));
  expect(attempt.nonce).toBe(claims.nonce);
  expect(flow.url.searchParams.get('code_challenge')).toBe(
    crypto
      .createHash('sha256')
      .update(attempt.code_verifier)
      .digest('base64url')
  );
  expect(flow.response.headers['set-cookie'][0]).toMatch(
    /HttpOnly; SameSite=Lax/
  );
  const response = await complete(flow).expect(303);
  expect(exchange).toHaveBeenCalledWith({
    code: 'private-code',
    codeVerifier: attempt.code_verifier,
  });
  expect(verify).toHaveBeenCalledWith({
    idToken: 'private-google-token',
    audience: 'test-client',
  });
  expect(response.headers.location).toBe('/welcome-page');
});

test('persists a Google user and a hashed session, then reads the safe profile', async () => {
  const response = await complete(await begin()).expect(303);
  const cookie = sessionCookie(response);
  const [user] = await all(db, 'SELECT * FROM users');
  expect(user).toMatchObject({
    email: 'person@gmail.com',
    display_name: 'Test Person',
    role: 'user',
    password_hash: null,
  });
  expect(await all(db, 'SELECT * FROM oauth_accounts')).toEqual([
    { user_id: user.id, provider: 'google', provider_user_id: claims.sub },
  ]);
  const [session] = await all(db, 'SELECT * FROM sessions');
  expect(session.token_hash).toBe(digest(cookie.slice(4)));
  expect(session.token_hash).not.toBe(cookie.slice(4));
  const me = await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookie)
    .expect(200);
  expect(me.body).toEqual({
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: 'user',
    },
  });
  expect(me.headers['cache-control']).toBe('no-store');
  expect(JSON.stringify(me.body)).not.toMatch(
    /password_hash|token_hash|private-google-token/
  );
  expect(await all(db, 'SELECT * FROM oauth_login_attempts')).toEqual([]);
});

test('recognizes returning Google sub even after Google email changes, rotates the session', async () => {
  const first = await complete(await begin());
  const oldCookie = sessionCookie(first);
  const flow = await begin();
  claims.email = 'changed@gmail.com';
  const second = await request(app)
    .get('/api/auth/google/callback')
    .query({ state: flow.state, code: 'second-code' })
    .set('Cookie', `${flow.cookie}; ${oldCookie}`)
    .expect(303);
  expect(sessionCookie(second)).not.toBe(oldCookie);
  expect(await all(db, 'SELECT id FROM users')).toHaveLength(1);
  expect(await all(db, 'SELECT id FROM sessions')).toHaveLength(1);
  expect(
    (await request(app).get('/api/auth/me').set('Cookie', oldCookie)).body
  ).toEqual({ user: null });
});

test('links authoritative verified email to an existing account without replacing password or role', async () => {
  await run(
    db,
    "INSERT INTO users (email, password_hash, display_name, role) VALUES ('PERSON@gmail.com', 'existing-hash', 'Existing Person', 'organizer')"
  );
  await complete(await begin()).expect(303);
  expect(await all(db, 'SELECT email, password_hash, role FROM users')).toEqual(
    [
      {
        email: 'PERSON@gmail.com',
        password_hash: 'existing-hash',
        role: 'organizer',
      },
    ]
  );
  expect(await all(db, 'SELECT * FROM oauth_accounts')).toHaveLength(1);
});

test('does not auto-link third-party email ownership that Google cannot establish', async () => {
  await run(
    db,
    "INSERT INTO users (email, display_name) VALUES ('person@example.com', 'Existing Person')"
  );
  const flow = await begin();
  claims.email = 'person@example.com';
  await complete(flow).expect(
    'Location',
    '/welcome-page?error=ACCOUNT_LINK_REQUIRED'
  );
  expect(await all(db, 'SELECT * FROM oauth_accounts')).toEqual([]);
  expect(await all(db, 'SELECT * FROM sessions')).toEqual([]);
});

test('accepts a verified Workspace account for existing-email linking', async () => {
  await run(
    db,
    "INSERT INTO users (email, display_name) VALUES ('person@example.com', 'Existing Person')"
  );
  const flow = await begin();
  Object.assign(claims, { email: 'person@example.com', hd: 'example.com' });
  await complete(flow).expect('Location', '/welcome-page');
  expect(await all(db, 'SELECT id FROM users')).toHaveLength(1);
});

test.each(['nonce', 'sub', 'email', 'email_verified'])(
  'rejects invalid %s claims without creating users or sessions',
  async (field) => {
    const flow = await begin();
    claims[field] = field === 'email_verified' ? false : '';
    const response = await complete(flow).expect(303);
    expect(response.headers.location).toContain('?error=GOOGLE_');
    expect(await all(db, 'SELECT * FROM users')).toEqual([]);
    expect(await all(db, 'SELECT * FROM sessions')).toEqual([]);
  }
);

test.each([
  'state',
  'missing-cookie',
  'expired',
  'replay',
  'missing-code',
  'cancelled',
  'token-failure',
  'signature-failure',
])('handles %s safely', async (scenario) => {
  const flow = await begin();
  let callback;
  if (scenario === 'expired')
    await run(
      db,
      "UPDATE oauth_login_attempts SET expires_at = '2000-01-01T00:00:00.000Z'"
    );
  if (scenario === 'replay') await complete(flow);
  if (scenario === 'token-failure')
    exchange.mockRejectedValueOnce(new Error('private-token-exchange-detail'));
  if (scenario === 'signature-failure')
    verify.mockRejectedValueOnce(new Error('invalid signature'));
  if (scenario === 'missing-cookie')
    callback = request(app)
      .get('/api/auth/google/callback')
      .query({ state: flow.state, code: 'private-code' });
  else
    callback = complete(
      flow,
      scenario === 'state'
        ? { state: 'wrong' }
        : scenario === 'missing-code'
          ? { code: '' }
          : scenario === 'cancelled'
            ? { error: 'access_denied' }
            : {}
    );
  const response = await callback.expect(303);
  expect(response.headers.location).toBe(
    `/welcome-page?error=${scenario === 'cancelled' ? 'GOOGLE_AUTH_CANCELLED' : 'GOOGLE_AUTH_FAILED'}`
  );
  expect(
    response.headers['set-cookie'].some((cookie) => cookie.startsWith('sid='))
  ).toBe(false);
  const output = JSON.stringify(logs.mock.calls);
  expect(output).not.toContain('private-code');
  expect(output).not.toContain(flow.state);
  expect(output).not.toContain('private-google-token');
});

test('rolls back user/link creation if session persistence fails', async () => {
  await execute(
    db,
    "CREATE TRIGGER reject_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'test failure'); END;"
  );
  try {
    await complete(await begin()).expect(
      'Location',
      '/welcome-page?error=GOOGLE_AUTH_FAILED'
    );
    expect(await all(db, 'SELECT * FROM users')).toEqual([]);
    expect(await all(db, 'SELECT * FROM oauth_accounts')).toEqual([]);
  } finally {
    await execute(db, 'DROP TRIGGER reject_session');
  }
});

test('session survives reopening the database and reflects current roles', async () => {
  const cookie = sessionCookie(await complete(await begin()));
  await run(db, "UPDATE users SET role = 'organizer'");
  const { open } = require('./helpers/sqlite');
  const other = await open(process.env.DATABASE_PATH);
  try {
    expect(await all(other, 'SELECT * FROM sessions')).toHaveLength(1);
  } finally {
    await close(other);
  }
  expect(
    (await request(app).get('/api/auth/me').set('Cookie', cookie)).body.user
      .role
  ).toBe('organizer');
});

test.each(['expires_at', 'absolute_expires_at'])(
  'rejects an expired %s session',
  async (field) => {
    const cookie = sessionCookie(await complete(await begin()));
    await run(db, `UPDATE sessions SET ${field} = '2000-01-01T00:00:00.000Z'`);
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(response.body).toEqual({ user: null });
    expect(await all(db, 'SELECT * FROM sessions')).toEqual([]);
  }
);

test('renews sliding expiry without passing absolute expiry and sets Secure in production', async () => {
  const cookie = sessionCookie(await complete(await begin()));
  const absolute = new Date(Date.now() + 60000).toISOString();
  await run(db, 'UPDATE sessions SET expires_at = ?, absolute_expires_at = ?', [
    absolute,
    absolute,
  ]);
  process.env.NODE_ENV = 'production';
  try {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(response.headers['set-cookie'][0]).toMatch(
      /HttpOnly; Secure; SameSite=Lax/
    );
    expect(
      (await all(db, 'SELECT expires_at FROM sessions'))[0].expires_at
    ).toBe(absolute);
  } finally {
    process.env.NODE_ENV = 'test';
  }
});

test('logout enforces Origin, revokes the session and is repeatable', async () => {
  const cookie = sessionCookie(await complete(await begin()));
  await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(403);
  await request(app)
    .post('/api/auth/logout')
    .set('Origin', 'https://evil.example')
    .set('Cookie', cookie)
    .expect(403);
  expect(await all(db, 'SELECT * FROM sessions')).toHaveLength(1);
  await request(app)
    .post('/api/auth/logout')
    .set('Origin', 'http://localhost:3000')
    .set('Cookie', cookie)
    .expect(200);
  expect(
    (await request(app).get('/api/auth/me').set('Cookie', cookie)).body
  ).toEqual({ user: null });
  await request(app)
    .post('/api/auth/logout')
    .set('Origin', 'http://localhost:3000')
    .expect(200);
});

test('missing credentials produce a friendly error; disallowed CORS origin is not echoed', async () => {
  delete process.env.GOOGLE_CLIENT_SECRET;
  try {
    await request(app)
      .get('/api/auth/google')
      .expect('Location', '/welcome-page?error=GOOGLE_NOT_CONFIGURED');
  } finally {
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  }
  const response = await request(app)
    .get('/api/auth/me')
    .set('Origin', 'https://evil.example')
    .expect(200);
  expect(response.headers['access-control-allow-origin']).toBeUndefined();
});

test('auth migration rolls back without removing existing users and reapplies', async () => {
  await run(
    db,
    "INSERT INTO users (email, display_name) VALUES ('kept@gmail.com', 'Keep')"
  );
  await authMigration.down(db);
  expect(await all(db, 'SELECT * FROM users')).toHaveLength(1);
  await authMigration.up(db);
  expect(await all(db, 'SELECT * FROM sessions')).toEqual([]);
});

test('concurrent callbacks can consume a login attempt only once', async () => {
  const flow = await begin();
  const responses = await Promise.all([complete(flow), complete(flow)]);
  expect(responses.map((response) => response.headers.location).sort()).toEqual(
    ['/welcome-page', '/welcome-page?error=GOOGLE_AUTH_FAILED']
  );
  expect(await all(db, 'SELECT id FROM users')).toHaveLength(1);
  expect(await all(db, 'SELECT id FROM sessions')).toHaveLength(1);
});

test('concurrent sign-ins cannot create duplicate users or Google account links', async () => {
  const model = require('../src/models/auth/auth.model');
  const profile = {
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    authoritativeEmail: true,
  };
  await Promise.all([
    model.signInGoogle(profile, digest('first-session'), null),
    model.signInGoogle(profile, digest('second-session'), null),
  ]);
  expect(await all(db, 'SELECT id FROM users')).toHaveLength(1);
  expect(await all(db, 'SELECT * FROM oauth_accounts')).toHaveLength(1);
  expect(await all(db, 'SELECT * FROM sessions')).toHaveLength(2);
});
