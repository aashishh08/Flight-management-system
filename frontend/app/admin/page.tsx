"use client";
import { useEffect, useState } from "react";
import {
  getAdminMetrics,
  getBookingsTrend,
  getBookingsByAirline,
  getBookingStatusDistribution,
} from "@/lib/admin-api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [airlineData, setAirlineData] = useState<any[]>([]);
  const [airlineLoading, setAirlineLoading] = useState(true);
  const [airlineError, setAirlineError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminMetrics()
      .then(setMetrics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setTrendLoading(true);
    getBookingsTrend()
      .then(setTrend)
      .catch((e) => setTrendError(e.message))
      .finally(() => setTrendLoading(false));
  }, []);

  useEffect(() => {
    setAirlineLoading(true);
    getBookingsByAirline()
      .then(setAirlineData)
      .catch((e) => setAirlineError(e.message))
      .finally(() => setAirlineLoading(false));
  }, []);

  useEffect(() => {
    setStatusLoading(true);
    getBookingStatusDistribution()
      .then(setStatusData)
      .catch((e) => setStatusError(e.message))
      .finally(() => setStatusLoading(false));
  }, []);

  const pieColors = [
    "#2563eb",
    "#f59e42",
    "#10b981",
    "#ef4444",
    "#a78bfa",
    "#fbbf24",
    "#f472b6",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
              <h1 className="text-4xl md:text-6xl font-bold">SkyBooker</h1>
            </div>
            <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
              Discover amazing destinations and book your perfect flight with
              ease
            </p>
            <div className="flex items-center justify-center space-x-6 text-blue-100">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span>Best Prices</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <circle cx={12} cy={12} r={10} />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M21 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                  <circle cx={12} cy={10} r={3} />
                </svg>
                <span>Worldwide</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="container mx-auto px-4 -mt-10 relative z-10">
        {/* ...FlightSearchForm... */}
      </div>

      {/* Metrics */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-2xl font-semibold mb-2">Total Bookings</div>
            <div className="text-4xl font-bold">
              {metrics?.totalBookings ?? "--"}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-2xl font-semibold mb-2">Total Users</div>
            <div className="text-4xl font-bold">
              {metrics?.totalUsers ?? "--"}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-2xl font-semibold mb-2">Total Revenue</div>
            <div className="text-4xl font-bold">
              ${metrics?.totalRevenue ?? "--"}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-2xl font-semibold mb-2">Cancellations</div>
            <div className="text-4xl font-bold">
              {metrics?.cancellations ?? "--"}
            </div>
          </div>
        </div>

        {/* Bookings Trend Line Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-12">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Daily Bookings (Last 30 Days)
          </h2>
          {trendLoading ? (
            <div>Loading chart...</div>
          ) : trendError ? (
            <div className="text-red-500">{trendError}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={trend}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={10} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bookings by Airline Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-12">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Bookings by Airline
          </h2>
          {airlineLoading ? (
            <div>Loading chart...</div>
          ) : airlineError ? (
            <div className="text-red-500">{airlineError}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={airlineData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="airline"
                  tick={{ fontSize: 12 }}
                  minTickGap={10}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#6366f1" name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Booking Status Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-12">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Booking Status Distribution
          </h2>
          {statusLoading ? (
            <div>Loading chart...</div>
          ) : statusError ? (
            <div className="text-red-500">{statusError}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {statusData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={pieColors[idx % pieColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ...rest of dashboard... */}
    </div>
  );
}
