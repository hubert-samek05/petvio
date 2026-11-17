const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getNotifications, markRead, markAllRead, registerDeviceToken, removeDeviceToken } = require('../controllers/notifications.controller');

router.use(authenticateToken);
router.get('/', getNotifications);
router.post('/devices', registerDeviceToken);
router.delete('/devices', removeDeviceToken);
router.post('/:id/read', markRead);
router.post('/read-all', markAllRead);

module.exports = router;
