const { AppError } = require('../utils/appError');

const { Job } = require('../models/Job');
const { WorkOrder } = require('../models/WorkOrder');
const { Invoice } = require('../models/Invoice');
const { WorkflowAudit } = require('../models/WorkflowAudit');

const { workflowEvents, WORKFLOW_EVENTS } = require('./workflowEvents');

const ENTITY_TYPES = {
  JOB: 'JOB',
  WORK_ORDER: 'WORK_ORDER',
  INVOICE: 'INVOICE',
};

const JOB_STATES = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

const WORK_ORDER_STATES = {
  CREATED: 'CREATED',
  ACTIVE: 'ACTIVE',
  VERIFIED: 'VERIFIED',
  CLOSED: 'CLOSED',
};

const INVOICE_STATES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
};

const TRANSITIONS = {
  [ENTITY_TYPES.JOB]: {
    [JOB_STATES.OPEN]: { [JOB_STATES.ASSIGNED]: { roles: ['agent'] } },
    [JOB_STATES.ASSIGNED]: { [JOB_STATES.IN_PROGRESS]: { roles: ['contractor'] } },
    [JOB_STATES.IN_PROGRESS]: { [JOB_STATES.COMPLETED]: { roles: ['agent', 'contractor'] } },
  },
  [ENTITY_TYPES.WORK_ORDER]: {
    [WORK_ORDER_STATES.CREATED]: { [WORK_ORDER_STATES.ACTIVE]: { roles: ['agent'] } },
    [WORK_ORDER_STATES.ACTIVE]: { [WORK_ORDER_STATES.VERIFIED]: { roles: ['contractor'] } },
    [WORK_ORDER_STATES.VERIFIED]: { [WORK_ORDER_STATES.CLOSED]: { roles: ['agent'] } },
  },
  [ENTITY_TYPES.INVOICE]: {
    [INVOICE_STATES.DRAFT]: { [INVOICE_STATES.SUBMITTED]: { roles: ['contractor'] } },
    [INVOICE_STATES.SUBMITTED]: {
      [INVOICE_STATES.APPROVED]: { roles: ['agent'] },
      [INVOICE_STATES.REJECTED]: { roles: ['agent'] },
    },
    [INVOICE_STATES.APPROVED]: { [INVOICE_STATES.PAID]: { roles: ['agent'] } },
    [INVOICE_STATES.REJECTED]: { [INVOICE_STATES.SUBMITTED]: { roles: ['contractor'] } },
  },
};

function normalizeState(state) {
  return String(state || '').toUpperCase();
}

function ensureNextState(nextState) {
  const ns = normalizeState(nextState);
  if (!ns) throw new AppError('nextState is required', 400);
  return ns;
}

function getState(entityType, entity) {
  const explicit = normalizeState(entity.currentState);
  if (explicit) return explicit;

  const legacy = normalizeState(entity.status);

  if (entityType === ENTITY_TYPES.WORK_ORDER) {
    const map = {
      DRAFT: WORK_ORDER_STATES.CREATED,
      ISSUED: WORK_ORDER_STATES.ACTIVE,
      SIGNED: WORK_ORDER_STATES.VERIFIED,
      CLOSED: WORK_ORDER_STATES.CLOSED,
    };
    return map[legacy] || legacy;
  }

  return legacy;
}

function isAllowedTransition(entityType, fromState, toState) {
  const map = TRANSITIONS[entityType] || {};
  return Boolean(map[fromState] && map[fromState][toState]);
}

function ensureRoleAllowed(entityType, fromState, toState, userRole) {
  const map = TRANSITIONS[entityType];
  const transition = map && map[fromState] && map[fromState][toState];
  if (!transition) throw new AppError(`Invalid state transition: ${fromState} -> ${toState}`, 400);

  const roles = transition.roles || [];
  if (!roles.includes(userRole)) {
    throw new AppError('Forbidden: role not allowed for this transition', 403);
  }
}

function syncLegacyStatus(entityType, entity, currentState) {
  if (entityType === ENTITY_TYPES.JOB) {
    entity.status = currentState;
    return;
  }

  if (entityType === ENTITY_TYPES.INVOICE) {
    entity.status = currentState;
    return;
  }

  if (entityType === ENTITY_TYPES.WORK_ORDER) {
    const map = {
      [WORK_ORDER_STATES.CREATED]: 'DRAFT',
      [WORK_ORDER_STATES.ACTIVE]: 'ISSUED',
      [WORK_ORDER_STATES.VERIFIED]: 'SIGNED',
      [WORK_ORDER_STATES.CLOSED]: 'CLOSED',
    };
    const legacy = map[currentState];
    if (legacy) entity.status = legacy;
  }
}

async function loadEntity(entityType, id) {
  if (entityType === ENTITY_TYPES.JOB) return Job.findById(id);
  if (entityType === ENTITY_TYPES.WORK_ORDER) return WorkOrder.findById(id);
  if (entityType === ENTITY_TYPES.INVOICE) return Invoice.findById(id);
  throw new AppError('Unsupported entityType', 400);
}

function ensureOwnershipAndContext(entityType, entity, fromState, toState, user, payload) {
  if (entityType === ENTITY_TYPES.JOB) {
    const isAgentOwner = String(entity.createdBy) === String(user._id);
    const isAssignedContractor = entity.assignedContractor && String(entity.assignedContractor) === String(user._id);

    if (toState === JOB_STATES.ASSIGNED) {
      if (!isAgentOwner) throw new AppError('Forbidden', 403);
      if (!entity.assignedContractor && !payload.contractorId) {
        throw new AppError('contractorId is required to assign a contractor', 400);
      }
    }

    if (toState === JOB_STATES.IN_PROGRESS) {
      if (!isAssignedContractor) throw new AppError('Forbidden', 403);
    }

    if (toState === JOB_STATES.COMPLETED) {
      if (!(isAgentOwner || isAssignedContractor)) throw new AppError('Forbidden', 403);
    }

    return;
  }

  if (entityType === ENTITY_TYPES.WORK_ORDER) {
    const isAgent = String(entity.agent) === String(user._id);
    const isContractor = String(entity.contractor) === String(user._id);

    if (toState === WORK_ORDER_STATES.ACTIVE) {
      if (!isAgent) throw new AppError('Forbidden', 403);
      return;
    }

    if (toState === WORK_ORDER_STATES.VERIFIED) {
      if (!isContractor) throw new AppError('Forbidden', 403);
      const hasAttachments = Array.isArray(entity.attachments) && entity.attachments.length > 0;
      const proof = payload && payload.proof;
      if (!hasAttachments && !proof) {
        throw new AppError('Proof is required to verify a work order', 400);
      }
      return;
    }

    if (toState === WORK_ORDER_STATES.CLOSED) {
      if (!isAgent) throw new AppError('Forbidden', 403);
    }

    return;
  }

  if (entityType === ENTITY_TYPES.INVOICE) {
    const isAgent = String(entity.agent) === String(user._id);
    const isContractor = String(entity.contractor) === String(user._id);

    if (toState === INVOICE_STATES.SUBMITTED) {
      if (!isContractor) throw new AppError('Forbidden', 403);
    }

    if ([INVOICE_STATES.APPROVED, INVOICE_STATES.REJECTED, INVOICE_STATES.PAID].includes(toState)) {
      if (!isAgent) throw new AppError('Forbidden', 403);
    }

    return;
  }

  throw new AppError('Unsupported entityType', 400);
}

async function applyEntityMutation(entityType, entity, toState, user, payload) {
  if (entityType === ENTITY_TYPES.JOB && toState === JOB_STATES.ASSIGNED && payload && payload.contractorId) {
    entity.assignedContractor = payload.contractorId;

    if (Array.isArray(entity.applicants) && entity.applicants.length > 0) {
      entity.applicants.forEach((a) => {
        if (String(a.contractor) === String(payload.contractorId)) a.status = 'ACCEPTED';
        else a.status = 'REJECTED';
      });
    }
  }

  if (entityType === ENTITY_TYPES.WORK_ORDER && toState === WORK_ORDER_STATES.VERIFIED) {
    if (payload && payload.proof) {
      entity.attachments = Array.isArray(entity.attachments) ? entity.attachments : [];
      entity.attachments.push({
        fileUrl: String(payload.proof),
        originalName: 'proof',
        uploadedAt: new Date(),
      });
    }
  }

  if (entityType === ENTITY_TYPES.INVOICE && toState === INVOICE_STATES.SUBMITTED) {
    if (payload && Array.isArray(payload.items)) entity.items = payload.items;
    if (payload && payload.currency) entity.currency = payload.currency;
    if (payload && typeof payload.notes === 'string') entity.notes = payload.notes;

    const items = Array.isArray(entity.items) ? entity.items : [];
    entity.totalAmount = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );
  }

  if (entityType === ENTITY_TYPES.INVOICE && toState === INVOICE_STATES.REJECTED) {
    if (payload && typeof payload.reason === 'string' && payload.reason.trim()) {
      entity.notes = payload.reason;
    }
  }

  if (entityType === ENTITY_TYPES.INVOICE && toState === INVOICE_STATES.APPROVED) {
    entity.approvedAt = new Date();
  }

  if (entityType === ENTITY_TYPES.INVOICE && toState === INVOICE_STATES.PAID) {
    entity.paidAt = new Date();
  }

  if (entityType === ENTITY_TYPES.INVOICE && toState === INVOICE_STATES.SUBMITTED) {
    if (entity.approvedAt) entity.approvedAt = undefined;
    if (entity.paidAt) entity.paidAt = undefined;
  }
}

async function transition({ entityType, id, nextState, user, payload }) {
  // End-to-end Job-to-Invoice workflow implemented as role-based lifecycle state machines with enforced transitions, audit logging, and event-driven notifications.

  if (!user || !user._id) throw new AppError('Unauthorized', 401);

  const toState = ensureNextState(nextState);

  const entity = await loadEntity(entityType, id);
  if (!entity) throw new AppError('Not found', 404);

  const fromState = getState(entityType, entity);

  if (!isAllowedTransition(entityType, fromState, toState)) {
    throw new AppError(`Invalid state transition: ${fromState} -> ${toState}`, 400);
  }

  ensureRoleAllowed(entityType, fromState, toState, user.role);
  ensureOwnershipAndContext(entityType, entity, fromState, toState, user, payload || {});

  await applyEntityMutation(entityType, entity, toState, user, payload || {});

  entity.currentState = toState;
  syncLegacyStatus(entityType, entity, toState);

  await entity.save();

  const audit = await WorkflowAudit.create({
    entityType,
    entityId: entity._id,
    fromState,
    toState,
    performedBy: { user: user._id, role: user.role },
    job:
      entityType === ENTITY_TYPES.JOB
        ? entity._id
        : entityType === ENTITY_TYPES.INVOICE
          ? entity.job
          : entityType === ENTITY_TYPES.WORK_ORDER
            ? entity.job
            : undefined,
    workOrder:
      entityType === ENTITY_TYPES.WORK_ORDER
        ? entity._id
        : entityType === ENTITY_TYPES.INVOICE
          ? entity.workOrder
          : undefined,
    invoice: entityType === ENTITY_TYPES.INVOICE ? entity._id : undefined,
    metadata: payload && payload.metadata ? payload.metadata : undefined,
  });

  workflowEvents.emit(WORKFLOW_EVENTS.TRANSITIONED, {
    entityType,
    entity,
    fromState,
    toState,
    performedBy: { userId: String(user._id), role: user.role },
    auditId: String(audit._id),
  });

  return { entity, audit };
}

module.exports = {
  ENTITY_TYPES,
  JOB_STATES,
  WORK_ORDER_STATES,
  INVOICE_STATES,
  transition,
};
