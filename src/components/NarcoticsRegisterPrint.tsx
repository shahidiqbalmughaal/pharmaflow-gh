import { forwardRef } from "react";

interface NarcoticsEntry {
  id: string;
  serial_no: number;
  drug_name: string;
  batch_no: string;
  supplier_name: string;
  patient_name: string;
  prescribed_by: string;
  quantity_sold: number;
  quantity_remaining: number;
  remarks: string;
  sale_date: string;
}

interface NarcoticsRegisterPrintProps {
  entries: NarcoticsEntry[];
  instantPrint?: boolean;
}

const ROWS_PER_PAGE = 20;

export const NarcoticsRegisterPrint = forwardRef<HTMLDivElement, NarcoticsRegisterPrintProps>(
  ({ entries, instantPrint = false }, ref) => {
    // Group entries by drug_name
    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.drug_name]) acc[entry.drug_name] = [];
      acc[entry.drug_name].push(entry);
      return acc;
    }, {} as Record<string, NarcoticsEntry[]>);

    const renderPages = () => {
      const pages: JSX.Element[] = [];

      Object.entries(grouped).forEach(([drugName, drugEntries]) => {
        // Get supplier from first entry
        const supplierName = drugEntries[0]?.supplier_name || "";

        if (instantPrint) {
          // One entry per page pair
          drugEntries.forEach((entry, idx) => {
            pages.push(
              <div key={`left-${entry.id}`} className="nr-page">
                <h2 className="nr-heading">Name of Drug: {drugName}</h2>
                <table className="nr-table">
                  <thead>
                    <tr>
                      <th className="p1-sr">Serial No</th>
                      <th className="p1-date">Date</th>
                      <th className="p1-doc">Prescribed By</th>
                      <th className="p1-patient">Patient Name</th>
                      <th className="p1-batch">Batch No</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{entry.serial_no}</td>
                      <td>{new Date(entry.sale_date).toLocaleDateString()}</td>
                      <td>{entry.prescribed_by}</td>
                      <td>{entry.patient_name}</td>
                      <td>{entry.batch_no}</td>
                    </tr>
                    {Array.from({ length: ROWS_PER_PAGE - 1 }).map((_, i) => (
                      <tr key={i}>
                        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            pages.push(
              <div key={`right-${entry.id}`} className="nr-page">
                <h2 className="nr-heading">Manufactured By / Supplier By: {supplierName}</h2>
                <table className="nr-table">
                  <thead>
                    <tr>
                      <th className="p2-qtyin">Qty Purchased / Received</th>
                      <th className="p2-qtyout">Qty Sold</th>
                      <th className="p2-balance">Qty Remaining</th>
                      <th className="p2-remarks">Remarks</th>
                      <th className="p2-sign">Pharmacist Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>0</td>
                      <td>{entry.quantity_sold}</td>
                      <td>{entry.quantity_remaining}</td>
                      <td>{entry.remarks}</td>
                      <td>&nbsp;</td>
                    </tr>
                    {Array.from({ length: ROWS_PER_PAGE - 1 }).map((_, i) => (
                      <tr key={i}>
                        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          });
        } else {
          // Batch print: multiple entries per page
          const chunks: NarcoticsEntry[][] = [];
          for (let i = 0; i < drugEntries.length; i += ROWS_PER_PAGE) {
            chunks.push(drugEntries.slice(i, i + ROWS_PER_PAGE));
          }

          chunks.forEach((chunk, chunkIdx) => {
            // Page 1 (Left)
            pages.push(
              <div key={`left-${drugName}-${chunkIdx}`} className="nr-page">
                <h2 className="nr-heading">Name of Drug: {drugName}</h2>
                <table className="nr-table">
                  <thead>
                    <tr>
                      <th className="p1-sr">Serial No</th>
                      <th className="p1-date">Date</th>
                      <th className="p1-doc">Prescribed By</th>
                      <th className="p1-patient">Patient Name</th>
                      <th className="p1-batch">Batch No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.serial_no}</td>
                        <td>{new Date(entry.sale_date).toLocaleDateString()}</td>
                        <td>{entry.prescribed_by}</td>
                        <td>{entry.patient_name}</td>
                        <td>{entry.batch_no}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, ROWS_PER_PAGE - chunk.length) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

            // Page 2 (Right)
            pages.push(
              <div key={`right-${drugName}-${chunkIdx}`} className="nr-page">
                <h2 className="nr-heading">Manufactured By / Supplier By: {supplierName}</h2>
                <table className="nr-table">
                  <thead>
                    <tr>
                      <th className="p2-qtyin">Qty Purchased / Received</th>
                      <th className="p2-qtyout">Qty Sold</th>
                      <th className="p2-balance">Qty Remaining</th>
                      <th className="p2-remarks">Remarks</th>
                      <th className="p2-sign">Pharmacist Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((entry) => (
                      <tr key={entry.id}>
                        <td>0</td>
                        <td>{entry.quantity_sold}</td>
                        <td>{entry.quantity_remaining}</td>
                        <td>{entry.remarks}</td>
                        <td>&nbsp;</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, ROWS_PER_PAGE - chunk.length) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          });
        }
      });

      return pages;
    };

    return (
      <div ref={ref} className="narcotics-register-print">
        <style>{`
          @media print {
            @page {
              size: 8.8in 13in;
              margin: 0.2in;
            }
            body * {
              visibility: hidden;
            }
            .narcotics-register-print,
            .narcotics-register-print * {
              visibility: visible;
            }
            .narcotics-register-print {
              position: absolute;
              left: 0;
              top: 0;
            }
          }
          .nr-page {
            width: 8.8in;
            height: 13in;
            page-break-after: always;
            font-family: Arial, sans-serif;
            padding: 0.2in;
            box-sizing: border-box;
          }
          .nr-heading {
            text-align: center;
            margin-bottom: 10px;
            font-size: 16px;
            font-weight: bold;
          }
          .nr-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .nr-table th,
          .nr-table td {
            border: 1px solid black;
            padding: 5px;
            font-size: 12px;
            text-align: center;
          }
          .nr-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          /* PAGE 1 columns */
          .p1-sr { width: 2cm; }
          .p1-date { width: 3.5cm; }
          .p1-doc { width: 4.5cm; }
          .p1-patient { width: 4.5cm; }
          .p1-batch { width: 6cm; }
          /* PAGE 2 columns */
          .p2-qtyin { width: 5.5cm; }
          .p2-qtyout { width: 3.5cm; }
          .p2-balance { width: 3.5cm; }
          .p2-remarks { width: 4cm; }
          .p2-sign { width: 4.5cm; }
        `}</style>
        {renderPages()}
      </div>
    );
  }
);

NarcoticsRegisterPrint.displayName = "NarcoticsRegisterPrint";
