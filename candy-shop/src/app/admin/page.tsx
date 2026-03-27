"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingBag, Clock, CheckCircle, TrendingUp } from "lucide-react";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  recentOrders: Array<{
    id: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products?all=true").then((r) => r.json()),
      fetch("/api/admin/orders").then((r) => r.json()),
    ]).then(([products, orders]) => {
      const pending = orders.filter((o: { status: string }) => o.status === "pending").length;
      const completed = orders.filter((o: { status: string }) => o.status === "delivered").length;
      const revenue = orders
        .filter((o: { status: string }) => o.status !== "cancelled")
        .reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0);

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        pendingOrders: pending,
        completedOrders: completed,
        totalRevenue: revenue,
        recentOrders: orders.slice(0, 5),
      });
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Products",
            value: stats?.totalProducts ?? "—",
            icon: Package,
            color: "bg-purple-50 text-purple-600",
            href: "/admin/products",
          },
          {
            label: "Total Orders",
            value: stats?.totalOrders ?? "—",
            icon: ShoppingBag,
            color: "bg-blue-50 text-blue-600",
            href: "/admin/orders",
          },
          {
            label: "Pending",
            value: stats?.pendingOrders ?? "—",
            icon: Clock,
            color: "bg-yellow-50 text-yellow-600",
            href: "/admin/orders",
          },
          {
            label: "Revenue",
            value: stats ? `${stats.totalRevenue.toFixed(0)} SAR` : "—",
            icon: TrendingUp,
            color: "bg-green-50 text-green-600",
            href: "/admin/orders",
          },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs text-pink-600 hover:underline">
            View all
          </Link>
        </div>

        {!stats ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stats.recentOrders.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No orders yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{order.customerName}</p>
                  <p className="text-xs text-gray-400">
                    #{order.id.slice(-8).toUpperCase()} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                    STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.status}
                </span>
                <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                  {order.totalAmount.toFixed(2)} SAR
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
