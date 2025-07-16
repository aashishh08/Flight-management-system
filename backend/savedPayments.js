import express from 'express';
import supabase from './supabaseClient.js';

const router = express.Router();

// Save a masked payment method
router.post('/', async (req, res) => {
  const { user_id, card_last4, card_expiry, card_name } = req.body;
  if (!user_id || !card_last4 || !card_expiry || !card_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { data, error } = await supabase
      .from('saved_payments')
      .insert([
        { user_id, card_last4, card_expiry, card_name }
      ]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save payment method' });
  }
});

// Get all saved payment methods for a user
router.get('/', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }
  try {
    const { data, error } = await supabase
      .from('saved_payments')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saved payments' });
  }
});

// Delete a saved payment method by id and user_id
router.delete('/', async (req, res) => {
  const { id, user_id } = req.body;
  if (!id || !user_id) {
    return res.status(400).json({ error: 'Missing id or user_id' });
  }
  try {
    const { error } = await supabase
      .from('saved_payments')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

export default router; 