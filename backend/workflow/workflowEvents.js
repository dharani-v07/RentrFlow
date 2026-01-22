const { EventEmitter } = require('events');

const workflowEvents = new EventEmitter();

const WORKFLOW_EVENTS = {
  TRANSITIONED: 'workflow.transitioned',
};

module.exports = { workflowEvents, WORKFLOW_EVENTS };
