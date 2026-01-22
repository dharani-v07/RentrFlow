const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { asyncHandler } = require('../utils/asyncHandler');

const {
  listOpenJobs,
  applyToJob,
  listAssignedJobs,
  updateJobStatus,
  listWorkOrders,
  createInvoice,
  listInvoices,
  listNotifications,
  markNotificationRead,
} = require('../controllers/contractorController');

const router = express.Router();

router.use(requireAuth, requireRole('contractor'));

router.get('/jobs/open', asyncHandler(listOpenJobs));
router.post('/jobs/:jobId/apply', asyncHandler(applyToJob));

router.get('/jobs/assigned', asyncHandler(listAssignedJobs));
router.post('/jobs/:jobId/status', asyncHandler(updateJobStatus));

router.get('/work-orders', asyncHandler(listWorkOrders));

router.post('/jobs/:jobId/invoices', asyncHandler(createInvoice));
router.get('/invoices', asyncHandler(listInvoices));

router.get('/notifications', asyncHandler(listNotifications));
router.post('/notifications/:notificationId/read', asyncHandler(markNotificationRead));

module.exports = router;
