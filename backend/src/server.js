import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT || 5000);

async function start() {
  try {
    console.log('STARTUP ENV MONGODB_URI:', process.env.MONGODB_URI);
    console.log('STARTUP ENV JWT_SECRET:', process.env.JWT_SECRET ? `${process.env.JWT_SECRET.slice(0, 10)}...` : 'MISSING');
    await connectDatabase(process.env.MONGODB_URI);
    app.listen(port, () => {
      console.log(`VendorBridge backend running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
  }
}

start();
