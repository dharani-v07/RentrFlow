const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { createUploadMiddleware } = require('../middleware/upload');
const { AppError } = require('../utils/appError');

const { getMyProfile, updateMyProfile } = require('../controllers/userController');

const router = express.Router();

router.use(requireAuth);

router.get('/me/profile', asyncHandler(getMyProfile));

const upload = createUploadMiddleware({
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype) return cb(new AppError('Invalid file upload', 400));
    if (!file.mimetype.startsWith('image/')) return cb(new AppError('Only image uploads are allowed', 400));
    return cb(null, true);
  },
});

function maybeUploadProfileImage(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('multipart/form-data')) {
    return upload.single('profileImage')(req, res, next);
  }
  return next();
}

router.put('/me/profile', maybeUploadProfileImage, asyncHandler(updateMyProfile));

module.exports = router;
