const { Job } = require('../models/Job');
const { WorkOrder } = require('../models/WorkOrder');
const { Invoice } = require('../models/Invoice');

const { createNotification } = require('../utils/notifications');
const { getIo } = require('../sockets');

const { workflowEvents, WORKFLOW_EVENTS } = require('./workflowEvents');
const { ENTITY_TYPES } = require('./workflowService');

let initialized = false;

function buildNotification({ entityType, entity, toState, performedBy }) {
  const actorRole = performedBy && performedBy.role;

  if (entityType === ENTITY_TYPES.JOB) {
    const toUser = actorRole === 'agent' ? entity.assignedContractor : entity.createdBy;
    if (!toUser) return null;

    const titleMap = {
      ASSIGNED: 'Job assigned',
      IN_PROGRESS: 'Job started',
      COMPLETED: 'Job completed',
    };

    return {
      user: toUser,
      type: 'JOB',
      title: titleMap[toState] || 'Job updated',
      body: entity.title ? `${entity.title} is now ${String(toState).replace('_', ' ')}` : undefined,
      job: entity._id,
    };
  }

  if (entityType === ENTITY_TYPES.WORK_ORDER) {
    const toUser = actorRole === 'agent' ? entity.contractor : entity.agent;
    if (!toUser) return null;

    const titleMap = {
      ACTIVE: 'Work order issued',
      VERIFIED: 'Work order verified',
      CLOSED: 'Work order closed',
    };

    return {
      user: toUser,
      type: 'WORK_ORDER',
      title: titleMap[toState] || 'Work order updated',
      body: entity.workOrderNumber ? `Work order ${entity.workOrderNumber} is now ${toState}` : undefined,
      job: entity.job,
      workOrder: entity._id,
    };
  }

  if (entityType === ENTITY_TYPES.INVOICE) {
    const toUser = actorRole === 'agent' ? entity.contractor : entity.agent;
    if (!toUser) return null;

    const titleMap = {
      SUBMITTED: 'Invoice submitted',
      APPROVED: 'Invoice approved',
      REJECTED: 'Invoice rejected',
      PAID: 'Invoice paid',
    };

    return {
      user: toUser,
      type: 'INVOICE',
      title: titleMap[toState] || 'Invoice updated',
      body: entity.invoiceNumber ? `Invoice ${entity.invoiceNumber} is now ${toState}` : undefined,
      job: entity.job,
      workOrder: entity.workOrder,
      invoice: entity._id,
    };
  }

  return null;
}

async function loadEntityFresh(entityType, entityId) {
  if (entityType === ENTITY_TYPES.JOB) return Job.findById(entityId);
  if (entityType === ENTITY_TYPES.WORK_ORDER) return WorkOrder.findById(entityId);
  if (entityType === ENTITY_TYPES.INVOICE) return Invoice.findById(entityId);
  return null;
}

function initWorkflowNotifications() {
  if (initialized) return;
  initialized = true;

  workflowEvents.on(WORKFLOW_EVENTS.TRANSITIONED, async (evt) => {
    try {
      const { entityType, entity, toState, performedBy } = evt || {};
      if (!entityType || !entity || !toState) return;

      const fresh = await loadEntityFresh(entityType, entity._id);
      const source = fresh || entity;

      const notifArgs = buildNotification({ entityType, entity: source, toState, performedBy });
      if (!notifArgs) return;

      const notif = await createNotification(notifArgs);

      const io = getIo();
      if (io && notif) {
        io.to(`user:${String(notif.user)}`).emit('notification', notif);
      }

      const jobId = notifArgs.job;
      if (io && jobId) {
        io.to(`job:${String(jobId)}`).emit('workflow_transitioned', {
          entityType,
          entityId: String(entity._id),
          toState,
          performedBy,
        });
      }
    } catch (e) {
      return;
    }
  });
}

module.exports = { initWorkflowNotifications };
