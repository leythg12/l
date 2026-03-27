import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !admin.isSuperAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admins = await prisma.admin.findMany({
    select: { id: true, name: true, email: true, isSuperAdmin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(admins);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin || !admin.isSuperAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, password, isSuperAdmin } = await req.json();
  if (!name || !email || !password) {
    return Response.json({ error: "Name, email, and password required" }, { status: 400 });
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return Response.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const newAdmin = await prisma.admin.create({
    data: { name, email, password: hashed, isSuperAdmin: !!isSuperAdmin },
    select: { id: true, name: true, email: true, isSuperAdmin: true, createdAt: true },
  });

  return Response.json(newAdmin, { status: 201 });
}
