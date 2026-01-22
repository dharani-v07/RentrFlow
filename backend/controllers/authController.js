const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { User } = require('../models/User');
const { AppError } = require('../utils/appError');

function signToken({ userId, role, rememberMe }) {
  const expiresIn = rememberMe
    ? process.env.JWT_REMEMBER_EXPIRES_IN || '7d'
    : process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(
    {
      sub: userId,
      role,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

async function register(req, res) {
  const { role, name, email, password, phone, companyName } = req.body;

  if (!role || !['agent', 'contractor'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }
  if (!name || !email || !password) {
    throw new AppError('name, email and password are required', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already in use', 409);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    role,
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone,
    companyName,
  });

  const token = signToken({ userId: user._id, role: user.role, rememberMe: true });
  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  });
}

async function login(req, res) {
  const { role, email, password, rememberMe } = req.body;

  if (!role || !['agent', 'contractor'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }
  if (!email || !password) {
    throw new AppError('email and password are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase(), role });
  if (!user) throw new AppError('Invalid credentials', 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid credentials', 401);

  const token = signToken({ userId: user._id, role: user.role, rememberMe: Boolean(rememberMe) });

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  });
}

async function me(req, res) {
  res.json({
    success: true,
    user: req.user,
  });
}

module.exports = { register, login, me };
