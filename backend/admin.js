import express from 'express';
import supabase from './supabaseClient.js';
import dayjs from "dayjs";

const router = express.Router();

// GET /api/admin/metrics - Dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    // Total bookings
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Total revenue (sum of total_amount for confirmed bookings)
    const { data: revenueRows } = await supabase
      .from('bookings')
      .select('total_amount, status');
    const totalRevenue = (revenueRows || [])
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    // Cancellations count
    const { count: cancellations } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled');

    res.json({
      totalBookings: totalBookings || 0,
      totalUsers: totalUsers || 0,
      totalRevenue: totalRevenue || 0,
      cancellations: cancellations || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metrics', details: err.message });
  }
});

// GET /api/admin/bookings - All bookings with optional filters and pagination
router.get('/bookings', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, bookingId, userEmail, flightNumber } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 20;
    let query = supabase
      .from('bookings')
      .select(`*, passengers(*), flight_bookings(*, flight:flights(*))`, { count: 'exact' })
      .order('booking_date', { ascending: false });
    if (bookingId) {
      query = query.eq('id', bookingId);
    }
    if (userEmail) {
      query = query.ilike('contact_email', `%${userEmail}%`);
    }
    // Filter by flight number (search in joined flights)
    let filterByFlightNumber = false;
    if (flightNumber) {
      filterByFlightNumber = true;
    }
    query = query.range((pageNum - 1) * size, pageNum * size - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    let filtered = data || [];
    if (filterByFlightNumber) {
      filtered = filtered.filter(b =>
        (b.flight_bookings || []).some(fb =>
          fb.flight && fb.flight.flight_number && fb.flight.flight_number.includes(flightNumber)
        )
      );
    }
    res.json({
      data: filtered,
      total: filterByFlightNumber ? filtered.length : (count || 0),
      page: pageNum,
      pageSize: size,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message });
  }
});

// GET /api/admin/users - All users with optional filters and pagination
router.get('/users', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, email, name } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 20;
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    if (name) {
      query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
    }
    query = query.range((pageNum - 1) * size, pageNum * size - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({
      data: data || [],
      total: count || 0,
      page: pageNum,
      pageSize: size,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// GET /api/admin/flights - All flights (with optional date filters, pagination, and flight number search)
router.get('/flights', async (req, res) => {
  try {
    const { departureFrom, departureTo, page = 1, pageSize = 20, flightNumber } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 20;
    let query = supabase
      .from('flights')
      .select(`*, airline:airlines(*), aircraft:aircraft(*), origin_airport:airports!flights_origin_airport_id_fkey(*), destination_airport:airports!flights_destination_airport_id_fkey(*)`, { count: 'exact' })
      .order('departure_time', { ascending: false });
    if (departureFrom) {
      query = query.gte('departure_time', departureFrom);
    }
    if (departureTo) {
      query = query.lte('departure_time', departureTo);
    }
    if (flightNumber) {
      query = query.ilike('flight_number', `%${flightNumber}%`);
    }
    query = query.range((pageNum - 1) * size, pageNum * size - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({
      data,
      total: count || 0,
      page: pageNum,
      pageSize: size,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flights', details: err.message });
  }
});

// GET /api/admin/flights-with-status - All flights with latest status from logs
router.get('/flights-with-status', async (req, res) => {
  try {
    const { flightNumber, departureFrom, departureTo } = req.query;
    let query = supabase
      .from('flights')
      .select(`*, airline:airlines(*), aircraft:aircraft(*), origin_airport:airports!flights_origin_airport_id_fkey(*), destination_airport:airports!flights_destination_airport_id_fkey(*)`)
      .order('departure_time', { ascending: false });

    if (flightNumber) {
      query = query.ilike('flight_number', `%${flightNumber}%`);
    }
    if (departureFrom) {
      query = query.gte('departure_time', departureFrom);
    }
    if (departureTo) {
      query = query.lte('departure_time', departureTo);
    }

    const { data: flights, error } = await query;
    if (error) throw error;
    if (!flights || flights.length === 0) return res.json([]);

    // Get latest status for all flights in one query
    const flightIds = flights.map(f => f.id);
    const { data: statusLogs, error: statusError } = await supabase
      .from('flight_status_logs')
      .select('flight_id, status, updated_at')
      .in('flight_id', flightIds)
      .order('updated_at', { ascending: false });
    if (statusError) throw statusError;

    // Map flight_id to latest status
    const latestStatusMap = {};
    for (const log of statusLogs) {
      if (!latestStatusMap[log.flight_id]) {
        latestStatusMap[log.flight_id] = { status: log.status, updated_at: log.updated_at };
      }
    }

    // Attach latest status to each flight
    const flightsWithStatus = flights.map(f => ({
      ...f,
      latest_status: latestStatusMap[f.id]?.status || f.status,
      latest_status_time: latestStatusMap[f.id]?.updated_at || null,
    }));

    res.json(flightsWithStatus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flights with status', details: err.message });
  }
});

// GET /api/admin/flights/:id/status-history - Full status history for a flight
router.get('/flights/:id/status-history', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('flight_status_logs')
      .select('*')
      .eq('flight_id', id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status history', details: err.message });
  }
});

// PATCH /api/admin/flights/:id/status - Change flight status and log it
router.patch('/flights/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, updated_by, note } = req.body; // updated_by is optional (admin user id)
  if (!status) {
    return res.status(400).json({ error: 'Missing status' });
  }
  try {
    // Update the flight status and latest_status
    const { data: updatedFlight, error: updateError } = await supabase
      .from('flights')
      .update({ status, latest_status: status })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    // Log the status change in flight_status_logs
    const { error: logError } = await supabase
      .from('flight_status_logs')
      .insert({
        flight_id: id,
        status,
        updated_at: new Date().toISOString(),
        ...(updated_by && { updated_by }),
        note: note || 'Status changed by admin',
      });
    if (logError) throw logError;

    res.json(updatedFlight);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update flight status', details: err.message });
  }
});

// GET /api/admin/stats/bookings-trend - Daily bookings count for last 30 days
router.get('/stats/bookings-trend', async (req, res) => {
  try {
    const today = dayjs().endOf('day');
    const start = today.subtract(29, 'day').startOf('day');
    // Fetch all bookings in the last 30 days
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_date')
      .gte('booking_date', start.toISOString())
      .lte('booking_date', today.toISOString());
    if (error) throw error;
    // Aggregate by date
    const counts = {};
    for (let i = 0; i < 30; i++) {
      const d = start.add(i, 'day').format('YYYY-MM-DD');
      counts[d] = 0;
    }
    (data || []).forEach(b => {
      const d = dayjs(b.booking_date).format('YYYY-MM-DD');
      if (counts[d] !== undefined) counts[d]++;
    });
    const result = Object.entries(counts).map(([date, count]) => ({ date, count }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings trend', details: err.message });
  }
});

// GET /api/admin/stats/bookings-by-airline - Bookings count by airline
router.get('/stats/bookings-by-airline', async (req, res) => {
  try {
    // Join bookings -> flight_bookings -> flights -> airlines
    const { data, error } = await supabase
      .from('flight_bookings')
      .select('id, flight:flights(airline:airlines(name))');
    if (error) throw error;
    // Count bookings per airline
    const counts = {};
    (data || []).forEach(fb => {
      const airline = fb.flight?.airline?.name || 'Unknown';
      counts[airline] = (counts[airline] || 0) + 1;
    });
    const result = Object.entries(counts).map(([airline, count]) => ({ airline, count }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings by airline', details: err.message });
  }
});

// GET /api/admin/stats/booking-status-distribution - Booking count by status
router.get('/stats/booking-status-distribution', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('status');
    if (error) throw error;
    const counts = {};
    (data || []).forEach(b => {
      const status = b.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    const result = Object.entries(counts).map(([status, count]) => ({ status, count }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking status distribution', details: err.message });
  }
});

export default router; 