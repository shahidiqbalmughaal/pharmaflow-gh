import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Pill, Download } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePharmacySettings } from "@/hooks/usePharmacySettings";

const NarcoticsSales = () => {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = usePharmacySettings();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["narcotics-sales-history", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("narcotics_register")
        .select("*")
        .gte("sale_date", `${startDate}T00:00:00`)
        .lte("sale_date", `${endDate}T23:59:59`)
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const totals = useMemo(() => {
    const totalQty = entries.reduce((s, e) => s + (e.quantity_sold || 0), 0);
    const drugs = new Set(entries.map((e) => e.drug_name)).size;
    return { totalQty, drugs, count: entries.length };
  }, [entries]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Narcotics-Sales-${startDate}_to_${endDate}`,
  });

  const handleExportCSV = () => {
    const headers = ["S.No", "Date", "Drug Name", "Batch No", "Patient", "Prescribed By", "Qty Sold", "Remaining", "Remarks"];
    const rows = entries.map((e, i) => [
      i + 1,
      format(new Date(e.sale_date), "yyyy-MM-dd HH:mm"),
      e.drug_name,
      e.batch_no,
      e.patient_name,
      e.prescribed_by,
      e.quantity_sold,
      e.quantity_remaining,
      e.remarks,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `narcotics-sales-${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Pill className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Narcotics Sales History</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={!entries.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={handlePrint} disabled={!entries.length}>
            <Printer className="h-4 w-4 mr-2" /> Print Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => {
                setStartDate(format(new Date(), "yyyy-MM-dd"));
                setEndDate(format(new Date(), "yyyy-MM-dd"));
              }}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => {
                setStartDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
                setEndDate(format(new Date(), "yyyy-MM-dd"));
              }}>Last 7 Days</Button>
              <Button variant="outline" size="sm" onClick={() => {
                setStartDate(format(subDays(new Date(), 30), "yyyy-MM-dd"));
                setEndDate(format(new Date(), "yyyy-MM-dd"));
              }}>Last 30 Days</Button>
            </div>
            <div className="flex items-end gap-2">
              <Badge variant="secondary">{totals.count} entries</Badge>
              <Badge variant="secondary">{totals.drugs} drugs</Badge>
              <Badge>Qty: {totals.totalQty}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No narcotic sales in this period</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Drug Name</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e, i) => (
                  <TableRow key={e.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{format(new Date(e.sale_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{e.drug_name}</TableCell>
                    <TableCell>{e.batch_no}</TableCell>
                    <TableCell>{e.patient_name}</TableCell>
                    <TableCell>{e.prescribed_by}</TableCell>
                    <TableCell className="text-right">{e.quantity_sold}</TableCell>
                    <TableCell className="text-right">{e.quantity_remaining}</TableCell>
                    <TableCell>{e.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Printable area */}
      <div className="hidden">
        <div ref={printRef} className="p-6">
          <style>{`
            @media print {
              @page { size: A4; margin: 0.5in; }
            }
            .nsh-table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .nsh-table th, .nsh-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
            .nsh-table th { background: #eee; }
            .nsh-header { text-align: center; margin-bottom: 12px; }
            .nsh-header h1 { font-size: 18px; margin: 0; font-weight: bold; }
            .nsh-header p { margin: 2px 0; font-size: 11px; }
            .nsh-meta { display: flex; justify-content: space-between; margin: 8px 0; font-size: 11px; }
            .nsh-footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; }
          `}</style>
          <div className="nsh-header">
            <h1>{settings?.pharmacy_name || "Pharmacy"}</h1>
            <p>{settings?.pharmacy_address}</p>
            <p>Contact: {settings?.pharmacy_contact}</p>
            <h2 style={{ fontSize: 14, marginTop: 8, textDecoration: "underline" }}>
              NARCOTICS / CONTROLLED SUBSTANCES SALES REPORT
            </h2>
          </div>
          <div className="nsh-meta">
            <div><strong>Period:</strong> {format(new Date(startDate), "dd/MM/yyyy")} to {format(new Date(endDate), "dd/MM/yyyy")}</div>
            <div><strong>Printed:</strong> {format(new Date(), "dd/MM/yyyy HH:mm")}</div>
          </div>
          <div className="nsh-meta">
            <div><strong>Total Entries:</strong> {totals.count}</div>
            <div><strong>Distinct Drugs:</strong> {totals.drugs}</div>
            <div><strong>Total Qty Sold:</strong> {totals.totalQty}</div>
          </div>
          <table className="nsh-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Drug Name</th>
                <th>Batch</th>
                <th>Patient Name</th>
                <th>Prescribed By</th>
                <th>Qty</th>
                <th>Bal.</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{format(new Date(e.sale_date), "dd/MM/yy")}</td>
                  <td>{e.drug_name}</td>
                  <td>{e.batch_no}</td>
                  <td>{e.patient_name}</td>
                  <td>{e.prescribed_by}</td>
                  <td style={{ textAlign: "right" }}>{e.quantity_sold}</td>
                  <td style={{ textAlign: "right" }}>{e.quantity_remaining}</td>
                  <td>{e.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="nsh-footer">
            <div>
              <p>_____________________________</p>
              <p>Pharmacist Signature</p>
            </div>
            <div>
              <p>_____________________________</p>
              <p>Authorized By</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NarcoticsSales;
