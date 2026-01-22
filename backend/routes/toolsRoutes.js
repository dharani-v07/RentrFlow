const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { createUploadMiddleware } = require('../middleware/upload');

const {
  getTools,
  jobStatusTracker,
  analytics,
  estimateCost,
  autoGenerateWorkOrder,
  uploadDocument,
  listDocuments,
  updatePreferences,
} = require('../controllers/toolsController');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(getTools));

router.get('/job-status', asyncHandler(jobStatusTracker));
router.get('/analytics', asyncHandler(analytics));
router.post('/estimate', asyncHandler(estimateCost));

router.post('/work-orders/auto-generate', asyncHandler(autoGenerateWorkOrder));

const upload = createUploadMiddleware();
router.post('/documents/upload', upload.single('file'), asyncHandler(uploadDocument));
router.get('/documents', asyncHandler(listDocuments));

router.post('/settings/preferences', asyncHandler(updatePreferences));

module.exports = router;
