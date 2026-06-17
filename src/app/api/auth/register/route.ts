import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if any user exists in the system
    // For SaaS version, we comment this check out to allow public registration
    /*
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json({ error: "Registration is locked. DevOS already has an owner." }, { status: 403 });
    }
    */

    // Hash the password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the first user (the owner)
    await prisma.user.create({
      data: {
        name: name || "Developer",
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ hasOwner: userCount > 0 });
  } catch (error) {
    return NextResponse.json({ hasOwner: false });
  }
}
