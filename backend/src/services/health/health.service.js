const { getHealthStatus } = require('../../models/health/health.model');

const getHealthSummary = async () => {
  const health = await getHealthStatus();

  return {
    status: health.status,
    message: 'Backend is healthy and ready',
    service: health.service,
    database: health.database,
    timestamp: health.timestamp,
    uptime: process.uptime(),
  };
};

module.exports = {
  getHealthSummary,
};
