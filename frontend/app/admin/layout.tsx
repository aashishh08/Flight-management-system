import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r p-6 space-y-6">
        <div className="text-2xl font-bold mb-8">Admin Panel</div>
        <nav className="space-y-4">
          <Link href="/admin" className="block hover:text-blue-600">
            Dashboard
          </Link>
          <Link href="/admin/bookings" className="block hover:text-blue-600">
            Bookings
          </Link>
          <Link href="/admin/flights" className="block hover:text-blue-600">
            Flights
          </Link>
          <Link href="/admin/users" className="block hover:text-blue-600">
            Users
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
