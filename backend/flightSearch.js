// Flight and airport search logic moved from frontend/lib/flight-search.ts
// This file should use direct DB/service calls, not fetch
const db = require('./supabaseClient'); // or your actual DB/service client

// Helper to check flight status before booking
async function checkFlightStatusBeforeBooking(flightIds) {
  // Fetch latest flight data for each flightId from DB
  const results = await Promise.all(
    flightIds.map(async (id) => {
      const { data: flight, error } = await db
        .from('flights')
        .select('id, status')
        .eq('id', id)
        .single();
      if (error || !flight) return { id, status: 'unknown' };
      return { id, status: flight.status };
    })
  );
  return results;
}

// Always fetch latest flight data before booking
async function getLatestFlightsForBooking(flightIds) {
  return Promise.all(
    flightIds.map(async (id) => {
      const { data: flight, error } = await db
        .from('flights')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !flight) return null;
      return flight;
    })
  );
}

async function searchFlights(params) {
  // params: { origin, destination, departureDate }
  let query = db.from('flights').select('*');
  if (params.origin) query = query.eq('origin', params.origin);
  if (params.destination) query = query.eq('destination', params.destination);
  if (params.departureDate) query = query.eq('departureDate', params.departureDate);
  // Add more params as needed
  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch flights');
  return data;
}

async function getFlightById(id) {
  const { data: flight, error } = await db
    .from('flights')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !flight) return null;
  return flight;
}

async function getAirports() {
  const { data, error } = await db.from('airports').select('*');
  if (error) throw new Error('Failed to fetch airports');
  return data;
}

module.exports = {
  checkFlightStatusBeforeBooking,
  getLatestFlightsForBooking,
  searchFlights,
  getFlightById,
  getAirports,
}; 