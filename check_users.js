import mongoose from 'mongoose';
import { User } from './backend/src/models.js';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendorbridge');
    const users = await User.find({}, 'firstName lastName email role');
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
