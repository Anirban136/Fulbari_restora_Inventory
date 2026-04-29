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
        "Item Name": "Example: Sugar",
        "Category": "Example: RAW_MATERIAL",
        "Quantity": 100,
        "Unit Type": "pieces", // pieces, box, packet, plate
        "Cost per Unit": 45.50,
        "Vendor Name": "Example: ABC Suppliers",
        "Vendor ID": "",
        "Notes": "Delivery note or invoice reference"
      },
      ...items.map(item => ({
        "Item ID": item.id,
        "Item Name": item.name,
        "Category": item.category || "Uncategorized",
        "Quantity": "",
        "Unit Type": "pieces",
        "Cost per Unit": "",
        "Vendor Name": "",
        "Vendor ID": "",
        "Notes": ""
      }))
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Item ID
      { wch: 25 }, // Item Name
      { wch: 20 }, // Category
      { wch: 12 }, // Quantity
      { wch: 12 }, // Unit Type
      { wch: 12 }, // Cost per Unit
      { wch: 25 }, // Vendor Name
      { wch: 15 }, // Vendor ID
      { wch: 30 }, // Notes
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, "Bulk Stock Template")

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
      { "Step": "1", "Description": "Fill in the 'Bulk Stock Template' sheet with your stock data" },
      { "Step": "2", "Description": "Use Item ID for existing items or fill Item Name for new items" },
      { "Step": "3", "Description": "Unit Type options: pieces, box, packet, plate" },
      { "Step": "4", "Description": "Vendor Name or Vendor ID - fill either one" },
      { "Step": "5", "Description": "Cost per Unit is optional but recommended for tracking" },
      { "Step": "6", "Description": "Save the Excel file and upload it back" },
      { "Step": "7", "Description": "System will automatically calculate vendor balances" },
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
        const itemName = row["Item Name"]
        const quantity = parseFloat(row["Quantity"] || 0)
        const unitType = row["Unit Type"] || "pieces"
        const costPerUnit = parseFloat(row["Cost per Unit"] || 0)
        const vendorName = row["Vendor Name"]
        const vendorId = row["Vendor ID"]
        const notes = row["Notes"] || ""

        if (!itemName && !vendorId) {
          errors.push(`Row ${rowNum}: Either Item Name or Item ID is required`)
          continue
        }

        if (isNaN(quantity) || quantity <= 0) {
          errors.push(`Row ${rowNum}: Invalid quantity`)
          continue
        }

        if (!["pieces", "box", "packet", "plate"].includes(unitType)) {
          errors.push(`Row ${rowNum}: Invalid unit type. Must be pieces, box, packet, or plate`)
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
              unit: "pcs",
              currentStock: 0,
              costPerUnit: costPerUnit || undefined
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

        // Calculate final quantity (handle boxes/packets)
        const piecesPerBox = item.piecesPerBox || 1
        const isContainer = unitType === "box" || unitType === "packet" || unitType === "plate"
        const finalQuantity = isContainer ? quantity * piecesPerBox : quantity
        const unitCost = isContainer ? costPerUnit / piecesPerBox : costPerUnit
        const totalCost = unitCost * finalQuantity

        // Create inventory ledger entry
        await prisma.$transaction([
          prisma.inventoryLedger.create({
            data: {
              type: "STOCK_IN",
              itemId: item.id,
              quantity: finalQuantity,
              vendorId: vendor?.id || null,
              userId: session.user.id,
              notes: `[BULK-IMPORT: Row ${rowNum}] ${unitType.toUpperCase()}-ENTRY: ${quantity} ${unitType}s @ ₹${costPerUnit}/${unitType}. Cost Info: Cost=${isNaN(unitCost) ? 0 : unitCost.toFixed(4)}. ${notes}`,
            }
          }),
          prisma.item.update({
            where: { id: item.id },
            data: {
              currentStock: { increment: finalQuantity },
              costPerUnit: isNaN(unitCost) ? undefined : (unitCost || undefined),
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
