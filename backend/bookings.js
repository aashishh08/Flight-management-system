import express from 'express';
import supabase from './supabaseClient.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';
dotenv.config();

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Create a booking
router.post('/', async (req, res) => {
  logger.info('Received booking request body: %o', req.body);
  const { userId, flightIds, passengers, contactEmail, contactPhone, seatClass = 'economy' } = req.body;
  if (!userId || !flightIds || !passengers || !contactEmail) {
    logger.error('Missing required fields: %o', { userId, flightIds, passengers, contactEmail });
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // 1. Check seat availability for each flight
    for (const flightId of flightIds) {
      const { data: flight, error: flightError } = await supabase
        .from('flights')
        .select('*')
        .eq('id', flightId)
        .single();
      if (flightError || !flight) {
        return res.status(400).json({ error: 'Flight not found' });
      }
      let availableField = '';
      switch (seatClass) {
        case 'economy':
          availableField = 'available_economy';
          break;
        case 'premium_economy':
          availableField = 'available_premium_economy';
          break;
        case 'business':
          availableField = 'available_business';
          break;
        case 'first_class':
          availableField = 'available_first_class';
          break;
        default:
          availableField = 'available_economy';
      }
      if (flight[availableField] < passengers.length) {
        return res.status(400).json({ error: `Not enough seats available in ${seatClass} for flight ${flight.flight_number}` });
      }
    }
    // 2. Decrement seat counts for each flight
    for (const flightId of flightIds) {
      const { data: flight } = await supabase
        .from('flights')
        .select('*')
        .eq('id', flightId)
        .single();
      let availableField = '';
      switch (seatClass) {
        case 'economy':
          availableField = 'available_economy';
          break;
        case 'premium_economy':
          availableField = 'available_premium_economy';
          break;
        case 'business':
          availableField = 'available_business';
          break;
        case 'first_class':
          availableField = 'available_first_class';
          break;
        default:
          availableField = 'available_economy';
      }
      const newAvailable = flight[availableField] - passengers.length;
      const { error: updateError } = await supabase
        .from('flights')
        .update({ [availableField]: newAvailable })
        .eq('id', flightId);
      if (updateError) {
        return res.status(500).json({ error: 'Failed to update seat availability' });
      }
    }
    // Generate booking reference
    const bookingReference = Math.random().toString(36).substring(2, 8).toUpperCase();
    const totalAmount = flightIds.length * passengers.length * 299.99;
    logger.info('Inserting booking...');
    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_reference: bookingReference,
        user_id: userId,
        total_amount: totalAmount,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        status: 'confirmed',
      })
      .select()
      .single();
    if (bookingError) {
      logger.error('Booking insert error:', bookingError);
      throw bookingError;
    }
    logger.info('Booking inserted:', booking);
    // Create passengers
    logger.info('Inserting passengers...');
    const { data: createdPassengers, error: passengersError } = await supabase
      .from('passengers')
      .insert(
        passengers.map((p) => ({
          booking_id: booking.id,
          first_name: p.first_name,
          last_name: p.last_name,
          date_of_birth: p.date_of_birth,
          passport_number: p.passport_number,
          nationality: p.nationality,
          passenger_type: p.passenger_type,
        }))
      )
      .select();
    if (passengersError) {
      logger.error('Passengers insert error:', passengersError);
      throw passengersError;
    }
    logger.info('Passengers inserted:', createdPassengers);
    // Create flight bookings with seat assignment and dynamic pricing
    logger.info('Inserting flight bookings...');
    const flightBookings = [];
    for (const flightId of flightIds) {
      // Fetch the flight to get price info
      const { data: flight, error: flightError } = await supabase
        .from('flights')
        .select('*')
        .eq('id', flightId)
        .single();
      if (flightError || !flight) {
        throw new Error('Flight not found for seat assignment');
      }
      // Determine price column
      let price = flight.base_price;
      let priceField = 'base_price';
      switch (seatClass) {
        case 'economy':
          price = flight.economy_price ?? flight.base_price;
          priceField = 'economy_price';
          break;
        case 'premium_economy':
          price = flight.premium_price ?? flight.base_price;
          priceField = 'premium_price';
          break;
        case 'business':
          price = flight.business_price ?? flight.base_price;
          priceField = 'business_price';
          break;
        case 'first_class':
          price = flight.first_price ?? flight.base_price;
          priceField = 'first_price';
          break;
      }
      // Generate next available seat numbers for this flight and class
      const { data: bookedSeats, error: seatError } = await supabase
        .from('flight_bookings')
        .select('seat_number')
        .eq('flight_id', flightId)
        .eq('seat_class', seatClass);
      if (seatError) throw seatError;
      const taken = new Set((bookedSeats || []).map(s => s.seat_number));
      const prefix = seatClass.charAt(0).toUpperCase();
      const seatNumbers = [];
      let i = 1;
      while (seatNumbers.length < createdPassengers.length) {
        const seat = `${prefix}${i}`;
        if (!taken.has(seat)) seatNumbers.push(seat);
        i++;
      }
      for (let j = 0; j < createdPassengers.length; j++) {
        const passenger = createdPassengers[j];
        const seat = seatNumbers[j];
        flightBookings.push({
          booking_id: booking.id,
          flight_id: flightId,
          passenger_id: passenger.id,
          seat_class: seatClass,
          seat_number: seat,
          price,
        });
      }
    }
    const { error: flightBookingsError } = await supabase.from('flight_bookings').insert(flightBookings);
    if (flightBookingsError) {
      logger.error('Flight bookings insert error:', flightBookingsError);
      throw flightBookingsError;
    }
    logger.info('Flight bookings inserted');

    // Fetch the sum of price from the DB for this booking
    const { data: sumResult, error: sumError } = await supabase
      .from('flight_bookings')
      .select('price')
      .eq('booking_id', booking.id);
    if (sumError) throw sumError;
    const dbTotalAmount = (sumResult || []).reduce((sum, fb) => sum + (fb.price || 0), 0);
    await supabase
      .from('bookings')
      .update({ total_amount: dbTotalAmount })
      .eq('id', booking.id);

    // Log booking creation in booking_status_logs
    await supabase
      .from('booking_status_logs')
      .insert({
        booking_id: booking.id,
        old_status: null,
        new_status: 'confirmed',
        changed_by: userId,
        reason: 'Booking created',
      });

    // Log initial flight status in flight_status_logs for each flight
    for (const flightId of flightIds) {
      // Fetch the flight to get current status
      const { data: flight, error: flightError } = await supabase
        .from('flights')
        .select('status')
        .eq('id', flightId)
        .single();
      if (!flightError && flight && flight.status) {
        await supabase
          .from('flight_status_logs')
          .insert({
            flight_id: flightId,
            status: flight.status,
            updated_by: userId,
            note: 'Initial status after booking',
          });
      }
    }

    // Prepare seat/class details for email (improved for round-trip/multi-flight)
    // Fetch all flights for this booking
    const flightIdsSet = new Set(flightBookings.map(fb => fb.flight_id));
    const flightsMap = {};
    for (const flightId of flightIdsSet) {
      const { data: flight, error: flightError } = await supabase
        .from('flights')
        .select(`*, airline:airlines(*), origin_airport:airports!flights_origin_airport_id_fkey(*), destination_airport:airports!flights_destination_airport_id_fkey(*), aircraft:aircraft(*)`)
        .eq('id', flightId)
        .single();
      if (!flightError && flight) {
        flightsMap[flightId] = flight;
      }
    }

    // Build flight details section
    let flightDetailsHtml = '';
    let passengerTableHtml = '';
    let uniqueFlights = Object.values(flightsMap);
    uniqueFlights.forEach((flight, idx) => {
      flightDetailsHtml += `<h3>Flight Details ${uniqueFlights.length > 1 ? (idx === 0 ? '(Departure)' : '(Return)') : ''}</h3>
        <ul>
          <li><b>Airline:</b> ${flight.airline?.name || '-'} (${flight.flight_number})</li>
          <li><b>Status:</b> ${flight.status || '-'}</li>
          <li><b>From:</b> ${flight.origin_airport?.city || '-'} (${flight.origin_airport?.code || '-'})</li>
          <li><b>To:</b> ${flight.destination_airport?.city || '-'} (${flight.destination_airport?.code || '-'})</li>
          <li><b>Departure:</b> ${flight.departure_time ? new Date(flight.departure_time).toLocaleString() : '-'}</li>
          <li><b>Arrival:</b> ${flight.arrival_time ? new Date(flight.arrival_time).toLocaleString() : '-'}</li>
          <li><b>Aircraft:</b> ${flight.aircraft?.model || '-'}</li>
          <li><b>Duration:</b> ${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m</li>
        </ul>`;
      // Passenger table for this flight
      passengerTableHtml += `<h4>Passenger Details (${flight.flight_number})</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-top:10px;">
          <tr><th>Passenger</th><th>Type</th><th>Seat</th><th>Class</th></tr>`;
      for (const passenger of createdPassengers) {
        const fb = flightBookings.find(fb => fb.passenger_id === passenger.id && fb.flight_id === flight.id);
        passengerTableHtml += `<tr><td>${passenger.first_name} ${passenger.last_name}</td><td>${passenger.passenger_type}</td><td>${fb ? fb.seat_number : '-'}</td><td>${fb ? fb.seat_class : '-'}</td></tr>`;
      }
      passengerTableHtml += '</table>';
    });

    // Booking summary
    let bookingSummaryHtml = `<h3>Booking Summary</h3>
      <ul>
        <li><b>Booking Date:</b> ${new Date(booking.booking_date).toLocaleString()}</li>
        <li><b>Status:</b> ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</li>
        <li><b>Total Amount:</b> $${Number(booking.total_amount).toFixed(2)}</li>
      </ul>`;

    // Contact info
    let contactHtml = `<h3>Contact Information</h3>
      <ul>
        <li><b>Email:</b> ${booking.contact_email}</li>
        <li><b>Phone:</b> ${booking.contact_phone || '-'}</li>
      </ul>`;

    // Important info
    let importantHtml = `<div style="margin-top:20px;padding:10px;background:#f8fafc;border-left:4px solid #2563eb;"><b>Important:</b> Please arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights. Bring a valid ID and any required travel documents.</div>`;

    // Compose the full email
    let emailHtml = `<h2>Booking Confirmed!</h2>
      <p>Thank you for booking with SkyBooker.</p>
      <p><b>Booking Reference:</b> ${bookingReference}</p>
      ${flightDetailsHtml}
      ${passengerTableHtml}
      ${contactHtml}
      ${bookingSummaryHtml}
      ${importantHtml}
      <hr/>
      <small>This is an automated email. Please do not reply.</small>`;

    // Send booking confirmation email
    logger.info('Preparing to send booking confirmation email to: %s', contactEmail);
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contactEmail,
      subject: 'Your Flight Booking Confirmation',
      html: emailHtml
    }, (err, info) => {
      if (err) {
        logger.error('Email send error:', err);
      } else {
        logger.info('Email sent successfully to %s, Response: %s', contactEmail, info.response);
      }
    });

    res.json({ bookingId: booking.id });
  } catch (err) {
    logger.error('Booking creation error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`*,
        passengers(*),
        flight_bookings(
          *,
          flight:flights(
            *,
            airline:airlines(*),
            origin_airport:airports!flights_origin_airport_id_fkey(*),
            destination_airport:airports!flights_destination_airport_id_fkey(*)
          ),
          passenger:passengers(*)
        )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Get bookings for a user
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`*,
        passengers(*),
        flight_bookings(
          *,
          flight:flights(
            *,
            airline:airlines(*),
            origin_airport:airports!flights_origin_airport_id_fkey(*),
            destination_airport:airports!flights_destination_airport_id_fkey(*)
          ),
          passenger:passengers(*)
        )
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Cancel a booking
router.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  // Optionally, get userId from req.body or session if available
  const userId = req.body?.userId || null;
  try {
    // Get previous status
    const { data: prevBooking } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', id)
      .single();
    // Set booking status to cancelled
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (bookingError) throw bookingError;

    // Insert audit log
    await supabase
      .from('booking_status_logs')
      .insert({
        booking_id: id,
        old_status: prevBooking?.status || null,
        new_status: 'cancelled',
        changed_by: userId,
        reason: 'User cancelled booking',
      });

    // Optionally, release seats (increment available seats for each flight)
    // Get flight_bookings for this booking
    const { data: flightBookings, error: fbError } = await supabase
      .from('flight_bookings')
      .select('flight_id, seat_class')
      .eq('booking_id', id);
    if (fbError) throw fbError;
    for (const fb of flightBookings || []) {
      let availableField = '';
      switch (fb.seat_class) {
        case 'economy': availableField = 'available_economy'; break;
        case 'premium_economy': availableField = 'available_premium_economy'; break;
        case 'business': availableField = 'available_business'; break;
        case 'first_class': availableField = 'available_first_class'; break;
        default: availableField = 'available_economy';
      }
      // Fetch current value and increment
      const { data: flight } = await supabase
        .from('flights')
        .select(availableField)
        .eq('id', fb.flight_id)
        .single();
      if (flight) {
        await supabase
          .from('flights')
          .update({ [availableField]: flight[availableField] + 1 })
          .eq('id', fb.flight_id);
      }
    }

    // Fetch booking contact info for email
    const { data: booking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select('booking_reference, contact_email, contact_phone, status')
      .eq('id', id)
      .single();
    if (!bookingFetchError && booking && booking.contact_email) {
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: booking.contact_email,
        subject: 'Your Flight Booking Has Been Cancelled',
        html: `<h2>Booking Cancelled</h2>
          <p>Your booking (Reference: <b>${booking.booking_reference}</b>) has been cancelled.</p>
          <p>If you have any questions, please contact support.</p>
          <hr/>
          <small>This is an automated email. Please do not reply.</small>`
      }, (err, info) => {
        if (err) {
          logger.error('Cancellation email send error:', err);
        } else {
          logger.info('Cancellation email sent to %s, Response: %s', booking.contact_email, info.response);
        }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Cancel a single flight within a booking
router.post('/:id/cancel-flight/:flight_booking_id', async (req, res) => {
  const { id, flight_booking_id } = req.params;
  try {
    // Fetch the flight_booking
    const { data: flightBooking, error: fbError } = await supabase
      .from('flight_bookings')
      .select('*')
      .eq('id', flight_booking_id)
      .single();
    if (fbError || !flightBooking) throw fbError || new Error('Flight booking not found');

    // Release seat (increment available seats for this flight/class)
    let availableField = '';
    switch (flightBooking.seat_class) {
      case 'economy': availableField = 'available_economy'; break;
      case 'premium_economy': availableField = 'available_premium_economy'; break;
      case 'business': availableField = 'available_business'; break;
      case 'first_class': availableField = 'available_first_class'; break;
      default: availableField = 'available_economy';
    }
    // Fetch current value and increment
    const { data: flight } = await supabase
      .from('flights')
      .select(availableField)
      .eq('id', flightBooking.flight_id)
      .single();
    if (flight) {
      await supabase
        .from('flights')
        .update({ [availableField]: flight[availableField] + 1 })
        .eq('id', flightBooking.flight_id);
    }

    // Delete the flight_booking row (represents cancellation)
    await supabase
      .from('flight_bookings')
      .delete()
      .eq('id', flight_booking_id);

    // Recalculate total_amount for the booking
    const { data: remainingBookings, error: remBookError } = await supabase
      .from('flight_bookings')
      .select('price')
      .eq('booking_id', id);
    if (remBookError) throw remBookError;
    const newTotal = (remainingBookings || []).reduce((sum, fb) => sum + (fb.price || 0), 0);
    await supabase
      .from('bookings')
      .update({ total_amount: newTotal })
      .eq('id', id);

    // Check if all flight_bookings for this booking are now cancelled (i.e., none left)
    const { data: remaining, error: remError } = await supabase
      .from('flight_bookings')
      .select('id')
      .eq('booking_id', id);
    if (remError) throw remError;
    if (!remaining || remaining.length === 0) {
      // Set booking status to cancelled
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);
    }

    // Log the cancellation (optional: booking_status_logs)
    await supabase
      .from('booking_status_logs')
      .insert({
        booking_id: id,
        old_status: 'confirmed',
        new_status: 'partial-cancelled',
        changed_by: req.body?.userId || null,
        reason: 'User cancelled a single flight in booking',
      });

    // Fetch booking contact info for email
    const { data: booking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select('booking_reference, contact_email, contact_phone, status')
      .eq('id', id)
      .single();
    if (!bookingFetchError && booking && booking.contact_email) {
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: booking.contact_email,
        subject: 'A Flight in Your Booking Has Been Cancelled',
        html: `<h2>Flight Cancelled</h2>
          <p>A flight in your booking (Reference: <b>${booking.booking_reference}</b>) has been cancelled.</p>
          <p>If you have any questions, please contact support.</p>
          <hr/>
          <small>This is an automated email. Please do not reply.</small>`
      }, (err, info) => {
        if (err) {
          logger.error('Partial cancellation email send error:', err);
        } else {
          logger.info('Partial cancellation email sent to %s, Response: %s', booking.contact_email, info.response);
        }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel flight in booking' });
  }
});

// Modify a booking (update contact info and passenger info)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { passengers, contact_email, contact_phone } = req.body;
  try {
    // Fetch booking and associated flights
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`*, flight_bookings(flight:flights(*))`)
      .eq('id', id)
      .single();
    if (error || !booking) throw error || new Error('Booking not found');
    // Check if any associated flight has already departed
    const now = new Date();
    const hasDeparted = (booking.flight_bookings || []).some(fb => new Date(fb.flight.departure_time) <= now);
    if (hasDeparted) {
      return res.status(400).json({ error: 'Cannot edit booking after flight departure.' });
    }
    // Update contact info if provided
    if (contact_email || contact_phone) {
      await supabase
        .from('bookings')
        .update({
          contact_email: contact_email || booking.contact_email,
          contact_phone: contact_phone || booking.contact_phone,
        })
        .eq('id', id);
    }
    // Update each passenger (now including first_name and last_name)
    if (Array.isArray(passengers)) {
      for (const p of passengers) {
        await supabase
          .from('passengers')
          .update({
            first_name: p.first_name,
            last_name: p.last_name,
            passport_number: p.passport_number,
            nationality: p.nationality,
          })
          .eq('id', p.id);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Send booking confirmation email with latest data
router.post('/:id/send-confirmation', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch latest booking, passengers, and flight_bookings
    const { data: updatedBooking, error: fetchError } = await supabase
      .from('bookings')
      .select(`*, passengers(*), flight_bookings(*)`)
      .eq('id', id)
      .single();
    if (fetchError || !updatedBooking || !updatedBooking.contact_email) {
      return res.status(404).json({ error: 'Booking not found or missing email' });
    }
    // Fetch all flights for this booking
    const flightIdsSet = new Set((updatedBooking.flight_bookings || []).map(fb => fb.flight_id));
    const flightsMap = {};
    for (const flightId of flightIdsSet) {
      const { data: flight, error: flightError } = await supabase
        .from('flights')
        .select(`*, airline:airlines(*), origin_airport:airports!flights_origin_airport_id_fkey(*), destination_airport:airports!flights_destination_airport_id_fkey(*), aircraft:aircraft(*)`)
        .eq('id', flightId)
        .single();
      if (!flightError && flight) {
        flightsMap[flightId] = flight;
      }
    }
    // Build flight details section
    let flightDetailsHtml = '';
    let passengerTableHtml = '';
    let uniqueFlights = Object.values(flightsMap);
    uniqueFlights.forEach((flight, idx) => {
      flightDetailsHtml += `<h3>Flight Details ${uniqueFlights.length > 1 ? (idx === 0 ? '(Departure)' : '(Return)') : ''}</h3>
        <ul>
          <li><b>Airline:</b> ${flight.airline?.name || '-'} (${flight.flight_number})</li>
          <li><b>Status:</b> ${flight.status || '-'}</li>
          <li><b>From:</b> ${flight.origin_airport?.city || '-'} (${flight.origin_airport?.code || '-'})</li>
          <li><b>To:</b> ${flight.destination_airport?.city || '-'} (${flight.destination_airport?.code || '-'})</li>
          <li><b>Departure:</b> ${flight.departure_time ? new Date(flight.departure_time).toLocaleString() : '-'}</li>
          <li><b>Arrival:</b> ${flight.arrival_time ? new Date(flight.arrival_time).toLocaleString() : '-'}</li>
          <li><b>Aircraft:</b> ${flight.aircraft?.model || '-'}</li>
          <li><b>Duration:</b> ${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m</li>
        </ul>`;
      // Passenger table for this flight
      passengerTableHtml += `<h4>Passenger Details (${flight.flight_number})</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-top:10px;">
          <tr><th>Passenger</th><th>Type</th><th>Seat</th><th>Class</th></tr>`;
      for (const passenger of updatedBooking.passengers) {
        const fb = (updatedBooking.flight_bookings || []).find(fb => fb.passenger_id === passenger.id && fb.flight_id === flight.id);
        passengerTableHtml += `<tr><td>${passenger.first_name} ${passenger.last_name}</td><td>${passenger.passenger_type}</td><td>${fb ? fb.seat_number : '-'}</td><td>${fb ? fb.seat_class : '-'}</td></tr>`;
      }
      passengerTableHtml += '</table>';
    });
    // Booking summary
    let bookingSummaryHtml = `<h3>Booking Summary</h3>
      <ul>
        <li><b>Booking Date:</b> ${new Date(updatedBooking.booking_date).toLocaleString()}</li>
        <li><b>Status:</b> ${updatedBooking.status.charAt(0).toUpperCase() + updatedBooking.status.slice(1)}</li>
        <li><b>Total Amount:</b> $${Number(updatedBooking.total_amount).toFixed(2)}</li>
      </ul>`;
    // Contact info
    let contactHtml = `<h3>Contact Information</h3>
      <ul>
        <li><b>Email:</b> ${updatedBooking.contact_email}</li>
        <li><b>Phone:</b> ${updatedBooking.contact_phone || '-'}</li>
      </ul>`;
    // Important info
    let importantHtml = `<div style="margin-top:20px;padding:10px;background:#f8fafc;border-left:4px solid #2563eb;"><b>Important:</b> Please arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights. Bring a valid ID and any required travel documents.</div>`;
    // Compose the full email
    let emailHtml = `<h2>Booking Updated!</h2>
      <p>Your booking details have been updated. Please review the latest information below.</p>
      <p><b>Booking Reference:</b> ${updatedBooking.booking_reference}</p>
      ${flightDetailsHtml}
      ${passengerTableHtml}
      ${contactHtml}
      ${bookingSummaryHtml}
      ${importantHtml}
      <hr/>
      <small>This is an automated email. Please do not reply.</small>`;
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: updatedBooking.contact_email,
      subject: 'Your Flight Booking Has Been Updated',
      html: emailHtml
    }, (err, info) => {
      if (err) {
        logger.error('Update email send error:', err);
        return res.status(500).json({ error: 'Failed to send update email' });
      } else {
        logger.info('Update email sent to %s, Response: %s', updatedBooking.contact_email, info.response);
        return res.json({ success: true });
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send confirmation email' });
  }
});

// Generate and download booking PDF
router.get('/:id/pdf', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch booking, passengers, and flight_bookings
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`*,
        passengers(*),
        flight_bookings(
          *,
          flight:flights(
            *,
            airline:airlines(*),
            origin_airport:airports!flights_origin_airport_id_fkey(*),
            destination_airport:airports!flights_destination_airport_id_fkey(*),
            aircraft:aircraft(*)
          ),
          passenger:passengers(*)
        )
      `)
      .eq('id', id)
      .single();
    if (error || !booking) throw error || new Error('Booking not found');
    const flight = booking.flight_bookings[0]?.flight;
    // Create PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${booking.booking_reference}.pdf"`);
    doc.pipe(res);
    // Brand Header with color and logo
    doc.rect(0, 0, doc.page.width, 70).fill('#2563eb');
    // Logo (if available)
    const logoPath = path.join(process.cwd(), '../public/placeholder-logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, doc.page.width / 2 - 45, 10, { width: 90, align: 'center' });
    }
    doc
      .fillColor('white')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('SkyBooker', 0, 25, { align: 'center', width: doc.page.width });
    doc.moveDown(2);
    // Main Title
    doc
      .moveDown(1.5)
      .fontSize(22)
      .fillColor('#2563eb')
      .font('Helvetica-Bold')
      .text('E-Ticket / Booking Confirmation', { align: 'center', width: doc.page.width })
      .moveDown(0.5);
    // Booking Reference and Status
    doc
      .fontSize(13)
      .fillColor('black')
      .font('Helvetica')
      .text(`Booking Reference: ${booking.booking_reference}`, { align: 'center', width: doc.page.width })
      .moveDown(0.2);
    doc
      .fontSize(12)
      .fillColor(booking.status === 'confirmed' ? '#22c55e' : '#ef4444')
      .text(`Status: ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}`, { align: 'center', width: doc.page.width })
      .moveDown(1);
    // Flight Details Section
    if (flight) {
      doc
        .fontSize(15)
        .fillColor('#2563eb')
        .font('Helvetica-Bold')
        .text('Flight Details', { underline: true, align: 'center', width: doc.page.width })
        .moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor('black')
        .font('Helvetica')
        .text(`Airline: ${flight.airline?.name || '-'} (${flight.flight_number})`, { align: 'center', width: doc.page.width })
        .text(`From: ${flight.origin_airport?.city || '-'} (${flight.origin_airport?.code || '-'})`, { align: 'center', width: doc.page.width })
        .text(`To: ${flight.destination_airport?.city || '-'} (${flight.destination_airport?.code || '-'})`, { align: 'center', width: doc.page.width })
        .text(`Departure: ${new Date(flight.departure_time).toLocaleString()}`, { align: 'center', width: doc.page.width })
        .text(`Arrival: ${new Date(flight.arrival_time).toLocaleString()}`, { align: 'center', width: doc.page.width })
        .text(`Aircraft: ${flight.aircraft?.model || flight.aircraft_name || '-'}`, { align: 'center', width: doc.page.width })
        .text(`Duration: ${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m`, { align: 'center', width: doc.page.width })
        .moveDown(1);
    }
    // Passengers Table with colored header
    doc
      .fontSize(15)
      .fillColor('#2563eb')
      .font('Helvetica-Bold')
      .text('Passenger Details', { underline: true, align: 'center', width: doc.page.width })
      .moveDown(0.5);
    // Table header
    const tableTop = doc.y;
    const tableWidth = 420;
    const tableX = (doc.page.width - tableWidth) / 2;
    doc
      .rect(tableX, tableTop, tableWidth, 20)
      .fill('#e0e7ff');
    doc
      .fillColor('#2563eb')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Name', tableX + 5, tableTop + 5)
      .text('Type', tableX + 120, tableTop + 5)
      .text('Seat', tableX + 220, tableTop + 5)
      .text('Class', tableX + 320, tableTop + 5);
    let y = tableTop + 25;
    let row = 0;
    for (const passenger of booking.passengers) {
      const fb = (booking.flight_bookings || []).find(fb => fb.passenger_id === passenger.id);
      // Alternate row color
      if (row % 2 === 0) {
        doc.rect(tableX, y - 2, tableWidth, 18).fill('#f1f5f9');
      }
      doc
        .fillColor('black')
        .font('Helvetica')
        .text(`${passenger.first_name} ${passenger.last_name}`, tableX + 5, y)
        .text(passenger.passenger_type, tableX + 120, y)
        .text(fb?.seat_number || '-', tableX + 220, y)
        .text(fb?.seat_class || '-', tableX + 320, y);
      y += 18;
      row++;
    }
    doc.moveDown(2);
    // Contact Info
    doc
      .fontSize(15)
      .fillColor('#2563eb')
      .font('Helvetica-Bold')
      .text('Contact Information', { underline: true, align: 'center', width: doc.page.width })
      .moveDown(0.5);
    doc
      .fontSize(12)
      .fillColor('black')
      .font('Helvetica')
      .text(`Email: ${booking.contact_email}`, { align: 'center', width: doc.page.width })
      .text(`Phone: ${booking.contact_phone || '-'}`, { align: 'center', width: doc.page.width })
      .moveDown(1);
    // Booking Summary
    doc
      .fontSize(15)
      .fillColor('#2563eb')
      .font('Helvetica-Bold')
      .text('Booking Summary', { underline: true, align: 'center', width: doc.page.width })
      .moveDown(0.5);
    doc
      .fontSize(12)
      .fillColor('black')
      .font('Helvetica')
      .text(`Booking Date: ${new Date(booking.booking_date).toLocaleString()}`, { align: 'center', width: doc.page.width })
      .text(`Total Amount: $${Number(booking.total_amount).toFixed(2)}`, { align: 'center', width: doc.page.width })
      .moveDown(1);
    // Important Info
    doc
      .fontSize(10)
      .fillColor('gray')
      .font('Helvetica-Oblique')
      .text('Please arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights. Bring a valid ID and any required travel documents.',
        (doc.page.width - 350) / 2,
        doc.y,
        { align: 'center', width: 350 })
      .moveDown(1);
    doc
      .fontSize(10)
      .fillColor('gray')
      .font('Helvetica-Oblique')
      .text('Thank you for booking with SkyBooker!', (doc.page.width - 350) / 2, doc.y, { align: 'center', width: 350 });
    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Change a single flight within a booking
router.post('/:id/change-flight/:flight_booking_id', async (req, res) => {
  const { id, flight_booking_id } = req.params;
  const { new_flight_id } = req.body;
  try {
    // Fetch the flight_booking
    const { data: flightBooking, error: fbError } = await supabase
      .from('flight_bookings')
      .select('*')
      .eq('id', flight_booking_id)
      .single();
    if (fbError || !flightBooking) throw fbError || new Error('Flight booking not found');

    // Optionally, check seat availability for new_flight_id and seat_class
    // (skipped for now, but can be added)

    // Update the flight_id for this flight_booking
    await supabase
      .from('flight_bookings')
      .update({ flight_id: new_flight_id })
      .eq('id', flight_booking_id);

    // Log the change (optional: booking_status_logs)
    await supabase
      .from('booking_status_logs')
      .insert({
        booking_id: id,
        old_status: 'confirmed',
        new_status: 'flight-changed',
        changed_by: req.body?.userId || null,
        reason: 'User changed a single flight in booking',
      });

    // Fetch booking contact info for email
    const { data: booking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select('booking_reference, contact_email, contact_phone, status')
      .eq('id', id)
      .single();
    if (!bookingFetchError && booking && booking.contact_email) {
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: booking.contact_email,
        subject: 'A Flight in Your Booking Has Been Changed',
        html: `<h2>Flight Changed</h2>
          <p>A flight in your booking (Reference: <b>${booking.booking_reference}</b>) has been changed.</p>
          <p>If you have any questions, please contact support.</p>
          <hr/>
          <small>This is an automated email. Please do not reply.</small>`
      }, (err, info) => {
        if (err) {
          logger.error('Flight change email send error:', err);
        } else {
          logger.info('Flight change email sent to %s, Response: %s', booking.contact_email, info.response);
        }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change flight in booking' });
  }
});

// Change seat number for a passenger in a booking
router.post('/:id/change-seat-number', async (req, res) => {
  const { id } = req.params;
  const { passenger_id, seat_number } = req.body;
  if (!passenger_id || !seat_number) {
    return res.status(400).json({ error: 'Missing passenger_id or seat_number' });
  }
  try {
    // Find the flight_booking for this booking and passenger
    const { data: flightBooking, error: fbError } = await supabase
      .from('flight_bookings')
      .select('*')
      .eq('booking_id', id)
      .eq('passenger_id', passenger_id)
      .single();
    if (fbError || !flightBooking) {
      return res.status(404).json({ error: 'Flight booking not found for this passenger' });
    }
    // Optionally: Check if seat_number is already taken for this flight and class
    const { data: taken, error: takenError } = await supabase
      .from('flight_bookings')
      .select('id')
      .eq('flight_id', flightBooking.flight_id)
      .eq('seat_class', flightBooking.seat_class)
      .eq('seat_number', seat_number)
      .maybeSingle();
    if (takenError) {
      return res.status(500).json({ error: 'Failed to check seat availability' });
    }
    if (taken) {
      return res.status(409).json({ error: 'Seat already taken' });
    }
    // Update the seat number
    const { error: updateError } = await supabase
      .from('flight_bookings')
      .update({ seat_number })
      .eq('id', flightBooking.id);
    if (updateError) {
      return res.status(500).json({ error: 'Failed to update seat number' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Change seat class for a passenger in a booking
router.post('/:id/change-seat-class', async (req, res) => {
  const { id } = req.params;
  const { passenger_id, seat_class } = req.body;
  if (!passenger_id || !seat_class) {
    return res.status(400).json({ error: 'Missing passenger_id or seat_class' });
  }
  try {
    // Find the flight_booking for this booking and passenger
    const { data: flightBooking, error: fbError } = await supabase
      .from('flight_bookings')
      .select('*')
      .eq('booking_id', id)
      .eq('passenger_id', passenger_id)
      .single();
    if (fbError || !flightBooking) {
      return res.status(404).json({ error: 'Flight booking not found for this passenger' });
    }
    // Optionally: Check if there are available seats in the new class
    // (You can add logic here to check seat availability if needed)
    // Update the seat class and clear seat number (to be reassigned)
    const { error: updateError } = await supabase
      .from('flight_bookings')
      .update({ seat_class, seat_number: null })
      .eq('id', flightBooking.id);
    if (updateError) {
      return res.status(500).json({ error: 'Failed to update seat class' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;