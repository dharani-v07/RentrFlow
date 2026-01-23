const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { asyncHandler } = require('../utils/asyncHandler');

const {
  suggestContractors,
  generateWorkOrderSummary,
  suggestInvoiceItems,
  summarizeChat,
  predictJobCost,
  prioritizeNotifications,
} = require('../controllers/aiController');

const router = express.Router();

router.use(requireAuth);

// IMPORTANT (AI Design Principle):
// All endpoints are advisory. No endpoint mutates DB state via AI or bypasses FSM.

router.post('/suggest-contractors', requireRole('agent'), asyncHandler(suggestContractors));
router.post('/generate-work-order-summary', requireRole('agent'), asyncHandler(generateWorkOrderSummary));
router.post('/predict-job-cost', requireRole('agent'), asyncHandler(predictJobCost));

router.post('/suggest-invoice-items', requireRole('contractor'), asyncHandler(suggestInvoiceItems));

router.post('/summarize-chat', asyncHandler(summarizeChat));
router.post('/prioritize-notifications', asyncHandler(prioritizeNotifications));

module.exports = router;
