const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getPosts, createPost, updatePost, deletePost, reactPost,
  getComments, addComment, deleteComment,
} = require('../controllers/posts.controller');

router.use(authenticateToken);

router.get('/', getPosts);
router.post('/', createPost);
router.patch('/:id', updatePost);
router.delete('/:id', deletePost);
router.post('/:id/react', reactPost);
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);
router.delete('/comments/:id', deleteComment);

module.exports = router;
