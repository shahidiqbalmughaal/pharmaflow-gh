import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Pill, Download, FileText, RefreshCw } from "lucide-react";
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
import { toast } from "sonner";

// 8.8 x 13 inch page sizing — fit rows precisely per page
const ROWS_PER_PAGE = 22;

const NarcoticsSales = () => {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = usePharmacySettings();
  const queryClient = useQueryClient();

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

  const { data: weeklyReports = [], refetch: refetchReports } = useQuery({
    queryKey: ["narcotics-weekly-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("narcotics_weekly_reports")
        .select("*")
        .order("period_end", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const totals = useMemo(() => {
    const totalQty = entries.reduce((s, e) => s + (e.quantity_sold || 0), 0);
    const drugs = new Set(entries.map((e) => e.drug_name)).size;
    return { totalQty, drugs, count: entries.length };
  }, [entries]);

  // Split into pages of ROWS_PER_PAGE for accurate pagination
  const pages = useMemo(() => {
    const chunks: typeof entries[] = [];
    for (let i = 0; i < entries.length; i += ROWS_PER_PAGE) {
      chunks.push(entries.slice(i, i + ROWS_PER_PAGE));
    }
    return chunks.length === 0 ? [[]] : chunks;
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

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-narcotics-report", {
        body: { period_start: startDate, period_end: endDate, triggered_by: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const generated = (data?.results || []).filter((r: any) => r.ok).length;
      const skipped = (data?.results || []).filter((r: any) => r.skipped).length;
      toast.success(`Report job complete — generated: ${generated}, skipped: ${skipped}`);
      queryClient.invalidateQueries({ queryKey: ["narcotics-weekly-reports"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate report"),
  });

  const downloadReport = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from("narcotics-reports")
      .createSignedUrl(storagePath, 60);
    if (error || !data) {
      toast.error(error?.message || "Failed to create download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Pill className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Narcotics Sales History</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportCSV} disabled={!entries.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <FileText className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? "Generating..." : "Save PDF to Cloud"}
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
            <div className="flex items-end gap-2 flex-wrap">
              <Badge variant="secondary">{totals.count} entries</Badge>
              <Badge variant="secondary">{totals.drugs} drugs</Badge>
              <Badge>Qty: {totals.totalQty}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly reports archive */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Weekly Reports Archive (auto-generated every Monday)</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetchReports()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {weeklyReports.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No weekly reports yet. Reports auto-generate every Monday for the previous week, or click "Save PDF to Cloud" above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyReports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {format(new Date(r.period_start), "dd/MM/yyyy")} – {format(new Date(r.period_end), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{format(new Date(r.generated_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">{r.entry_count}</TableCell>
                    <TableCell className="text-right">{r.total_quantity}</TableCell>
                    <TableCell>
                      <Badge variant={r.generated_by === "auto-cron" ? "default" : "secondary"}>
                        {r.generated_by}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => downloadReport(r.storage_path)}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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

      {/* Printable area — paginated for 8.8 x 13 inch register style */}
      <div className="hidden">
        <div ref={printRef}>
          <style>{`
            @media print {
              @page { size: 8.8in 13in; margin: 0.4in; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            .nsh-page {
              width: 8in;
              height: 12.2in;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              font-family: Arial, sans-serif;
              box-sizing: border-box;
            }
            .nsh-page:last-child { page-break-after: auto; }
            .nsh-header { text-align: center; margin-bottom: 8px; }
            .nsh-header h1 { font-size: 16px; margin: 0; font-weight: bold; }
            .nsh-header h2 { font-size: 13px; margin: 4px 0; text-decoration: underline; }
            .nsh-header p { margin: 1px 0; font-size: 10px; }
            .nsh-meta { display: flex; justify-content: space-between; margin: 6px 0; font-size: 10px; }
            .nsh-table { width: 100%; border-collapse: collapse; font-size: 10px; flex: 1; }
            .nsh-table th, .nsh-table td { border: 1px solid #000; padding: 4px 5px; text-align: left; vertical-align: top; }
            .nsh-table th { background: #eee; font-weight: bold; }
            .nsh-footer { margin-top: 8px; display: flex; justify-content: space-between; font-size: 9px; padding-top: 6px; border-top: 1px solid #999; }
            .nsh-pageno { text-align: center; font-size: 9px; margin-top: 4px; }
          `}</style>

          {pages.map((pageEntries, pageIdx) => (
            <div key={pageIdx} className="nsh-page">
              <div className="nsh-header">
                <h1>{settings?.pharmacy_name || "Pharmacy"}</h1>
                <p>{settings?.pharmacy_address}</p>
                <p>Contact: {settings?.pharmacy_contact}</p>
                <h2>NARCOTICS / CONTROLLED SUBSTANCES SALES REPORT</h2>
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
                    <th style={{ width: "5%" }}>S.No</th>
                    <th style={{ width: "10%" }}>Date</th>
                    <th style={{ width: "18%" }}>Drug Name</th>
                    <th style={{ width: "10%" }}>Batch</th>
                    <th style={{ width: "16%" }}>Patient Name</th>
                    <th style={{ width: "16%" }}>Prescribed By</th>
                    <th style={{ width: "6%" }}>Qty</th>
                    <th style={{ width: "6%" }}>Bal.</th>
                    <th style={{ width: "13%" }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.map((e, i) => (
                    <tr key={e.id}>
                      <td>{pageIdx * ROWS_PER_PAGE + i + 1}</td>
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
              <div className="nsh-pageno">Page {pageIdx + 1} of {pages.length}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NarcoticsSales;
