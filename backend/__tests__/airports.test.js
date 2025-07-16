import request from 'supertest';
import express from 'express';
jest.mock('../supabaseClient.js', () => ({
  __esModule: true,
  default: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  },
}));
import airportsRouter from '../airports.js';

describe('airports.js API', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/airports', airportsRouter);
  });

  test('GET /api/airports returns airports', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => ({ data: [{ code: 'JFK' }], error: null }) });
    const res = await request(app).get('/api/airports');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/airports handles error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => ({ data: null, error: new Error('DB error') }) });
    const res = await request(app).get('/api/airports');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/airports/popular returns airports', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ in: () => ({ data: [{ code: 'JFK' }], error: null }) });
    const res = await request(app).get('/api/airports/popular');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/airports/popular handles error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ in: () => ({ data: null, error: new Error('DB error') }) });
    const res = await request(app).get('/api/airports/popular');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
}); 