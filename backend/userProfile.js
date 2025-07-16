import express from 'express';
import supabase from './supabaseClient.js';
import logger from './logger.js';

const router = express.Router();

// Get user profile by user_id
router.get('/', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();
    if (error) {
      logger.error('Supabase error: %o', error);
      throw error;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile by user_id
router.put('/', async (req, res) => {
  const { user_id, ...fields } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .select()
      .single();
    if (error) {
      logger.error('Supabase error: %o', error);
      throw error;
    }
    res.json(data);
  } catch (err) {
    logger.error('Supabase update error: %o', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Create user profile
router.post('/', async (req, res) => {
  const { user_id, ...fields } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{ user_id, ...fields, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      .select()
      .single();
    if (error) {
      logger.error('Supabase error: %o', error);
      throw error;
    }
    res.json(data);
  } catch (err) {
    logger.error('API error: %o', err);
    res.status(500).json({ error: 'Failed to create user profile', details: err.message || err });
  }
});

export default router; 