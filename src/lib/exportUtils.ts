/**
 * Export data to CSV file
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    return;
  }

  const headers = Object.keys(data[0]);
  
  const csvContent = [
    headers.join(","),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          const stringValue = String(value ?? "");
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Enhanced Excel export with professional formatting using exceljs library
 * (More secure alternative to xlsx - no prototype pollution vulnerabilities)
 */
export async function exportToExcel(data: any[], filename: string): Promise<void> {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  try {
    // Dynamic import for exceljs library
    const ExcelJS = await import('exceljs');
    
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');
    
    // Get headers from data
    const headers = Object.keys(data[0]);
    
    // Set up columns with auto-width calculation
    worksheet.columns = headers.map(header => {
      let maxWidth = header.length;
      data.forEach(row => {
        const cellValue = String(row[header] ?? "");
        maxWidth = Math.max(maxWidth, cellValue.length);
      });
      return { 
        header, 
        key: header, 
        width: Math.min(maxWidth + 2, 50)
      };
    });
    
    // Add data rows
    data.forEach(row => {
      worksheet.addRow(row);
    });
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    
    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Excel export failed:", error);
    // Fallback to simple TSV export
    const headers = Object.keys(data[0]);
    const BOM = "\uFEFF";
    const csvContent =
      BOM +
      [
        headers.join("\t"),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (value === null || value === undefined) return "";
              return String(value).replace(/\t/g, " ");
            })
            .join("\t")
        ),
      ].join("\n");

    const blob = new Blob([csvContent], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

/**
 * Enhanced medicine inventory export with professional formatting
 * Uses exceljs - a secure Excel library without prototype pollution vulnerabilities
 */
export async function exportMedicineInventoryToExcel(
  data: any[], 
  filename: string,
  lowStockThreshold: number = 10
): Promise<void> {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  try {
    const ExcelJS = await import('exceljs');
    const { format } = await import('date-fns');
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pharmacy Management System';
    workbook.created = new Date();
    
    // Create main worksheet
    const worksheet = workbook.addWorksheet('Medicine Inventory');
    
    // Define columns
    const columns = [
      { header: 'Medicine Name', key: 'medicineName', width: 30 },
      { header: 'Batch No', key: 'batchNo', width: 15 },
      { header: 'Company', key: 'company', width: 20 },
      { header: 'Rack No', key: 'rackNo', width: 10 },
      { header: 'Selling Type', key: 'sellingType', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Purchase Price (PKR)', key: 'purchasePrice', width: 20 },
      { header: 'Selling Price (PKR)', key: 'sellingPrice', width: 20 },
      { header: 'Expiry Date', key: 'expiryDate', width: 15 },
      { header: 'Supplier', key: 'supplier', width: 20 },
      { header: 'Last Updated', key: 'lastUpdated', width: 20 },
      { header: 'Stock Status', key: 'stockStatus', width: 12 },
    ];
    
    worksheet.columns = columns;
    
    // Add data rows
    data.forEach(m => {
      const isLowStock = m.quantity <= lowStockThreshold;
      const row = worksheet.addRow({
        medicineName: m.medicine_name || "",
        batchNo: m.batch_no || "",
        company: m.company_name || "",
        rackNo: m.rack_no || "",
        sellingType: m.selling_type ? getSellingTypeLabelForExport(m.selling_type) : "",
        quantity: m.quantity || 0,
        purchasePrice: formatPKR(Number(m.purchase_price || 0)),
        sellingPrice: formatPKR(Number(m.selling_price || 0)),
        expiryDate: m.expiry_date ? format(new Date(m.expiry_date), "yyyy-MM-dd") : "N/A",
        supplier: m.supplier || "",
        lastUpdated: m.updated_at ? format(new Date(m.updated_at), "yyyy-MM-dd HH:mm") : "",
        stockStatus: isLowStock ? "LOW STOCK" : "OK",
      });
      
      // Highlight low stock rows
      if (isLowStock) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' } // Light red
          };
        });
      }
    });
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1A2E' } // Dark blue
    };
    headerRow.alignment = { horizontal: 'center' };
    
    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    
    // Add auto-filter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.length + 1, column: columns.length }
    };
    
    // Add summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    const lowStockCount = data.filter(m => m.quantity <= lowStockThreshold).length;
    const totalValue = data.reduce((sum, m) => sum + (m.quantity * (m.selling_price || 0)), 0);
    
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 25 },
    ];
    
    summarySheet.addRow({ metric: 'Total Items', value: data.length });
    summarySheet.addRow({ metric: 'Low Stock Items', value: lowStockCount });
    summarySheet.addRow({ metric: 'Total Inventory Value (PKR)', value: formatPKR(totalValue) });
    summarySheet.addRow({ metric: 'Report Generated', value: new Date().toLocaleString() });
    
    // Style summary header
    const summaryHeader = summarySheet.getRow(1);
    summaryHeader.font = { bold: true };
    summaryHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Enhanced Excel export failed, using fallback:", error);
    // Fallback to basic export
    await exportToExcel(data, filename);
  }
}

// Helper to format currency as PKR
function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to get selling type label
function getSellingTypeLabelForExport(value: string): string {
  const typeMap: Record<string, string> = {
    "per_tablet": "Per Tablet",
    "capsule": "Capsule",
    "per_packet": "Per Packet",
    "syrup": "Syrup",
    "suspension": "Suspension",
    "emulsion": "Emulsion",
    "drops": "Drops",
    "eye_drops": "Eye Drops",
    "ear_drops": "Ear Drops",
    "nasal_spray": "Nasal Spray",
    "inhaler": "Inhaler",
    "nebulizer_solution": "Nebulizer Solution",
    "powder": "Powder",
    "granules": "Granules",
    "lotion": "Lotion",
    "gel": "Gel",
    "paste": "Paste",
    "foam": "Foam",
    "patch": "Patch",
    "infusion": "Infusion",
    "iv_fluid": "IV Fluid",
    "mouthwash": "Mouthwash",
    "gargle": "Gargle",
    "shampoo": "Shampoo",
    "soap": "Soap",
    "vaccine": "Vaccine",
    "insulin": "Insulin",
    "dry_syrup": "Dry Syrup",
    "oral_solution": "Oral Solution",
    "spray": "Spray",
    "pessary": "Pessary",
    "enema": "Enema",
    "injection": "Injection",
    "suppository": "Suppository",
    "ampoule": "Ampoule",
    "vial": "Vial",
    "cream": "Cream",
    "ointment": "Ointment",
    "oral_ampoule": "Oral Ampoule",
    "oral_gel": "Oral Gel",
    "liquid": "Liquid",
    "drip": "Drip",
    "iv_set": "IV Set",
    "cannula": "Cannula",
    "syringe": "Syringe",
    "bandage": "Bandage",
    "crepe_bandage": "Crepe Bandage",
    "dressing": "Dressing",
    "cotton": "Cotton",
    "plaster": "Plaster",
    "mask": "Mask",
    "sachet": "Sachet",
    "bar": "Bar",
    "toothbrush": "Toothbrush",
    "toothpaste": "Toothpaste",
    "sugar_strip": "Sugar Strip",
    "supplement": "Supplement",
    "narcotic": "Narcotic",
    "solution": "Solution",
    "elixir": "Elixir",
  };
  return typeMap[value] || value;
}

/**
 * Export data to PDF (opens print dialog)
 */
export async function exportToPDF(
  data: any[],
  title: string,
  filename: string
): Promise<void> {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Could not open print window");
    return;
  }

  const tableRows = data
    .map(
      (row) =>
        `<tr>${headers
          .map((h) => `<td style="padding: 8px; border: 1px solid #ddd;">${row[h] ?? ""}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background-color: #f4f4f4; padding: 10px; border: 1px solid #ddd; text-align: left; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .print-date { text-align: right; font-size: 12px; color: #666; margin-bottom: 10px; }
        @media print {
          body { padding: 0; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      <div class="print-date">Printed: ${new Date().toLocaleString()}</div>
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Print Stock List with formatted layout
 */
export function printStockList(
  data: any[],
  pharmacyName: string,
  title: string
): void {
  if (!data || data.length === 0) {
    console.warn("No data to print");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Could not open print window");
    return;
  }

  const tableRows = data
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.medicine_name || item.product_name || ""}</td>
        <td>${item.batch_no || ""}</td>
        <td>${item.quantity || 0}</td>
        <td>${item.rack_no || ""}</td>
        <td>${item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "N/A"}</td>
        <td>${item.selling_price ? `Rs. ${Number(item.selling_price).toFixed(2)}` : ""}</td>
        <td>${item.supplier || ""}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header h2 { margin: 5px 0; font-size: 18px; color: #666; }
        .print-info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background-color: #1a1a2e; color: white; padding: 10px; border: 1px solid #ddd; text-align: left; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .low-stock { background-color: #fee2e2 !important; }
        .expiring-soon { background-color: #fef3c7 !important; }
        .expired { background-color: #dc2626 !important; color: white; }
        .summary { margin-top: 20px; padding: 15px; background: #f4f4f4; border-radius: 5px; }
        @media print {
          body { padding: 0; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${pharmacyName}</h1>
        <h2>${title}</h2>
      </div>
      <div class="print-info">
        <span>Total Items: ${data.length}</span>
        <span>Generated: ${new Date().toLocaleString()}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Batch</th>
            <th>Qty</th>
            <th>Rack</th>
            <th>Expiry</th>
            <th>Price</th>
            <th>Supplier</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="summary">
        <strong>Summary:</strong> ${data.length} items in stock
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Format data for WhatsApp sharing
 */
export function formatForWhatsApp(data: any[], title: string): string {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  
  let message = `*${title}*\n\n`;
  
  data.forEach((row, index) => {
    message += `*${index + 1}. ${row[headers[0]]}*\n`;
    headers.slice(1).forEach(header => {
      message += `${header}: ${row[header]}\n`;
    });
    message += "\n";
  });

  return message;
}

/**
 * Share via WhatsApp Web
 */
export function shareViaWhatsApp(message: string, phoneNumber?: string) {
  const encodedMessage = encodeURIComponent(message);
  const url = phoneNumber
    ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
  
  window.open(url, "_blank");
}
