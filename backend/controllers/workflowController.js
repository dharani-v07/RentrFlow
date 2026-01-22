const { AppError } = require('../utils/appError');

const { ENTITY_TYPES, transition } = require('../workflow/workflowService');

const { WorkflowAudit } = require('../models/WorkflowAudit');
const { Job } = require('../models/Job');
const { WorkOrder } = require('../models/WorkOrder');
const { Invoice } = require('../models/Invoice');

function getNextState(req) {
  const body = req.body || {};
  const nextState = body.nextState || body.toState || body.state;
  if (!nextState) throw new AppError('nextState is required', 400);
  return nextState;
}

function getPayload(req) {
  const body = req.body || {};
  const { payload, nextState, toState, state, ...rest } = body;

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return { ...rest, ...payload };
  }

  return rest;
}

async function transitionJob(req, res) {
  const result = await transition({
    entityType: ENTITY_TYPES.JOB,
    id: req.params.jobId,
    nextState: getNextState(req),
    user: req.user,
    payload: getPayload(req),
  });

  res.json({ success: true, entity: result.entity, audit: result.audit });
}

async function transitionWorkOrder(req, res) {
  const result = await transition({
    entityType: ENTITY_TYPES.WORK_ORDER,
    id: req.params.workOrderId,
    nextState: getNextState(req),
    user: req.user,
    payload: getPayload(req),
  });

  res.json({ success: true, entity: result.entity, audit: result.audit });
}

async function transitionInvoice(req, res) {
  const result = await transition({
    entityType: ENTITY_TYPES.INVOICE,
    id: req.params.invoiceId,
    nextState: getNextState(req),
    user: req.user,
    payload: getPayload(req),
  });

  res.json({ success: true, entity: result.entity, audit: result.audit });
}

async function getJobWorkflowHistory(req, res) {
  const job = await Job.findById(req.params.jobId).select('createdBy assignedContractor currentState status');
  if (!job) throw new AppError('Job not found', 404);

  const isAgentOwner = String(job.createdBy) === String(req.user._id);
  const isAssignedContractor = job.assignedContractor && String(job.assignedContractor) === String(req.user._id);
  if (!isAgentOwner && !isAssignedContractor) throw new AppError('Forbidden', 403);

  let history = await WorkflowAudit.find({ entityType: ENTITY_TYPES.JOB, entityId: job._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('performedBy.user', 'name role');

  if (!history || history.length === 0) {
    const initialToState = job.currentState || job.status || 'OPEN';
    const created = await WorkflowAudit.create({
      entityType: ENTITY_TYPES.JOB,
      entityId: job._id,
      fromState: 'N/A',
      toState: initialToState,
      performedBy: { user: job.createdBy, role: 'agent' },
      job: job._id,
    });
    history = [created];
  }

  res.json({ success: true, history });
}

async function getWorkOrderWorkflowHistory(req, res) {
  const wo = await WorkOrder.findById(req.params.workOrderId).select('agent contractor currentState status job');
  if (!wo) throw new AppError('Work order not found', 404);

  const isAgent = String(wo.agent) === String(req.user._id);
  const isContractor = String(wo.contractor) === String(req.user._id);
  if (!isAgent && !isContractor) throw new AppError('Forbidden', 403);

  let history = await WorkflowAudit.find({ entityType: ENTITY_TYPES.WORK_ORDER, entityId: wo._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('performedBy.user', 'name role');

  if (!history || history.length === 0) {
    const initialToState = wo.currentState || wo.status || 'ACTIVE';
    const created = await WorkflowAudit.create({
      entityType: ENTITY_TYPES.WORK_ORDER,
      entityId: wo._id,
      fromState: 'N/A',
      toState: initialToState,
      performedBy: { user: wo.agent, role: 'agent' },
      job: wo.job,
      workOrder: wo._id,
    });
    history = [created];
  }

  res.json({ success: true, history });
}

async function getInvoiceWorkflowHistory(req, res) {
  const inv = await Invoice.findById(req.params.invoiceId).select('agent contractor currentState status job workOrder');
  if (!inv) throw new AppError('Invoice not found', 404);

  const isAgent = String(inv.agent) === String(req.user._id);
  const isContractor = String(inv.contractor) === String(req.user._id);
  if (!isAgent && !isContractor) throw new AppError('Forbidden', 403);

  let history = await WorkflowAudit.find({ entityType: ENTITY_TYPES.INVOICE, entityId: inv._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('performedBy.user', 'name role');

  if (!history || history.length === 0) {
    const initialToState = inv.currentState || inv.status || 'DRAFT';
    const created = await WorkflowAudit.create({
      entityType: ENTITY_TYPES.INVOICE,
      entityId: inv._id,
      fromState: 'N/A',
      toState: initialToState,
      performedBy: { user: inv.contractor, role: 'contractor' },
      job: inv.job,
      workOrder: inv.workOrder,
      invoice: inv._id,
    });
    history = [created];
  }

  res.json({ success: true, history });
}

module.exports = {
  transitionJob,
  transitionWorkOrder,
  transitionInvoice,
  getJobWorkflowHistory,
  getWorkOrderWorkflowHistory,
  getInvoiceWorkflowHistory,
};
