import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { query, response, rating } = await request.json();

    if (!query || !response || !rating) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const source = rating === "up" ? "cockpit_helpful" : "cockpit_unhelpful";
    
    // Save the query/response feedback as a background note
    const note = await prisma.note.create({
      data: {
        userId,
        content: `${query} || ${response}`,
        source,
        category: "feedback",
      },
    });

    return Response.json({ success: true, id: note.id });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
