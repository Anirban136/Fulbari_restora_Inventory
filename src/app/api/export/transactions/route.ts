import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getISTDateBounds } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const targetDateStr = searchParams.get("date") // expected format YYYY-MM-DD
  const fromDateStr = searchParams.get("from") // new range support
  const toDateStr = searchParams.get("to")
  const outletType = searchParams.get("outlet")

  // Authentication logic based on role
  const role = session.user.role
  if (role !== "OWNER") {
    if (outletType === "CAFE" && role !== "CAFE_STAFF") return new NextResponse("Forbidden", { status: 403 })
    if (outletType === "CHAI_JOINT" && role !== "CHAI_STAFF") return new NextResponse("Forbidden", { status: 403 })
    if (!outletType) return new NextResponse("Forbidden", { status: 403 }) // Only owner can fetch without specifying outlet
  }

  // Determine the date bounds
  let startUTC: Date;
  let endUTC: Date;

  if (fromDateStr && toDateStr) {
    // Range logic: From 4 AM of 'from' to 3:59 AM after 'to'
    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    
    // Use the utility to get boundaries for the start and end of the range
    const fromBounds = getISTDateBounds(fromDate);
    const toBounds = getISTDateBounds(toDate);
    
    startUTC = fromBounds.startUTC;
    endUTC = toBounds.endUTC;
  } else {
    // Legacy single date logic
    const bounds = getISTDateBounds(targetDateStr ? new Date(targetDateStr) : undefined);
    startUTC = bounds.startUTC;
    endUTC = bounds.endUTC;
  }

  // Validate the query constraint - Match Dashboard Logic
  const whereClause: any = {
    status: { in: ["CLOSED", "CANCELLED"] },
    closedAt: { gte: startUTC, lte: endUTC }
  }

  if (outletType) {
    const outlet = await prisma.outlet.findFirst({ where: { type: outletType } })
    if (outlet) {
      whereClause.outletId = outlet.id
    } else {
      return new NextResponse("Outlet not found", { status: 404 })
    }
  }

  // Fetch the data
  const tabs = await prisma.tab.findMany({
    where: whereClause,
    include: {
      Outlet: true,
      User: true,
      Items: {
        include: {
          MenuItem: true
        }
      }
    },
    orderBy: { closedAt: "asc" }
  })

  // Create CSV String
  const headers = [
    "Date",
    "Time",
    "Transaction ID",
    "Outlet",
    "Billed By",
    "Customer",
    "Status",
    "Payment Mode",
    "Total Amount (INR)",
    "Items Breakdown"
  ]

  let csvContent = headers.join(",") + "\n"

  tabs.forEach(tab => {
    const ts = new Date(tab.closedAt || tab.openedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const [datePart, timePart] = ts.split(', ');

    const itemsStr = tab.Items.map(item => `${item.quantity}x ${item.MenuItem.name}`).join(" | ")

    const row = [
      datePart,
      timePart,
      tab.id,
      tab.Outlet.name,
      tab.User.name,
      tab.customerName || "Walk-in",
      tab.status,
      tab.paymentMode || "",
      tab.totalAmount.toFixed(2),
      `"${itemsStr}"` // wrap items in quotes to escape potential commas safely
    ]

    csvContent += row.map(cell => {
      // Basic CSV escaping for fields that might contain commas but aren't explicitly quoted
      const cellStr = String(cell);
      if (cellStr.includes(',') && !cellStr.startsWith('"')) {
        return `"${cellStr}"`;
      }
      return cellStr;
    }).join(",") + "\n"
  })

  // Daily Summary for Ranges
  if (fromDateStr && toDateStr) {
    const dailyMap: Record<string, number> = {};
    tabs.forEach(tab => {
        const dateStr = new Date(tab.closedAt || tab.openedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + tab.totalAmount;
    });

    csvContent += "\nSUMMARY BY DATE,,\n";
    csvContent += "Date,,Total Collected\n";
    Object.entries(dailyMap).forEach(([date, total]) => {
        csvContent += `${date},,${total.toFixed(2)}\n`;
    });
  }

  // Calculate Subtotals
  const totalCash = tabs.filter(t => t.paymentMode === "CASH").reduce((sum, t) => sum + t.totalAmount, 0);
  const totalOnline = tabs.filter(t => t.paymentMode === "ONLINE" || t.paymentMode === "UPI").reduce((sum, t) => sum + t.totalAmount, 0);
  const totalSplit = tabs.filter(t => t.paymentMode === "SPLIT").reduce((sum, t) => sum + t.totalAmount, 0);
  const totalComplementary = tabs.filter(t => t.paymentMode === "COMPLEMENTARY").reduce((sum, t) => sum + t.totalAmount, 0);
  const grandTotal = tabs.filter(t => t.paymentMode !== "COMPLEMENTARY").reduce((sum, t) => sum + t.totalAmount, 0);

  // Append Summary Rows
  csvContent += "\nOVERALL RANGE TOTALS,,\n";
  csvContent += `,,,,,,,TOTAL CASH,${totalCash.toFixed(2)},\n`;
  csvContent += `,,,,,,,TOTAL ONLINE (UPI/CARD),${totalOnline.toFixed(2)},\n`;
  if (totalSplit > 0) {
    csvContent += `,,,,,,,TOTAL SPLIT,${totalSplit.toFixed(2)},\n`;
  }
  if (totalComplementary > 0) {
    csvContent += `,,,,,,,TOTAL COMPLEMENTARY,${totalComplementary.toFixed(2)},\n`;
  }
  csvContent += `,,,,,,,GRAND TOTAL,${grandTotal.toFixed(2)},\n`;

  // Format filename
  const prefix = outletType ? outletType.toLowerCase() : "all_outlets";
  let filenameSuffix = targetDateStr || new Date().toISOString().split('T')[0];
  
  if (fromDateStr && toDateStr) {
    filenameSuffix = `range_${fromDateStr}_to_${toDateStr}`;
  }
  
  const filename = `${prefix}_transactions_${filenameSuffix}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  })
}
