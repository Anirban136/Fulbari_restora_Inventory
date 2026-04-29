import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as XLSX from "xlsx"

export const dynamic = "force-dynamic"

// GET: Export Excel template with existing items
export async function GET() {
  try {
    console.log("Bulk stock export API called")
    
    const session = await getServerSession(authOptions)
    console.log("Session check:", session?.user?.role)
    
    if (!session) {
      console.log("No session found")
      return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 })
    }
    
    if (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER") {
      console.log("Insufficient permissions:", session.user.role)
      return NextResponse.json({ error: "Insufficient permissions. Owner or Inventory Manager role required." }, { status: 403 })
    }

    // Get all items and vendors
    console.log("Fetching items and vendors...")
    const items = await prisma.item.findMany({
      orderBy: { category: 'asc' }
    }).catch(error => {
      console.error("Error fetching items:", error)
      throw new Error("Failed to fetch items from database")
    })
    
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' }
    }).catch(error => {
      console.error("Error fetching vendors:", error)
      throw new Error("Failed to fetch vendors from database")
    })
    
    console.log(`Found ${items.length} items and ${vendors.length} vendors`)

    // Create Excel workbook
    const wb = XLSX.utils.book_new()

    // Create template worksheet
    const templateData = [
      {
        "Item ID": "",
        "Product Detail": "Example: Sugar",
        "Category": "Example: RAW_MATERIAL",
        "Inventory Status": "Visible here",
        "Base Unit": "pieces", // pieces, box, packet, plate
        "Multiplier (PCS/Box)": 1,
        "Buy Rate": 45.50,
        "Sell Rate": 60.00,
        "Add Stock": 100,
        "New Total Stock": "",
        "Vendor Name": "Example: ABC Suppliers",
        "Vendor ID": "",
        "Notes": "Delivery note or invoice reference"
      },
      ...items.map(item => ({
        "Item ID": item.id,
        "Product Detail": item.name,
        "Category": item.category || "Uncategorized",
        "Inventory Status": item.currentStock || 0,
        "Base Unit": item.unit || "pcs",
        "Multiplier (PCS/Box)": item.piecesPerBox || 1,
        "Buy Rate": item.costPerUnit || "",
        "Sell Rate": item.sellPrice || "",
        "Add Stock": "",
        "New Total Stock": item.currentStock || 0,
        "Vendor Name": "",
        "Vendor ID": "",
        "Notes": ""
      }))
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Item ID
      { wch: 25 }, // Product Detail
      { wch: 20 }, // Category
      { wch: 15 }, // Inventory Status
      { wch: 12 }, // Base Unit
      { wch: 18 }, // Multiplier (PCS/Box)
      { wch: 15 }, // Buy Rate
      { wch: 15 }, // Sell Rate
      { wch: 15 }, // Add Stock
      { wch: 15 }, // New Total Stock
      { wch: 25 }, // Vendor Name
      { wch: 15 }, // Vendor ID
      { wch: 30 }, // Notes
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, "Global Catalog Stock")

    // Create vendors reference sheet
    const vendorData = vendors.map(vendor => ({
      "Vendor ID": vendor.id,
      "Vendor Name": vendor.name,
      "Contact": vendor.contact || ""
    }))
    
    const vendorWs = XLSX.utils.json_to_sheet(vendorData)
    vendorWs['!cols'] = [
      { wch: 15 }, // Vendor ID
      { wch: 25 }, // Vendor Name
      { wch: 20 }, // Contact
    ]
    XLSX.utils.book_append_sheet(wb, vendorWs, "Vendors Reference")

    // Create instructions sheet
    const instructionsData = [
      { "Step": "1", "Description": "To ADD stock: Enter the amount in the 'Add Stock' column" },
      { "Step": "2", "Description": "To UPDATE total stock: Change the number in the 'New Total Stock' column" },
      { "Step": "3", "Description": "Use Item ID for existing items or fill Product Detail for new items" },
      { "Step": "4", "Description": "Base Unit options: pieces, box, packet, plate, kg, liter" },
      { "Step": "5", "Description": "Vendor Name or Vendor ID - fill either one" },
      { "Step": "6", "Description": "Save the Excel file and upload it back" },
    ]
    
    const instructionsWs = XLSX.utils.json_to_sheet(instructionsData)
    instructionsWs['!cols'] = [
      { wch: 8 },  // Step
      { wch: 80 }, // Description
    ]
    XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions")

    // Generate Excel file
    console.log("Generating Excel file...")
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    if (!excelBuffer || excelBuffer.length === 0) {
      throw new Error("Failed to generate Excel file")
    }

    console.log(`Excel file generated successfully (${excelBuffer.length} bytes)`)

    // Return file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bulk-stock-template-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error("Export error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to export template"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// POST: Import Excel file and process bulk stock
export async function POST(req: NextRequest) {
  try {
    console.log("Bulk stock import API called")
    
    const session = await getServerSession(authOptions)
    console.log("Session check:", session?.user?.role)
    
    if (!session) {
      console.log("No session found")
      return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 })
    }
    
    if (session.user.role !== "OWNER" && session.user.role !== "INV_MANAGER") {
      console.log("Insufficient permissions:", session.user.role)
      return NextResponse.json({ error: "Insufficient permissions. Owner or Inventory Manager role required." }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`File received: ${file.name}, size: ${file.size} bytes`)

    // Check file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      console.log("Invalid file type:", file.name)
      return NextResponse.json({ error: "Please upload an Excel file (.xlsx or .xls)" }, { status: 400 })
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.log("File too large:", file.size)
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    // Read Excel file
    console.log("Reading Excel file...")
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: "buffer" })
    
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      console.log("No worksheets found in Excel file")
      return NextResponse.json({ error: "Excel file has no worksheets" }, { status: 400 })
    }
    
    // Get the first worksheet (template)
    console.log(`Processing worksheet: ${wb.SheetNames[0]}`)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws)

    if (!data || data.length === 0) {
      console.log("Excel file is empty or invalid")
      return NextResponse.json({ error: "Excel file is empty or invalid" }, { status: 400 })
    }

    console.log(`Found ${data.length} rows in Excel file`)

    // Process each row
    const results = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any
      const rowNum = i + 2 // Excel row numbers start from 2 (after header)

      try {
        // Skip empty rows
        if (!row["Item Name"] && !row["Item ID"]) {
          continue
        }

        // Validate required fields
        const itemName = row["Product Detail"] || row["Item Name"]
        const addStock = parseFloat(row["Add Stock"] || row["Quantity (To Add)"] || row["Quantity"] || 0)
        const newTotalStock = row["New Total Stock"] !== undefined && row["New Total Stock"] !== "" ? parseFloat(row["New Total Stock"]) : undefined
        const unitType = (row["Base Unit"] || row["Unit Type"] || "pieces").toString().toLowerCase()
        const costPerUnit = parseFloat(row["Buy Rate"] || row["Cost per Unit"] || 0)
        const sellPrice = row["Sell Rate"] !== undefined && row["Sell Rate"] !== "" ? parseFloat(row["Sell Rate"]) : undefined
        const piecesPerBox = row["Multiplier (PCS/Box)"] !== undefined && row["Multiplier (PCS/Box)"] !== "" ? parseInt(row["Multiplier (PCS/Box)"]) : undefined
        const vendorName = row["Vendor Name"]
        const vendorId = row["Vendor ID"]
        const notes = row["Notes"] || ""

        if (!itemName && !vendorId) {
          errors.push(`Row ${rowNum}: Either Item Name or Item ID is required`)
          continue
        }

        const validUnits = ["pieces", "pcs", "box", "packet", "plate", "kg", "liter", "l", "g", "ml", "gm"]
        if (!validUnits.includes(unitType)) {
          errors.push(`Row ${rowNum}: Invalid unit type. Must be one of: ${validUnits.join(", ")}`)
          continue
        }

        // Find or create item
        let item
        if (row["Item ID"]) {
          item = await prisma.item.findUnique({ where: { id: row["Item ID"] } })
        }
        
        if (!item && itemName) {
          // Create new item
          const category = row["Category"] || "Uncategorized"
          item = await prisma.item.create({
            data: {
              name: itemName,
              category,
              unit: unitType,
              currentStock: 0,
              costPerUnit: costPerUnit || undefined,
              sellPrice: sellPrice || undefined,
              piecesPerBox: piecesPerBox || undefined,
            }
          })
        }

        if (!item) {
          errors.push(`Row ${rowNum}: Item not found and could not be created`)
          continue
        }

        // Find vendor
        let vendor = null
        if (vendorId) {
          vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
        } else if (vendorName) {
          vendor = await prisma.vendor.findFirst({ where: { name: vendorName } })
        }

        if (!vendor && vendorName) {
          // Create new vendor
          vendor = await prisma.vendor.create({
            data: {
              name: vendorName
            }
          })
        }

        // Calculate stock difference
        const currentStock = item.currentStock || 0
        const piecesPerBox = item.piecesPerBox || 1
        const isContainer = unitType === "box" || unitType === "packet" || unitType === "plate"
        
        let stockDifference = 0
        let isAdjustment = false

        if (newTotalStock !== undefined && !isNaN(newTotalStock)) {
          // If 'New Total Stock' is provided, we treat it as the final absolute stock level
          stockDifference = newTotalStock - currentStock
          isAdjustment = true
        } else if (!isNaN(addStock) && addStock !== 0) {
          // 'Add Stock' respects the container multiplier (e.g. 1 box = 20 pieces)
          stockDifference = isContainer ? addStock * piecesPerBox : addStock
        }

        if (stockDifference === 0) {
          continue // Nothing to do for this row
        }

        const unitCost = isContainer && !isNaN(costPerUnit) ? costPerUnit / piecesPerBox : costPerUnit
        const totalCost = (unitCost || 0) * Math.abs(stockDifference)
        const finalQuantity = currentStock + stockDifference

        // Create inventory ledger entry
        await prisma.$transaction([
          prisma.inventoryLedger.create({
            data: {
              type: stockDifference >= 0 ? "STOCK_IN" : "ADJUSTMENT",
              itemId: item.id,
              quantity: Math.abs(stockDifference),
              vendorId: vendor?.id || null,
              userId: session.user.id,
              notes: `[BULK-IMPORT: Row ${rowNum}] ${isAdjustment ? "TOTAL_UPDATE" : "ENTRY"}: Diff=${stockDifference > 0 ? "+" : ""}${stockDifference} ${unitType}. Old=${currentStock}, New=${finalQuantity}. Cost Info: UnitCost=${isNaN(unitCost) ? 0 : unitCost.toFixed(4)}. ${notes}`,
            }
          }),
          prisma.item.update({
            where: { id: item.id },
            data: {
              currentStock: finalQuantity,
              costPerUnit: isNaN(unitCost) ? undefined : (unitCost || undefined),
              sellPrice: isNaN(sellPrice) ? undefined : (sellPrice || undefined),
              piecesPerBox: isNaN(piecesPerBox) ? undefined : (piecesPerBox || undefined),
            }
          })
        ])

        // Note: Vendor balance tracking can be implemented separately through VendorPayment model
        // For now, we just log the cost information in the notes

        results.push({
          rowNum,
          itemName: item.name,
          quantity: finalQuantity,
          unitType,
          vendor: vendor?.name || "No Vendor",
          totalCost: totalCost.toFixed(2),
          status: "success"
        })

      } catch (error) {
        console.error(`Row ${rowNum} error:`, error)
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : "Processing error"}`)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: data.length,
        successful: results.length,
        failed: errors.length
      },
      results,
      errors
    })

  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 })
  }
}
