const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const { listJobMessages, sendJobMessage, markJobMessagesRead } = require('../controllers/chatController');

const router = express.Router();

router.use(requireAuth);

router.get('/jobs/:jobId/messages', asyncHandler(listJobMessages));
router.post('/jobs/:jobId/messages', asyncHandler(sendJobMessage));
router.post('/jobs/:jobId/read', asyncHandler(markJobMessagesRead));

module.exports = router;
