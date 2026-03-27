import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/admin/admins/[id]">) {
  const admin = await getAdminSession();
  if (!admin || !admin.isSuperAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (id === admin.id) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.admin.delete({ where: { id } });
  return Response.json({ success: true });
}
