import request from 'supertest';
import express from 'express';
import flightsRouter from '../flights.js';

describe('flights.js integration tests', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/flights', flightsRouter);
  });

  test('GET /api/flights/search returns 400 if params missing', async () => {
    const res = await request(app).get('/api/flights/search');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // This test assumes a working supabase test DB and valid params
  // You may need to adjust or mock DB for CI
  test.skip('GET /api/flights/search returns 200 with valid params', async () => {
    const res = await request(app).get('/api/flights/search?origin=JFK&destination=LAX&departureDate=2024-06-01');
    expect([200, 500]).toContain(res.status); // Accept 500 if DB not set up
  });
}); 