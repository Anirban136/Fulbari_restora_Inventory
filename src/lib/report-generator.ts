import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatCurrency(amount: number) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `Rs ${safeAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function normalizePaymentAmounts(tab: any) {
  const totalAmount = Number(tab?.totalAmount ?? 0);
  const paymentMode = String(tab?.paymentMode ?? "").toUpperCase();
  const splitCash = Number(tab?.splitCashAmount ?? 0);
  const splitOnline = Number(tab?.splitOnlineAmount ?? 0);

  if (paymentMode === "CASH") {
    return { cashAmount: totalAmount, upiAmount: 0 };
  }
  if (paymentMode === "ONLINE" || paymentMode === "UPI") {
    return { cashAmount: 0, upiAmount: totalAmount };
  }
  if (paymentMode === "SPLIT") {
    if (splitCash > 0 || splitOnline > 0) {
      return { cashAmount: splitCash, upiAmount: splitOnline };
    }
    // Fallback for old rows where split parts were not saved.
    return { cashAmount: totalAmount / 2, upiAmount: totalAmount / 2 };
  }
  // Ignore unknown modes in financial allocation.
  return { cashAmount: 0, upiAmount: 0 };
}

export async function generateTransactionPDF(data: any, fromDate: string, toDate: string) {
  const transactions = Array.isArray(data?.transactions) ? data.transactions : [];
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // --- 1. DARK ELITE BACKGROUND ---
  doc.setFillColor(9, 9, 11); // Zinc-950
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // --- 2. HEADER: WEB-STYLE ACCENT ---
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(0, 0, pageWidth, 5, 'F'); // Top accent bar

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("FULBARI", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text("EXECUTIVE PERFORMANCE SUMMARY", pageWidth / 2, 32, { align: "center", charSpace: 2 });
  doc.setTextColor(113, 113, 122); // Zinc-400
  doc.text(`AUDIT PERIOD: ${fromDate} TO ${toDate}`, pageWidth / 2, 38, { align: "center" });

  // --- 3. NUMERIC SUMMARY GRID (Replaces Pie Charts) ---
  const totalCash = transactions.reduce((sum: number, t: any) => sum + normalizePaymentAmounts(t).cashAmount, 0);
  const totalUPI = transactions.reduce((sum: number, t: any) => sum + normalizePaymentAmounts(t).upiAmount, 0);
  const grandTotal = totalCash + totalUPI;
  const cafeTotal = transactions
    .filter((t: any) => String(t?.Outlet?.name ?? "").toUpperCase().includes("CAFE"))
    .reduce((s: number, t: any) => {
      const { cashAmount, upiAmount } = normalizePaymentAmounts(t);
      return s + cashAmount + upiAmount;
    }, 0);
  const chaiTotal = transactions
    .filter((t: any) => String(t?.Outlet?.name ?? "").toUpperCase().includes("CHAI"))
    .reduce((s: number, t: any) => {
      const { cashAmount, upiAmount } = normalizePaymentAmounts(t);
      return s + cashAmount + upiAmount;
    }, 0);

  // Centered Dashboard Box
  doc.setFillColor(24, 24, 27); // Zinc-900
  doc.roundedRect(10, 45, pageWidth - 20, 60, 4, 4, 'F');

  const drawMetric = (x: number, y: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122); // Zinc-400
    doc.text(label, x, y, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont("helvetica", "bold");
    doc.text(value, x, y + 10, { align: 'center' });
  };

  const colWidth = (pageWidth - 20) / 4;
  const startX = 10 + colWidth / 2;
  const metricsY = 65;

  drawMetric(startX, metricsY, "CAFE HUB", formatCurrency(cafeTotal), [251, 191, 36]); // Amber
  drawMetric(startX + colWidth, metricsY, "TEA JOINT", formatCurrency(chaiTotal), [45, 212, 191]); // Teal
  drawMetric(startX + colWidth * 2, metricsY, "CASH TALLY", formatCurrency(totalCash), [16, 185, 129]); // Emerald
  drawMetric(startX + colWidth * 3, metricsY, "UPI/ONLINE", formatCurrency(totalUPI), [59, 130, 246]); // Blue

  // Large Total Centerpiece
  doc.setFillColor(16, 185, 129, 0.1);
  doc.roundedRect(pageWidth/2 - 50, 85, 100, 15, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`NET GENERATED REVENUE: ${formatCurrency(grandTotal)}`, pageWidth / 2, 94, { align: 'center' });

  // --- 4. HIGH-VISIBILITY AUDIT TABLE ---
  const dailyData: Record<string, any> = {};
  transactions.forEach((tab: any) => {
    const timestamp = new Date(tab.closedAt || tab.openedAt).getTime();
    const istOffset = 5.5 * 3600000;
    const logicalDate = new Date(timestamp + istOffset);
    if (logicalDate.getUTCHours() < 4) logicalDate.setUTCDate(logicalDate.getUTCDate() - 1);
    
    const bizDayStr = logicalDate.toLocaleString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' 
    });

    if (!dailyData[bizDayStr]) {
      dailyData[bizDayStr] = {
        cafeCash: 0, cafeUPI: 0, chaiCash: 0, chaiUPI: 0,
        totalCash: 0, totalUPI: 0, total: 0
      };
    }

    const { paymentMode } = tab;
    const isCafe = String(tab?.Outlet?.name ?? "").toUpperCase().includes("CAFE");
    const { cashAmount, upiAmount } = normalizePaymentAmounts(tab);

    if (isCafe) {
      dailyData[bizDayStr].cafeCash += cashAmount;
      dailyData[bizDayStr].cafeUPI += upiAmount;
    } else {
      dailyData[bizDayStr].chaiCash += cashAmount;
      dailyData[bizDayStr].chaiUPI += upiAmount;
    }

    if (paymentMode === "CASH" || paymentMode === "ONLINE" || paymentMode === "UPI" || paymentMode === "SPLIT") {
      dailyData[bizDayStr].totalCash += cashAmount;
      dailyData[bizDayStr].totalUPI += upiAmount;
    }
    
    dailyData[bizDayStr].total += cashAmount + upiAmount;
  });

  const tableRows = Object.entries(dailyData).map(([date, stats]: [string, any]) => [
    date,
    formatCurrency(stats.cafeCash),
    formatCurrency(stats.cafeUPI),
    formatCurrency(stats.chaiCash),
    formatCurrency(stats.chaiUPI),
    formatCurrency(stats.totalCash),
    formatCurrency(stats.totalUPI),
    formatCurrency(stats.total)
  ]);

  autoTable(doc, {
    startY: 115,
    head: [["DATE", "CAFE C", "CAFE U", "CHAI C", "CHAI U", "TOT CASH", "TOT UPI", "NET DAY"]],
    body: tableRows,
    theme: 'plain',
    headStyles: { 
      fillColor: [16, 185, 129], 
      textColor: [0, 0, 0],
      fontSize: 8.5, fontStyle: 'bold', halign: 'center', cellPadding: 4
    },
    styles: { 
      fontSize: 8.5, cellPadding: 5, textColor: [255, 255, 255], 
      lineColor: [39, 39, 42], lineWidth: 0.1, font: "helvetica",
      valign: 'middle'
    },
    alternateRowStyles: { 
      fillColor: [18, 18, 20] 
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 }, // Date
      1: { cellWidth: 18 }, // Cafe C
      2: { cellWidth: 18 }, // Cafe U
      3: { cellWidth: 18 }, // Chai C
      4: { cellWidth: 18 }, // Chai U
      5: { textColor: [16, 185, 129], fontStyle: 'bold', fontSize: 10, cellWidth: 25 }, // Tot Cash
      6: { textColor: [59, 130, 246], fontStyle: 'bold', fontSize: 10, cellWidth: 25 }, // Tot Online
      7: { halign: 'right', fontStyle: 'bold', fontSize: 11, textColor: [255, 255, 255], cellWidth: 32 } // Net Day
    }
  });

  // --- 5. ELITE FOOTER ---
  const finalY = ((doc as any).lastAutoTable?.finalY ?? 165) + 25;
  doc.setDrawColor(63, 63, 70); // Zinc-700
  doc.line(20, finalY, 80, finalY);
  doc.line(pageWidth - 80, finalY, pageWidth - 20, finalY);
  
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122); // Zinc-400
  doc.text("MANAGER AUDIT", 50, finalY + 8, { align: "center" });
  doc.text("EXECUTIVE SIGN-OFF", pageWidth - 50, finalY + 8, { align: "center" });

  doc.setFontSize(7);
  doc.text("RESOURCES GENERATED FROM FULBARI ECOSYSTEM HUB", pageWidth/2, pageHeight - 12, { align: 'center' });

  doc.save(`FR_Audit_${fromDate}.pdf`);
}

export async function generateInventoryReportPDF(data: any, fromDate: string, toDate: string) {
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // --- 1. DARK ELITE BACKGROUND ---
  doc.setFillColor(9, 9, 11); // Zinc-950
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // --- 2. HEADER: WEB-STYLE ACCENT ---
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(0, 0, pageWidth, 5, 'F'); // Top accent bar

  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("FULBARI RESTORA", pageWidth / 2, 22, { align: "center" });
  
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text("CENTRAL INVENTORY LEDGER AUDIT", pageWidth / 2, 29, { align: "center", charSpace: 2 });
  
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122); // Zinc-400
  doc.text(`AUDIT PERIOD: ${fromDate} TO ${toDate}`, pageWidth / 2, 35, { align: "center" });

  // --- 3. SUMMARY BOX ---
  const totalStockInQty = logs.filter((l: any) => l.type === "STOCK_IN").reduce((sum: number, l: any) => sum + l.quantity, 0);
  const totalStockInValue = logs.filter((l: any) => l.type === "STOCK_IN").reduce((sum: number, l: any) => sum + l.value, 0);
  const totalDispatchQty = logs.filter((l: any) => l.type === "DISPATCH").reduce((sum: number, l: any) => sum + l.quantity, 0);
  const totalWasteQty = logs.filter((l: any) => l.type === "WASTE").reduce((sum: number, l: any) => sum + l.quantity, 0);

  doc.setFillColor(24, 24, 27); // Zinc-900
  doc.roundedRect(10, 42, pageWidth - 20, 42, 4, 4, 'F');

  const drawMetric = (x: number, y: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122); // Zinc-400
    doc.text(label, x, y, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont("helvetica", "bold");
    doc.text(value, x, y + 8, { align: 'center' });
  };

  const colWidth = (pageWidth - 20) / 4;
  const startX = 10 + colWidth / 2;
  const metricsY = 54;

  drawMetric(startX, metricsY, "ITEMS STOCKED IN", String(totalStockInQty), [16, 185, 129]); // Emerald
  drawMetric(startX + colWidth, metricsY, "STOCK VALUE", formatCurrency(totalStockInValue), [59, 130, 246]); // Blue
  drawMetric(startX + colWidth * 2, metricsY, "ITEMS DISPATCHED", String(totalDispatchQty), [251, 191, 36]); // Amber
  drawMetric(startX + colWidth * 3, metricsY, "STOCK WASTE", String(totalWasteQty), [239, 68, 68]); // Red

  // --- 4. DETAILED TRANSACTION AUDIT TABLE ---
  const tableRows = logs.map((log: any) => [
    new Date(log.createdAt).toLocaleString("en-IN", { 
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" 
    }),
    log.itemName,
    log.type,
    `${log.quantity} ${log.unit}`,
    log.rate > 0 ? formatCurrency(log.rate) : "—",
    log.value > 0 ? formatCurrency(log.value) : "—",
    log.type === "DISPATCH" ? (log.outletName || "Outlet") : (log.vendorName || "N/A"),
    log.notes
  ]);

  autoTable(doc, {
    startY: 92,
    head: [["DATE / TIME", "PRODUCT NAME", "TYPE", "QTY", "RATE", "VALUE", "DEST / SOURCE", "NOTES"]],
    body: tableRows,
    theme: 'plain',
    headStyles: { 
      fillColor: [16, 185, 129], 
      textColor: [0, 0, 0],
      fontSize: 7.5, fontStyle: 'bold', halign: 'center', cellPadding: 3
    },
    styles: { 
      fontSize: 7.5, cellPadding: 3.5, textColor: [255, 255, 255], 
      lineColor: [39, 39, 42], lineWidth: 0.1, font: "helvetica",
      valign: 'middle'
    },
    alternateRowStyles: { 
      fillColor: [18, 18, 20] 
    },
    columnStyles: {
      0: { cellWidth: 26 }, // Date
      1: { fontStyle: 'bold', cellWidth: 32 }, // Product Name
      2: { cellWidth: 18 }, // Type
      3: { cellWidth: 16 }, // Qty
      4: { cellWidth: 16 }, // Rate
      5: { cellWidth: 18 }, // Value
      6: { cellWidth: 24 }, // Outlet / Vendor
      7: { cellWidth: 40 }  // Notes
    },
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFillColor(9, 9, 11);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, pageWidth, 5, 'F');
      }
    }
  });

  // --- 5. SIGN-OFF FOOTER ---
  const finalY = ((doc as any).lastAutoTable?.finalY ?? 150) + 25;
  const needNewPage = finalY > pageHeight - 35;
  
  if (needNewPage) {
    doc.addPage();
    doc.setFillColor(9, 9, 11);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 5, 'F');
  }

  const sigY = needNewPage ? 40 : finalY;
  doc.setDrawColor(63, 63, 70); // Zinc-700
  doc.line(20, sigY, 80, sigY);
  doc.line(pageWidth - 80, sigY, pageWidth - 20, sigY);
  
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122); // Zinc-400
  doc.text("MANAGER AUDIT", 50, sigY + 8, { align: "center" });
  doc.text("OWNER SIGN-OFF", pageWidth - 50, sigY + 8, { align: "center" });

  doc.setFontSize(7);
  doc.text("RESOURCES GENERATED FROM FULBARI ECOSYSTEM HUB", pageWidth/2, pageHeight - 12, { align: 'center' });

  doc.save(`inventory-ledger-report-${fromDate}-to-${toDate}.pdf`);
}

