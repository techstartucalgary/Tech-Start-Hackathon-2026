const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initializeDatabase } = require('./config/database');
const { swaggerUi, swaggerSpec } = require('./config/swagger');
const { httpLogger, logger } = require('./config/logger');
const healthRoutes = require('./routes/health/health.routes');

const app = express();

app.use(helmet());
app.use(httpLogger);
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api', (req, res) => {
  res.json({
    message: 'Tech Start Hackathon 2026 API',
    endpoints: {
      health: '/api/health',
      docs: '/swagger-ui',
    },
  });
});

app.use('/api/health', healthRoutes);
app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err, req, res, next) => {
  const log = req.log || logger;
  log.error({ err }, 'Unhandled error');

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

initializeDatabase()
  .then(() => {
    logger.info('Database initialized');
  })
  .catch((error) => {
    logger.error({ err: error }, 'Database initialization failed');
  });

module.exports = app;
