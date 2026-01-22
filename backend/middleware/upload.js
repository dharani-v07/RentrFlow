const fs = require('fs');
const path = require('path');
const multer = require('multer');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeBaseName(name) {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function createUploadMiddleware(options = {}) {
  const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
  ensureDir(uploadDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const base = safeBaseName(file.originalname);
      const stamp = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      cb(null, `${stamp}_${base}`);
    },
  });

  const limits = options.limits || { fileSize: 15 * 1024 * 1024 };

  return multer({
    storage,
    limits,
    ...(options.fileFilter ? { fileFilter: options.fileFilter } : {}),
  });
}

module.exports = { createUploadMiddleware };
