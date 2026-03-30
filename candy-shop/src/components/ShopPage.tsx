"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { getProducts, Product } from "@/lib/firestore";
import { Search, Printer, Layers, Clock } from "lucide-react";

const CATEGORIES = ["all", "functional", "decorative", "miniature", "prototype", "art", "tools"];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getProducts(true)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = category === "all" || p.category === category;
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.material?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Printer size={36} className="text-blue-500" />
          <h1 className="text-4xl font-bold text-slate-800">PrintForge</h1>
        </div>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Professional 3D prints on demand — PLA, PETG, ABS and more. Delivered to your door.
        </p>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-400">
          <span className="flex items-center gap-1"><Layers size={14} /> Multiple materials</span>
          <span className="flex items-center gap-1"><Clock size={14} /> Fast turnaround</span>
          <span className="flex items-center gap-1">💵 Cash on delivery · SAR</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search models, materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-slate-200 hover:border-blue-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🖨️</p>
          <p>No models found. Try a different search!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
        <p className="text-blue-800 font-medium">
          🖨️ Printed on Flashforge M5 &nbsp;|&nbsp; 💵 Cash on Delivery &nbsp;|&nbsp; All prices in SAR
        </p>
      </div>
    </main>
  );
}
