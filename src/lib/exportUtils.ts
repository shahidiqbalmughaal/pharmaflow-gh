/**
 * Export data to CSV file
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(","),
    // Data rows
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          const stringValue = String(value ?? "");
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  // Create blob and download
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
