import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT || 5000);

async function start() {
  try {
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
