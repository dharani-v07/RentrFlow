const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/appError');
const { User } = require('../models/User');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401));
  }

  const token = header.substring('Bearer '.length);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = decoded;
  } catch (e) {
    return next(new AppError('Invalid or expired token', 401));
  }

  return User.findById(req.auth.sub)
    .select('-passwordHash')
    .then((user) => {
      if (!user) return next(new AppError('Unauthorized', 401));
      req.user = user;
      next();
    })
    .catch(next);
}

module.exports = { requireAuth };
