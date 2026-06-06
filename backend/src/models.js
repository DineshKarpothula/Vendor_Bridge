import mongoose from 'mongoose';

const { Schema } = mongoose;

const baseOptions = { timestamps: true };

const rfqItemSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    specifications: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0.01 },
    unitOfMeasure: { type: String, default: '' },
    minQuantity: { type: Number, default: null },
    maxQuantity: { type: Number, default: null },
    targetUnitCost: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const quotationItemSchema = new Schema(
  {
    rfqItemId: { type: Schema.Types.ObjectId, ref: 'RfqItem', default: null },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 }
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'procurement_officer', 'vendor'],
      required: true
    },
    isActive: { type: Boolean, default: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null }
  },
  baseOptions
);

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

const vendorSchema = new Schema(
  {
    legalName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    gstNumber: { type: String, required: true, unique: true, trim: true },
    contactName: { type: String, default: '' },
    contactEmail: { type: String, default: '', lowercase: true, trim: true },
    contactPhone: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'rejected'],
      default: 'pending'
    },
    onboardingNotes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    linkedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  baseOptions
);

const rfqSchema = new Schema(
  {
    rfqNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: '' },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'dispatched', 'under_review', 'approved', 'rejected', 'closed'],
      default: 'draft'
    },
    responseDeadline: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    vendorIds: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }],
    items: [rfqItemSchema]
  },
  baseOptions
);

const invitationSchema = new Schema(
  {
    rfq: { type: Schema.Types.ObjectId, ref: 'Rfq', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    invitationStatus: {
      type: String,
      enum: ['sent', 'accepted', 'declined', 'responded', 'withdrawn'],
      default: 'sent'
    },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null }
  },
  baseOptions
);

invitationSchema.index({ rfq: 1, vendor: 1 }, { unique: true });

const quotationSchema = new Schema(
  {
    rfq: { type: Schema.Types.ObjectId, ref: 'Rfq', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    quotationNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['submitted', 'updated', 'withdrawn', 'expired', 'selected'],
      default: 'submitted'
    },
    notes: { type: String, default: '' },
    deliveryDays: { type: Number, default: 0, min: 0 },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    updatedAtManual: { type: Date, default: Date.now },
    selectedAt: { type: Date, default: null }
  },
  baseOptions
);

quotationSchema.index({ rfq: 1, vendor: 1 }, { unique: true });

const approvalSchema = new Schema(
  {
    rfq: { type: Schema.Types.ObjectId, ref: 'Rfq', required: true },
    quotation: { type: Schema.Types.ObjectId, ref: 'Quotation', default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    remarks: { type: String, default: '' },
    decidedAt: { type: Date, default: null }
  },
  baseOptions
);

const purchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    rfq: { type: Schema.Types.ObjectId, ref: 'Rfq', required: true },
    quotation: { type: Schema.Types.ObjectId, ref: 'Quotation', default: null },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['draft', 'issued', 'sent_to_vendor', 'accepted', 'closed', 'cancelled'],
      default: 'issued'
    },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 9 },
    sgstRate: { type: Number, default: 9 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    issuedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null }
  },
  baseOptions
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['draft', 'generated', 'sent', 'paid', 'void'],
      default: 'generated'
    },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    issuedAt: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null }
  },
  baseOptions
);

const vendorRequestSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    status: { type: String, default: 'open' }
  },
  baseOptions
);

const auditLogSchema = new Schema(
  {
    actorUser: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    entityType: {
      type: String,
      enum: ['user', 'vendor', 'rfq', 'quotation', 'approval', 'purchase_order', 'invoice', 'vendor_request'],
      required: true
    },
    entityId: { type: Schema.Types.ObjectId, default: null },
    action: { type: String, required: true },
    beforeData: { type: Schema.Types.Mixed, default: null },
    afterData: { type: Schema.Types.Mixed, default: null }
  },
  baseOptions
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
export const Rfq = mongoose.models.Rfq || mongoose.model('Rfq', rfqSchema);
export const RfqInvitation = mongoose.models.RfqInvitation || mongoose.model('RfqInvitation', invitationSchema);
export const Quotation = mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema);
export const Approval = mongoose.models.Approval || mongoose.model('Approval', approvalSchema);
export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);
export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
export const VendorRequest = mongoose.models.VendorRequest || mongoose.model('VendorRequest', vendorRequestSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
