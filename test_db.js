import mongoose from 'mongoose';
const uri = 'mongodb+srv://karupothuladineshgoud_db_user:n8CCpNURTjUMibbE@vendorbridge.3utbx2o.mongodb.net/vendorbridge?retryWrites=true&w=majority&appName=VendorBridge';

async function test() {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(uri);
    console.log('Connected!');
    process.exit(0);
  } catch (err) {
    console.error('Atlas Connection Error:', err.message);
    process.exit(1);
  }
}

test();
