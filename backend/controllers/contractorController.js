const { AppError } = require('../utils/appError');
const { generateNumber } = require('../utils/numbering');

const { Job } = require('../models/Job');
const { WorkOrder } = require('../models/WorkOrder');
const { Invoice } = require('../models/Invoice');
const { Notification } = require('../models/Notification');
const { createNotification } = require('../utils/notifications');

const { ENTITY_TYPES, transition } = require('../workflow/workflowService');

async function listOpenJobs(req, res) {
  const { q } = req.query;
  const filter = { status: 'OPEN' };
  if (q) {
    filter.$or = [{ title: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }, { location: new RegExp(q, 'i') }];
  }
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name email role');
  res.json({ success: true, jobs });
}

async function applyToJob(req, res) {
  const { note } = req.body;
  const job = await Job.findById(req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  if (job.status !== 'OPEN') throw new AppError('Job is not open for applications', 400);

  const exists = job.applicants.some((a) => String(a.contractor) === String(req.user._id));
  if (exists) throw new AppError('You already applied to this job', 409);

  job.applicants.push({ contractor: req.user._id, note, status: 'APPLIED' });
  await job.save();

  await createNotification({
    user: job.createdBy,
    type: 'JOB',
    title: 'New job application',
    body: `${req.user.name} applied to ${job.title}`,
    job: job._id,
  });

  res.status(201).json({ success: true, job });
}

async function listAssignedJobs(req, res) {
  const { status } = req.query;
  const filter = { assignedContractor: req.user._id };
  if (status) {
    filter.status = status;
  }

  const jobs = await Job.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name email role');
  res.json({ success: true, jobs });
}

async function updateJobStatus(req, res) {
  const { status } = req.body;
  if (!status) throw new AppError('status is required', 400);

  const job = await Job.findById(req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  if (!job.assignedContractor || String(job.assignedContractor) !== String(req.user._id)) {
    throw new AppError('Forbidden', 403);
  }

  const result = await transition({
    entityType: ENTITY_TYPES.JOB,
    id: job._id,
    nextState: status,
    user: req.user,
    payload: {},
  });

  res.json({ success: true, job: result.entity, audit: result.audit });
}

async function listWorkOrders(req, res) {
  const workOrders = await WorkOrder.find({ contractor: req.user._id })
    .sort({ createdAt: -1 })
    .populate('job')
    .populate('agent', 'name email role');

  res.json({ success: true, workOrders });
}

function computeTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
}

async function createInvoice(req, res) {
  const { jobId } = req.params;
  const { items, currency, notes } = req.body;

  const job = await Job.findById(jobId);
  if (!job) throw new AppError('Job not found', 404);
  if (!job.assignedContractor || String(job.assignedContractor) !== String(req.user._id)) {
    throw new AppError('Forbidden', 403);
  }

  const workOrder = await WorkOrder.findOne({ job: job._id });
  if (!workOrder) throw new AppError('Work order not found for this job', 404);

  const safeItems = Array.isArray(items) ? items : [];
  const totalAmount = computeTotal(safeItems);

  const invoice = await Invoice.create({
    job: job._id,
    workOrder: workOrder._id,
    agent: job.createdBy,
    contractor: req.user._id,
    invoiceNumber: generateNumber('INV'),
    items: safeItems,
    currency: currency || 'INR',
    totalAmount,
    status: 'DRAFT',
    currentState: 'DRAFT',
    notes,
  });

  const result = await transition({
    entityType: ENTITY_TYPES.INVOICE,
    id: invoice._id,
    nextState: 'SUBMITTED',
    user: req.user,
    payload: { items: safeItems, currency: currency || 'INR', notes },
  });

  res.status(201).json({ success: true, invoice: result.entity, audit: result.audit });
}

async function listInvoices(req, res) {
  const { status } = req.query;
  const filter = { contractor: req.user._id };
  if (status) filter.status = status;

  const invoices = await Invoice.find(filter)
    .sort({ createdAt: -1 })
    .populate('job')
    .populate('agent', 'name email role');

  res.json({ success: true, invoices });
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
  listOpenJobs,
  applyToJob,
  listAssignedJobs,
  updateJobStatus,
  listWorkOrders,
  createInvoice,
  listInvoices,
  listNotifications,
  markNotificationRead,
};
