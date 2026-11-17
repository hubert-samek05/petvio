const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const c = require('../controllers/friends.controller');

router.use(authenticateToken);
router.get('/', c.listFriends);
router.get('/requests', c.listRequests);
router.get('/search', c.searchPeople);
router.get('/settings', c.getMySettings);
router.patch('/settings', c.updateSettings);
router.get('/blocked', c.blockedList);
router.post('/block', c.blockUser);
router.delete('/block/:userId', c.unblockUser);
router.get('/profile/:userId', c.getProfile);
router.post('/request', c.sendRequest);
router.post('/accept', c.acceptRequest);
router.post('/decline', c.declineRequest);
router.post('/follow', c.followUser);
router.delete('/follow/:userId', c.unfollowUser);
router.get('/:userId/friends', c.listUserFriends);
router.delete('/:userId', c.removeFriend);

module.exports = router;
