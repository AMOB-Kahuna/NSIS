import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js';
import sisRouter from './routes/sis.js';
import lmsRouter from './routes/lms.js';
import gradesRouter from './routes/grades.js';
import analyticsRouter from './routes/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for headers
app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/sis', sisRouter);
app.use('/api/lms', lmsRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/analytics', analyticsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`SIS/LMS API Server running on port ${PORT}`);
});
