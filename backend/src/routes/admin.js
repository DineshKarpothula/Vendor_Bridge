import bcrypt from 'bcryptjs';
import express from 'express';

import { AuditLog, User, Vendor, Rfq, Quotation, PurchaseOrder, Invoice } from '../models.js';
import { publicUser } from '../utils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

async function audit(actorUser, entityType, entityId, action, beforeData, afterData) {
  await AuditLog.create({
    actorUser: actorUser?.id || null,
    entityType,
    entityId,
    action,
    beforeData,
    afterData
  });
}

router.use(requireAuth, requireRole('admin'));

router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json({ users: users.map((user) => publicUser(user, user.vendorId?.toString?.() || null)) });
  } catch (error) {
    return next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, isActive = true, vendorId = null } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'firstName, lastName, email, password, and role are required' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      isActive: Boolean(isActive),
      vendorId: vendorId || null
    });

    if (vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, { linkedUserId: user._id });
    }

    await audit(req.user, 'user', user._id, 'user.created', null, user.toJSON());

    return res.status(201).json({ user: publicUser(user, user.vendorId?.toString?.() || null) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const beforeData = user.toJSON();
    const { firstName, lastName, email, password, role, isActive, vendorId } = req.body;

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = String(email).toLowerCase().trim();
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (vendorId !== undefined) user.vendorId = vendorId || null;
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 12);
    }

    await user.save();

    if (vendorId !== undefined && vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, { linkedUserId: user._id });
    }

    await audit(req.user, 'user', user._id, 'user.updated', beforeData, user.toJSON());

    return res.json({ user: publicUser(user, user.vendorId?.toString?.() || null) });
  } catch (error) {
    return next(error);
  }
});

router.get('/vendors', async (_req, res, next) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    return res.json({ vendors });
  } catch (error) {
    return next(error);
  }
});

router.post('/vendors', async (req, res, next) => {
  try {
    const { legalName, category, gstNumber, contactName, contactEmail, contactPhone, status, onboardingNotes, linkedUserId } = req.body;

    if (!legalName || !category || !gstNumber) {
      return res.status(400).json({ message: 'legalName, category, and gstNumber are required' });
    }

    const vendor = await Vendor.create({
      legalName,
      category,
      gstNumber,
      contactName: contactName || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      status: status || 'pending',
      onboardingNotes: onboardingNotes || '',
      createdBy: req.user.id,
      linkedUserId: linkedUserId || null
    });

    if (linkedUserId) {
      await User.findByIdAndUpdate(linkedUserId, { vendorId: vendor._id });
    }

    await audit(req.user, 'vendor', vendor._id, 'vendor.created', null, vendor.toObject());

    return res.status(201).json({ vendor });
  } catch (error) {
    return next(error);
  }
});

router.patch('/vendors/:id', async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const beforeData = vendor.toObject();
    const { legalName, category, gstNumber, contactName, contactEmail, contactPhone, status, onboardingNotes, linkedUserId } = req.body;

    if (legalName !== undefined) vendor.legalName = legalName;
    if (category !== undefined) vendor.category = category;
    if (gstNumber !== undefined) vendor.gstNumber = gstNumber;
    if (contactName !== undefined) vendor.contactName = contactName;
    if (contactEmail !== undefined) vendor.contactEmail = contactEmail;
    if (contactPhone !== undefined) vendor.contactPhone = contactPhone;
    if (status !== undefined) vendor.status = status;
    if (onboardingNotes !== undefined) vendor.onboardingNotes = onboardingNotes;
    if (linkedUserId !== undefined) vendor.linkedUserId = linkedUserId || null;

    await vendor.save();

    if (linkedUserId !== undefined && linkedUserId) {
      await User.findByIdAndUpdate(linkedUserId, { vendorId: vendor._id });
    }

    await audit(req.user, 'vendor', vendor._id, 'vendor.updated', beforeData, vendor.toObject());

    return res.json({ vendor });
  } catch (error) {
    return next(error);
  }
});

router.get('/reports/summary', async (_req, res, next) => {
  try {
    const [userCount, vendorCount, rfqCount, quotationCount, purchaseOrderCount, invoiceCount] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments(),
      Rfq.countDocuments(),
      Quotation.countDocuments(),
      PurchaseOrder.countDocuments(),
      Invoice.countDocuments()
    ]);

    const spendResult = await Invoice.aggregate([
      { $match: { status: { $ne: 'void' } } },
      { $group: { _id: null, spend: { $sum: '$grandTotal' } } }
    ]);

    return res.json({
      totals: {
        users: userCount,
        vendors: vendorCount,
        rfqs: rfqCount,
        quotations: quotationCount,
        purchaseOrders: purchaseOrderCount,
        invoices: invoiceCount,
        totalSpend: spendResult[0]?.spend || 0
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/reports/spend-trends', async (_req, res, next) => {
  try {
    const trends = await Invoice.aggregate([
      { $match: { status: { $ne: 'void' } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          spend: { $sum: '$grandTotal' },
          invoices: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return res.json({ trends });
  } catch (error) {
    return next(error);
  }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).populate('actorUser', 'firstName lastName email role');
    return res.json({ logs });
  } catch (error) {
    return next(error);
  }
});

export default router;
