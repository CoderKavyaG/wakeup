import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentFetch } from "@/lib/agentFetch";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    try {
      const agentRes = await agentFetch("/scan-project", {
        method: "POST",
        body
      });
      
      const data = await agentRes.json();
      
      if (!agentRes.ok) {
        return NextResponse.json({ error: data.error || "Failed to scan project" }, { status: agentRes.status });
      }

      return NextResponse.json(data);
    } catch (agentError: any) {
      if (agentError.code === 'ECONNREFUSED' || agentError.message.includes('fetch failed')) {
        return NextResponse.json(
          { error: "Agent not running — start it with npm run agent" }, 
          { status: 503 }
        );
      }
      throw agentError;
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to parse request body" }, 
      { status: 400 }
    );
  }
}

