/**
 * Pure utility functions for Snapchat notifications (no server imports).
 * Safe to use in both client and server components.
 */

const SNAP_USERNAME = "abelgirault";

export function getSnapchatChatLink(username: string = SNAP_USERNAME) {
  return `https://www.snapchat.com/add/${username}`;
}

export function formatOrderMessage(order: {
  id: string;
  customerName: string;
  phone?: string | null;
  deliveryAddress: string;
  totalAmount: number;
  items: Array<{ productName: string; quantity: number; price: number }>;
}) {
  const itemsList = order.items
    .map((i) => `• ${i.productName} x${i.quantity} — ${(i.price * i.quantity).toFixed(2)} SAR`)
    .join("\n");

  return (
    `🍬 New Candy Shop Order!\n\n` +
    `Order #${order.id.slice(-8).toUpperCase()}\n` +
    `Customer: ${order.customerName}\n` +
    `Phone: ${order.phone || "N/A"}\n` +
    `Deliver to: ${order.deliveryAddress}\n\n` +
    `Items:\n${itemsList}\n\n` +
    `Total: ${order.totalAmount.toFixed(2)} SAR\n` +
    `Payment: Cash on Delivery`
  );
}
