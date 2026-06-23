import express from 'express';

import {
  Approval,
  AuditLog,
  Invoice,
  PurchaseOrder,
  Quotation,
  Rfq,
  RfqInvitation,
  Vendor
} from '../models.js';
import { calculateDocumentTotals, createDocumentNumber } from '../utils.js';
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

router.use(requireAuth, requireRole('admin', 'procurement_officer', 'manager'));


router.get('/rfqs', async (_req, res, next) => {
  try {
    const rfqs = await Rfq.find().sort({ createdAt: -1 });
    return res.json({ rfqs });
  } catch (error) {
    return next(error);
  }
});

router.post('/rfqs', async (req, res, next) => {
  try {
    const { rfqNumber, title, category, description, responseDeadline, items = [], vendorIds = [] } = req.body;

    if (!title || !responseDeadline) {
      return res.status(400).json({ message: 'title and responseDeadline are required' });
    }

    const rfq = await Rfq.create({
      rfqNumber: rfqNumber || createDocumentNumber('RFQ'),
      title,
      category: category || '',
      description: description || '',
      responseDeadline,
      createdBy: req.user.id,
      status: vendorIds.length > 0 ? 'dispatched' : 'draft',
      vendorIds,
      items
    });

    if (vendorIds.length > 0) {
      const invitations = vendorIds.map((vendorId) => ({ rfq: rfq._id, vendor: vendorId }));
      await RfqInvitation.insertMany(invitations, { ordered: false }).catch(() => null);
    }

    await audit(req.user, 'rfq', rfq._id, 'rfq.created', null, rfq.toObject());

    return res.status(201).json({ rfq });
  } catch (error) {
    return next(error);
  }
});

router.get('/rfqs/:id', async (req, res, next) => {
  try {
    const rfq = await Rfq.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    const invitations = await RfqInvitation.find({ rfq: rfq._id }).populate('vendor', 'legalName category status');
    const quotations = await Quotation.find({ rfq: rfq._id }).populate('vendor', 'legalName category status');

    return res.json({ rfq, invitations, quotations });
  } catch (error) {
    return next(error);
  }
});

router.patch('/rfqs/:id', async (req, res, next) => {
  try {
    const rfq = await Rfq.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    const beforeData = rfq.toObject();
    const { title, category, description, responseDeadline, status, items } = req.body;

    if (title !== undefined) rfq.title = title;
    if (category !== undefined) rfq.category = category;
    if (description !== undefined) rfq.description = description;
    if (responseDeadline !== undefined) rfq.responseDeadline = responseDeadline;
    if (status !== undefined) rfq.status = status;
    if (items !== undefined) rfq.items = items;

    await rfq.save();
    await audit(req.user, 'rfq', rfq._id, 'rfq.updated', beforeData, rfq.toObject());

    return res.json({ rfq });
  } catch (error) {
    return next(error);
  }
});

router.post('/rfqs/:id/invitations', async (req, res, next) => {
  try {
    const rfq = await Rfq.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    const vendorIds = Array.isArray(req.body.vendorIds) ? req.body.vendorIds : [];
    if (vendorIds.length === 0) {
      return res.status(400).json({ message: 'vendorIds array is required' });
    }

    rfq.vendorIds = Array.from(new Set([...(rfq.vendorIds || []).map(String), ...vendorIds.map(String)])).filter(Boolean);
    if (rfq.status === 'draft') {
      rfq.status = 'dispatched';
    }
    await rfq.save();

    const vendorDocs = await Vendor.find({ _id: { $in: vendorIds } });
    const invitationDocs = vendorDocs.map((vendor) => ({ rfq: rfq._id, vendor: vendor._id }));
    await RfqInvitation.insertMany(invitationDocs, { ordered: false }).catch(() => null);

    await audit(req.user, 'rfq', rfq._id, 'rfq.invitations.added', null, { vendorIds });

    return res.status(201).json({ message: 'Invitations added' });
  } catch (error) {
    return next(error);
  }
});

router.get('/rfqs/:id/quotations', async (req, res, next) => {
  try {
    const quotations = await Quotation.find({ rfq: req.params.id }).populate('vendor', 'legalName category status');
    return res.json({ quotations });
  } catch (error) {
    return next(error);
  }
});

router.patch('/quotations/:id/select', async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const beforeData = quotation.toObject();
    quotation.status = 'selected';
    quotation.selectedAt = new Date();
    await quotation.save();

    await Rfq.findByIdAndUpdate(quotation.rfq, { status: 'under_review' });
    await audit(req.user, 'quotation', quotation._id, 'quotation.selected', beforeData, quotation.toObject());

    return res.json({ quotation });
  } catch (error) {
    return next(error);
  }
});

router.post('/approvals', async (req, res, next) => {
  try {
    const { rfqId, quotationId, remarks = '' } = req.body;
    if (!rfqId) {
      return res.status(400).json({ message: 'rfqId is required' });
    }

    const approval = await Approval.create({
      rfq: rfqId,
      quotation: quotationId || null,
      remarks,
      reviewedBy: req.user.id
    });

    await audit(req.user, 'approval', approval._id, 'approval.created', null, approval.toObject());

    return res.status(201).json({ approval });
  } catch (error) {
    return next(error);
  }
});

router.get('/approvals', async (_req, res, next) => {
  try {
    const approvals = await Approval.find().sort({ createdAt: -1 }).populate('rfq quotation approvedBy reviewedBy');
    return res.json({ approvals });
  } catch (error) {
    return next(error);
  }
});

router.patch('/approvals/:id', async (req, res, next) => {
  try {
    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    const beforeData = approval.toObject();
    const nextStatus = req.body.status;
    if (!['approved', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({ message: 'status must be approved or rejected' });
    }

    approval.status = nextStatus;
    approval.approvedBy = req.user.id;
    approval.reviewedBy = req.user.id;
    approval.remarks = req.body.remarks ?? approval.remarks;
    approval.decidedAt = new Date();
    await approval.save();

    const rfqUpdate = nextStatus === 'approved'
      ? { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() }
      : { status: 'rejected' };

    await Rfq.findByIdAndUpdate(approval.rfq, rfqUpdate);
    await audit(req.user, 'approval', approval._id, `approval.${nextStatus}`, beforeData, approval.toObject());

    return res.json({ approval });
  } catch (error) {
    return next(error);
  }
});

router.post('/purchase-orders', async (req, res, next) => {
  try {
    const { rfqId, quotationId, vendorId, cgstRate = 9, sgstRate = 9 } = req.body;
    if (!rfqId || !quotationId) {
      return res.status(400).json({ message: 'rfqId and quotationId are required' });
    }

    const quotation = await Quotation.findById(quotationId).populate('vendor');
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const items = quotation.items.map((item) => ({ ...item.toObject?.() || item }));
    const totals = calculateDocumentTotals(items, cgstRate, sgstRate);

    const purchaseOrder = await PurchaseOrder.create({
      poNumber: createDocumentNumber('PO'),
      rfq: rfqId,
      quotation: quotation._id,
      vendor: vendorId || quotation.vendor._id,
      createdBy: req.user.id,
      status: 'issued',
      items,
      cgstRate,
      sgstRate,
      ...totals,
      issuedAt: new Date()
    });

    await Rfq.findByIdAndUpdate(rfqId, { status: 'closed' });
    await audit(req.user, 'purchase_order', purchaseOrder._id, 'purchase_order.created', null, purchaseOrder.toObject());

    return res.status(201).json({ purchaseOrder });
  } catch (error) {
    return next(error);
  }
});

router.get('/purchase-orders', async (_req, res, next) => {
  try {
    const purchaseOrders = await PurchaseOrder.find().sort({ createdAt: -1 }).populate('vendor', 'legalName category status');
    return res.json({ purchaseOrders });
  } catch (error) {
    return next(error);
  }
});

router.post('/invoices', async (req, res, next) => {
  try {
    const { purchaseOrderId } = req.body;
    if (!purchaseOrderId) {
      return res.status(400).json({ message: 'purchaseOrderId is required' });
    }

    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const totals = calculateDocumentTotals(purchaseOrder.items, purchaseOrder.cgstRate, purchaseOrder.sgstRate);

    const invoice = await Invoice.create({
      invoiceNumber: createDocumentNumber('INV'),
      purchaseOrder: purchaseOrder._id,
      vendor: purchaseOrder.vendor,
      generatedBy: req.user.id,
      status: 'generated',
      items: purchaseOrder.items,
      ...totals,
      issuedAt: new Date()
    });

    await audit(req.user, 'invoice', invoice._id, 'invoice.created', null, invoice.toObject());

    return res.status(201).json({ invoice });
  } catch (error) {
    return next(error);
  }
});

router.get('/invoices', async (_req, res, next) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).populate('purchaseOrder vendor');
    return res.json({ invoices });
  } catch (error) {
    return next(error);
  }
});

export default router;
