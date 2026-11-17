const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const c = require('../controllers/business-pages.controller');

router.use(authenticateToken);
router.get('/mine', c.myPages);
router.get('/', c.listPages);
router.get('/:id', c.getPage);
router.post('/', c.createPage);
router.patch('/:id', c.updatePage);
router.delete('/:id', c.deletePage);

module.exports = router;
