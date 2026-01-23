import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedField {
  value: string | number | null;
  confidence: "high" | "medium" | "low";
}

// Single product OCR result (for medicine box/label scanning)
interface OCRResult {
  product_name: ExtractedField;
  batch_no: ExtractedField;
  quantity: ExtractedField;
  expiry_date: ExtractedField;
  manufacturing_date: ExtractedField;
  purchase_price: ExtractedField;
  selling_price: ExtractedField;
  company_name: ExtractedField;
  raw_text: string;
  overall_confidence: "high" | "medium" | "low";
  warnings: string[];
}

// Multi-item invoice line item
interface InvoiceLineItem {
  row_number: number;
  product_name: ExtractedField;
  quantity: ExtractedField;
  purchase_price: ExtractedField;
  batch_no: ExtractedField;
  expiry_date: ExtractedField;
  line_amount: ExtractedField;
  company_name: ExtractedField;
  row_confidence: "high" | "medium" | "low";
  needs_review: boolean;
}

// Multi-item invoice OCR result
interface InvoiceOCRResult {
  is_invoice: boolean;
  supplier_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  items: InvoiceLineItem[];
  total_items_detected: number;
  overall_confidence: "high" | "medium" | "low";
  warnings: string[];
  raw_text: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client for authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authentication token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`OCR request from authenticated user: ${user.id}`);

    // Verify user has appropriate role (admin or manager can use OCR for inventory)
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error("Failed to fetch user roles:", rolesError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['admin', 'manager'];
    const hasValidRole = userRoles?.some(r => validRoles.includes(r.role));
    
    if (!hasValidRole) {
      console.error(`User ${user.id} lacks required role. Has roles:`, userRoles?.map(r => r.role));
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - Admin or Manager role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} authorized with role:`, userRoles?.map(r => r.role));

    // Now process the image
    const { image_base64, image_url, mode = "auto" } = await req.json();
    
    if (!image_base64 && !image_url) {
      return new Response(
        JSON.stringify({ error: "No image provided. Please provide image_base64 or image_url." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing image for OCR extraction (mode: ${mode})...`);

    // Build the image content for the AI
    const imageContent = image_base64 
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } }
      : { type: "image_url", image_url: { url: image_url } };

    // Determine if this is an invoice or single product
    // Use auto-detection or honor explicit mode
    const isInvoiceMode = mode === "invoice" || mode === "auto";
    
    const systemPrompt = isInvoiceMode ? getInvoiceSystemPrompt() : getSingleProductSystemPrompt();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: isInvoiceMode 
                ? "Analyze this image. If it's a supplier invoice with a table of items, extract ALL line items. If it's a single product label/box, extract that product's details. Return the data as JSON."
                : "Extract all medicine/product information from this image. Return the data as JSON." 
              },
              imageContent
            ]
          }
        ],
        max_tokens: 8000, // Increased for multi-item invoices
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Unable to process image. Please try a clearer photo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Unable to read text from image. Please upload a clearer photo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response received, parsing...");

    // Parse the JSON from the AI response
    let extractedData: OCRResult | InvoiceOCRResult;
    try {
      // Try to extract JSON from the response (might be wrapped in markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError, content);
      return new Response(
        JSON.stringify({ 
          error: "Unable to extract structured data from image. Please upload a clearer photo.",
          raw_response: content 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if it's an invoice result
    if ('is_invoice' in extractedData && extractedData.is_invoice) {
      const invoiceData = extractedData as InvoiceOCRResult;
      
      // Process invoice items - mark items needing review
      const warnings = invoiceData.warnings || [];
      let lowConfidenceItems = 0;
      
      for (const item of invoiceData.items) {
        const fieldConfidences = [
          item.product_name?.confidence,
          item.quantity?.confidence,
          item.purchase_price?.confidence,
        ].filter(Boolean);
        
        const lowCount = fieldConfidences.filter(c => c === 'low').length;
        if (lowCount >= 1 || !item.product_name?.value) {
          item.needs_review = true;
          item.row_confidence = 'low';
          lowConfidenceItems++;
        } else if (fieldConfidences.some(c => c === 'medium')) {
          item.row_confidence = 'medium';
        } else {
          item.row_confidence = 'high';
        }
      }

      if (lowConfidenceItems > 0) {
        warnings.push(`${lowConfidenceItems} item(s) have low confidence and need review.`);
      }

      invoiceData.warnings = warnings;
      invoiceData.total_items_detected = invoiceData.items.length;

      console.log(`Invoice OCR completed: ${invoiceData.items.length} items extracted for user ${user.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          type: "invoice",
          data: invoiceData 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single product result
    const singleData = extractedData as OCRResult;
    const warnings = singleData.warnings || [];
    let lowConfidenceCount = 0;
    
    const fields = ['product_name', 'batch_no', 'quantity', 'expiry_date', 'selling_price'];
    for (const field of fields) {
      const fieldData = singleData[field as keyof OCRResult] as ExtractedField;
      if (fieldData?.confidence === 'low') {
        lowConfidenceCount++;
      }
    }

    if (lowConfidenceCount >= 2) {
      warnings.push("Some fields may be incorrect. Please verify before saving.");
    }

    singleData.warnings = warnings;

    console.log(`Single product OCR completed successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        type: "single",
        data: singleData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("OCR processing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getSingleProductSystemPrompt(): string {
  return `You are an expert OCR system specialized in extracting medicine/pharmaceutical product information from images of medicine boxes, labels, and packaging.

Your task is to extract the following fields from the image:
1. Product Name / Medicine Name
2. Batch Number (B.No, Batch No, Batch#, Lot No)
3. Quantity (Qty, Tablets, Capsules, ml, Units, pieces in pack)
4. Expiry Date (Exp, Expiry, Use Before, Best Before)
5. Manufacturing Date (MFG, Mfg Date, Manufacturing Date)
6. Purchase Price (optional - Cost, CP, Purchase Price)
7. Selling Price (MRP, Price, Rate, SP, Selling Price)
8. Company Name / Manufacturer

IMPORTANT RULES:
- For dates: Normalize to YYYY-MM-DD format. If only month/year like "12/26" or "Dec 2026", use the first day (2026-12-01).
- For prices: Remove currency symbols (Rs, PKR, $, ₹) and commas. Return only numeric values.
- For quantity: Extract just the number.
- If a field is not visible or cannot be determined, return null.
- Assign confidence levels: "high" (clearly visible), "medium" (partially visible/guessed), "low" (uncertain/inferred).

Respond ONLY with a valid JSON object in this exact format:
{
  "is_invoice": false,
  "product_name": { "value": "Medicine Name", "confidence": "high" },
  "batch_no": { "value": "ABC123", "confidence": "high" },
  "quantity": { "value": 100, "confidence": "medium" },
  "expiry_date": { "value": "2026-12-01", "confidence": "high" },
  "manufacturing_date": { "value": "2024-01-01", "confidence": "medium" },
  "purchase_price": { "value": null, "confidence": "low" },
  "selling_price": { "value": 150.50, "confidence": "high" },
  "company_name": { "value": "Pharma Corp", "confidence": "high" },
  "raw_text": "All visible text from the image",
  "overall_confidence": "medium",
  "warnings": ["Expiry date partially visible", "Price might be MRP not selling price"]
}`;
}

function getInvoiceSystemPrompt(): string {
  return `You are an expert OCR system specialized in extracting data from supplier invoices and pharmaceutical documents. You can handle both:
1. Multi-item supplier invoices with tables of products
2. Single product labels/boxes

FIRST, determine if the image is:
- A SUPPLIER INVOICE (contains a table with multiple product rows, supplier info, invoice number)
- A SINGLE PRODUCT (medicine box, label, or packaging)

FOR SUPPLIER INVOICES:
Extract ALL line items from the invoice table. Look for:
- Product Description / Item Name / Medicine Name
- Quantity (Qty, Pcs, Units)
- Trade Price / Purchase Price / TP / Rate
- Batch Number (B.No, Batch, Lot)
- Expiry Date (Exp, Expiry)
- Line Amount / Total (optional)
- Company/Manufacturer (if mentioned per row)

CRITICAL RULES FOR INVOICES:
- Parse EVERY row in the table - do not stop after the first item
- Ignore header rows, total rows, tax rows, and supplier metadata
- For dates: Normalize to YYYY-MM-DD. If "12/26" or "Dec 26", use 2026-12-01
- For prices: Remove currency symbols (Rs, PKR, $). Return numeric values only.
- For quantity: Extract just the number.
- If a value is unclear, still include the row and mark confidence as "low"
- Set needs_review: true for any row with uncertain data

FOR SINGLE PRODUCTS:
Extract standard product information as usual.

RESPOND with this JSON format:

For INVOICES:
{
  "is_invoice": true,
  "supplier_name": "Supplier Company Name or null",
  "invoice_number": "INV-12345 or null",
  "invoice_date": "2024-01-15 or null",
  "items": [
    {
      "row_number": 1,
      "product_name": { "value": "Panadol 500mg", "confidence": "high" },
      "quantity": { "value": 100, "confidence": "high" },
      "purchase_price": { "value": 50.00, "confidence": "high" },
      "batch_no": { "value": "BN123", "confidence": "medium" },
      "expiry_date": { "value": "2026-06-01", "confidence": "high" },
      "line_amount": { "value": 5000, "confidence": "high" },
      "company_name": { "value": "GSK", "confidence": "medium" },
      "row_confidence": "high",
      "needs_review": false
    },
    {
      "row_number": 2,
      "product_name": { "value": "Brufen 400mg", "confidence": "high" },
      "quantity": { "value": 50, "confidence": "medium" },
      "purchase_price": { "value": 35.00, "confidence": "high" },
      "batch_no": { "value": null, "confidence": "low" },
      "expiry_date": { "value": "2025-12-01", "confidence": "medium" },
      "line_amount": { "value": 1750, "confidence": "high" },
      "company_name": { "value": null, "confidence": "low" },
      "row_confidence": "medium",
      "needs_review": true
    }
  ],
  "total_items_detected": 2,
  "overall_confidence": "medium",
  "warnings": ["Some batch numbers not clearly visible"],
  "raw_text": "All text from the invoice"
}

For SINGLE PRODUCTS:
{
  "is_invoice": false,
  "product_name": { "value": "Medicine Name", "confidence": "high" },
  "batch_no": { "value": "ABC123", "confidence": "high" },
  "quantity": { "value": 100, "confidence": "medium" },
  "expiry_date": { "value": "2026-12-01", "confidence": "high" },
  "manufacturing_date": { "value": "2024-01-01", "confidence": "medium" },
  "purchase_price": { "value": null, "confidence": "low" },
  "selling_price": { "value": 150.50, "confidence": "high" },
  "company_name": { "value": "Pharma Corp", "confidence": "high" },
  "raw_text": "All visible text",
  "overall_confidence": "medium",
  "warnings": []
}`;
}
