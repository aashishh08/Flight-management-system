import express from 'express';
import supabase from './supabaseClient.js';

const router = express.Router();

// Search flights
router.get('/search', async (req, res) => {
  const { origin, destination, departureDate } = req.query;
  if (!origin || !destination || !departureDate) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  try {
    const { data, error } = await supabase
      .from('flights')
      .select(`*,
        airline:airlines(*),
        aircraft:aircraft(*),
        origin_airport:airports!flights_origin_airport_id_fkey(*),
        destination_airport:airports!flights_destination_airport_id_fkey(*)
      `)
      .eq('origin_airport.code', origin)
      .eq('destination_airport.code', destination)
      .gte('departure_time', departureDate)
      .lt('departure_time', new Date(new Date(departureDate).getTime() + 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'scheduled')
      .order('departure_time');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search flights' });
  }
});

// Get flight by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('flights')
      .select(`*,
        airline:airlines(*),
        aircraft:aircraft(*),
        origin_airport:airports!flights_origin_airport_id_fkey(*),
        destination_airport:airports!flights_destination_airport_id_fkey(*)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flight' });
  }
});

// Get available seat numbers for a flight and class
router.get('/:id/available-seats', async (req, res) => {
  const { id } = req.params;
  const { seat_class } = req.query;
  if (!seat_class) return res.status(400).json({ error: 'Missing seat_class' });
  try {
    // Get aircraft info for seat count
    const { data: flight, error: flightError } = await supabase
      .from('flights')
      .select('aircraft:aircraft(*), id')
      .eq('id', id)
      .single();
    if (flightError || !flight) throw flightError || new Error('Flight not found');
    const aircraft = flight.aircraft;
    let totalSeats = 0;
    switch (seat_class) {
      case 'economy': totalSeats = aircraft.economy_seats; break;
      case 'premium_economy': totalSeats = aircraft.premium_economy_seats; break;
      case 'business': totalSeats = aircraft.business_seats; break;
      case 'first_class': totalSeats = aircraft.first_class_seats; break;
      default: totalSeats = aircraft.economy_seats;
    }
    // Get taken seat numbers
    const { data: booked, error: bookedError } = await supabase
      .from('flight_bookings')
      .select('seat_number')
      .eq('flight_id', id)
      .eq('seat_class', seat_class);
    if (bookedError) throw bookedError;
    const taken = new Set((booked || []).map(s => s.seat_number));
    // Generate all possible seat numbers (e.g., E1, E2, ...)
    const prefix = seat_class.charAt(0).toUpperCase();
    const available = [];
    for (let i = 1; i <= totalSeats; i++) {
      const seat = `${prefix}${i}`;
      if (!taken.has(seat)) available.push(seat);
    }
    res.json(available);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get available seats' });
  }
});

// Get all seat numbers for a flight and class (for seat selection UI)
router.get('/:id/all-seats', async (req, res) => {
  const { id } = req.params;
  const { seat_class } = req.query;
  if (!seat_class) return res.status(400).json({ error: 'Missing seat_class' });
  try {
    // Get aircraft info for seat count
    const { data: flight, error: flightError } = await supabase
      .from('flights')
      .select('aircraft:aircraft(*), id')
      .eq('id', id)
      .single();
    if (flightError || !flight) throw flightError || new Error('Flight not found');
    const aircraft = flight.aircraft;
    let totalSeats = 0;
    switch (seat_class) {
      case 'economy': totalSeats = aircraft.economy_seats; break;
      case 'premium_economy': totalSeats = aircraft.premium_economy_seats; break;
      case 'business': totalSeats = aircraft.business_seats; break;
      case 'first_class': totalSeats = aircraft.first_class_seats; break;
      default: totalSeats = aircraft.economy_seats;
    }
    // Generate all possible seat numbers (e.g., E1, E2, ...)
    const prefix = seat_class.charAt(0).toUpperCase();
    const allSeats = [];
    for (let i = 1; i <= totalSeats; i++) {
      allSeats.push(`${prefix}${i}`);
    }
    res.json(allSeats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get all seats' });
  }
});

// Get latest status for a flight from flight_status_logs
router.get('/:id/latest-status', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('flight_status_logs')
      .select('*')
      .eq('flight_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No status logs found for this flight' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest flight status' });
  }
});

export default router; 