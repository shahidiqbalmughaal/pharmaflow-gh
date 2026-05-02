import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  shop_id?: string;
  period_start?: string; // YYYY-MM-DD
  period_end?: string;   // YYYY-MM-DD
  triggered_by?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body: ReportRequest = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Default period: previous Monday..Sunday (last full week)
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun..6=Sat
    const lastSunday = new Date(now);
    lastSunday.setUTCDate(now.getUTCDate() - ((day + 0) % 7) - (day === 0 ? 7 : 0));
    const lastMonday = new Date(lastSunday);
    lastMonday.setUTCDate(lastSunday.getUTCDate() - 6);

    const periodStart = body.period_start || lastMonday.toISOString().slice(0, 10);
    const periodEnd = body.period_end || lastSunday.toISOString().slice(0, 10);

    // Determine shops to process
    let shopIds: string[] = [];
    if (body.shop_id) {
      shopIds = [body.shop_id];
    } else {
      const { data: shops, error: shopsErr } = await admin
        .from("shops")
        .select("id")
        .eq("status", "active");
      if (shopsErr) throw shopsErr;
      shopIds = (shops || []).map((s: any) => s.id);
    }

    const results: Array<Record<string, unknown>> = [];

    for (const shopId of shopIds) {
      // Skip if a report already exists for this shop+period (deduplication)
      const { data: existing } = await admin
        .from("narcotics_weekly_reports")
        .select("id, storage_path")
        .eq("shop_id", shopId)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .maybeSingle();

      if (existing) {
        results.push({ shop_id: shopId, skipped: true, reason: "already_generated", path: existing.storage_path });
        continue;
      }

      // Fetch narcotic entries for this shop+period
      const { data: entries, error: entriesErr } = await admin
        .from("narcotics_register")
        .select("*")
        .eq("shop_id", shopId)
        .gte("sale_date", `${periodStart}T00:00:00`)
        .lte("sale_date", `${periodEnd}T23:59:59`)
        .order("sale_date", { ascending: true });
      if (entriesErr) throw entriesErr;

      if (!entries || entries.length === 0) {
        results.push({ shop_id: shopId, skipped: true, reason: "no_entries" });
        continue;
      }

      // Get shop name
      const { data: shop } = await admin
        .from("shops")
        .select("name")
        .eq("id", shopId)
        .maybeSingle();

      // Build PDF (8.8 x 13 inches; 1in = 72pt)
      const doc = new jsPDF({ unit: "pt", format: [8.8 * 72, 13 * 72] });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(16);
      doc.text(shop?.name || "Pharmacy", pageWidth / 2, 36, { align: "center" });
      doc.setFontSize(12);
      doc.text("Narcotics / Controlled Substances Weekly Report", pageWidth / 2, 56, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Period: ${periodStart} to ${periodEnd}`, pageWidth / 2, 74, { align: "center" });
      doc.text(`Generated: ${new Date().toISOString().slice(0, 19).replace("T", " ")}`, pageWidth / 2, 88, { align: "center" });

      const totalQty = entries.reduce((s: number, e: any) => s + (e.quantity_sold || 0), 0);

      autoTable(doc, {
        startY: 110,
        head: [["#", "Date", "Drug", "Batch", "Patient", "Doctor", "Qty", "Bal", "Remarks"]],
        body: entries.map((e: any, i: number) => [
          i + 1,
          new Date(e.sale_date).toISOString().slice(0, 10),
          e.drug_name,
          e.batch_no,
          e.patient_name,
          e.prescribed_by,
          e.quantity_sold,
          e.quantity_remaining,
          e.remarks,
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [220, 220, 220], textColor: 0 },
        margin: { top: 100, bottom: 60, left: 24, right: 24 },
        didDrawPage: (data: any) => {
          const pageNum = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(
            `Page ${data.pageNumber} of ${pageNum}  |  Entries: ${entries.length}  |  Total Qty: ${totalQty}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 24,
            { align: "center" }
          );
        },
      });

      const pdfBytes = doc.output("arraybuffer");
      const fileName = `narcotics-${periodStart}_to_${periodEnd}.pdf`;
      const storagePath = `${shopId}/${fileName}`;

      const { error: uploadErr } = await admin.storage
        .from("narcotics-reports")
        .upload(storagePath, new Uint8Array(pdfBytes), {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadErr) {
        results.push({ shop_id: shopId, error: uploadErr.message });
        continue;
      }

      const { error: insertErr } = await admin
        .from("narcotics_weekly_reports")
        .insert({
          shop_id: shopId,
          period_start: periodStart,
          period_end: periodEnd,
          storage_path: storagePath,
          entry_count: entries.length,
          total_quantity: totalQty,
          generated_by: body.triggered_by || "auto-cron",
        });

      if (insertErr) {
        // best-effort cleanup if metadata insert fails
        await admin.storage.from("narcotics-reports").remove([storagePath]);
        results.push({ shop_id: shopId, error: insertErr.message });
        continue;
      }

      results.push({ shop_id: shopId, ok: true, path: storagePath, entries: entries.length, totalQty });
    }

    return new Response(JSON.stringify({ period_start: periodStart, period_end: periodEnd, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-narcotics-report error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
