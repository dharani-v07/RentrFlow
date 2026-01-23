const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { createUploadMiddleware } = require('../middleware/upload');
const { AppError } = require('../utils/appError');

const { getMyProfile, updateMyProfile, uploadMyResume, getMyResume } = require('../controllers/userController');

const router = express.Router();

router.use(requireAuth);

router.get('/me/profile', asyncHandler(getMyProfile));

router.put('/me/profile', asyncHandler(updateMyProfile));

const resumeUpload = createUploadMiddleware({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype) return cb(new AppError('Invalid file upload', 400));
    if (file.mimetype !== 'application/pdf') return cb(new AppError('Only PDF uploads are allowed', 400));
    return cb(null, true);
  },
});

router.post('/me/resume', resumeUpload.single('resume'), asyncHandler(uploadMyResume));
router.get('/me/resume', asyncHandler(getMyResume));

module.exports = router;
