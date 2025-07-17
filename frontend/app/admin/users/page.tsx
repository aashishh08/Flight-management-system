"use client";
import { useEffect, useState } from "react";
import { getAdminUsers } from "@/lib/admin-api";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const fetchUsers = (params?: {
    page?: number;
    pageSize?: number;
    email?: string;
    name?: string;
  }) => {
    setLoading(true);
    getAdminUsers({
      page: params?.page ?? page,
      pageSize: params?.pageSize ?? pageSize,
      email: params?.email ?? (email || undefined),
      name: params?.name ?? (name || undefined),
    })
      .then((res) => {
        setUsers(res.data);
        setTotal(res.total);
        setPage(res.page);
        setPageSize(res.pageSize);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers({
      page: 1,
      pageSize,
      email: email || undefined,
      name: name || undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchUsers({ page: newPage, pageSize });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setPage(1);
    fetchUsers({ page: 1, pageSize: newSize });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">User Management</h1>
      <form
        className="mb-6 flex flex-wrap gap-4 items-end bg-white rounded-lg shadow p-6"
        onSubmit={handleFilter}
      >
        <div className="flex flex-col w-full sm:w-auto">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Email
          </label>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <div className="flex flex-col w-full sm:w-auto">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Name
          </label>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First or Last Name"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow transition"
        >
          Filter
        </button>
        <div className="flex flex-col w-full sm:w-auto ml-auto">
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Page Size
          </label>
          <select
            className="border border-gray-300 rounded px-3 py-2"
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
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Nationality
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {users.map((user, idx) => (
                  <tr
                    key={user.id}
                    className={
                      idx % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50" + " hover:bg-blue-50 transition"
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.first_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.last_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.nationality}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6">
              <div className="text-gray-600">
                Page {page} of {totalPages} ({total} users)
              </div>
              <div className="space-x-2">
                <button
                  className="px-4 py-2 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="px-4 py-2 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
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
    </div>
  );
}
