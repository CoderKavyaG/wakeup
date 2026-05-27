import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const links = await prisma.projectLink.findMany({
      where: { projectId: id }
    });

    const pingResults = await Promise.all(
      links.map(async (link) => {
        let status = 500;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(link.url, { 
            method: 'HEAD', 
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          status = response.status;
          
          // Fallback to GET if HEAD is not allowed
          if (status === 405 || status === 403) {
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
            const response2 = await fetch(link.url, {
              method: 'GET',
              signal: controller2.signal
            });
            clearTimeout(timeoutId2);
            status = response2.status;
          }
        } catch (error) {
          status = 504; // Timeout or network error
        }

        const updatedLink = await prisma.projectLink.update({
          where: { id: link.id },
          data: {
            lastStatus: status,
            lastPinged: new Date()
          }
        });

        return updatedLink;
      })
    );

    return NextResponse.json(pingResults);
  } catch (error) {
    console.error("Failed to ping links:", error);
    return NextResponse.json({ error: "Failed to ping links" }, { status: 500 });
  }
}
