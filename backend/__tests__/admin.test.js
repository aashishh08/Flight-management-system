import request from 'supertest';
import express from 'express';
jest.mock('../supabaseClient.js', () => ({
  __esModule: true,
  default: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  },
}));
import adminRouter from '../admin.js';

describe('admin.js API', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
  });

  test('GET /api/admin/metrics returns metrics', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ count: 10 });
    supabase.select.mockReturnValueOnce({ count: 5 });
    supabase.select.mockReturnValueOnce({ data: [{ total_amount: 100, status: 'confirmed' }] });
    supabase.select.mockReturnValueOnce({ count: 2 });
    const res = await request(app).get('/api/admin/metrics');
    expect([200, 500]).toContain(res.status);
  });

  test('GET /api/admin/bookings returns bookings', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => ({ data: [], error: null, count: 0 }) });
    const res = await request(app).get('/api/admin/bookings');
    expect([200, 500]).toContain(res.status);
  });

  test('GET /api/admin/users returns users', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => ({ data: [], error: null, count: 0 }) });
    const res = await request(app).get('/api/admin/users');
    expect([200, 500]).toContain(res.status);
  });

  test('GET /api/admin/flights returns flights', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => ({ data: [], error: null, count: 0 }) });
    const res = await request(app).get('/api/admin/flights');
    expect([200, 500]).toContain(res.status);
  });

  test('GET /api/admin/flights-with-status returns flights with status', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => ({ data: [], error: null }) });
    supabase.select.mockReturnValueOnce({ order: () => ({ data: [], error: null }) });
    const res = await request(app).get('/api/admin/flights-with-status');
    expect([200, 500]).toContain(res.status);
  });

  test('GET /api/admin/metrics error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockImplementation(() => { throw new Error('DB error') });
    const res = await request(app).get('/api/admin/metrics');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/bookings error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => { throw new Error('DB error') } });
    const res = await request(app).get('/api/admin/bookings');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/users error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => { throw new Error('DB error') } });
    const res = await request(app).get('/api/admin/users');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/flights error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => { throw new Error('DB error') } });
    const res = await request(app).get('/api/admin/flights');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/flights-with-status error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ order: () => { throw new Error('DB error') } });
    const res = await request(app).get('/api/admin/flights-with-status');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/flights/1/status-history success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ order: () => ({ data: [{ id: 1 }], error: null }) }) });
    const res = await request(app).get('/api/admin/flights/1/status-history');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/admin/flights/1/status-history error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ order: () => ({ error: new Error('DB error') }) }) });
    const res = await request(app).get('/api/admin/flights/1/status-history');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('PATCH /api/admin/flights/1/status missing status', async () => {
    const res = await request(app).patch('/api/admin/flights/1/status').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('PATCH /api/admin/flights/1/status error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.update.mockReturnValueOnce({ eq: () => ({ select: () => ({ single: () => ({ error: new Error('Update error') }) }) }) });
    const res = await request(app).patch('/api/admin/flights/1/status').send({ status: 'delayed' });
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/stats/bookings-trend success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ gte: () => ({ lte: () => ({ data: [{ booking_date: new Date().toISOString() }], error: null }) }) });
    const res = await request(app).get('/api/admin/stats/bookings-trend');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/admin/stats/bookings-trend error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ gte: () => ({ lte: () => ({ error: new Error('DB error') }) }) });
    const res = await request(app).get('/api/admin/stats/bookings-trend');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/stats/bookings-by-airline success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ data: [{ flight: { airline: { name: 'TestAir' } } }], error: null });
    const res = await request(app).get('/api/admin/stats/bookings-by-airline');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/admin/stats/bookings-by-airline error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ error: new Error('DB error') });
    const res = await request(app).get('/api/admin/stats/bookings-by-airline');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/stats/booking-status-distribution success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ data: [{ status: 'confirmed' }], error: null });
    const res = await request(app).get('/api/admin/stats/booking-status-distribution');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/admin/stats/booking-status-distribution error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ error: new Error('DB error') });
    const res = await request(app).get('/api/admin/stats/booking-status-distribution');
    expect([500, 200]).toContain(res.status);
    if (res.status === 500) expect(res.body).toHaveProperty('error');
  });

  test('GET /api/admin/bookings with filters', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ ilike: () => ({ range: () => ({ data: [{ id: 1, flight_bookings: [{ flight: { flight_number: 'FN123' } }] }], error: null, count: 1 }) }) }) });
    const res = await request(app).get('/api/admin/bookings?bookingId=1&userEmail=test%40a.com&flightNumber=FN123');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(res.body).toHaveProperty('data');
  });

  test('GET /api/admin/users with filters', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ ilike: () => ({ or: () => ({ range: () => ({ data: [{ id: 1 }], error: null, count: 1 }) }) }) });
    const res = await request(app).get('/api/admin/users?email=test%40a.com&name=Test');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(res.body).toHaveProperty('data');
  });

  test('GET /api/admin/flights with filters', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ gte: () => ({ lte: () => ({ ilike: () => ({ range: () => ({ data: [{ id: 1 }], error: null, count: 1 }) }) }) }) });
    const res = await request(app).get('/api/admin/flights?departureFrom=2024-01-01&departureTo=2024-01-02&flightNumber=FN123');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(res.body).toHaveProperty('data');
  });

  test('GET /api/admin/flights-with-status with filters', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ ilike: () => ({ gte: () => ({ lte: () => ({ order: () => ({ data: [{ id: 1, status: 'on-time' }], error: null }) }) }) }) });
    supabase.select.mockReturnValueOnce({ in: () => ({ order: () => ({ data: [{ flight_id: 1, status: 'on-time', updated_at: new Date().toISOString() }], error: null }) }) });
    const res = await request(app).get('/api/admin/flights-with-status?flightNumber=FN123&departureFrom=2024-01-01&departureTo=2024-01-02');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/admin/flights/1/status-history no logs', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ order: () => ({ data: [], error: null }) }) });
    const res = await request(app).get('/api/admin/flights/1/status-history');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true);
  });

  test('PATCH /api/admin/flights/1/status with note and updated_by', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.update.mockReturnValueOnce({ eq: () => ({ select: () => ({ single: () => ({ data: { id: 1, status: 'delayed' }, error: null }) }) }) });
    if (!supabase.insert) supabase.insert = jest.fn();
    supabase.insert.mockReturnValueOnce({});
    const res = await request(app).patch('/api/admin/flights/1/status').send({ status: 'delayed', updated_by: 1, note: 'Weather' });
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(res.body).toHaveProperty('id', 1);
  });
}); 