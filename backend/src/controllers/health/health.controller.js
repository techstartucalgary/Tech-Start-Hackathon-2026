const { getHealthSummary } = require('../../services/health/health.service');

const healthCheck = async (req, res) => {
  try {
    const health = await getHealthSummary();
    return res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    const log = req.log || console;
    log.error('Health check failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
    });
  }
};

module.exports = {
  healthCheck,
};
