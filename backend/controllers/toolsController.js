const path = require('path');

const { AppError } = require('../utils/appError');
const { generateNumber } = require('../utils/numbering');

const { Job } = require('../models/Job');
const { WorkOrder } = require('../models/WorkOrder');
const { Invoice } = require('../models/Invoice');
const { ToolsLog } = require('../models/ToolsLog');
const { Document } = require('../models/Document');

const { ENTITY_TYPES, transition } = require('../workflow/workflowService');

async function ensureJobAccess(user, job) {
  const isAgentOwner = String(job.createdBy) === String(user._id);
  const isAssignedContractor = job.assignedContractor && String(job.assignedContractor) === String(user._id);
  if (!isAgentOwner && !isAssignedContractor) throw new AppError('Forbidden', 403);
}

async function logTool(req, toolName, action, metadata) {
  await ToolsLog.create({
    user: req.user._id,
    role: req.user.role,
    toolName,
    action,
    metadata,
  });
}

async function getTools(req, res) {
  const common = [
    { key: 'JOB_STATUS_TRACKER', label: 'Job Status Tracker' },
    { key: 'COST_ESTIMATION', label: 'Cost Estimation Tool' },
    { key: 'DOCUMENT_MANAGER', label: 'Document Upload & Management' },
    { key: 'NOTIFICATION_CENTER', label: 'Notification Center' },
    { key: 'ANALYTICS_OVERVIEW', label: 'Analytics Overview' },
    { key: 'SETTINGS_PREFERENCES', label: 'Settings & Role Preferences' },
  ];

  const agentOnly = [
    { key: 'WORK_ORDER_AUTO_GENERATOR', label: 'Work Order Auto-Generator' },
  ];

  const contractorOnly = [
    { key: 'INVOICE_GENERATOR', label: 'Invoice Generator' },
  ];

  const tools = req.user.role === 'agent' ? common.concat(agentOnly) : common.concat(contractorOnly);
  await logTool(req, 'ANALYTICS_OVERVIEW', 'TOOLS_LIST_VIEWED', { role: req.user.role });
  res.json({ success: true, tools });
}

async function jobStatusTracker(req, res) {
  const { jobId } = req.query;
  if (!jobId) throw new AppError('jobId is required', 400);

  const job = await Job.findById(jobId).populate('createdBy', 'name role').populate('assignedContractor', 'name role');
  if (!job) throw new AppError('Job not found', 404);

  const allowed =
    String(job.createdBy._id) === String(req.user._id) ||
    (job.assignedContractor && String(job.assignedContractor._id) === String(req.user._id));
  if (!allowed) throw new AppError('Forbidden', 403);

  const workOrder = await WorkOrder.findOne({ job: job._id }).select('_id workOrderNumber status');
  const invoices = await Invoice.find({ job: job._id }).select('_id invoiceNumber status totalAmount currency createdAt');

  await logTool(req, 'JOB_STATUS_TRACKER', 'VIEW', { jobId });

  res.json({
    success: true,
    job,
    workOrder,
    invoices,
  });
}

async function analytics(req, res) {
  const userId = req.user._id;

  const jobFilter = req.user.role === 'agent' ? { createdBy: userId } : { assignedContractor: userId };
  const invoiceFilter = req.user.role === 'agent' ? { agent: userId } : { contractor: userId };

  const [jobCounts, invoiceCounts] = await Promise.all([
    Job.aggregate([
      { $match: jobFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: invoiceFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  await logTool(req, 'ANALYTICS_OVERVIEW', 'VIEW', {});

  res.json({
    success: true,
    analytics: {
      jobsByStatus: jobCounts,
      invoicesByStatus: invoiceCounts,
    },
  });
}

async function estimateCost(req, res) {
  const { lineItems } = req.body;
  const items = Array.isArray(lineItems) ? lineItems : [];
  const total = items.reduce((sum, li) => sum + Number(li.quantity || 0) * Number(li.unitCost || 0), 0);

  await logTool(req, 'COST_ESTIMATION', 'CALCULATE', { count: items.length });
  res.json({ success: true, estimate: { total } });
}

async function autoGenerateWorkOrder(req, res) {
  const { jobId } = req.body;
  if (!jobId) throw new AppError('jobId is required', 400);

  const job = await Job.findById(jobId);
  if (!job) throw new AppError('Job not found', 404);
  if (String(job.createdBy) !== String(req.user._id)) throw new AppError('Forbidden', 403);
  if (!job.assignedContractor) throw new AppError('Assign a contractor before generating a work order', 400);

  const existing = await WorkOrder.findOne({ job: job._id });
  if (existing) {
    await logTool(req, 'WORK_ORDER_AUTO_GENERATOR', 'EXISTS', { jobId });
    return res.json({ success: true, workOrder: existing });
  }

  const workOrder = await WorkOrder.create({
    job: job._id,
    agent: req.user._id,
    contractor: job.assignedContractor,
    workOrderNumber: generateNumber('WO'),
    scopeOfWork: job.description,
    terms: 'Standard terms apply',
    status: 'DRAFT',
    currentState: 'CREATED',
  });

  const transitioned = await transition({
    entityType: ENTITY_TYPES.WORK_ORDER,
    id: workOrder._id,
    nextState: 'ACTIVE',
    user: req.user,
    payload: {},
  });

  await logTool(req, 'WORK_ORDER_AUTO_GENERATOR', 'CREATE', { jobId, workOrderId: workOrder._id });
  res.status(201).json({ success: true, workOrder: transitioned.entity, audit: transitioned.audit });
}

async function uploadDocument(req, res) {
  const file = req.file;
  if (!file) throw new AppError('file is required', 400);

  const { jobId, workOrderId, invoiceId, tags } = req.body;

  const fileUrl = `/uploads/${path.basename(file.path)}`;

  const document = await Document.create({
    uploadedBy: req.user._id,
    role: req.user.role,
    job: jobId || undefined,
    workOrder: workOrderId || undefined,
    invoice: invoiceId || undefined,
    fileUrl,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    tags: Array.isArray(tags) ? tags : tags ? String(tags).split(',').map((t) => t.trim()).filter(Boolean) : [],
  });

  await logTool(req, 'DOCUMENT_MANAGER', 'UPLOAD', { documentId: document._id });
  res.status(201).json({ success: true, document });
}

async function listDocuments(req, res) {
  const { jobId, workOrderId, invoiceId } = req.query;

  const filter = {};

  if (jobId || workOrderId || invoiceId) {
    let job;

    if (invoiceId) {
      const inv = await Invoice.findById(invoiceId).select('job');
      if (!inv) throw new AppError('Invoice not found', 404);
      filter.invoice = invoiceId;
      job = await Job.findById(inv.job).select('createdBy assignedContractor');
    }

    if (!job && workOrderId) {
      const wo = await WorkOrder.findById(workOrderId).select('job');
      if (!wo) throw new AppError('Work order not found', 404);
      filter.workOrder = workOrderId;
      job = await Job.findById(wo.job).select('createdBy assignedContractor');
    }

    if (!job && jobId) {
      filter.job = jobId;
      job = await Job.findById(jobId).select('createdBy assignedContractor');
    }

    if (!job) throw new AppError('Job not found', 404);
    await ensureJobAccess(req.user, job);
  } else {
    filter.uploadedBy = req.user._id;
  }

  const documents = await Document.find(filter).sort({ createdAt: -1 }).limit(200);

  await logTool(req, 'DOCUMENT_MANAGER', 'LIST', { jobId, workOrderId, invoiceId });
  res.json({ success: true, documents });
}

async function updatePreferences(req, res) {
  const { theme, notifications } = req.body;

  if (theme && !['light', 'dark'].includes(theme)) throw new AppError('Invalid theme', 400);

  req.user.preferences = {
    ...req.user.preferences,
    ...(theme ? { theme } : {}),
    ...(typeof notifications === 'boolean' ? { notifications } : {}),
  };

  await req.user.save();

  await logTool(req, 'SETTINGS_PREFERENCES', 'UPDATE', { theme, notifications });
  res.json({ success: true, user: req.user });
}

module.exports = {
  getTools,
  jobStatusTracker,
  analytics,
  estimateCost,
  autoGenerateWorkOrder,
  uploadDocument,
  listDocuments,
  updatePreferences,
};
