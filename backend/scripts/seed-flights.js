import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function seedAirports() {
  const airports = [
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', timezone: 'America/New_York' },
    { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles' },
    { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
    { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin' },
    { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai' },
    { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
    { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
    { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
    { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata' },
    { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore', country: 'India', timezone: 'Asia/Kolkata' },
  ];
  await supabase.from('airports').insert(airports);
}

async function seedAirlines() {
  const airlines = [
    { code: 'AA', name: 'American Airlines', logo_url: '/airlines/american.png' },
    { code: 'DL', name: 'Delta Air Lines', logo_url: '/airlines/delta.png' },
    { code: 'UA', name: 'United Airlines', logo_url: '/airlines/united.png' },
    { code: 'BA', name: 'British Airways', logo_url: '/airlines/british.png' },
    { code: 'LH', name: 'Lufthansa', logo_url: '/airlines/lufthansa.png' },
    { code: 'AF', name: 'Air France', logo_url: '/airlines/airfrance.png' },
    { code: 'KL', name: 'KLM Royal Dutch Airlines', logo_url: '/airlines/klm.png' },
    { code: 'EK', name: 'Emirates', logo_url: '/airlines/emirates.png' },
    { code: 'AI', name: 'Air India', logo_url: '/airlines/airindia.png' },
    { code: '6E', name: 'IndiGo', logo_url: '/airlines/indigo.png' },
  ];
  await supabase.from('airlines').insert(airlines);
}

async function seedAircraft() {
  const aircraft = [
    { model: 'Boeing 737-800', manufacturer: 'Boeing', total_seats: 162, economy_seats: 150, premium_economy_seats: 0, business_seats: 12, first_class_seats: 0 },
    { model: 'Boeing 777-300ER', manufacturer: 'Boeing', total_seats: 396, economy_seats: 296, premium_economy_seats: 40, business_seats: 52, first_class_seats: 8 },
    { model: 'Airbus A320', manufacturer: 'Airbus', total_seats: 180, economy_seats: 162, premium_economy_seats: 0, business_seats: 18, first_class_seats: 0 },
    { model: 'Airbus A380', manufacturer: 'Airbus', total_seats: 853, economy_seats: 615, premium_economy_seats: 76, business_seats: 126, first_class_seats: 36 },
    { model: 'Boeing 787-9', manufacturer: 'Boeing', total_seats: 290, economy_seats: 224, premium_economy_seats: 28, business_seats: 30, first_class_seats: 8 },
    { model: 'Airbus A350-900', manufacturer: 'Airbus', total_seats: 325, economy_seats: 253, premium_economy_seats: 36, business_seats: 30, first_class_seats: 6 },
  ];
  await supabase.from('aircraft').insert(aircraft);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

async function seedFlights() {
  const { data: airports } = await supabase.from('airports').select('*');
  const { data: airlines } = await supabase.from('airlines').select('*');
  const { data: aircraft } = await supabase.from('aircraft').select('*');
  let totalInserted = 0;
  for (const dest of airports) {
    let flights = [];
    for (let i = 0; i < 100; i++) {
      let origin;
      do {
        origin = airports[randomInt(0, airports.length - 1)];
      } while (origin.id === dest.id);
      const airline = airlines[randomInt(0, airlines.length - 1)];
      const plane = aircraft[randomInt(0, aircraft.length - 1)];
      const flightNum = randomInt(1000, 9999);
      const flightNumber = `${airline.code}${flightNum}`;
      // Set outbound date to July 20 of current year
      const currentYear = new Date().getFullYear();
      const date = new Date(Date.UTC(currentYear, 6, 20)); // July is month 6 (0-indexed)
      const depHour = randomInt(0, 23);
      const depMin = randomInt(0, 59);
      const depTime = `${pad(depHour)}:${pad(depMin)}:00`;
      const duration = randomInt(60, 720);
      const arr = new Date(date);
      arr.setUTCHours(depHour);
      arr.setUTCMinutes(depMin + duration);
      const arrTime = `${pad(arr.getUTCHours())}:${pad(arr.getUTCMinutes())}:00`;
      const basePrice = randomInt(100, 1500);
      const available_economy = randomInt(50, plane.economy_seats || 200);
      const available_premium_economy = randomInt(0, plane.premium_economy_seats || 40);
      const available_business = randomInt(0, plane.business_seats || 30);
      const available_first_class = randomInt(0, plane.first_class_seats || 10);
      const depISO = `${date.toISOString().slice(0,10)}T${depTime}`;
      const arrISO = `${date.toISOString().slice(0,10)}T${arrTime}`;
      // Outbound flight
      const outboundFlight = {
        flight_number: flightNumber,
        airline_id: airline.id,
        aircraft_id: plane.id,
        origin_airport_id: origin.id,
        destination_airport_id: dest.id,
        departure_time: depISO,
        arrival_time: arrISO,
        duration,
        base_price: basePrice,
        available_economy,
        available_premium_economy,
        available_business,
        available_first_class,
        economy_price: basePrice,
        premium_price: Math.round(basePrice * 1.2),
        business_price: Math.round(basePrice * 1.5),
        first_price: Math.round(basePrice * 2),
      };
      // Round-trip flight (fixed to July 21)
      const returnDate = new Date(Date.UTC(currentYear, 6, 21)); // July 21
      const returnDepTime = depTime; // same time of day for simplicity
      const returnArr = new Date(returnDate);
      returnArr.setUTCHours(depHour);
      returnArr.setUTCMinutes(depMin + duration);
      const returnArrTime = `${pad(returnArr.getUTCHours())}:${pad(returnArr.getUTCMinutes())}:00`;
      const returnDepISO = `${returnDate.toISOString().slice(0,10)}T${returnDepTime}`;
      const returnArrISO = `${returnDate.toISOString().slice(0,10)}T${returnArrTime}`;
      const returnFlightNum = randomInt(1000, 9999);
      const returnFlightNumber = `${airline.code}${returnFlightNum}`;
      const returnFlight = {
        flight_number: returnFlightNumber,
        airline_id: airline.id,
        aircraft_id: plane.id,
        origin_airport_id: dest.id,
        destination_airport_id: origin.id,
        departure_time: returnDepISO,
        arrival_time: returnArrISO,
        duration,
        base_price: basePrice,
        available_economy,
        available_premium_economy,
        available_business,
        available_first_class,
        economy_price: basePrice,
        premium_price: Math.round(basePrice * 1.2),
        business_price: Math.round(basePrice * 1.5),
        first_price: Math.round(basePrice * 2),
      };
      flights.push(outboundFlight, returnFlight);
      if (flights.length >= 100) {
        const { error } = await supabase.from('flights').insert(flights);
        if (error) {
          console.error('Insert error:', error);
        } else {
          totalInserted += flights.length;
          console.log(`Inserted ${flights.length} flights (including round-trips) for destination ${dest.code}`);
        }
        flights = [];
      }
    }
    if (flights.length > 0) {
      const { error } = await supabase.from('flights').insert(flights);
      if (error) {
        console.error('Insert error:', error);
      } else {
        totalInserted += flights.length;
        console.log(`Inserted ${flights.length} flights (including round-trips) for destination ${dest.code}`);
      }
    }
  }
  console.log(`Done! Inserted ${totalInserted} flights (including round-trips).`);
}

async function main() {
  console.log('Seeding airports...');
  await seedAirports();
  console.log('Seeding airlines...');
  await seedAirlines();
  console.log('Seeding aircraft...');
  await seedAircraft();
  console.log('Seeding flights...');
  await seedFlights();
  console.log('All done!');
  process.exit(0);
}

main();
