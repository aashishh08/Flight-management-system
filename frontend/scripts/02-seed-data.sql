-- Insert sample airlines
INSERT INTO airlines (code, name, logo_url) VALUES
('AA', 'American Airlines', '/airlines/american.png'),
('DL', 'Delta Air Lines', '/airlines/delta.png'),
('UA', 'United Airlines', '/airlines/united.png'),
('BA', 'British Airways', '/airlines/british.png'),
('LH', 'Lufthansa', '/airlines/lufthansa.png'),
('AF', 'Air France', '/airlines/airfrance.png'),
('KL', 'KLM Royal Dutch Airlines', '/airlines/klm.png'),
('EK', 'Emirates', '/airlines/emirates.png');

-- Insert sample airports
INSERT INTO airports (code, name, city, country, timezone) VALUES
('JFK', 'John F. Kennedy International Airport', 'New York', 'United States', 'America/New_York'),
('LAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 'America/Los_Angeles'),
('LHR', 'London Heathrow Airport', 'London', 'United Kingdom', 'Europe/London'),
('CDG', 'Charles de Gaulle Airport', 'Paris', 'France', 'Europe/Paris'),
('FRA', 'Frankfurt Airport', 'Frankfurt', 'Germany', 'Europe/Berlin'),
('AMS', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 'Europe/Amsterdam'),
('DXB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 'Asia/Dubai'),
('NRT', 'Narita International Airport', 'Tokyo', 'Japan', 'Asia/Tokyo'),
('SIN', 'Singapore Changi Airport', 'Singapore', 'Singapore', 'Asia/Singapore'),
('SYD', 'Sydney Kingsford Smith Airport', 'Sydney', 'Australia', 'Australia/Sydney');

-- Insert sample aircraft
INSERT INTO aircraft (model, manufacturer, total_seats, economy_seats, premium_economy_seats, business_seats, first_class_seats) VALUES
('Boeing 737-800', 'Boeing', 162, 150, 0, 12, 0),
('Boeing 777-300ER', 'Boeing', 396, 296, 40, 52, 8),
('Airbus A320', 'Airbus', 180, 162, 0, 18, 0),
('Airbus A380', 'Airbus', 853, 615, 76, 126, 36),
('Boeing 787-9', 'Boeing', 290, 224, 28, 30, 8),
('Airbus A350-900', 'Airbus', 325, 253, 36, 30, 6);

-- Insert sample flights for the next 30 days
DO $$
DECLARE
    airline_ids UUID[];
    aircraft_ids UUID[];
    airport_ids UUID[];
    flight_date DATE;
    i INTEGER;
BEGIN
    -- Get IDs for random selection
    SELECT ARRAY(SELECT id FROM airlines) INTO airline_ids;
    SELECT ARRAY(SELECT id FROM aircraft) INTO aircraft_ids;
    SELECT ARRAY(SELECT id FROM airports) INTO airport_ids;
    
    -- Generate flights for next 30 days
    FOR i IN 0..29 LOOP
        flight_date := CURRENT_DATE + i;
        
        -- JFK to LAX flights
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, destination_airport_id, 
                           departure_time, arrival_time, duration, base_price, 
                           available_economy, available_premium_economy, available_business, available_first_class)
        VALUES 
        ('AA101', airline_ids[1], aircraft_ids[2], 
         (SELECT id FROM airports WHERE code = 'JFK'), 
         (SELECT id FROM airports WHERE code = 'LAX'),
         flight_date + TIME '08:00:00', flight_date + TIME '11:30:00', 390, 299.99,
         250, 35, 25, 6),
        ('DL205', airline_ids[2], aircraft_ids[3], 
         (SELECT id FROM airports WHERE code = 'JFK'), 
         (SELECT id FROM airports WHERE code = 'LAX'),
         flight_date + TIME '14:00:00', flight_date + TIME '17:30:00', 390, 319.99,
         150, 0, 12, 0);
         
        -- LAX to JFK flights
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, destination_airport_id, 
                           departure_time, arrival_time, duration, base_price, 
                           available_economy, available_premium_economy, available_business, available_first_class)
        VALUES 
        ('AA102', airline_ids[1], aircraft_ids[2], 
         (SELECT id FROM airports WHERE code = 'LAX'), 
         (SELECT id FROM airports WHERE code = 'JFK'),
         flight_date + TIME '09:00:00', flight_date + TIME '17:30:00', 330, 289.99,
         250, 35, 25, 6),
        ('UA301', airline_ids[3], aircraft_ids[5], 
         (SELECT id FROM airports WHERE code = 'LAX'), 
         (SELECT id FROM airports WHERE code = 'JFK'),
         flight_date + TIME '15:00:00', flight_date + TIME '23:30:00', 330, 349.99,
         220, 25, 28, 7);
         
        -- International flights
        INSERT INTO flights (flight_number, airline_id, aircraft_id, origin_airport_id, destination_airport_id, 
                           departure_time, arrival_time, duration, base_price, 
                           available_economy, available_premium_economy, available_business, available_first_class)
        VALUES 
        ('BA117', airline_ids[4], aircraft_ids[2], 
         (SELECT id FROM airports WHERE code = 'JFK'), 
         (SELECT id FROM airports WHERE code = 'LHR'),
         flight_date + TIME '22:00:00', (flight_date + 1) + TIME '09:30:00', 450, 599.99,
         280, 35, 48, 6),
        ('LH401', airline_ids[5], aircraft_ids[6], 
         (SELECT id FROM airports WHERE code = 'JFK'), 
         (SELECT id FROM airports WHERE code = 'FRA'),
         flight_date + TIME '17:30:00', (flight_date + 1) + TIME '06:45:00', 495, 649.99,
         240, 32, 28, 5);
    END LOOP;
END $$;
