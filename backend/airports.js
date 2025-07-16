import express from 'express';
import supabase from './supabaseClient.js';

const router = express.Router();

// Get all airports
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('airports')
      .select('*')
      .order('city');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});

// Get popular airports
router.get('/popular', async (req, res) => {
  try {
    const popularCodes = ['LAX', 'JFK', 'LHR', 'CDG', 'DXB', 'NRT'];
    const { data, error } = await supabase
      .from('airports')
      .select('*')
      .in('code', popularCodes);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch popular airports' });
  }
});

export default router; 