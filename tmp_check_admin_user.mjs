import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: './backend/.env' });
console.log('Loaded MONGODB_URI:', process.env.MONGODB_URI);
console.log('Loaded JWT_SECRET starts:', process.env.JWT_SECRET?.slice(0, 10));

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendorbridge');
const { User } = await import('./backend/src/models.js');
const user = await User.findOne({ email: 'admin@vendorbridge.com' }).lean();
console.log('User record:', JSON.stringify(user, null, 2));
if (user) {
  const match = await bcrypt.compare('Password@123', user.passwordHash);
  console.log('Password compare result:', match);
}
await mongoose.disconnect();
