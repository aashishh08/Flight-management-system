import request from 'supertest';
import express from 'express';
jest.mock('../supabaseClient.js', () => ({
  __esModule: true,
  default: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  },
}));
import bookingsRouter from '../bookings.js';

describe('bookings.js API', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/bookings', bookingsRouter);
  });

  test('POST /api/bookings missing fields', async () => {
    const res = await request(app).post('/api/bookings').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/bookings error', async () => {
    const supabase = require('../supabaseClient.js').default;
    // Simulate flight not found
    supabase.select.mockReturnValueOnce({ eq: () => ({ single: () => ({ data: null, error: new Error('Flight not found') }) }) });
    const res = await request(app).post('/api/bookings').send({ userId: 1, flightIds: [1], passengers: [{}], contactEmail: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // More detailed success and error cases can be added with deeper supabase mocks
}); 