"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { getProducts, createProduct, updateProduct, deleteProduct, Product } from "@/lib/firestore";

const CATEGORIES = ["candy", "chocolate", "gummy", "lollipop", "chewy", "sour"];
const EMPTY: Omit<Product, "id" | "createdAt"> = { name: "", description: "", price: 0, image: "", category: "candy", stock: 100, active: true };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [priceStr, setPriceStr] = useState("0");
  const [stockStr, setStockStr] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const data = await getProducts(false).catch(() => []);
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setPriceStr("0");
    setStockStr("100");
    setError("");
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, description: p.description, price: p.price, image: p.image, category: p.category, stock: p.stock, active: p.active });
    setPriceStr(p.price.toString());
    setStockStr(p.stock.toString());
    setError("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = { ...form, price: parseFloat(priceStr) || 0, stock: parseInt(stockStr) || 0 };
      if (editing) {
        await updateProduct(editing.id, data);
      } else {
        await createProduct(data);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await deleteProduct(id).catch(() => {});
    load();
  }

  async function toggleActive(p: Product) {
    await updateProduct(p.id, { active: !p.active }).catch(() => {});
    load();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-pink-700 transition-colors">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-100" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><p className="text-5xl mb-4">🍬</p><p>No products yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl border overflow-hidden ${p.active ? "border-gray-100" : "border-gray-200 opacity-60"}`}>
              <div className="relative h-36 bg-pink-50">
                {p.image ? (
                  <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl">🍬</div>
                )}
                {!p.active && <span className="absolute top-2 left-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Hidden</span>}
              </div>
              <div className="p-4">
                <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                <p className="text-xs text-gray-400 capitalize mb-2">{p.category} · Stock: {p.stock}</p>
                <p className="text-pink-600 font-bold text-base mb-3">{p.price.toFixed(2)} SAR</p>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => toggleActive(p)} className={`flex-1 text-xs py-1.5 border rounded-lg ${p.active ? "border-yellow-200 text-yellow-600 hover:bg-yellow-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                    {p.active ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="flex items-center justify-center w-8 text-red-400 hover:text-red-600 border border-red-100 rounded-lg hover:bg-red-50">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{editing ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" placeholder="Haribo Gold Bears" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Price (SAR) *</label>
                  <input required type="number" step="0.01" min="0" value={priceStr} onChange={(e) => setPriceStr(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Stock</label>
                  <input type="number" min="0" value={stockStr} onChange={(e) => setStockStr(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Image URL</label>
                <input type="url" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-pink-600" />
                Active (visible to customers)
              </label>

              {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-pink-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-pink-700 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editing ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
