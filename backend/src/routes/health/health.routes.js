const express = require('express');
const { healthCheck } = require('../../controllers/health/health.controller');

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Get backend health status
 *     description: Returns the current health status of the backend service.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Backend is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     message:
 *                       type: string
 *                     service:
 *                       type: string
 *                     database:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     uptime:
 *                       type: number
 */
router.get('/', healthCheck);

module.exports = router;
