-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Airlines table
CREATE TABLE airlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Airports table
CREATE TABLE airports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aircraft table
CREATE TABLE aircraft (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    total_seats INTEGER NOT NULL,
    economy_seats INTEGER NOT NULL,
    premium_economy_seats INTEGER DEFAULT 0,
    business_seats INTEGER DEFAULT 0,
    first_class_seats INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flights table
CREATE TABLE flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_number VARCHAR(10) NOT NULL,
    airline_id UUID REFERENCES airlines(id),
    aircraft_id UUID REFERENCES aircraft(id),
    origin_airport_id UUID REFERENCES airports(id),
    destination_airport_id UUID REFERENCES airports(id),
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    base_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, delayed, cancelled, boarding, departed, arrived
    available_economy INTEGER NOT NULL,
    available_premium_economy INTEGER DEFAULT 0,
    available_business INTEGER DEFAULT 0,
    available_first_class INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(10) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled, completed
    total_amount DECIMAL(10,2) NOT NULL,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passengers table
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    passport_number VARCHAR(20),
    nationality VARCHAR(100),
    passenger_type VARCHAR(10) NOT NULL, -- adult, child, infant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flight bookings (junction table for flights and bookings)
CREATE TABLE flight_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    flight_id UUID REFERENCES flights(id),
    passenger_id UUID REFERENCES passengers(id),
    seat_class VARCHAR(20) NOT NULL, -- economy, premium_economy, business, first_class
    seat_number VARCHAR(10),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment information
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    transaction_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Payments table (masked, no CVV)
CREATE TABLE saved_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    card_last4 VARCHAR(4) NOT NULL,
    card_expiry VARCHAR(5) NOT NULL,
    card_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES auth.users(id)
);

-- Indexes for better performance
CREATE INDEX idx_flights_route_date ON flights(origin_airport_id, destination_airport_id, departure_time);
CREATE INDEX idx_flights_airline ON flights(airline_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_flight_bookings_booking ON flight_bookings(booking_id);
CREATE INDEX idx_flight_bookings_flight ON flight_bookings(flight_id);

-- Row Level Security (RLS) policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view passengers for own bookings" ON passengers FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create passengers for own bookings" ON passengers FOR INSERT WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view flight bookings for own bookings" ON flight_bookings FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create flight bookings for own bookings" ON flight_bookings FOR INSERT WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view payments for own bookings" ON payments FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
);
