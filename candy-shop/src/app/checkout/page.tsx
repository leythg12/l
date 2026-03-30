"use client";

import Navbar from "@/components/Navbar";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/lib/auth-context";
import { createOrder, getProduct } from "@/lib/firestore";
import { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, User, CheckCircle, Printer, Layers } from "lucide-react";
import { formatOrderMessage } from "@/lib/snapchat-utils";

const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU", "SILK PLA"];
const INFILL_OPTIONS = [10, 15, 20, 30, 40, 50, 75, 100];

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();

  const [form, setForm] = useState({
    customerName: user?.displayName || "",
    phone: user?.phoneNumber || "",
    deliveryAddress: "",
    notes: "",
  });
  // Per-order print preferences (applied to all items unless overridden)
  const [printPrefs, setPrintPrefs] = useState({
    material: "PLA",
    color: "",
    infillPercent: 20,
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
          <p className="text-5xl mb-4">🖨️</p>
          <p className="text-gray-600 mb-4">Your cart is empty.</p>
          <Link href="/" className="text-blue-600 font-semibold hover:underline">Back to Shop</Link>
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
          <p className="text-gray-500 text-sm mb-2">
            Your model is being queued for printing on the Flashforge M5.
          </p>
          <p className="text-gray-500 text-sm mb-6">Pay cash on delivery.</p>
          {snapMessage && (
            <details className="text-left bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-xs">
              <summary className="cursor-pointer font-medium text-yellow-700">
                📋 Order details (for @abelgirault on Snapchat)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-yellow-800 font-mono leading-relaxed">{snapMessage}</pre>
            </details>
          )}
          <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors">
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
      // Fetch full product data to get fileUrl/fileName
      const productDetails = await Promise.all(
        items.map((i) => getProduct(i.id))
      );

      const orderItems = items.map((item, idx) => {
        const p = productDetails[idx];
        return {
          productId: item.id,
          productName: item.name,
          fileUrl: p?.fileUrl || "",
          fileName: p?.fileName || "",
          quantity: item.quantity,
          price: item.price,
          requestedColor: printPrefs.color || p?.color || "",
          requestedMaterial: printPrefs.material,
          infillPercent: printPrefs.infillPercent,
        };
      });

      const id = await createOrder({
        userId: user?.uid || null,
        customerName: form.customerName,
        phone: form.phone || "",
        deliveryAddress: form.deliveryAddress,
        notes: form.notes || "",
        status: "pending",
        printStatus: "queued",
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
        items: orderItems.map((i) => ({
          productName: `${i.productName} (${i.requestedMaterial}, ${i.requestedColor || "any"}, ${i.infillPercent}% infill)`,
          quantity: i.quantity,
          price: i.price,
        })),
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
          {/* Order Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm">Order Summary</h2>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{item.name} × {item.quantity}</span>
                <span>{(item.price * item.quantity).toFixed(2)} SAR</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-blue-600 border-t border-slate-100 mt-2 pt-2">
              <span>Total</span><span>{total.toFixed(2)} SAR</span>
            </div>
            <p className="text-xs text-green-600 mt-1 font-medium">💵 Cash on Delivery</p>
          </div>

          {/* Print Preferences */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <Printer size={15} className="text-blue-500" /> Print Preferences
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Material</label>
                <select
                  value={printPrefs.material}
                  onChange={(e) => setPrintPrefs({ ...printPrefs, material: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Infill %</label>
                <select
                  value={printPrefs.infillPercent}
                  onChange={(e) => setPrintPrefs({ ...printPrefs, infillPercent: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {INFILL_OPTIONS.map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
            </div>
            <div className="relative">
              <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Preferred color (e.g. Black, Red, White)"
                value={printPrefs.color}
                onChange={(e) => setPrintPrefs({ ...printPrefs, color: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm">Your Details</h2>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Full name *" required value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" placeholder="Phone number (optional)" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-3 text-gray-400" />
              <textarea placeholder="Delivery address *" required rows={3} value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <textarea placeholder="Any additional notes (optional)" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 rounded-full font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <Printer size={18} />
            {loading ? "Placing Order…" : `Place Order — ${total.toFixed(2)} SAR`}
          </button>
        </form>
      </main>
    </>
  );
}
