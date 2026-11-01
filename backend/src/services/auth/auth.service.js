const { OAuth2Client, CodeChallengeMethod } = require('google-auth-library');
const crypto = require('crypto');
const model = require('../../models/auth/auth.model');
const { hash, randomToken, authError } = require('../../config/auth');

function googleClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
    process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw authError('GOOGLE_NOT_CONFIGURED');
  }
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

async function beginGoogle() {
  const client = googleClient();
  const state = randomToken();
  const nonce = randomToken();
  const { codeVerifier, codeChallenge } =
    await client.generateCodeVerifierAsync();
  await model.saveAttempt({ stateHash: hash(state), codeVerifier, nonce });
  const url = client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });
  return { state, url };
}

async function finishGoogle(query, browserState, previousToken) {
  if (
    typeof query.state !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(query.state) ||
    !browserState ||
    query.state.length !== browserState.length ||
    !crypto.timingSafeEqual(Buffer.from(query.state), Buffer.from(browserState))
  ) {
    throw authError('GOOGLE_AUTH_FAILED');
  }
  const attempt = await model.consumeAttempt(hash(browserState));
  if (!attempt || attempt.expires_at <= new Date().toISOString())
    throw authError('GOOGLE_AUTH_FAILED');
  if (query.error === 'access_denied') throw authError('GOOGLE_AUTH_CANCELLED');
  if (
    query.error ||
    typeof query.code !== 'string' ||
    !query.code ||
    query.code.length > 4096
  )
    throw authError('GOOGLE_AUTH_FAILED');
  const client = googleClient();
  const { tokens } = await client.getToken({
    code: query.code,
    codeVerifier: attempt.code_verifier,
  });
  if (!tokens.id_token) throw authError('GOOGLE_AUTH_FAILED');
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (
    !payload ||
    payload.nonce !== attempt.nonce ||
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    typeof payload.email !== 'string' ||
    !payload.email.includes('@')
  )
    throw authError('GOOGLE_AUTH_FAILED');
  if (payload.email_verified !== true)
    throw authError('GOOGLE_EMAIL_UNVERIFIED');
  const token = randomToken();
  await model.signInGoogle(
    {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: (
        (typeof payload.name === 'string' && payload.name.trim()) ||
        payload.email
      ).slice(0, 50),
      // Google may no longer own verification of a third-party email address.
      authoritativeEmail:
        payload.email.toLowerCase().endsWith('@gmail.com') ||
        Boolean(payload.hd),
    },
    hash(token),
    previousToken ? hash(previousToken) : null
  );
  return token;
}

module.exports = { beginGoogle, finishGoogle };
