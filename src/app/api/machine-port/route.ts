import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const portFilePath = path.join(process.cwd(), "devos-agent", "active-port.json");
    if (fs.existsSync(portFilePath)) {
      const content = fs.readFileSync(portFilePath, "utf8");
      const data = JSON.parse(content);
      if (data && typeof data.port === "number") {
        return NextResponse.json({ port: data.port });
      }
    }
  } catch (e) {
    console.error("Failed to read active-port.json:", e);
  }
  return NextResponse.json({ port: 3131 });
}
