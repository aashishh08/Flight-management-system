"use client";
import { useEffect, useState } from "react";
import { getAdminFlights, updateFlightStatus } from "@/lib/admin-api";

const STATUS_OPTIONS = ["scheduled", "On-Time", "Delayed", "Cancelled"];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function AdminFlightsPage() {
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChange, setStatusChange] = useState<{ [id: string]: string }>(
    {}
  );
  const [saving, setSaving] = useState<{ [id: string]: boolean }>({});
  const [success, setSuccess] = useState<{ [id: string]: boolean }>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchFlights = (params?: {
    departureFrom?: string;
    departureTo?: string;
    page?: number;
    pageSize?: number;
    flightNumber?: string;
  }) => {
    setLoading(true);
    getAdminFlights({
      departureFrom: params?.departureFrom ?? (dateFrom || undefined),
      departureTo: params?.departureTo ?? (dateTo || undefined),
      page: params?.page ?? page,
      pageSize: params?.pageSize ?? pageSize,
      flightNumber: params?.flightNumber ?? (search || undefined),
    })
      .then((res) => {
        setFlights(res.data);
        setTotal(res.total);
        setPage(res.page);
        setPageSize(res.pageSize);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFlights();
    // eslint-disable-next-line
  }, []);

  const handleStatusChange = (id: string, value: string) => {
    setStatusChange((prev) => ({ ...prev, [id]: value }));
  };

  const handleUpdateStatus = async (id: string) => {
    setSaving((prev) => ({ ...prev, [id]: true }));
    setSuccess((prev) => ({ ...prev, [id]: false }));
    try {
      await updateFlightStatus(id, statusChange[id] || "scheduled");
      setSuccess((prev) => ({ ...prev, [id]: true }));
      setFlights((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, latest_status: statusChange[id] || "scheduled" }
            : f
        )
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFlights({
      departureFrom: dateFrom || undefined,
      departureTo: dateTo || undefined,
      page: 1,
      pageSize,
      flightNumber: search || undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFlights({ page: newPage, pageSize });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setPage(1);
    fetchFlights({ page: 1, pageSize: newSize });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Flights Management</h1>
      <form
        className="mb-6 flex flex-wrap gap-4 items-end"
        onSubmit={handleFilter}
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Flight Number
          </label>
          <input
            type="text"
            className="border rounded px-2 py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. AI123"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Departure From
          </label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Departure To</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Filter
        </button>
        <div className="ml-auto">
          <label className="block text-sm font-medium mb-1">Page Size</label>
          <select
            className="border rounded px-2 py-1"
            value={pageSize}
            onChange={handlePageSizeChange}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </form>
      {loading ? (
        <div>Loading flights...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded shadow">
              <thead>
                <tr>
                  <th className="px-4 py-2">Flight #</th>
                  <th className="px-4 py-2">Airline</th>
                  <th className="px-4 py-2">From</th>
                  <th className="px-4 py-2">To</th>
                  <th className="px-4 py-2">Departure</th>
                  <th className="px-4 py-2">Arrival</th>
                  <th className="px-4 py-2">Latest Status</th>
                  <th className="px-4 py-2">Change Status</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((flight) => (
                  <tr key={flight.id} className="border-t">
                    <td className="px-4 py-2 font-mono">
                      {flight.flight_number}
                    </td>
                    <td className="px-4 py-2">{flight.airline?.name}</td>
                    <td className="px-4 py-2">
                      {flight.origin_airport?.city} (
                      {flight.origin_airport?.code})
                    </td>
                    <td className="px-4 py-2">
                      {flight.destination_airport?.city} (
                      {flight.destination_airport?.code})
                    </td>
                    <td className="px-4 py-2">
                      {new Date(flight.departure_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {new Date(flight.arrival_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {flight.latest_status || flight.status}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="border rounded px-2 py-1 mr-2"
                        value={
                          statusChange[flight.id] ??
                          flight.latest_status ??
                          flight.status
                        }
                        onChange={(e) =>
                          handleStatusChange(flight.id, e.target.value)
                        }
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <button
                        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        disabled={
                          saving[flight.id] ||
                          (statusChange[flight.id] ??
                            flight.latest_status ??
                            flight.status) ===
                            (flight.latest_status ?? flight.status)
                        }
                        onClick={() => handleUpdateStatus(flight.id)}
                      >
                        {saving[flight.id]
                          ? "Saving..."
                          : success[flight.id]
                          ? "Saved!"
                          : "Update"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div>
              Page {page} of {totalPages} ({total} flights)
            </div>
            <div className="space-x-2">
              <button
                className="px-3 py-1 rounded border"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 rounded border"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
