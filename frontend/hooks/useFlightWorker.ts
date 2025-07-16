import { useEffect, useRef, useState } from "react";

export interface FlightWorkerFilters {
  origin?: string;
  destination?: string;
  departureDate?: string;
  cabinClass?: string;
  passengers?: number;
}

export function useFlightWorker(
  flights: any[],
  filters: FlightWorkerFilters,
  sort?: string
) {
  const [result, setResult] = useState<any[]>(flights);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../lib/flightFilter.worker.js", import.meta.url),
        { type: "module" }
      );
    }
    setLoading(true);
    workerRef.current.onmessage = (e) => {
      setResult(e.data);
      setLoading(false);
    };
    workerRef.current.postMessage({ flights, filters, sort });
    // Cleanup
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(flights), JSON.stringify(filters), sort]);

  return { result, loading };
}
