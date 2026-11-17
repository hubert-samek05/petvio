const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getPosts, createPost, updatePost, deletePost,
  togglePostLike, reportPost,
  getComments, addComment, deleteComment, toggleCommentLike,
} = require('../controllers/forum.controller');

router.use(authenticateToken);
router.get('/posts', getPosts);
router.post('/posts', createPost);
router.patch('/posts/:id', updatePost);
router.delete('/posts/:id', deletePost);
router.post('/posts/:id/like', togglePostLike);
router.post('/posts/:id/report', reportPost);
router.get('/posts/:id/comments', getComments);
router.post('/posts/:id/comments', addComment);
router.delete('/comments/:id', deleteComment);
router.post('/comments/:id/like', toggleCommentLike);

module.exports = router;
