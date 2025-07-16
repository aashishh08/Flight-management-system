import request from 'supertest';
import express from 'express';
jest.mock('../supabaseClient.js', () => ({
  __esModule: true,
  default: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  },
}));
import userProfileRouter from '../userProfile.js';

describe('userProfile.js API', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/user-profile', userProfileRouter);
  });

  test('GET /api/user-profile success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ single: () => ({ data: { user_id: 1 }, error: null }) }) });
    const res = await request(app).get('/api/user-profile?user_id=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user_id', 1);
  });

  test('GET /api/user-profile missing user_id', async () => {
    const res = await request(app).get('/api/user-profile');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/user-profile error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.select.mockReturnValueOnce({ eq: () => ({ single: () => ({ data: null, error: new Error('DB error') }) }) });
    const res = await request(app).get('/api/user-profile?user_id=1');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('PUT /api/user-profile success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.update.mockReturnValueOnce({ eq: () => ({ select: () => ({ single: () => ({ data: { user_id: 1 }, error: null }) }) }) });
    const res = await request(app).put('/api/user-profile').send({ user_id: 1, name: 'Test' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user_id', 1);
  });

  test('PUT /api/user-profile missing user_id', async () => {
    const res = await request(app).put('/api/user-profile').send({ name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('PUT /api/user-profile error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.update.mockReturnValueOnce({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: new Error('DB error') }) }) }) });
    const res = await request(app).put('/api/user-profile').send({ user_id: 1, name: 'Test' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/user-profile success', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.insert.mockReturnValueOnce({ select: () => ({ single: () => ({ data: { user_id: 1 }, error: null }) }) });
    const res = await request(app).post('/api/user-profile').send({ user_id: 1, name: 'Test' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user_id', 1);
  });

  test('POST /api/user-profile missing user_id', async () => {
    const res = await request(app).post('/api/user-profile').send({ name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/user-profile error', async () => {
    const supabase = require('../supabaseClient.js').default;
    supabase.insert.mockReturnValueOnce({ select: () => ({ single: () => ({ data: null, error: new Error('DB error') }) }) });
    const res = await request(app).post('/api/user-profile').send({ user_id: 1, name: 'Test' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
}); 