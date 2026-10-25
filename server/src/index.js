import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`[SignalDesk API] Server listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[SignalDesk API] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[SignalDesk API] Process terminated.');
  });
});

process.on('SIGINT', () => {
  console.log('[SignalDesk API] SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('[SignalDesk API] Process terminated.');
  });
});
