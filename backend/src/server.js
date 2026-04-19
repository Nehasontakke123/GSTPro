import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB, { getActiveDbLabel } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import clientRoutes from './routes/client.routes.js';
import officerRoutes from './routes/officer.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { bootstrapUsers } from './utils/bootstrapUsers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 8000;
const DEFAULT_FRONTEND_ORIGIN = 'https://gst-pro-opal.vercel.app';

const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '');

const allowedOrigins = Array.from(
  new Set(
    [
      DEFAULT_FRONTEND_ORIGIN,
      ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000'] : []),
      ...(process.env.FRONTEND_URL || '')
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean)
    ]
  )
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    const corsError = new Error(`Origin ${normalizedOrigin} is not allowed by CORS`);
    corsError.statusCode = 403;
    callback(corsError);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GST Reconciliation System Pro API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: getActiveDbLabel()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/officer', officerRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  await bootstrapUsers();

  const server = app.listen(PORT, () => {
    console.log('\nGST Reconciliation System Pro API');
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Database: ${getActiveDbLabel()}`);
    console.log(`Health check: http://localhost:${PORT}/api/health\n`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing process using port ${PORT} and restart the backend.`);
      process.exit(1);
    }

    console.error(`Server failed to start: ${error.message}`);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
