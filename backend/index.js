import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import flightsRouter from './flights.js';
import bookingsRouter from './bookings.js';
import airportsRouter from './airports.js';
import { flightStatusStream } from './flightStatusStream.js';
import savedPaymentsRouter from './savedPayments.js';
import userProfileRouter from './userProfile.js';
import logger from './logger.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/bookings', bookingsRouter);
app.use('/api/flights', flightsRouter);
app.use('/api/airports', airportsRouter);
app.get('/api/flight-status/:flightId/stream', flightStatusStream);
app.use('/api/saved-payments', savedPaymentsRouter);
app.use('/api/user-profile', userProfileRouter);

// Add new SSE endpoint for /api/flight-status?flightId=...
app.get('/api/flight-status', (req, res) => {
  // Support both /api/flight-status/:flightId/stream and /api/flight-status?flightId=...
  if (!req.query.flightId) {
    return res.status(400).json({ error: 'Missing flightId query parameter' });
  }
  // Adapt the handler to use req.query.flightId
  req.params = req.params || {};
  req.params.flightId = req.query.flightId;
  flightStatusStream(req, res);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Backend server running on port ${PORT}`);
});
console.log(`Backend server running on port ${PORT}`);

app.use((err, req, res, next) => {
  logger.error('Unhandled error: %o', err);
  res.status(500).json({ error: 'Internal server error' });
}); 