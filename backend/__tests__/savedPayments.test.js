import request from 'supertest';
import express from 'express';
jest.mock('../supabaseClient.js', () => ({
  __esModule: true,
  default: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  },
}));
import savedPaymentsRouter from '../savedPayments.js';

describe('savedPayments.js API', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/saved-payments', savedPaymentsRouter);
  });

  test('POST /api/saved-payments success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.insert.mockReturnValueOnce({ data: {}, error: null });
    const res = await request(app).post('/api/saved-payments').send({ user_id: 1, card_last4: '1234', card_expiry: '12/25', card_name: 'Test' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  test('POST /api/saved-payments missing fields', async () => {
    const res = await request(app).post('/api/saved-payments').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/saved-payments error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.insert.mockReturnValueOnce({ error: new Error('DB error') });
    const res = await request(app).post('/api/saved-payments').send({ user_id: 1, card_last4: '1234', card_expiry: '12/25', card_name: 'Test' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/saved-payments success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ order: () => ({ data: [], error: null }) }) });
    const res = await request(app).get('/api/saved-payments?user_id=1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/saved-payments missing user_id', async () => {
    const res = await request(app).get('/api/saved-payments');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/saved-payments error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ order: () => ({ data: null, error: new Error('DB error') }) }) });
    const res = await request(app).get('/api/saved-payments?user_id=1');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('DELETE /api/saved-payments success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.delete.mockReturnValueOnce({ eq: () => ({ eq: () => ({ error: null }) }) });
    const res = await request(app).delete('/api/saved-payments').send({ id: 1, user_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  test('DELETE /api/saved-payments missing fields', async () => {
    const res = await request(app).delete('/api/saved-payments').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('DELETE /api/saved-payments error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.delete.mockReturnValueOnce({ eq: () => ({ eq: () => ({ error: new Error('DB error') }) }) });
    const res = await request(app).delete('/api/saved-payments').send({ id: 1, user_id: 1 });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
}); 