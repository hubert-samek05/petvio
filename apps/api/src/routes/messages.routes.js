const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const c = require('../controllers/messages.controller');

router.use(authenticateToken);
router.get('/conversations', c.listConversations);
router.post('/conversations', c.openConversation);
router.get('/conversations/:id/messages', c.listMessages);
router.post('/conversations/:id/messages', c.sendMessage);
router.post('/conversations/:id/read', c.markRead);
router.post('/conversations/:id/hide', c.hideConversation);
router.post('/conversations/:id/flags', c.setFlags);
router.post('/conversations/:id/folder', c.setFolder);
router.get('/folders', c.listFolders);
router.post('/folders', c.createFolder);
router.patch('/folders/:id', c.renameFolder);
router.delete('/folders/:id', c.deleteFolder);
router.get('/unread', c.unreadTotal);

module.exports = router;
