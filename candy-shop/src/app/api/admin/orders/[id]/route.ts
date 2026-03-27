import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { markOrderNotified } from "@/lib/snapchat-notify";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { status, notifiedSnap } = await req.json();

  if (notifiedSnap) await markOrderNotified(id);

  const order = await prisma.order.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notifiedSnap !== undefined && { notifiedSnap }),
    },
    include: { items: true },
  });

  return Response.json(order);
}
