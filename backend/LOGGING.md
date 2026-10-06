# Logging Guide

## Overview

This app uses a simple console-based JSON logger that:
- Outputs JSON lines for easy parsing
- Supports common log levels (fatal, error, warn, info, debug)
- Attaches `req.log` on HTTP requests so handlers can log
- Redacts a small set of sensitive headers by default

## Configuration

Logging is configured in `src/config/logger.js`:

```javascript
const { logger, httpLogger } = require('./config/logger');

app.use(httpLogger); // HTTP request/response logging
logger.info('Application started'); // Manual logging
```

## Using the logger

The `logger` object exposes common level methods. Each method accepts a `message` and
an optional `meta` object which will be included in the JSON output.

```javascript
const { logger } = require('./config/logger');

logger.fatal('Critical error that crashes the app');
logger.error('Error that needs attention', { err });
logger.warn('Warning for unexpected conditions');
logger.info('Informational message');
logger.debug('Debug details for development');
```

Include context objects for easier debugging:

```javascript
logger.info('User logged in', { userId: 123, action: 'login' });
logger.error('Health check failed', { err, endpoint: '/api/health' });
```

## Security: Never log secrets

By default the middleware redacts common sensitive headers (for example `authorization` and
`x-api-key`). Avoid logging secrets and add any additional sensitive fields directly in
your code (do not include raw passwords, tokens, or secrets in log meta objects).

## Log levels

The simple logger does not currently support dynamic level filtering via `LOG_LEVEL`.
If you need that behavior we can add a small environment-controlled wrapper.

## Examples

### In a controller
```javascript
// In a controller
const { getHealthSummary } = require('../services/health.service');

const healthCheck = async (req, res) => {
  try {
    const health = await getHealthSummary();
    req.log.info('Health check successful', { endpoint: '/health' });
    return res.status(200).json({ success: true, data: health });
  } catch (error) {
    req.log.error('Health check failed', { err: error });
    return res.status(500).json({ success: false, message: 'Health check failed' });
  }
};
```

### In a service
```javascript
const { logger } = require('./config/logger');

const getHealthSummary = async () => {
  logger.debug('Fetching health status...');
  // ... service logic
  logger.info('Health status retrieved successfully');
  return result;
};
```

## Log output format

### Example JSON line
```json
{"timestamp":"2026-10-04T00:00:00.000Z","level":"info","message":"Health check successful","meta":{"endpoint":"/health"}}
```

### In log aggregation service
Once sent to a service like Datadog, you can:
- Search by request ID to see all logs from one request
- Filter by log level
- Alert on error counts
- Build dashboards on patterns

## Best practices

1. **Include context** - Add relevant data to help debugging
   ```javascript
   logger.info({ userId: 123, action: 'login' }, 'User action');
   ```

2. **Use appropriate levels** - Don't use `error` for warnings
   ```javascript
   logger.warn('Retry attempt 1 of 3'); // Warning, not error
   ```

3. **Never leak secrets** - Always add sensitive fields to redact list
   ```javascript
   // Add to src/config/logger.js if you have custom sensitive fields
   redact: { paths: ['req.body.mySecret'] }
   ```

4. **Use structured IDs** - Request IDs are already added, but you can add transaction IDs:
   ```javascript
   logger.info({ transactionId: 'tx-123' }, 'Processing payment');
   ```

5. **Log at boundaries** - Log when crossing service boundaries
   ```javascript
   logger.debug('Calling external API');
   const result = await externalAPI();
   logger.info({ status: result.code }, 'External API response');
   ```

## Integration with log aggregation

This simple logger writes JSON lines to stdout/stderr. To integrate with aggregation services
you can pipe or collect the process output, or replace this module with a transport-aware
implementation (we can add a small transport if you want Datadog/ELK integration).
