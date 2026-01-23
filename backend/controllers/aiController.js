const { AppError } = require('../utils/appError');
const { Job } = require('../models/Job');
const { WorkOrder } = require('../models/WorkOrder');
const { Invoice } = require('../models/Invoice');
const { User } = require('../models/User');
const { Notification } = require('../models/Notification');
const { Message } = require('../models/Message');

const ai = require('../services/aiService');

// IMPORTANT (AI Design Principle):
// These endpoints provide AI-assisted suggestions only.
// They MUST NOT change FSM state and MUST NOT auto-approve/auto-assign.

function normalizeId(x) {
  return String(x?._id || x?.id || x || '');
}

function ensureJobAccess({ job, user }) {
  if (!job) throw new AppError('Job not found', 404);
  const uid = normalizeId(user?._id);
  const isAgentOwner = normalizeId(job.createdBy) === uid;
  const isAssignedContractor = normalizeId(job.assignedContractor) === uid;
  if (!isAgentOwner && !isAssignedContractor) throw new AppError('Forbidden', 403);
}

async function suggestContractors(req, res) {
  const { jobId } = req.body || {};
  if (!jobId) throw new AppError('jobId is required', 400);

  const job = await Job.findById(jobId);
  if (!job) throw new AppError('Job not found', 404);
  if (normalizeId(job.createdBy) !== normalizeId(req.user._id)) throw new AppError('Forbidden', 403);

  const requiredSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
  const location = job.location || job.area || '';

  const contractors = await User.find({ role: 'contractor' })
    .select('name email contractorProfile')
    .sort({ createdAt: -1 })
    .limit(100);

  const contractorIds = contractors.map((c) => c._id);
  const stats = await Job.aggregate([
    { $match: { assignedContractor: { $in: contractorIds } } },
    {
      $group: {
        _id: '$assignedContractor',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
      },
    },
  ]);

  const completionRateByContractorId = new Map(
    stats.map((s) => {
      const total = Number(s.total || 0);
      const completed = Number(s.completed || 0);
      const rate = total > 0 ? completed / total : null;
      return [String(s._id), rate];
    })
  );

  contractors.forEach((c) => {
    const rate = completionRateByContractorId.get(String(c._id));
    if (typeof rate === 'number') {
      c.completionRate = rate;
    }
  });

  const payloadHash = ai.hashPayload({ requiredSkills, location, contractors: contractors.map((c) => normalizeId(c._id)) });
  const cacheKey = `ai:suggest-contractors:${normalizeId(req.user._id)}:${normalizeId(job._id)}:${payloadHash}`;

  const result = await ai.withCache({
    cacheKey,
    compute: async () => {
      const computed = await ai.suggestContractors({
        job: { requiredSkills, location },
        contractors,
      });
      return { result: computed };
    },
  });

  res.json({ success: true, ...result });
}

async function generateWorkOrderSummary(req, res) {
  const { workOrderId } = req.body || {};
  if (!workOrderId) throw new AppError('workOrderId is required', 400);

  const wo = await WorkOrder.findById(workOrderId).populate('job').populate('contractor', 'contractorProfile');
  if (!wo) throw new AppError('Work order not found', 404);
  if (normalizeId(wo.agent) !== normalizeId(req.user._id)) throw new AppError('Forbidden', 403);

  const job = wo.job;
  const contractorSkills = wo.contractor?.contractorProfile?.skills || [];

  const payloadHash = ai.hashPayload({
    jobId: normalizeId(job?._id),
    workOrderId: normalizeId(wo._id),
    jobTitle: job?.title,
    jobDescription: job?.description,
    contractorSkills,
  });
  const cacheKey = `ai:workorder-summary:${normalizeId(req.user._id)}:${normalizeId(wo._id)}:${payloadHash}`;

  const result = await ai.withCache({
    cacheKey,
    compute: async () => {
      const computed = await ai.generateWorkOrderSummary({
        jobTitle: job?.title,
        jobDescription: job?.description,
        contractorSkills,
      });
      return { result: computed };
    },
  });

  res.json({ success: true, ...result });
}

async function suggestInvoiceItems(req, res) {
  const { jobId } = req.body || {};
  if (!jobId) throw new AppError('jobId is required', 400);

  const job = await Job.findById(jobId);
  if (!job) throw new AppError('Job not found', 404);
  if (normalizeId(job.assignedContractor) !== normalizeId(req.user._id)) throw new AppError('Forbidden', 403);

  const contractorSkills = req.user?.contractorProfile?.skills || [];

  const payloadHash = ai.hashPayload({ jobId: normalizeId(job._id), contractorSkills, title: job.title });
  const cacheKey = `ai:invoice-items:${normalizeId(req.user._id)}:${normalizeId(job._id)}:${payloadHash}`;

  const result = await ai.withCache({
    cacheKey,
    compute: async () => {
      const computed = await ai.suggestInvoiceItems({ jobTitle: job.title, contractorSkills });
      return { result: computed };
    },
  });

  res.json({ success: true, ...result });
}

async function summarizeChat(req, res) {
  const { jobId, limit } = req.body || {};
  if (!jobId) throw new AppError('jobId is required', 400);

  const job = await Job.findById(jobId);
  ensureJobAccess({ job, user: req.user });

  const n = Math.max(5, Math.min(Number(limit || 20), 50));

  const messages = await Message.find({ job: jobId })
    .sort({ createdAt: -1 })
    .limit(n)
    .select('content senderRole createdAt');

  const payloadHash = ai.hashPayload({ jobId: normalizeId(jobId), n, messages: messages.map((m) => normalizeId(m._id)) });
  const cacheKey = `ai:chat-summary:${normalizeId(req.user._id)}:${normalizeId(jobId)}:${payloadHash}`;

  const result = await ai.withCache({
    cacheKey,
    compute: async () => {
      const computed = await ai.summarizeChat({ messages });
      return { result: computed };
    },
  });

  res.json({ success: true, ...result });
}

async function predictJobCost(req, res) {
  const { title, description, location, currency } = req.body || {};

  const t = String(title || '').trim();
  const d = String(description || '').trim();
  if (!t || !d) throw new AppError('title and description are required', 400);

  const loc = String(location || '').trim();

  const invoices = await Invoice.find({ agent: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('job', 'title location')
    .select('totalAmount currency job');

  const similar = invoices.filter((inv) => {
    const jt = String(inv.job?.title || '').toLowerCase();
    const jl = String(inv.job?.location || '').toLowerCase();
    if (loc && jl && !jl.includes(loc.toLowerCase())) return false;
    const kw = t.toLowerCase().split(' ').filter(Boolean).slice(0, 2);
    return kw.length ? kw.some((k) => jt.includes(k)) : true;
  });

  const payloadHash = ai.hashPayload({ t, d, loc, ids: similar.map((x) => normalizeId(x._id)).slice(0, 20) });
  const cacheKey = `ai:predict-job-cost:${normalizeId(req.user._id)}:${payloadHash}`;

  const result = await ai.withCache({
    cacheKey,
    compute: async () => {
      const computed = await ai.predictJobCost({
        title: t,
        description: d,
        location: loc,
        currency: currency || 'INR',
        similarInvoices: similar.slice(0, 20),
      });
      return { result: computed };
    },
  });

  res.json({ success: true, ...result });
}

async function prioritizeNotifications(req, res) {
  const { notifications } = req.body || {};

  let source = Array.isArray(notifications) ? notifications : null;

  if (!source) {
    source = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  }

  const payloadHash = ai.hashPayload({ ids: source.map((n) => normalizeId(n._id)) });
  const cacheKey = `ai:prioritize-notifications:${normalizeId(req.user._id)}:${payloadHash}`;

  const result = await ai.withCache({
    cacheKey,
    compute: async () => {
      const computed = await ai.prioritizeNotifications({ notifications: source });
      return { result: computed };
    },
  });

  res.json({ success: true, ...result });
}

module.exports = {
  suggestContractors,
  generateWorkOrderSummary,
  suggestInvoiceItems,
  summarizeChat,
  predictJobCost,
  prioritizeNotifications,
};
