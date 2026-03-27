import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminToken, getAdminSession } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await createAdminToken(admin.id);
  const cookieStore = await cookies();
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return Response.json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isSuperAdmin: admin.isSuperAdmin,
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  return Response.json({ success: true });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  return Response.json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isSuperAdmin: admin.isSuperAdmin,
  });
}
