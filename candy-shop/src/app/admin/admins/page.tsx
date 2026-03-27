"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Loader2, ShieldCheck } from "lucide-react";

interface Admin {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

const EMPTY_FORM = { name: "", email: "", password: "", isSuperAdmin: false };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notAllowed, setNotAllowed] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/admins");
    if (res.status === 401) { setNotAllowed(true); setLoading(false); return; }
    const data = await res.json();
    setAdmins(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this admin account?")) return;
    await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    load();
  }

  if (notAllowed) {
    return (
      <div className="text-center py-20 text-gray-500">
        <ShieldCheck size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="font-semibold">Super Admin access required</p>
        <p className="text-sm mt-1">Only super admins can manage admin accounts.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Accounts</h1>
        <button
          onClick={() => { setShowModal(true); setError(""); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-pink-700 transition-colors"
        >
          <Plus size={16} />
          Add Admin
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No admins found</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">
                {admin.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800 text-sm truncate">{admin.name}</p>
                  {admin.isSuperAdmin && (
                    <span className="flex-shrink-0 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                      Super
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{admin.email}</p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                {new Date(admin.createdAt).toLocaleDateString()}
              </p>
              <button
                onClick={() => handleDelete(admin.id)}
                className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">New Admin Account</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="john@candyshop.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Password *</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="••••••••"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isSuperAdmin}
                  onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
                  className="accent-pink-600"
                />
                Super Admin (can manage other admins)
              </label>

              {error && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-pink-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-pink-700 transition-colors disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
