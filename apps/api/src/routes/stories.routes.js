const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getStories, createStory, viewStory, deleteStory } = require('../controllers/stories.controller');

router.use(authenticateToken);

router.get('/', getStories);
router.post('/', createStory);
router.post('/:id/view', viewStory);
router.delete('/:id', deleteStory);

module.exports = router;
