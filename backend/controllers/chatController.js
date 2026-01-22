const { AppError } = require('../utils/appError');
const { Job } = require('../models/Job');
const { Message } = require('../models/Message');
const { getIo } = require('../sockets');

async function ensureJobAccess(user, jobId) {
  const job = await Job.findById(jobId);
  if (!job) throw new AppError('Job not found', 404);

  const isAgentOwner = String(job.createdBy) === String(user._id);
  const isAssignedContractor = job.assignedContractor && String(job.assignedContractor) === String(user._id);

  if (!isAgentOwner && !isAssignedContractor) throw new AppError('Forbidden', 403);

  return job;
}

async function listJobMessages(req, res) {
  const job = await ensureJobAccess(req.user, req.params.jobId);

  const messages = await Message.find({ job: job._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('fromUser', 'name role')
    .populate('toUser', 'name role');

  res.json({ success: true, messages: messages.reverse() });
}

async function sendJobMessage(req, res) {
  const { content } = req.body;
  if (!content) throw new AppError('content is required', 400);

  const job = await ensureJobAccess(req.user, req.params.jobId);

  const isAgentOwner = String(job.createdBy) === String(req.user._id);
  const toUser = isAgentOwner ? job.assignedContractor : job.createdBy;
  if (!toUser) throw new AppError('Chat is available only after contractor assignment', 400);

  const msg = await Message.create({
    job: job._id,
    fromUser: req.user._id,
    toUser,
    senderRole: req.user.role,
    content,
  });

  const populated = await Message.findById(msg._id)
    .populate('fromUser', 'name role')
    .populate('toUser', 'name role');

  res.status(201).json({ success: true, message: populated });
}

async function markJobMessagesRead(req, res) {
  const job = await ensureJobAccess(req.user, req.params.jobId);

  const unread = await Message.find({ job: job._id, toUser: req.user._id, readAt: { $exists: false } })
    .select('_id')
    .limit(500);

  const unreadIds = unread.map((m) => m._id);
  if (unreadIds.length === 0) {
    return res.json({ success: true, updated: 0 });
  }

  const now = new Date();
  const result = await Message.updateMany(
    { _id: { $in: unreadIds }, toUser: req.user._id },
    { $set: { readAt: now } }
  );

  const io = getIo();
  if (io) {
    io.to(`job:${String(job._id)}`).emit('messages_read', {
      jobId: String(job._id),
      readerId: String(req.user._id),
      messageIds: unreadIds.map((x) => String(x)),
      readAt: now.toISOString(),
    });
  }

  res.json({ success: true, updated: result.modifiedCount || 0 });
}

module.exports = { listJobMessages, sendJobMessage, markJobMessagesRead };
