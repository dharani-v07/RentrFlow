const { AppError } = require('../utils/appError');
const { generateNumber } = require('../utils/numbering');
const { Job } = require('../models/Job');
const { User } = require('../models/User');
const { WorkOrder } = require('../models/WorkOrder');
const { Invoice } = require('../models/Invoice');
const { Notification } = require('../models/Notification');

const { ENTITY_TYPES, transition } = require('../workflow/workflowService');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toStringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

async function agentStats(req, res) {
  const agentId = req.user._id;

  const [open, assigned, inProgress, completed, invoicesPending] = await Promise.all([
    Job.countDocuments({ createdBy: agentId, status: 'OPEN' }),
    Job.countDocuments({ createdBy: agentId, status: 'ASSIGNED' }),
    Job.countDocuments({ createdBy: agentId, status: 'IN_PROGRESS' }),
    Job.countDocuments({ createdBy: agentId, status: 'COMPLETED' }),
    Invoice.countDocuments({ agent: agentId, status: 'SUBMITTED' }),
  ]);

  res.json({
    success: true,
    stats: {
      open,
      assigned,
      inProgress,
      completed,
      invoicesPending,
    },
  });
}

async function createJob(req, res) {
  const { title, description, location, area, requiredSkills, budgetAmount, currency } = req.body;
  if (!title || !description) throw new AppError('title and description are required', 400);

  const skills = toStringList(requiredSkills);
  const effectiveLocation = location || area;

  const job = await Job.create({
    createdBy: req.user._id,
    title,
    description,
    location: effectiveLocation,
    area: effectiveLocation,
    requiredSkills: skills,
    budget: {
      currency: currency || 'INR',
      amount: Number(budgetAmount || 0),
    },
  });

  res.status(201).json({ success: true, job });
}

async function listMyJobs(req, res) {
  const { status } = req.query;
  const filter = { createdBy: req.user._id };
  if (status) {
    filter.status = status;
  }

  const jobs = await Job.find(filter)
    .sort({ createdAt: -1 })
    .populate('assignedContractor', 'name email role');

  res.json({ success: true, jobs });
}

async function getJob(req, res) {
  const job = await Job.findById(req.params.jobId)
    .populate('assignedContractor', 'name email role')
    .populate('createdBy', 'name email role');

  if (!job) throw new AppError('Job not found', 404);
  if (String(job.createdBy._id) !== String(req.user._id)) throw new AppError('Forbidden', 403);

  res.json({ success: true, job });
}

async function listContractors(req, res) {
  const { q, area, location, skills } = req.query;
  const filter = { role: 'contractor' };
  if (q) {
    filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  }

  const skillsList = toStringList(skills);
  const areaValue = area || location;
  if (areaValue) {
    filter['contractorProfile.serviceAreas'] = new RegExp(escapeRegex(areaValue), 'i');
  }
  if (skillsList.length > 0) {
    filter['contractorProfile.skills'] = {
      $in: skillsList.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')),
    };
  }

  const contractors = await User.find(filter).select('name email role contractorProfile').sort({ createdAt: -1 });
  res.json({ success: true, contractors });
}

async function assignContractor(req, res) {
  const { contractorId } = req.body;
  if (!contractorId) throw new AppError('contractorId is required', 400);

  const job = await Job.findById(req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  if (String(job.createdBy) !== String(req.user._id)) throw new AppError('Forbidden', 403);

  const contractor = await User.findOne({ _id: contractorId, role: 'contractor' });
  if (!contractor) throw new AppError('Contractor not found', 404);

  const result = await transition({
    entityType: ENTITY_TYPES.JOB,
    id: job._id,
    nextState: 'ASSIGNED',
    user: req.user,
    payload: { contractorId: contractor._id },
  });

  const existingWorkOrder = await WorkOrder.findOne({ job: result.entity._id });
  if (!existingWorkOrder) {
    const created = await WorkOrder.create({
      job: result.entity._id,
      agent: req.user._id,
      contractor: contractor._id,
      workOrderNumber: generateNumber('WO'),
      scopeOfWork: result.entity.description,
      terms: 'Standard terms apply',
      status: 'DRAFT',
      currentState: 'CREATED',
    });

    await transition({
      entityType: ENTITY_TYPES.WORK_ORDER,
      id: created._id,
      nextState: 'ACTIVE',
      user: req.user,
      payload: {},
    });
  }

  const populated = await Job.findById(result.entity._id).populate('assignedContractor', 'name email role');
  res.json({ success: true, job: populated });
}

async function listApplicants(req, res) {
  const job = await Job.findById(req.params.jobId)
    .populate('applicants.contractor', 'name email role contractorProfile')
    .select('title status applicants createdBy');

  if (!job) throw new AppError('Job not found', 404);
  if (String(job.createdBy) !== String(req.user._id)) throw new AppError('Forbidden', 403);

  res.json({ success: true, applicants: job.applicants, job: { id: job._id, title: job.title, status: job.status } });
}

async function listWorkOrders(req, res) {
  const workOrders = await WorkOrder.find({ agent: req.user._id })
    .sort({ createdAt: -1 })
    .populate('job')
    .populate('contractor', 'name email role');

  res.json({ success: true, workOrders });
}

async function listInvoices(req, res) {
  const { status } = req.query;
  const filter = { agent: req.user._id };
  if (status) filter.status = status;

  const invoices = await Invoice.find(filter)
    .sort({ createdAt: -1 })
    .populate('job')
    .populate('contractor', 'name email role');

  res.json({ success: true, invoices });
}

async function approveInvoice(req, res) {
  const invoice = await Invoice.findById(req.params.invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (String(invoice.agent) !== String(req.user._id)) throw new AppError('Forbidden', 403);

  const result = await transition({
    entityType: ENTITY_TYPES.INVOICE,
    id: invoice._id,
    nextState: 'APPROVED',
    user: req.user,
    payload: {},
  });

  res.json({ success: true, invoice: result.entity, audit: result.audit });
}

async function rejectInvoice(req, res) {
  const { reason } = req.body;

  const invoice = await Invoice.findById(req.params.invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (String(invoice.agent) !== String(req.user._id)) throw new AppError('Forbidden', 403);

  const result = await transition({
    entityType: ENTITY_TYPES.INVOICE,
    id: invoice._id,
    nextState: 'REJECTED',
    user: req.user,
    payload: { reason },
  });

  res.json({ success: true, invoice: result.entity, audit: result.audit });
}

async function markInvoicePaid(req, res) {
  const invoice = await Invoice.findById(req.params.invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (String(invoice.agent) !== String(req.user._id)) throw new AppError('Forbidden', 403);

  const result = await transition({
    entityType: ENTITY_TYPES.INVOICE,
    id: invoice._id,
    nextState: 'PAID',
    user: req.user,
    payload: {},
  });

  res.json({ success: true, invoice: result.entity, audit: result.audit });
}

async function listNotifications(req, res) {
  const { unread } = req.query;
  const filter = { user: req.user._id };
  if (unread === 'true') filter.read = false;

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, notifications });
}

async function markNotificationRead(req, res) {
  const notif = await Notification.findOne({ _id: req.params.notificationId, user: req.user._id });
  if (!notif) throw new AppError('Notification not found', 404);
  notif.read = true;
  await notif.save();
  res.json({ success: true, notification: notif });
}

module.exports = {
  agentStats,
  createJob,
  listMyJobs,
  getJob,
  listApplicants,
  listContractors,
  assignContractor,
  listWorkOrders,
  listInvoices,
  approveInvoice,
  rejectInvoice,
  markInvoicePaid,
  listNotifications,
  markNotificationRead,
};
