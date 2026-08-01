import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import os from 'os';
import path from 'path';
import { getMediaDataPath } from './utils/pathHelper.js';
import recordRoutes from './routes/recordRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { verifyToken } from './middleware/authMiddleware.js';

const app = express();
const PORT = 5000;

// Middleware
const ALLOWED_ORIGIN = 'http://localhost:5173';

app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Auth routes can be accessed via /auth directly for backdoors
app.use('/auth', authRoutes);

// Strict Origin Checker for API
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
  
  // If the request doesn't have the frontend origin/referer, block it completely
  if (!origin || !origin.startsWith(ALLOWED_ORIGIN)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access Denied: Requests only allowed from the official frontend application.' 
    });
  }
  
  next();
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected API Auth Routes (for frontend login/verify)
app.use('/api/auth', authRoutes);
// (Middlewares moved up)
// Serve record files (images stored in /data/{id}/ folders)
app.use('/data', express.static(getMediaDataPath()));

// Auth Routes
app.use('/api/auth', authRoutes);

// Protected Record Routes
app.use('/api/records', verifyToken, recordRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Media Management API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!', 
    error: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
