-- Seed ~100 flights for every destination airport
DO $$
DECLARE
    airline_ids UUID[];
    aircraft_ids UUID[];
    airport_ids UUID[];
    dest_id UUID;
    origin_id UUID;
    i INTEGER;
    j INTEGER;
    flight_date DATE;
    flight_num INTEGER;
    airline_idx INTEGER;
    aircraft_idx INTEGER;
    origin_idx INTEGER;
    flight_number TEXT;
    dep_time TIME;
    arr_time TIME;
    duration INTEGER;
    base_price NUMERIC;
    available_economy INTEGER;
    available_premium_economy INTEGER;
    available_business INTEGER;
    available_first_class INTEGER;
BEGIN
    SELECT ARRAY(SELECT id FROM airlines) INTO airline_ids;
    SELECT ARRAY(SELECT id FROM aircraft) INTO aircraft_ids;
    SELECT ARRAY(SELECT id FROM airports) INTO airport_ids;
    
    -- For each destination airport
    FOR i IN 1..array_length(airport_ids, 1) LOOP
        dest_id := airport_ids[i];
        -- For 100 flights per destination
        FOR j IN 1..100 LOOP
            -- Pick a random origin (not equal to destination)
            LOOP
                origin_idx := floor(random() * array_length(airport_ids, 1) + 1);
                origin_id := airport_ids[origin_idx];
                EXIT WHEN origin_id <> dest_id;
            END LOOP;
            -- Pick random airline and aircraft
            airline_idx := floor(random() * array_length(airline_ids, 1) + 1);
            aircraft_idx := floor(random() * array_length(aircraft_ids, 1) + 1);
            -- Generate random flight number
            flight_num := 1000 + floor(random() * 9000);
            flight_number := 'FN' || flight_num::text;
            -- Random date within next 30 days
            flight_date := CURRENT_DATE + floor(random() * 30);
            -- Random departure time
            dep_time := TIME '00:00:00' + (interval '1 hour' * floor(random() * 24));
            -- Random duration 1-12 hours
            duration := 60 * (1 + floor(random() * 12));
            arr_time := dep_time + (interval '1 minute' * duration);
            -- Random base price $100-$1500
            base_price := 100 + floor(random() * 1400);
            -- Random seat availability
            available_economy := 50 + floor(random() * 200);
            available_premium_economy := floor(random() * 40);
            available_business := floor(random() * 30);
            available_first_class := floor(random() * 10);
            -- Insert flight
            INSERT INTO flights (
                flight_number, airline_id, aircraft_id, origin_airport_id, destination_airport_id,
                departure_time, arrival_time, duration, base_price,
                available_economy, available_premium_economy, available_business, available_first_class
            ) VALUES (
                flight_number, airline_ids[airline_idx], aircraft_ids[aircraft_idx], origin_id, dest_id,
                flight_date + dep_time, flight_date + arr_time, duration, base_price,
                available_economy, available_premium_economy, available_business, available_first_class
            );
        END LOOP;
    END LOOP;
END $$; 