import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatOrderMessage } from "@/lib/snapchat-notify";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");

  const orders = await prisma.order.findMany({
    where: userId ? { userId } : {},
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { customerName, phone, deliveryAddress, notes, items } = body;

  if (!customerName || !deliveryAddress || !items?.length) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate and fetch products
  const productIds = items.map((i: { productId: string }) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });

  if (products.length !== productIds.length) {
    return Response.json({ error: "One or more products not found" }, { status: 400 });
  }

  const orderItems = items.map((item: { productId: string; quantity: number }) => {
    const product = products.find((p) => p.id === item.productId)!;
    return {
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
    };
  });

  const totalAmount = orderItems.reduce(
    (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
    0
  );

  const order = await prisma.order.create({
    data: {
      userId: session?.user?.id || null,
      customerName,
      phone: phone || null,
      deliveryAddress,
      notes: notes || null,
      totalAmount,
      items: { create: orderItems },
    },
    include: { items: true },
  });

  // Log the Snapchat notification message
  const message = formatOrderMessage({
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    deliveryAddress: order.deliveryAddress,
    totalAmount: order.totalAmount,
    items: order.items,
  });
  console.log("\n[SNAPCHAT NOTIFICATION for abelgirault]\n" + message + "\n");

  return Response.json({ order, snapMessage: message }, { status: 201 });
}
