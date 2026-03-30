"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Upload, FileCode2 } from "lucide-react";
import Image from "next/image";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { getProducts, createProduct, updateProduct, deleteProduct, Product } from "@/lib/firestore";

const CATEGORIES = ["functional", "decorative", "miniature", "prototype", "art", "tools"];
const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU", "SILK PLA"];

type FormData = Omit<Product, "id" | "createdAt">;

const EMPTY: FormData = {
  name: "", description: "", price: 0, previewImage: "",
  fileUrl: "", fileName: "", material: "PLA", color: "",
  dimensions: "", printTimeMin: 0, category: "functional",
  stock: 99, active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [priceStr, setPriceStr] = useState("0");
  const [printTimeStr, setPrintTimeStr] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // File upload state
  const modelFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [modelUploadProgress, setModelUploadProgress] = useState<number | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);

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
    setPrintTimeStr("0");
    setError("");
    setModelUploadProgress(null);
    setImageUploadProgress(null);
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description, price: p.price,
      previewImage: p.previewImage, fileUrl: p.fileUrl, fileName: p.fileName,
      material: p.material, color: p.color, dimensions: p.dimensions,
      printTimeMin: p.printTimeMin, category: p.category,
      stock: p.stock, active: p.active,
    });
    setPriceStr(p.price.toString());
    setPrintTimeStr(p.printTimeMin.toString());
    setError("");
    setModelUploadProgress(null);
    setImageUploadProgress(null);
    setShowModal(true);
  }

  function uploadFile(
    file: File,
    path: string,
    onProgress: (p: number) => void,
    onDone: (url: string, name: string) => void,
    onError: (e: string) => void,
  ) {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => onError(err.message),
      async () => { const url = await getDownloadURL(task.snapshot.ref); onDone(url, file.name); },
    );
  }

  function handleModelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setModelUploadProgress(0);
    uploadFile(
      file,
      `models/${Date.now()}_${file.name}`,
      setModelUploadProgress,
      (url, name) => { setForm((f) => ({ ...f, fileUrl: url, fileName: name })); setModelUploadProgress(null); },
      (err) => { setError(`Model upload failed: ${err}`); setModelUploadProgress(null); },
    );
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploadProgress(0);
    uploadFile(
      file,
      `previews/${Date.now()}_${file.name}`,
      setImageUploadProgress,
      (url) => { setForm((f) => ({ ...f, previewImage: url })); setImageUploadProgress(null); },
      (err) => { setError(`Image upload failed: ${err}`); setImageUploadProgress(null); },
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (modelUploadProgress !== null || imageUploadProgress !== null) {
      setError("Please wait for uploads to finish.");
      return;
    }
    setSaving(true);
    try {
      const data: FormData = { ...form, price: parseFloat(priceStr) || 0, printTimeMin: parseInt(printTimeStr) || 0 };
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
        <h1 className="text-2xl font-bold text-gray-800">3D Models</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Add Model
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-100" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><p className="text-5xl mb-4">🖨️</p><p>No models yet. Add one!</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl border overflow-hidden ${p.active ? "border-gray-100" : "border-gray-200 opacity-60"}`}>
              <div className="relative h-36 bg-slate-100">
                {p.previewImage ? (
                  <Image src={p.previewImage} alt={p.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl">🖨️</div>
                )}
                <span className="absolute top-2 left-2 bg-slate-800/80 text-white text-xs px-2 py-0.5 rounded-full font-medium">{p.material}</span>
                {!p.active && <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Hidden</span>}
              </div>
              <div className="p-4">
                <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                <p className="text-xs text-gray-400 capitalize mb-1">{p.category} · {p.printTimeMin}min</p>
                {p.fileName && (
                  <p className="text-xs text-blue-500 flex items-center gap-1 mb-1 truncate">
                    <FileCode2 size={11} />{p.fileName}
                  </p>
                )}
                <p className="text-blue-600 font-bold text-base mb-3">{p.price.toFixed(2)} SAR</p>
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
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{editing ? "Edit Model" : "Add Model"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Skull Vase" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>

              {/* Price + Print time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Price (SAR) *</label>
                  <input required type="number" step="0.01" min="0" value={priceStr} onChange={(e) => setPriceStr(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Print time (min)</label>
                  <input type="number" min="0" value={printTimeStr} onChange={(e) => setPrintTimeStr(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Material + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Material</label>
                  <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Color + Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Default color</label>
                  <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Black" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Dimensions</label>
                  <input value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="120 × 80 × 60 mm" />
                </div>
              </div>

              {/* Model file upload */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Model file (.gcode / .3mf / .stl)
                  {form.fileName && <span className="text-blue-500 ml-1">— {form.fileName}</span>}
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => modelFileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                    <Upload size={13} /> Upload file
                  </button>
                  {modelUploadProgress !== null && (
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all" style={{ width: `${modelUploadProgress}%` }} />
                    </div>
                  )}
                </div>
                <input ref={modelFileRef} type="file" accept=".gcode,.3mf,.stl" className="hidden" onChange={handleModelFile} />
                {form.fileUrl && !form.fileName && (
                  <input type="url" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                    placeholder="or paste URL"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                )}
              </div>

              {/* Preview image */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Preview image
                  {form.previewImage && <span className="text-blue-500 ml-1">— uploaded</span>}
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => imageFileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                    <Upload size={13} /> Upload image
                  </button>
                  {imageUploadProgress !== null && (
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all" style={{ width: `${imageUploadProgress}%` }} />
                    </div>
                  )}
                </div>
                <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                <input type="url" value={form.previewImage} onChange={(e) => setForm({ ...form, previewImage: e.target.value })}
                  placeholder="or paste image URL"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-blue-600" />
                Active (visible in shop)
              </label>

              {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving || modelUploadProgress !== null || imageUploadProgress !== null}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editing ? "Save Changes" : "Add Model"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
