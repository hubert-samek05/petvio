const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getGroups, createGroup, getGroup, updateGroup, deleteGroup,
  joinGroup, leaveGroup, getMembers, approveMember, removeMember, setMemberRole,
  getGroupPosts, getPendingPosts, createGroupPost, approveGroupPost, rejectGroupPost,
  updateGroupPost, deleteGroupPost, pinGroupPost, reactGroupPost,
  getGroupPostComments, addGroupPostComment, deleteGroupPostComment,
  getEvents, createEvent, respondEvent, deleteEvent, claimTicket, unclaimTicket,
  getPolls, createPoll, votePoll, deletePoll,
  getContests, getContest, createContest, addContestEntry, deleteContestEntry,
  pickContestWinner, deleteContest,
} = require('../controllers/groups.controller');

router.use(authenticateToken);

// Grupy
router.get('/', getGroups);
router.post('/', createGroup);
router.get('/:id', getGroup);
router.patch('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Członkostwo
router.post('/:id/join', joinGroup);
router.delete('/:id/leave', leaveGroup);
router.get('/:id/members', getMembers);
router.post('/:id/members/:uid/approve', approveMember);
router.delete('/:id/members/:uid', removeMember);
router.patch('/:id/members/:uid', setMemberRole);

// Posty w grupie
router.get('/:id/posts', getGroupPosts);
router.get('/:id/pending-posts', getPendingPosts);
router.post('/:id/posts', createGroupPost);
router.post('/posts/:id/approve', approveGroupPost);
router.post('/posts/:id/reject', rejectGroupPost);
router.patch('/posts/:id', updateGroupPost);
router.delete('/posts/:id', deleteGroupPost);
router.post('/posts/:id/pin', pinGroupPost);
router.post('/posts/:id/react', reactGroupPost);
router.get('/posts/:id/comments', getGroupPostComments);
router.post('/posts/:id/comments', addGroupPostComment);
router.delete('/comments/:id', deleteGroupPostComment);

// Wydarzenia
router.get('/:id/events', getEvents);
router.post('/:id/events', createEvent);
router.post('/events/:id/respond', respondEvent);
router.post('/events/:id/tickets', claimTicket);
router.delete('/events/:id/tickets', unclaimTicket);
router.delete('/events/:id', deleteEvent);

// Ankiety
router.get('/:id/polls', getPolls);
router.post('/:id/polls', createPoll);
router.post('/polls/:id/vote', votePoll);
router.delete('/polls/:id', deletePoll);

// Konkursy
router.get('/:id/contests', getContests);
router.post('/:id/contests', createContest);
router.get('/contests/:id', getContest);
router.post('/contests/:id/entries', addContestEntry);
router.post('/contests/:id/winner', pickContestWinner);
router.delete('/contests/:id', deleteContest);
router.delete('/contests/entries/:id', deleteContestEntry);

module.exports = router;
