import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/components/CartContext";

export const metadata: Metadata = {
  title: "CandyShop — Sweet Treats Delivered",
  description: "Order your favourite candies. Cash on delivery. Shop now!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-pink-50 font-sans">
        <SessionProvider>
          <CartProvider>{children}</CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
