const service = require('../../services/auth/auth.service');
const model = require('../../models/auth/auth.model');
const {
  DAY,
  hash,
  readCookie,
  cookieOptions,
  allowedOrigins,
} = require('../../config/auth');

const knownErrors = new Set([
  'GOOGLE_AUTH_CANCELLED',
  'GOOGLE_AUTH_FAILED',
  'GOOGLE_EMAIL_UNVERIFIED',
  'GOOGLE_NOT_CONFIGURED',
  'ACCOUNT_LINK_REQUIRED',
]);
function failure(req, res, error) {
  const code = knownErrors.has(error.code) ? error.code : 'GOOGLE_AUTH_FAILED';
  req.log.warn('Google sign-in rejected', { code });
  res.redirect(303, `/welcome-page?error=${code}`);
}

async function google(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    const { state, url } = await service.beginGoogle();
    res.cookie('oauth_state', state, {
      ...cookieOptions(),
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(url);
  } catch (error) {
    failure(req, res, error);
  }
}

async function callback(req, res) {
  res.set('Cache-Control', 'no-store');
  res.clearCookie('oauth_state', cookieOptions());
  try {
    const token = await service.finishGoogle(
      req.query,
      readCookie(req, 'oauth_state'),
      readCookie(req, 'sid')
    );
    res.cookie('sid', token, { ...cookieOptions(), maxAge: 7 * DAY });
    res.redirect(303, '/welcome-page');
  } catch (error) {
    failure(req, res, error);
  }
}

async function me(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    const token = readCookie(req, 'sid');
    const session = token && (await model.findSession(hash(token)));
    if (!session) {
      if (token) {
        await model.deleteSession(hash(token));
        res.clearCookie('sid', cookieOptions());
      }
      return res.json({ user: null });
    }
    const { expires_at, ...user } = session;
    res.cookie('sid', token, {
      ...cookieOptions(),
      expires: new Date(expires_at),
    });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (!allowedOrigins().includes(req.get('Origin'))) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_ORIGIN_REJECTED',
        message: 'Request origin is not allowed.',
      },
    });
  }
  try {
    const token = readCookie(req, 'sid');
    if (token) await model.deleteSession(hash(token));
    res.clearCookie('sid', cookieOptions());
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = { google, callback, me, logout };
