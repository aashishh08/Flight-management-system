import request from 'supertest';
import express from 'express';
jest.mock('../supabaseClient.js', () => ({
  __esModule: true,
  default: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  },
}));
import flightsRouter from '../flights.js';

describe('flights.js unit tests', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/flights', flightsRouter);
  });

  test('GET /api/flights/search missing params', async () => {
    const res = await request(app).get('/api/flights/search');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/flights/search handles supabase error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnThis();
    supabase.eq.mockReturnThis();
    supabase.gte.mockReturnThis();
    supabase.lt.mockReturnThis();
    supabase.order.mockReturnThis();
    supabase.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              lt: () => ({
                eq: () => ({
                  order: () => ({
                    data: null,
                    error: new Error('DB error'),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    });
    const res = await request(app).get('/api/flights/search?origin=JFK&destination=LAX&departureDate=2024-06-01');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
}); 