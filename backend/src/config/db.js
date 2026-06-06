import dns from 'node:dns';
import mongoose from 'mongoose';

export async function connectDatabase(connectionString) {
  if (!connectionString) {
    throw new Error('MONGODB_URI is required');
  }

  mongoose.set('strictQuery', true);

  if (connectionString.startsWith('mongodb+srv://')) {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  return mongoose.connect(connectionString);
}
