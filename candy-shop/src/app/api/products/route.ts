import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("all") !== "true";

  const products = await prisma.product.findMany({
    where: {
      ...(activeOnly && { active: true }),
      ...(category && { category }),
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(products);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, price, image, category, stock } = body;

  if (!name || !price) {
    return Response.json({ error: "Name and price required" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      description: description || null,
      price: parseFloat(price),
      image: image || null,
      category: category || "candy",
      stock: parseInt(stock) || 100,
    },
  });

  return Response.json(product, { status: 201 });
}
