"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Package, ShoppingBag, Users, LogOut, LayoutDashboard, Menu, X } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/admins", label: "Admins", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; email: string; isSuperAdmin: boolean } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => {
        if (!r.ok) router.replace("/admin/login");
        return r.json();
      })
      .then((data) => setAdmin(data))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-5 border-b border-gray-100">
          <Link href="/" className="text-xl font-bold text-pink-600">
            🍬 CandyShop
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? "bg-pink-50 text-pink-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          {admin && (
            <div className="mb-3 px-3">
              <p className="text-sm font-semibold text-gray-700 truncate">{admin.name}</p>
              <p className="text-xs text-gray-400 truncate">{admin.email}</p>
              {admin.isSuperAdmin && (
                <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                  Super Admin
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 md:ml-60 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-500"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h2 className="text-sm font-medium text-gray-500">
            {NAV.find((n) => isActive(n.href, n.exact))?.label || "Admin"}
          </h2>
        </header>

        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
