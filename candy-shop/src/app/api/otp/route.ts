import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return Response.json({ error: "Phone required" }, { status: 400 });

  const code = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpCode.create({ data: { phone, code, expires } });

  // In production, send via SMS provider (Twilio, etc.)
  // For development, the code is returned in the response
  console.log(`[OTP] ${phone}: ${code}`);

  const isDev = process.env.NODE_ENV === "development";
  return Response.json({
    success: true,
    message: "OTP sent",
    ...(isDev && { devCode: code }),
  });
}
