"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MessageCircle, ChevronDown, ChevronUp, Printer, FileCode2 } from "lucide-react";
import { getOrders, updateOrder, Order } from "@/lib/firestore";
import { getSnapchatChatLink, formatOrderMessage } from "@/lib/snapchat-utils";

const ORDER_STATUSES = ["pending", "printing", "printed", "shipped", "delivered", "cancelled"];
const PRINT_STATUSES = ["queued", "printing", "done", "failed"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  printing: "bg-blue-100 text-blue-700 border-blue-200",
  printed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  shipped: "bg-purple-100 text-purple-700 border-purple-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const PRINT_STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-50 text-yellow-600",
  printing: "bg-blue-50 text-blue-600",
  done: "bg-green-50 text-green-600",
  failed: "bg-red-50 text-red-600",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  async function load() {
    const data = await getOrders().catch(() => []);
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleStatus(id: string, status: string) {
    await updateOrder(id, { status }).catch(() => {});
    load();
  }

  async function handlePrintStatus(id: string, printStatus: string) {
    await updateOrder(id, { printStatus }).catch(() => {});
    load();
  }

  async function markNotified(id: string) {
    await updateOrder(id, { notifiedSnap: true }).catch(() => {});
    load();
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Orders</h1>

      <div className="flex gap-2 mb-5 flex-wrap">
        {["all", ...ORDER_STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition-colors ${filter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No orders found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">{order.customerName}</p>
                    <span className="text-xs text-gray-400">#{order.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{order.items.length} item(s)</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRINT_STATUS_COLORS[order.printStatus] || "bg-gray-50 text-gray-500"}`}>
                      <Printer size={10} className="inline mr-1" />{order.printStatus || "—"}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border hidden sm:inline-block ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {order.status}
                </span>
                <span className="text-sm font-bold text-gray-800 flex-shrink-0">{order.totalAmount.toFixed(2)} SAR</span>
                {expandedId === order.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>

              {expandedId === order.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  {/* Items with print specs */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-3">
                          <div className="flex justify-between text-sm text-gray-700 mb-1">
                            <span className="font-medium">{item.productName} × {item.quantity}</span>
                            <span className="text-gray-500">{(item.price * item.quantity).toFixed(2)} SAR</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                            <span>Material: <span className="font-medium text-gray-700">{item.requestedMaterial}</span></span>
                            {item.requestedColor && <span>Color: <span className="font-medium text-gray-700">{item.requestedColor}</span></span>}
                            <span>Infill: <span className="font-medium text-gray-700">{item.infillPercent}%</span></span>
                          </div>
                          {item.fileName && (
                            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                              <FileCode2 size={11} />{item.fileName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Delivery Address</p>
                      <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact</p>
                      <p className="text-sm text-gray-700">{order.phone || "No phone"}</p>
                    </div>
                  </div>

                  {order.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{order.notes}</p>
                    </div>
                  )}

                  {/* Status controls */}
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Order:</label>
                      <select value={order.status} onChange={(e) => handleStatus(order.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 flex items-center gap-1"><Printer size={11} />Print:</label>
                      <select value={order.printStatus || "queued"} onChange={(e) => handlePrintStatus(order.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {PRINT_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>

                    <a
                      href={getSnapchatChatLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => !order.notifiedSnap && markNotified(order.id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${order.notifiedSnap ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-white text-gray-600 border-gray-200 hover:border-yellow-300 hover:text-yellow-700"}`}
                    >
                      <MessageCircle size={13} />
                      {order.notifiedSnap ? "Snapchat Notified ✓" : "Notify on Snapchat"}
                      <ExternalLink size={11} />
                    </a>
                  </div>

                  {!order.notifiedSnap && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-yellow-700 mb-1">📋 Copy this to @abelgirault on Snapchat:</p>
                      <pre className="text-xs text-yellow-800 whitespace-pre-wrap font-mono leading-relaxed">
                        {formatOrderMessage({ id: order.id, customerName: order.customerName, phone: order.phone, deliveryAddress: order.deliveryAddress, totalAmount: order.totalAmount, items: order.items })}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
