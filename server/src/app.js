import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import feedbackRouter from './routes/feedback.js';
import insightsRouter from './routes/insights.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/insights', insightsRouter);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error-Handling Middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
