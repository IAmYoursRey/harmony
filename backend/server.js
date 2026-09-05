import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import aiRoutes from './routes/ai.js';
import digitalTwinRoutes from './routes/digitalTwin.js';
import schoolRoutes from './routes/schools.js';
import surveyRoutes from './routes/surveys.js';
import usersRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';
import classesRoutes from './routes/classes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://geo-sense-iota.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

import 'express-async-errors';

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/digital-twin', digitalTwinRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/classes', classesRoutes);

app.get('/api/debug', async (req, res) => {
  const hasDb = !!process.env.DATABASE_URL;
  let dbResult = 'skipped';
  if (hasDb) {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000,
        queryTimeout: 3000
      });
      const start = Date.now();
      const result = await Promise.race([
        pool.query('SELECT 1 as val'),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 4000))
      ]);
      dbResult = `success in ${Date.now()-start}ms`;
    } catch(e) {
      dbResult = `error: ${e.message}`;
    }
  }
  res.json({
    ok: true,
    vercel: process.env.VERCEL,
    node_env: process.env.NODE_ENV,
    hasDb,
    dbResult
  });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(503).json({ error: 'Service temporarily unavailable. Please verify backend configurations.' });
});

export default app;

if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`GeoSense Backend listening at http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERROR] Port ${PORT} is already in use.`);
      console.error(`Please kill the process holding the port manually.\n`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  // Graceful shutdown handling for nodemon and concurrently
  const shutdown = (signal) => {
    console.log(`\n[${signal}] Received, shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle nodemon restart specifically (SIGUSR2)
  process.once('SIGUSR2', () => {
    server.close(() => {
      process.kill(process.pid, 'SIGUSR2');
    });
  });
}
