export interface Airport {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface Airline {
  id: string;
  code: string;
  name: string;
  logo_url?: string;
}

export interface Aircraft {
  id: string;
  model: string;
  manufacturer: string;
  total_seats: number;
  economy_seats: number;
  premium_economy_seats: number;
  business_seats: number;
  first_class_seats: number;
}

export interface Flight {
  id: string;
  flight_number: string;
  airline: Airline;
  aircraft: Aircraft;
  origin_airport: Airport;
  destination_airport: Airport;
  departure_time: string;
  arrival_time: string;
  duration: number;
  base_price: number;
  status:
    | "scheduled"
    | "delayed"
    | "cancelled"
    | "boarding"
    | "departed"
    | "arrived";
  available_economy: number;
  available_premium_economy: number;
  available_business: number;
  available_first_class: number;
  economy_price?: number;
  premium_price?: number;
  business_price?: number;
  first_price?: number;
}

export interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabinClass: "economy" | "premium_economy" | "business" | "first_class";
  tripType: "one-way" | "round-trip";
}

export interface Passenger {
  id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  passport_number?: string;
  nationality?: string;
  passenger_type: "adult" | "child" | "infant";
}

export interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  status: "confirmed" | "completed" | "cancelled";
  total_amount: number;
  booking_date: string;
  contact_email: string;
  contact_phone?: string;
  passengers: Passenger[];
  flight_bookings: FlightBooking[];
}

export interface FlightBooking {
  id: string;
  booking_id: string;
  flight: Flight;
  passenger: Passenger;
  seat_class: string;
  seat_number?: string;
  price: number;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  passport_number: string;
  nationality: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  email?: string; // for convenience in UI
}

export interface SavedPayment {
  id: string;
  user_id: string;
  card_last4: string;
  card_expiry: string;
  card_name: string;
  created_at: string;
}
