const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const { User } = require('../models/User');
const { Job } = require('../models/Job');
const { WorkOrder } = require('../models/WorkOrder');
const { Message } = require('../models/Message');

let io;

function createSocketServer(httpServer) {
  const clientOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : null;

  io = new Server(httpServer, {
    cors: {
      origin: clientOrigins || '*',
      credentials: Boolean(clientOrigins),
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.sub).select('-passwordHash');
      if (!user) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch (e) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${String(socket.user._id)}`);

    socket.on('join_job_chat', async ({ jobId }) => {
      if (!jobId) return;
      const job = await Job.findById(jobId);
      if (!job) return;

      const isAgentOwner = String(job.createdBy) === String(socket.user._id);
      const isAssignedContractor = job.assignedContractor && String(job.assignedContractor) === String(socket.user._id);
      if (!isAgentOwner && !isAssignedContractor) return;

      socket.join(`job:${jobId}`);
    });

    socket.on('send_message', async ({ jobId, content }) => {
      if (!jobId || !content) return;
      const job = await Job.findById(jobId);
      if (!job) return;

      const isAgentOwner = String(job.createdBy) === String(socket.user._id);
      const isAssignedContractor = job.assignedContractor && String(job.assignedContractor) === String(socket.user._id);
      if (!isAgentOwner && !isAssignedContractor) return;

      const toUser = isAgentOwner ? job.assignedContractor : job.createdBy;
      if (!toUser) return;

      const wo = await WorkOrder.findOne({ job: job._id }).select('_id');

      const msg = await Message.create({
        job: job._id,
        workOrder: wo ? wo._id : undefined,
        fromUser: socket.user._id,
        toUser,
        senderRole: socket.user.role,
        content,
      });

      const populated = await Message.findById(msg._id)
        .populate('fromUser', 'name role')
        .populate('toUser', 'name role');

      io.to(`job:${jobId}`).emit('message', populated);
    });
  });

  return io;
}

function getIo() {
  return io;
}

module.exports = { createSocketServer, getIo };
