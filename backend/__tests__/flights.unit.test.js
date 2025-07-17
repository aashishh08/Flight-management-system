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

  test('GET /api/flights/:id returns flight', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ single: () => ({ data: { id: 1 }, error: null }) }) });
    const res = await request(app).get('/api/flights/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  test('GET /api/flights/:id/available-seats returns available seats', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ single: () => ({ data: { aircraft: { economy_seats: 2 }, id: 1 }, error: null }) }) });
    supabase.select.mockReturnValueOnce({ eq: () => ({ eq: () => ({ data: [{ seat_number: 'E1' }], error: null }) }) });
    const res = await request(app).get('/api/flights/1/available-seats?seat_class=economy');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/flights/:id/all-seats returns all seats', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ single: () => ({ data: { aircraft: { economy_seats: 2 }, id: 1 }, error: null }) }) });
    const res = await request(app).get('/api/flights/1/all-seats?seat_class=economy');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/flights/:id/latest-status returns latest status', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ order: () => ({ limit: () => ({ single: () => ({ data: { status: 'on-time' }, error: null }) }) }) }) });
    const res = await request(app).get('/api/flights/1/latest-status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'on-time');
  });

  test('POST /api/flights/statuses returns statuses', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValue({ eq: () => ({ single: () => ({ data: { id: 1, status: 'on-time' }, error: null }) }) });
    const res = await request(app).post('/api/flights/statuses').send({ flightIds: [1] });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/flights/batch returns flights', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValue({ eq: () => ({ single: () => ({ data: { id: 1 }, error: null }) }) });
    const res = await request(app).post('/api/flights/batch').send({ flightIds: [1] });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/flights/:id/available-seats missing seat_class', async () => {
    const res = await request(app).get('/api/flights/1/available-seats');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/flights/:id/available-seats flight not found', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ single: () => ({ data: null, error: new Error('Flight not found') }) }) });
    const res = await request(app).get('/api/flights/1/available-seats?seat_class=economy');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/flights/:id/all-seats missing seat_class', async () => {
    const res = await request(app).get('/api/flights/1/all-seats');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/flights/:id/all-seats flight not found', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ single: () => ({ data: null, error: new Error('Flight not found') }) }) });
    const res = await request(app).get('/api/flights/1/all-seats?seat_class=economy');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/flights/:id/latest-status no status logs', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ order: () => ({ limit: () => ({ single: () => ({ data: null, error: null }) }) }) }) });
    const res = await request(app).get('/api/flights/1/latest-status');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('PATCH /api/flights/:id missing id or status', async () => {
    const res = await request(app).patch('/api/flights/').send({});
    expect(res.status).toBe(404); // No id in URL
    // Now test missing status
    const res2 = await request(app).patch('/api/flights/1').send({});
    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty('error');
  });

  test('PATCH /api/flights/:id update error', async () => {
    const supabase = require('../supabaseClient.js').default;
    if (!supabase.update) supabase.update = jest.fn();
    supabase.update.mockReturnValueOnce({ eq: () => ({ select: () => ({ single: () => ({ error: new Error('Update error') }) }) }) });
    const res = await request(app).patch('/api/flights/1').send({ status: 'delayed' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('PATCH /api/flights/:id not found', async () => {
    const supabase = require('../supabaseClient.js').default;
    if (!supabase.update) supabase.update = jest.fn();
    supabase.update.mockReturnValueOnce({ eq: () => ({ select: () => ({ single: () => ({ error: null, data: null }) }) }) });
    const res = await request(app).patch('/api/flights/1').send({ status: 'delayed' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/flights/statuses missing flightIds', async () => {
    const res = await request(app).post('/api/flights/statuses').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/flights/batch missing flightIds', async () => {
    const res = await request(app).post('/api/flights/batch').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
}); 