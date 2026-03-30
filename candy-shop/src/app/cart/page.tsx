"use client";

import Navbar from "@/components/Navbar";
import { useCart } from "@/components/CartContext";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Plus, Minus, Printer } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart();

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🖨️</p>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Add some 3D models to get started!</p>
          <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors">
            Browse Models
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Cart</h1>

        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex items-center justify-center h-full text-2xl">🖨️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
                <p className="text-blue-600 text-sm font-medium">{item.price.toFixed(2)} SAR</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                  <Minus size={12} />
                </button>
                <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                  <Plus size={12} />
                </button>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-800">{(item.price * item.quantity).toFixed(2)} SAR</p>
                <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 mt-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Subtotal</span><span>{total.toFixed(2)} SAR</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>Payment</span>
            <span className="text-green-600 font-medium">Cash on Delivery</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-slate-100 pt-3 mb-5">
            <span>Total</span>
            <span className="text-blue-600">{total.toFixed(2)} SAR</span>
          </div>
          <Link href="/checkout/" className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors">
            <Printer size={18} /> Proceed to Checkout
          </Link>
        </div>
      </main>
    </>
  );
}
