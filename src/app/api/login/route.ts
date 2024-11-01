import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === process.env.PRIVATE_ACCESS_PASSWORD) {
    const response = NextResponse.json({ success: true });

    response.cookies.set("authToken", password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7 * 52, // 1 year
    });

    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
