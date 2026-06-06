import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';

import { User, Vendor } from '../models.js';
import { publicUser } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({}, secret, { subject: userId.toString(), expiresIn: '7d' });
}

router.post('/bootstrap-admin', async (req, res, next) => {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return res.status(403).json({ message: 'Bootstrap is only available when the database is empty' });
    }

    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'firstName, lastName, email, and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role: 'admin',
      isActive: true
    });

    return res.status(201).json({
      message: 'Admin account created',
      user: publicUser(admin)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let vendorId = user.vendorId?.toString?.() || null;
    if (user.role === 'vendor' && !vendorId) {
      const vendor = await Vendor.findOne({
        $or: [{ linkedUserId: user._id }, { contactEmail: user.email }]
      });
      vendorId = vendor?._id?.toString?.() || null;
    }

    const token = signToken(user._id);

    return res.json({
      token,
      user: publicUser(user, vendorId)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (_req, res) => {
  return res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const vendor = req.user.vendorId ? await Vendor.findById(req.user.vendorId) : null;

    return res.json({
      user: req.user,
      vendor: vendor
        ? {
            id: vendor._id,
            legalName: vendor.legalName,
            category: vendor.category,
            status: vendor.status
          }
        : null
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
