import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getISTDateBounds } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const days: {
    date: string;
    cash: number;
    online: number;
    split: number;
    total: number;
  }[] = [];

  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    // Generate a base date exactly i days ago
    const offsetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const { startUTC, endUTC } = getISTDateBounds(offsetDate);

    const tabs = await prisma.tab.findMany({
      where: {
        status: { in: ["CLOSED", "PAID_HOLD"] },
        closedAt: { gte: startUTC, lte: endUTC },
      },
      select: { totalAmount: true, paymentMode: true, splitCashAmount: true, splitOnlineAmount: true },
    });

    let cash = 0,
      online = 0,
      split = 0;
    for (const tab of tabs) {
      if (tab.paymentMode === "CASH") cash += tab.totalAmount;
      else if (tab.paymentMode === "ONLINE") online += tab.totalAmount;
      else if (tab.paymentMode === "SPLIT") {
        cash += tab.splitCashAmount || 0;
        online += tab.splitOnlineAmount || 0;
        split += tab.totalAmount;
      }
    }

    // Label in IST
    const istMs = startUTC.getTime() + 3600000 * 5.5;
    const label = new Date(istMs).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });

    days.push({ date: label, cash, online, split, total: cash + online + split });
  }

  return NextResponse.json({ days });
}
