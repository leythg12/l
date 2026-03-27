/**
 * Server-only Snapchat notification helpers (imports Prisma).
 * Only import this in server components / API routes.
 */

import { prisma } from "@/lib/prisma";
export { getSnapchatChatLink, formatOrderMessage } from "@/lib/snapchat-utils";

export async function markOrderNotified(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { notifiedSnap: true },
  });
}
