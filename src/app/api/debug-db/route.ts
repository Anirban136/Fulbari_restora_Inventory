import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tabs = await prisma.tab.findMany({
      where: {
        status: "CLOSED",
      },
      orderBy: {
        closedAt: "desc"
      },
      take: 20
    });
    
    return NextResponse.json({ success: true, count: tabs.length, tabs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
