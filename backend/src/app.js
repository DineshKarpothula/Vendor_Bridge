import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import procurementRoutes from './routes/procurement.js';
import vendorRoutes from './routes/vendor.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()) || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'vendorbridge-backend' });
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/procurement', procurementRoutes);
app.use('/vendor', vendorRoutes);

// Serve built frontend if present so a single URL (http://localhost:5000)
// can serve both API and the frontend in production.
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, '..', '..', 'dist');

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // Fallback middleware to serve index.html for client-side routes
    app.use((req, res, next) => {
      const apiPrefixes = ['/auth', '/admin', '/procurement', '/vendor', '/health'];
      if (apiPrefixes.some((p) => req.path.startsWith(p))) {
        return next();
      }

      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }

      return next();
    });
  }
} catch (err) {
  // non-fatal — continue serving API only
  // eslint-disable-next-line no-console
  console.warn('Frontend build not served:', err?.message || err);
}

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, _req, res, next) => {
  void next;
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal server error';
  res.status(statusCode).json({ message });
});

export default app;
