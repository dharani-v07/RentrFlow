const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { asyncHandler } = require('../utils/asyncHandler');

const {
  transitionJob,
  transitionWorkOrder,
  transitionInvoice,
  getJobWorkflowHistory,
  getWorkOrderWorkflowHistory,
  getInvoiceWorkflowHistory,
} = require('../controllers/workflowController');

const router = express.Router();

router.use(requireAuth, requireRole('agent', 'contractor'));

router.post('/jobs/:jobId/transition', asyncHandler(transitionJob));
router.post('/workorders/:workOrderId/transition', asyncHandler(transitionWorkOrder));
router.post('/invoices/:invoiceId/transition', asyncHandler(transitionInvoice));

router.get('/jobs/:jobId/history', asyncHandler(getJobWorkflowHistory));
router.get('/workorders/:workOrderId/history', asyncHandler(getWorkOrderWorkflowHistory));
router.get('/invoices/:invoiceId/history', asyncHandler(getInvoiceWorkflowHistory));

module.exports = router;
