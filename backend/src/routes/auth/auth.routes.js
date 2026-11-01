const router = require('express').Router();
const controller = require('../../controllers/auth/auth.controller');

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     summary: Start Google sign-in through the frontend /api proxy
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Google with a browser-bound OAuth attempt
 *       303:
 *         description: Redirect to welcome page if Google sign-in is unavailable
 * /api/auth/google/callback:
 *   get:
 *     summary: Complete Google sign-in (called by Google, not the UI)
 *     tags: [Authentication]
 *     responses:
 *       303:
 *         description: Set sid cookie and return to welcome page, or redirect with a safe error code
 * /api/auth/me:
 *   get:
 *     summary: Get the current user and renew a valid session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User profile (id, email, display_name, role), or user null when signed out
 * /api/auth/logout:
 *   post:
 *     summary: Delete the current session and clear sid
 *     description: Requires an Origin header matching ALLOWED_ORIGINS, even when signed out.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Session ended (also succeeds when already signed out)
 *       403:
 *         description: Missing or unapproved Origin header
 */
router.get('/google', controller.google);
router.get('/google/callback', controller.callback);
router.get('/me', controller.me);
router.post('/logout', controller.logout);

module.exports = router;
