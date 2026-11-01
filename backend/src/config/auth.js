const crypto = require('crypto');

const DAY = 24 * 60 * 60 * 1000;
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});
const readCookie = (req, name) => {
  const value = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  const token = value && value.slice(name.length + 1);
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)
    ? token
    : null;
};
const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const authError = (code, status = 401) =>
  Object.assign(new Error(code), { code, status });

module.exports = {
  DAY,
  hash,
  randomToken,
  cookieOptions,
  readCookie,
  allowedOrigins,
  authError,
};
