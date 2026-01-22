const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { asyncHandler } = require('../utils/asyncHandler');

const {
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
} = require('../controllers/agentController');

const router = express.Router();

router.use(requireAuth, requireRole('agent'));

router.get('/stats', asyncHandler(agentStats));

router.post('/jobs', asyncHandler(createJob));
router.get('/jobs', asyncHandler(listMyJobs));
router.get('/jobs/:jobId', asyncHandler(getJob));
router.get('/jobs/:jobId/applicants', asyncHandler(listApplicants));
router.post('/jobs/:jobId/assign', asyncHandler(assignContractor));

router.get('/contractors', asyncHandler(listContractors));

router.get('/work-orders', asyncHandler(listWorkOrders));

router.get('/invoices', asyncHandler(listInvoices));
router.post('/invoices/:invoiceId/approve', asyncHandler(approveInvoice));
router.post('/invoices/:invoiceId/reject', asyncHandler(rejectInvoice));
router.post('/invoices/:invoiceId/paid', asyncHandler(markInvoicePaid));

router.get('/notifications', asyncHandler(listNotifications));
router.post('/notifications/:notificationId/read', asyncHandler(markNotificationRead));

module.exports = router;
