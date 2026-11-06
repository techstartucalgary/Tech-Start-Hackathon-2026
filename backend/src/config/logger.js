/**
 * Simple console-based logger.
 * Exposes `logger` with standard level methods and an `httpLogger` middleware.
 * that attaches `req.log` and records request/response events.
 */

const SENSITIVE_HEADERS = ['authorization', 'x-api-key', 'cookie'];

function redactHeaders(headers = {}) {
  const out = {};
  Object.keys(headers).forEach((k) => {
    try {
      const key = k.toLowerCase();
      if (SENSITIVE_HEADERS.includes(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = headers[k];
      }
    } catch (e) {
      // ignore
    }
  });
  return out;
}

function formatEntry(level, message, meta) {
  const timestamp = new Date().toISOString();
  let metaString = '';
  try {
    if (meta && Object.keys(meta).length) {
      metaString = Object.keys(meta)
        .map((k) => {
          const v = meta[k];
          if (typeof v === 'object') return `${k}=${JSON.stringify(v)}`;
          return `${k}=${v}`;
        })
        .join(' | ');
    }
  } catch (e) {
    metaString = '';
  }

  return `${timestamp} ${level.toUpperCase()} ${message || ''}${metaString ? ' — ' + metaString : ''}`;
}

const logger = {
  info: (message, meta = {}) => console.log(formatEntry('info', message, meta)),
  warn: (message, meta = {}) =>
    console.warn(formatEntry('warn', message, meta)),
  error: (message, meta = {}) =>
    console.error(formatEntry('error', message, meta)),
  debug: (message, meta = {}) =>
    console.debug(formatEntry('debug', message, meta)),
  fatal: (message, meta = {}) =>
    console.error(formatEntry('fatal', message, meta)),
};

/**
 * Express middleware that logs incoming requests and completed responses.
 * Attaches `req.log = logger` so handlers can log.
 */
function httpLogger(req, res, next) {
  const start = process.hrtime();
  req.log = logger;
  const path = req.originalUrl || req.url || '';
  const isStaticAsset =
    /\.(css|js|png|jpg|jpeg|svg|ico|map)$/i.test(path) ||
    path.startsWith('/swagger-ui');
  if (isStaticAsset && process.env.LOG_STATIC !== 'true') {
    // skip verbose logging for static assets unless explicitly enabled
    return next();
  }
  function onFinish() {
    res.removeListener('finish', onFinish);
    res.removeListener('close', onFinish);
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(3);
    // Build a concise meta object. Headers are only included when LOG_HEADERS=true
    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
    };

    if (process.env.LOG_HEADERS === 'true') {
      const allowed = [
        'host',
        'user-agent',
        'referer',
        'x-forwarded-for',
        'accept',
      ];
      const safe = redactHeaders(req.headers || {});
      const small = {};
      allowed.forEach((k) => {
        if (safe[k]) {
          let v = safe[k];
          if (typeof v === 'string' && v.length > 160)
            v = v.slice(0, 157) + '...';
          small[k] = v;
        }
      });
      if (Object.keys(small).length) meta.headers = small;
    }

    logger.info(
      `${req.method} ${req.originalUrl || req.url} ${res.statusCode}`,
      meta
    );
  }

  res.on('finish', onFinish);
  res.on('close', onFinish);

  next();
}

module.exports = {
  logger,
  httpLogger,
};
