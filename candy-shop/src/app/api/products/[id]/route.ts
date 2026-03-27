import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(product);
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const { name, description, price, image, category, stock, active } = body;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(image !== undefined && { image }),
      ...(category !== undefined && { category }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(active !== undefined && { active }),
    },
  });

  return Response.json(product);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await prisma.product.delete({ where: { id } });
  return Response.json({ success: true });
}
