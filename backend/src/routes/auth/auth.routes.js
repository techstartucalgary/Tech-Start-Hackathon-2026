const router = require('express').Router();
const controller = require('../../controllers/auth/auth.controller');

router.get('/google', controller.google);
router.get('/google/callback', controller.callback);
router.get('/me', controller.me);
router.post('/logout', controller.logout);

module.exports = router;
