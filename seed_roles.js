import mongoose from 'mongoose';
import { User, Vendor } from './backend/src/models.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendorbridge');
    
    // Clear existing
    await User.deleteMany({});
    await Vendor.deleteMany({});
    
    const passwordHash = await bcrypt.hash('Password@123', 12);
    
    const users = [
      { firstName: 'Admin', lastName: 'User', email: 'admin@vendorbridge.com', passwordHash, role: 'admin', isActive: true },
      { firstName: 'Officer', lastName: 'User', email: 'officer@vendorbridge.com', passwordHash, role: 'procurement_officer', isActive: true },
      { firstName: 'Manager', lastName: 'User', email: 'manager@vendorbridge.com', passwordHash, role: 'manager', isActive: true },
      { firstName: 'Vendor', lastName: 'User', email: 'vendor@vendorbridge.com', passwordHash, role: 'vendor', isActive: true }
    ];
    
    const createdUsers = await User.insertMany(users);
    
    // Link vendor to a vendor profile
    const vendorUser = createdUsers.find(u => u.role === 'vendor');
    const vendor = await Vendor.create({
      legalName: 'Global Logistics Solutions',
      category: 'Logistics',
      gstNumber: '22AAAAA0000A1Z5',
      contactEmail: vendorUser.email,
      status: 'active',
      linkedUserId: vendorUser._id
    });
    
    vendorUser.vendorId = vendor._id;
    await vendorUser.save();

    console.log('Database Seeded Successfully!');
    console.log('Roles & Credentials:');
    users.forEach(u => console.log(`${u.role}: ${u.email} / Password@123`));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedUsers();
