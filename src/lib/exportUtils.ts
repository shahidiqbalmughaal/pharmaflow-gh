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
 * Export data to Excel format (TSV with .xls extension for Excel compatibility)
 */
export async function exportToExcel(data: any[], filename: string): Promise<void> {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

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
