const { db } = require('../../config/database');

const getHealthStatus = () =>
  new Promise((resolve, reject) => {
    db.get('SELECT 1 AS ok', (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        status: 'ok',
        service: 'backend',
        database: 'sqlite',
        timestamp: new Date().toISOString(),
      });
    });
  });

module.exports = {
  getHealthStatus,
};
