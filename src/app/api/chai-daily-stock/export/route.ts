import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as XLSX from "xlsx"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get("date") // YYYY-MM-DD

    const chaiJoint = await prisma.outlet.findFirst({
      where: { type: "CHAI_JOINT" },
    })
    if (!chaiJoint) {
      return NextResponse.json({ error: "Chai Joint outlet not configured." }, { status: 404 })
    }

    // Determine the date to export
    let targetDate: Date
    if (dateParam) {
      targetDate = new Date(`${dateParam}T00:00:00.000Z`)
    } else {
      const istOffset = 5.5 * 3600000
      const logicalDate = new Date(new Date().getTime() + istOffset)
      if (logicalDate.getUTCHours() < 4) {
        logicalDate.setUTCDate(logicalDate.getUTCDate() - 1)
      }
      targetDate = new Date(
        Date.UTC(logicalDate.getUTCFullYear(), logicalDate.getUTCMonth(), logicalDate.getUTCDate())
      )
    }

    const dateStr = targetDate.toISOString().split("T")[0]

    // Fetch the daily stock records for this date
    const records = await prisma.chaiHubDailyStock.findMany({
      where: {
        outletId: chaiJoint.id,
        date: targetDate,
      },
      include: {
        User: { select: { name: true } },
      },
      orderBy: [{ category: "asc" }, { menuItemName: "asc" }],
    })

    if (records.length === 0) {
      return NextResponse.json(
        { error: `No closing stock data found for ${dateStr}. Please submit the daily closing stock first.` },
        { status: 404 }
      )
    }

    // Build Excel rows
    const rows = records.map((r, idx) => ({
      "#": idx + 1,
      "Product Name": r.menuItemName,
      Category: r.category,
      "Starting Stock": r.startStock,
      "Ending Stock": r.endStock,
      "Today's Sales (Qty)": r.salesQty,
      "Amount (₹)": parseFloat(r.salesAmount.toFixed(2)),
    }))

    // Totals row
    const totalSalesQty = records.reduce((sum, r) => sum + r.salesQty, 0)
    const totalSalesAmount = records.reduce((sum, r) => sum + r.salesAmount, 0)

    rows.push({
      "#": "" as any,
      "Product Name": "TOTAL",
      Category: "",
      "Starting Stock": records.reduce((sum, r) => sum + r.startStock, 0),
      "Ending Stock": records.reduce((sum, r) => sum + r.endStock, 0),
      "Today's Sales (Qty)": totalSalesQty,
      "Amount (₹)": parseFloat(totalSalesAmount.toFixed(2)),
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Column widths
    ws["!cols"] = [
      { wch: 4 },  // #
      { wch: 28 }, // Product Name
      { wch: 20 }, // Category
      { wch: 16 }, // Starting Stock
      { wch: 14 }, // Ending Stock
      { wch: 22 }, // Today's Sales
      { wch: 14 }, // Amount
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Daily Sales")

    // Summary sheet
    const submittedBy = records[0]?.User?.name ?? "Staff"
    const summaryData = [
      { Field: "Outlet", Value: chaiJoint.name },
      { Field: "Date", Value: dateStr },
      { Field: "Total Products", Value: records.length },
      { Field: "Total Items Sold", Value: totalSalesQty },
      { Field: "Total Revenue (₹)", Value: parseFloat(totalSalesAmount.toFixed(2)) },
      { Field: "Submitted By", Value: submittedBy },
      { Field: "Generated At", Value: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) },
    ]
    const summaryWs = XLSX.utils.json_to_sheet(summaryData)
    summaryWs["!cols"] = [{ wch: 22 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="chai-daily-sales-${dateStr}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("GET /api/chai-daily-stock/export error:", error)
    return NextResponse.json({ error: "Failed to generate Excel report." }, { status: 500 })
  }
}
