"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/lib/auth-context";
import { ShoppingCart, User, LogOut } from "lucide-react";

export default function Navbar() {
  const { itemCount } = useCart();
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-pink-600 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          🍬 <span>CandyShop</span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-pink-200 transition-colors">
            Shop
          </Link>
          <Link href="/cart/" className="relative hover:text-pink-200 transition-colors flex items-center gap-1">
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-black rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                {itemCount}
              </span>
            )}
            <span className="hidden sm:inline">Cart</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-pink-200 text-xs">
                Hi, {user.displayName?.split(" ")[0] || user.phoneNumber || "Guest"}
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 hover:text-pink-200 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/"
              className="flex items-center gap-1 bg-white text-pink-600 px-3 py-1.5 rounded-full font-semibold text-xs hover:bg-pink-100 transition-colors"
            >
              <User size={14} />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
