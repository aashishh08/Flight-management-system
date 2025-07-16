import type { Flight, SearchParams, Airport } from "./types";
import { searchFlights, getFlightById, getAirports } from "./flight-search";

import { useEffect, useState } from "react";

export class FlightService {
  async searchFlights(params: SearchParams): Promise<Flight[]> {
    return await searchFlights(params);
  }

  async getFlightById(id: string): Promise<Flight | null> {
    return await getFlightById(id);
  }

  async getPopularDestinations(): Promise<Airport[]> {
    // TODO: Implement or replace this function
    return [];
  }

  async getAirports(): Promise<Airport[]> {
    return await getAirports();
  }
}

export function useFlightStatusSSE(flightId: string | null) {
  const [statusData, setStatusData] = useState<any>(null);

  useEffect(() => {
    if (!flightId) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
    const url = `${API_BASE}/flight-status/${flightId}/stream`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        setStatusData(JSON.parse(event.data));
      } catch (e) {
        // ignore parse errors
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, [flightId]);

  return statusData;
}

export const flightService = new FlightService();
