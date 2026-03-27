"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Loader2, ShieldCheck } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAdmins, createAdminRecord, deleteAdminRecord, getAdminByEmail, AdminRecord } from "@/lib/firestore";
import { onAuthStateChanged } from "firebase/auth";

const EMPTY = { name: "", email: "", password: "", isSuperAdmin: false };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState<AdminRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) return;
      const rec = await getAdminByEmail(user.email).catch(() => null);
      setCurrentAdmin(rec);
    });
    return unsub;
  }, []);

  async function load() {
    const data = await getAdmins().catch(() => []);
    setAdmins(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      // Create Firebase Auth account for the new admin
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      // Record admin in Firestore
      await createAdminRecord({ name: form.name, email: cred.user.email!, isSuperAdmin: form.isSuperAdmin });
      setShowModal(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setError(msg.includes("email-already-in-use") ? "Email already in use." : msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(admin: AdminRecord) {
    if (!confirm(`Delete admin ${admin.name}?`)) return;
    await deleteAdminRecord(admin.id).catch(() => {});
    load();
  }

  if (!currentAdmin?.isSuperAdmin && !loading) {
    return (
      <div className="text-center py-20 text-gray-500">
        <ShieldCheck size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="font-semibold">Super Admin access required</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Accounts</h1>
        <button onClick={() => { setShowModal(true); setError(""); setForm(EMPTY); }} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-pink-700">
          <Plus size={16} /> Add Admin
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-gray-100" />)}</div>
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
                  {admin.isSuperAdmin && <span className="flex-shrink-0 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">Super</span>}
                </div>
                <p className="text-xs text-gray-400 truncate">{admin.email}</p>
              </div>
              <button onClick={() => handleDelete(admin)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">New Admin Account</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Password *</label>
                <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" placeholder="••••••••" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.isSuperAdmin} onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })} className="accent-pink-600" />
                Super Admin
              </label>
              {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-pink-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-pink-700 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
