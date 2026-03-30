/**
 * Firestore helpers — all client-side via Firebase JS SDK.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;         // SAR
  previewImage: string;  // URL
  fileUrl: string;       // Firebase Storage URL to the pre-sliced .gcode / .3mf
  fileName: string;      // Original filename, e.g. "skull_vase.gcode"
  material: string;      // PLA, PETG, ABS, ASA, TPU…
  color: string;         // Default color offered
  dimensions: string;    // e.g. "120 × 80 × 60 mm"
  printTimeMin: number;  // Estimated print time in minutes
  category: string;
  stock: number;
  active: boolean;
  createdAt: Timestamp | null;
}

export interface OrderItem {
  productId: string;
  productName: string;
  fileUrl: string;
  fileName: string;
  quantity: number;
  price: number;
  // per-item print preferences chosen at checkout
  requestedColor: string;
  requestedMaterial: string;
  infillPercent: number;
}

export interface Order {
  id: string;
  userId: string | null;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  status: string;        // pending | printing | printed | shipped | delivered | cancelled
  printStatus: string;   // queued | printing | done | failed
  totalAmount: number;
  notes: string;
  notifiedSnap: boolean;
  items: OrderItem[];
  createdAt: Timestamp | null;
}

// ─── Products ─────────────────────────────────────────────────────────────

export async function getProducts(activeOnly = true): Promise<Product[]> {
  const ref = collection(db, "products");
  const q = activeOnly
    ? query(ref, where("active", "==", true), orderBy("createdAt", "desc"))
    : query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, "products", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Product) : null;
}

export async function createProduct(data: Omit<Product, "id" | "createdAt">) {
  return addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
}

export async function updateProduct(id: string, data: Partial<Omit<Product, "id">>) {
  return updateDoc(doc(db, "products", id), data);
}

export async function deleteProduct(id: string) {
  return deleteDoc(doc(db, "products", id));
}

// ─── Orders ───────────────────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function createOrder(data: Omit<Order, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "orders"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateOrder(id: string, data: Partial<Omit<Order, "id">>) {
  return updateDoc(doc(db, "orders", id), data);
}

// ─── Admin records ────────────────────────────────────────────────────────

export interface AdminRecord {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  createdAt: Timestamp | null;
}

export async function getAdmins(): Promise<AdminRecord[]> {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminRecord));
}

export async function getAdminByEmail(email: string): Promise<AdminRecord | null> {
  const q = query(collection(db, "admins"), where("email", "==", email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as AdminRecord;
}

export async function createAdminRecord(data: Omit<AdminRecord, "id" | "createdAt">) {
  return addDoc(collection(db, "admins"), { ...data, createdAt: serverTimestamp() });
}

export async function deleteAdminRecord(id: string) {
  return deleteDoc(doc(db, "admins", id));
}
