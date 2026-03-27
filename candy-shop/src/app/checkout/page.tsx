"use client";

import Navbar from "@/components/Navbar";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/lib/auth-context";
import { createOrder } from "@/lib/firestore";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, User, CheckCircle } from "lucide-react";
import { formatOrderMessage } from "@/lib/snapchat-utils";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    customerName: user?.displayName || "",
    phone: user?.phoneNumber || "",
    deliveryAddress: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [snapMessage, setSnapMessage] = useState("");

  if (items.length === 0 && !success) {
    return (
      <>
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-600 mb-4">Your cart is empty.</p>
          <Link href="/" className="text-pink-600 font-semibold hover:underline">
            Back to Shop
          </Link>
        </main>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h2>
          <p className="text-gray-500 mb-1">Order #{orderId.slice(-8).toUpperCase()}</p>
          <p className="text-gray-500 text-sm mb-6">
            Pay cash upon delivery. We&apos;ll be in touch!
          </p>
          {snapMessage && (
            <details className="text-left bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-xs">
              <summary className="cursor-pointer font-medium text-yellow-700">
                📋 Order details (for admin — copy to Snapchat @abelgirault)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-yellow-800 font-mono leading-relaxed">
                {snapMessage}
              </pre>
            </details>
          )}
          <Link
            href="/"
            className="inline-block bg-pink-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </main>
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.customerName.trim() || !form.deliveryAddress.trim()) {
      setError("Name and delivery address are required.");
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map((i) => ({
        productId: i.id,
        productName: i.name,
        quantity: i.quantity,
        price: i.price,
      }));

      const id = await createOrder({
        userId: user?.uid || null,
        customerName: form.customerName,
        phone: form.phone || "",
        deliveryAddress: form.deliveryAddress,
        notes: form.notes || "",
        status: "pending",
        totalAmount: total,
        notifiedSnap: false,
        items: orderItems,
      });

      const msg = formatOrderMessage({
        id,
        customerName: form.customerName,
        phone: form.phone,
        deliveryAddress: form.deliveryAddress,
        totalAmount: total,
        items: orderItems,
      });

      clearCart();
      setOrderId(id);
      setSnapMessage(msg);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-pink-100 p-4">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm">Order Summary</h2>
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{(item.price * item.quantity).toFixed(2)} SAR</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-pink-600 border-t border-pink-100 mt-3 pt-3">
              <span>Total</span>
              <span>{total.toFixed(2)} SAR</span>
            </div>
            <p className="text-xs text-green-600 mt-1 font-medium">💵 Cash on Delivery</p>
          </div>

          <div className="bg-white rounded-2xl border border-pink-100 p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm">Your Details</h2>

            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Full name *"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                placeholder="Delivery address — street, building, city... *"
                value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                required
                rows={3}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
              />
            </div>

            <textarea
              placeholder="Any notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 text-white py-3.5 rounded-full font-bold text-base hover:bg-pink-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Placing Order..." : `Place Order — ${total.toFixed(2)} SAR`}
          </button>
        </form>
      </main>
    </>
  );
}
