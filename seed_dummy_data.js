import mongoose from 'mongoose';
import { User, Vendor, Rfq, Quotation, AuditLog, VendorRequest } from './backend/src/models.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function seedDummyData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendorbridge');
    
    const admin = await User.findOne({ role: 'admin' });
    const officer = await User.findOne({ role: 'procurement_officer' });
    const manager = await User.findOne({ role: 'manager' });
    const vendorUser = await User.findOne({ role: 'vendor' });
    const existingVendor = await Vendor.findOne({ linkedUserId: vendorUser._id });

    if (!admin || !officer || !manager || !vendorUser) {
      console.error('Core roles not found. Please run seed_roles.js first.');
      process.exit(1);
    }

    // 1. Add more Vendors
    const additionalVendorsData = [
      { legalName: 'Apex Industrial Solutions', category: 'Hardware', gstNumber: '27AAAAA1111A1Z1', contactName: 'Rajesh Kumar', contactEmail: 'sales@apexind.com', status: 'active' },
      { legalName: 'Swift Tech Systems', category: 'Software', gstNumber: '27BBBBB2222B1Z2', contactName: 'Anjali Sharma', contactEmail: 'info@swifttech.com', status: 'active' },
      { legalName: 'Reliable Supply Chain', category: 'Logistics', gstNumber: '27CCCCC3333C1Z3', contactName: 'Vikram Singh', contactEmail: 'contact@reliablesupply.in', status: 'active' }
    ];
    
    await Vendor.insertMany(additionalVendorsData);
    const allVendors = await Vendor.find({});

    // 2. Add Dummy RFQs
    const rfqsData = [
      {
        rfqNumber: 'RFQ-2026-001',
        title: 'Laptops for Engineering Team',
        category: 'Hardware',
        description: 'Requirement for 25 high-performance laptops for the software development department.',
        status: 'under_review',
        responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: officer._id,
        items: [{ itemName: 'Precision Pro Laptops', quantity: 25, targetUnitCost: 85000 }]
      },
      {
        rfqNumber: 'RFQ-2026-002',
        title: 'Cloud Infrastructure Services',
        category: 'Software',
        description: 'Annual subscription for cloud hosting and managed database services.',
        status: 'dispatched',
        responseDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdBy: officer._id,
        items: [{ itemName: 'Reserved Instances - Compute', quantity: 1, targetUnitCost: 1200000 }]
      }
    ];

    const createdRfqs = await Rfq.insertMany(rfqsData);

    // 3. Add Quotations (Bids)
    const quotationsData = [];
    const laptopsRfq = createdRfqs[0];
    
    allVendors.forEach((v, index) => {
      const priceOffset = (index - 1) * 5000;
      const deliveryOffset = index * 2;
      
      quotationsData.push({
        rfq: laptopsRfq._id,
        vendor: v._id,
        quotationNumber: `QTN-LAP-${v._id.toString().slice(-4)}`,
        status: index === 0 ? 'selected' : 'submitted',
        deliveryDays: 5 + deliveryOffset,
        subtotal: (85000 + priceOffset) * 25,
        grandTotal: (85000 + priceOffset) * 25 * 1.18,
        items: [{
          itemName: 'Precision Pro Laptops',
          quantity: 25,
          unitPrice: 85000 + priceOffset,
          taxRate: 18,
          lineTotal: (85000 + priceOffset) * 25,
          taxAmount: (85000 + priceOffset) * 25 * 0.18,
          grandTotal: (85000 + priceOffset) * 25 * 1.18
        }]
      });
    });

    await Quotation.insertMany(quotationsData);

    // 4. Add Dummy Audit Logs
    const auditLogsData = [
      { actorUser: admin._id, entityType: 'vendor', action: 'BULK_IMPORT_VENDORS' },
      { actorUser: officer._id, entityType: 'rfq', action: 'DISPATCH_RFQ_TO_NETWORK', entityId: createdRfqs[1]._id },
      { actorUser: manager._id, entityType: 'approval', action: 'PENDING_REVIEW_TRIGGERED' }
    ];

    await AuditLog.insertMany(auditLogsData);

    // 5. Add Vendor Request
    await VendorRequest.create({
      vendor: existingVendor._id,
      user: vendorUser._id,
      subject: 'Clarification on RFQ Items',
      message: 'Could you please provide more details on the graphics card specifications for the requested laptops?',
      status: 'open'
    });

    console.log('Dummy Data Injected Successfully!');
    console.log('- Vendors added: 3');
    console.log('- RFQs added: 2');
    console.log('- Quotations added: ' + allVendors.length);
    console.log('- Audit Logs added: 3');
    console.log('- Vendor Requests added: 1');
    
    process.exit(0);
  } catch (err) {
    console.error('Error injecting dummy data:', err);
    process.exit(1);
  }
}

seedDummyData();
