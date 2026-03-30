"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/lib/auth-context";
import { ShoppingCart, User, LogOut, Printer } from "lucide-react";

export default function Navbar() {
  const { itemCount } = useCart();
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Printer size={22} className="text-blue-400" />
          <span>Print<span className="text-blue-400">Forge</span></span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-blue-300 transition-colors">Shop</Link>
          <Link href="/cart/" className="relative hover:text-blue-300 transition-colors flex items-center gap-1">
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                {itemCount}
              </span>
            )}
            <span className="hidden sm:inline">Cart</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-slate-400 text-xs">
                {user.displayName?.split(" ")[0] || user.phoneNumber || "Account"}
              </span>
              <button onClick={() => signOut()} className="hover:text-blue-300 transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link href="/auth/" className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-full font-semibold text-xs hover:bg-blue-500 transition-colors">
              <User size={14} /> Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
