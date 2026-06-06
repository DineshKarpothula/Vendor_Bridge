import express from 'express';

import { AuditLog, PurchaseOrder, Quotation, Rfq, RfqInvitation, VendorRequest } from '../models.js';
import { calculateLineItemTotals, calculateQuotationTotals, createDocumentNumber } from '../utils.js';
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

router.use(requireAuth, requireRole('vendor'));

function getVendorId(req) {
  return req.user.vendorId;
}

function requireVendorProfile(req, res) {
  const vendorId = getVendorId(req);
  if (!vendorId) {
    res.status(403).json({ message: 'Vendor profile is not linked to this account' });
    return null;
  }

  return vendorId;
}

router.get('/invitations', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;

    const invitations = await RfqInvitation.find({ vendor: vendorId }).populate('rfq');
    return res.json({ invitations });
  } catch (error) {
    return next(error);
  }
});

router.get('/rfqs', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;

    const invitations = await RfqInvitation.find({ vendor: vendorId }).populate('rfq');
    return res.json({ rfqs: invitations.map((invitation) => ({ ...invitation.rfq.toObject(), invitationStatus: invitation.invitationStatus })) });
  } catch (error) {
    return next(error);
  }
});

router.get('/rfqs/:id', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;
    const invitation = await RfqInvitation.findOne({ rfq: req.params.id, vendor: vendorId }).populate('rfq');

    if (!invitation) {
      return res.status(404).json({ message: 'RFQ not assigned to this vendor' });
    }

    const quotations = await Quotation.find({ rfq: req.params.id, vendor: vendorId });
    return res.json({ rfq: invitation.rfq, invitation, quotations });
  } catch (error) {
    return next(error);
  }
});

router.post('/quotations', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;

    const { rfqId, notes = '', deliveryDays = 0, items = [] } = req.body;
    if (!rfqId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'rfqId and non-empty items are required' });
    }

    const rfq = await Rfq.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    const invitation = await RfqInvitation.findOne({ rfq: rfqId, vendor: vendorId });
    if (!invitation) {
      return res.status(403).json({ message: 'This RFQ is not assigned to your vendor profile' });
    }

    if (new Date() > new Date(rfq.responseDeadline)) {
      return res.status(400).json({ message: 'RFQ response deadline has passed' });
    }

    const existing = await Quotation.findOne({ rfq: rfqId, vendor: vendorId });
    if (existing) {
      return res.status(409).json({ message: 'Quotation already exists, use PATCH to update it' });
    }

    const normalizedItems = items.map((item) => {
      const totals = calculateLineItemTotals(item);
      return {
        rfqItemId: item.rfqItemId || null,
        itemName: item.itemName,
        quantity: totals.quantity,
        unitPrice: totals.unitPrice,
        taxRate: totals.taxRate,
        lineTotal: totals.lineTotal,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal
      };
    });

    const quotationTotals = calculateQuotationTotals(normalizedItems);
    const quotation = await Quotation.create({
      quotationNumber: createDocumentNumber('QUO'),
      rfq: rfqId,
      vendor: vendorId,
      notes,
      deliveryDays,
      items: normalizedItems,
      subtotal: quotationTotals.subtotal,
      taxAmount: quotationTotals.taxAmount,
      grandTotal: quotationTotals.grandTotal,
      submittedAt: new Date(),
      updatedAtManual: new Date()
    });

    invitation.invitationStatus = 'responded';
    invitation.respondedAt = new Date();
    await invitation.save();

    await audit(req.user, 'quotation', quotation._id, 'quotation.created', null, quotation.toObject());

    return res.status(201).json({ quotation });
  } catch (error) {
    return next(error);
  }
});

router.patch('/quotations/:id', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;
    const quotation = await Quotation.findOne({ _id: req.params.id, vendor: vendorId });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.status === 'selected') {
      return res.status(400).json({ message: 'Selected quotations cannot be modified' });
    }

    const rfq = await Rfq.findById(quotation.rfq);
    if (!rfq || new Date() > new Date(rfq.responseDeadline)) {
      return res.status(400).json({ message: 'RFQ response deadline has passed' });
    }

    const beforeData = quotation.toObject();
    const { notes, deliveryDays, items } = req.body;

    if (notes !== undefined) quotation.notes = notes;
    if (deliveryDays !== undefined) quotation.deliveryDays = deliveryDays;
    if (Array.isArray(items)) {
      quotation.items = items.map((item) => {
        const totals = calculateLineItemTotals(item);
        return {
          rfqItemId: item.rfqItemId || null,
          itemName: item.itemName,
          quantity: totals.quantity,
          unitPrice: totals.unitPrice,
          taxRate: totals.taxRate,
          lineTotal: totals.lineTotal,
          taxAmount: totals.taxAmount,
          grandTotal: totals.grandTotal
        };
      });
    }

    const quotationTotals = calculateQuotationTotals(quotation.items);
    quotation.subtotal = quotationTotals.subtotal;
    quotation.taxAmount = quotationTotals.taxAmount;
    quotation.grandTotal = quotationTotals.grandTotal;
    quotation.status = 'updated';
    quotation.updatedAtManual = new Date();

    await quotation.save();
    await audit(req.user, 'quotation', quotation._id, 'quotation.updated', beforeData, quotation.toObject());

    return res.json({ quotation });
  } catch (error) {
    return next(error);
  }
});

router.get('/quotations/:id', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;
    const quotation = await Quotation.findOne({ _id: req.params.id, vendor: vendorId });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    return res.json({ quotation });
  } catch (error) {
    return next(error);
  }
});

router.get('/purchase-orders', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;
    const purchaseOrders = await PurchaseOrder.find({ vendor: vendorId }).sort({ createdAt: -1 });
    return res.json({ purchaseOrders });
  } catch (error) {
    return next(error);
  }
});

router.get('/purchase-orders/:id', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;
    const purchaseOrder = await PurchaseOrder.findOne({ _id: req.params.id, vendor: vendorId });

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    return res.json({ purchaseOrder });
  } catch (error) {
    return next(error);
  }
});

router.post('/requests', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;
    const { subject = '', message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'message is required' });
    }

    const vendorRequest = await VendorRequest.create({
      vendor: vendorId,
      user: req.user.id,
      subject,
      message,
      status: 'open'
    });

    await audit(req.user, 'vendor_request', vendorRequest._id, 'vendor_request.created', null, vendorRequest.toObject());

    return res.status(201).json({ vendorRequest });
  } catch (error) {
    return next(error);
  }
});

router.get('/requests', async (req, res, next) => {
  try {
    const vendorId = requireVendorProfile(req, res);
    if (!vendorId) return;
    const vendorRequests = await VendorRequest.find({ vendor: vendorId }).sort({ createdAt: -1 });
    return res.json({ vendorRequests });
  } catch (error) {
    return next(error);
  }
});

export default router;
