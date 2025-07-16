import supabase from './supabaseClient.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
import logger from './logger.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const flightStatusStream = async (req, res) => {
  const flightId = req.params.flightId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let lastStatus = null;
  let closed = false;

  // Subscribe to Supabase Realtime for this flight's status logs (no filter)
  const channel = supabase.channel('flight_status_logs_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'flight_status_logs',
        // filter removed for debugging
      },
      async (payload) => {
        logger.info('Realtime event received: %o', payload);
        if (closed) return;
        const data = payload.new;
        // Filter by flight_id in callback
        if (!data || data.flight_id !== flightId) return;
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        // If status changed, send email to all booking contacts for this flight
        if (data.status && data.status !== lastStatus) {
          lastStatus = data.status;
          // Find all bookings for this flight
          const { data: bookings } = await supabase
            .from('flight_bookings')
            .select('booking_id, booking:bookings(contact_email)')
            .eq('flight_id', flightId);
          const emails = Array.from(new Set((bookings || []).map(b => b.booking?.contact_email).filter(Boolean)));
          for (const email of emails) {
            try {
              transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Flight Status Update',
                html: `<h2>Flight Status Update</h2>
                <p>The status of your flight (ID: ${flightId}) has changed.</p>
                <p><b>New Status:</b> ${data.status}</p>
                <p>Thank you for choosing SkyBooker.</p>
                <hr/>
                <small>This is an automated email. Please do not reply.</small>`
              }, (err, info) => {
                if (err) {
                  logger.error('Status email send error: %o', err);
                } else {
                  logger.info('Status email sent to %s. Response: %s', email, info.response);
                }
              });
            } catch (err) {
              logger.error('Status email send error: %o', err);
            }
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Supabase Realtime subscription established for flight_id %s', flightId);
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Supabase Realtime subscription error: %o', status);
      }
    });

  req.on('close', async () => {
    closed = true;
    await supabase.removeChannel(channel);
  });
}; 