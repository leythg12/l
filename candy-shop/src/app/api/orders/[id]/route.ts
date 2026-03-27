import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { markOrderNotified } from "@/lib/snapchat-notify";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: { select: { name: true, email: true, phone: true } } },
  });

  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(order);
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const { status, notifiedSnap } = body;

  if (notifiedSnap) {
    await markOrderNotified(id);
  }

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
