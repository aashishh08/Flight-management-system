"use client";
import { useEffect, useState } from "react";
import { getAdminBookings } from "@/lib/admin-api";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [bookingId, setBookingId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [flightNumber, setFlightNumber] = useState("");

  const fetchBookings = (params?: {
    page?: number;
    pageSize?: number;
    bookingId?: string;
    userEmail?: string;
    flightNumber?: string;
  }) => {
    setLoading(true);
    getAdminBookings({
      page: params?.page ?? page,
      pageSize: params?.pageSize ?? pageSize,
      bookingId: params?.bookingId ?? (bookingId || undefined),
      userEmail: params?.userEmail ?? (userEmail || undefined),
      flightNumber: params?.flightNumber ?? (flightNumber || undefined),
    })
      .then((res) => {
        setBookings(res.data);
        setTotal(res.total);
        setPage(res.page);
        setPageSize(res.pageSize);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings({
      page: 1,
      pageSize,
      bookingId: bookingId || undefined,
      userEmail: userEmail || undefined,
      flightNumber: flightNumber || undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchBookings({ page: newPage, pageSize });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setPage(1);
    fetchBookings({ page: 1, pageSize: newSize });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Bookings Management</h1>
      <form
        className="mb-6 flex flex-wrap gap-4 items-end"
        onSubmit={handleFilter}
      >
        <div>
          <label className="block text-sm font-medium mb-1">Booking ID</label>
          <input
            type="text"
            className="border rounded px-2 py-1"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="Booking UUID"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">User Email</label>
          <input
            type="text"
            className="border rounded px-2 py-1"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Flight Number
          </label>
          <input
            type="text"
            className="border rounded px-2 py-1"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            placeholder="e.g. AI123"
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
        <div>Loading bookings...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded shadow">
              <thead>
                <tr>
                  <th className="px-4 py-2">Booking Ref</th>
                  <th className="px-4 py-2">User Email</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Total Amount</th>
                  <th className="px-4 py-2">Flights</th>
                  <th className="px-4 py-2">Passengers</th>
                  <th className="px-4 py-2">Booking Date</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-t">
                    <td className="px-4 py-2 font-mono">
                      {booking.booking_reference}
                    </td>
                    <td className="px-4 py-2">{booking.contact_email}</td>
                    <td className="px-4 py-2 font-semibold">
                      {booking.status}
                    </td>
                    <td className="px-4 py-2">${booking.total_amount}</td>
                    <td className="px-4 py-2">
                      {(booking.flight_bookings || []).map((fb) => (
                        <div key={fb.id} className="mb-1">
                          {fb.flight?.flight_number} ({fb.seat_class})
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-2">
                      {(booking.passengers || []).map((p) => (
                        <div key={p.id} className="mb-1">
                          {p.first_name} {p.last_name} ({p.passenger_type})
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-2">
                      {new Date(booking.booking_date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div>
              Page {page} of {totalPages} ({total} bookings)
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
