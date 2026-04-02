import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Verify role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['admin', 'manager', 'salesman'];
    if (!userRoles?.some(r => validRoles.includes(r.role))) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's shop
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('current_shop_id')
      .eq('id', userId)
      .single();

    if (profileError || !profileData?.current_shop_id) {
      return new Response(
        JSON.stringify({ error: 'User is not assigned to a shop' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userShopId = profileData.current_shop_id;

    const { symptoms } = await req.json();
    
    if (!symptoms || symptoms.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Symptoms description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch available medicines - handle NULL expiry_date (items without expiry)
    const today = new Date().toISOString().split('T')[0];
    const { data: medicines, error: medicinesError } = await supabase
      .from('medicines')
      .select('id, medicine_name, company_name, quantity, selling_price, expiry_date, rack_no, batch_no, selling_type')
      .eq('shop_id', userShopId)
      .gt('quantity', 0)
      .order('medicine_name');

    if (medicinesError) {
      throw new Error('Failed to fetch medicines inventory');
    }

    // Filter out expired medicines (but keep NULL expiry_date items)
    const availableMedicines = (medicines || []).filter(m => 
      !m.expiry_date || m.expiry_date >= today
    );

    console.log(`Found ${availableMedicines.length} available medicines for shop ${userShopId}`);

    if (availableMedicines.length === 0) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          medical_advice: "No medicines currently available in inventory. Please check stock.",
          consult_doctor: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a numbered list with IDs for the AI to reference
    const medicinesWithIndex = availableMedicines.map((m, i) => ({
      index: i,
      id: m.id,
      name: m.medicine_name,
      company: m.company_name,
      price: m.selling_price,
      qty: m.quantity,
      rack: m.rack_no,
      batch: m.batch_no,
      type: m.selling_type,
    }));

    const medicinesList = medicinesWithIndex.map(m => 
      `[${m.index}] ${m.name} (${m.company}) - Rs.${m.price} - Qty:${m.qty} - Rack:${m.rack}`
    ).join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a knowledgeable pharmacy assistant. Suggest appropriate medicines from the inventory based on customer symptoms.

RULES:
1. ONLY recommend medicines from the numbered inventory list below
2. Use the exact index number [N] to reference each medicine
3. Explain why each medicine helps with the symptoms
4. Suggest general OTC dosage guidance
5. Always recommend consulting a doctor for proper diagnosis
6. If symptoms seem serious, clearly state that
7. Prioritize commonly used medicines for the described symptoms
8. Recommend 3-5 medicines maximum

AVAILABLE INVENTORY:
${medicinesList}`;

    // Use tool calling for structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Customer symptoms: ${symptoms}` }
        ],
        temperature: 0.3,
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_medicines",
              description: "Return medicine recommendations based on symptoms. Each recommendation must use the exact index number from the inventory list.",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    description: "List of 3-5 recommended medicines",
                    items: {
                      type: "object",
                      properties: {
                        medicine_index: { 
                          type: "integer", 
                          description: "The index number [N] from the inventory list" 
                        },
                        reason: { 
                          type: "string", 
                          description: "Why this medicine helps with the symptoms" 
                        },
                        dosage_suggestion: { 
                          type: "string", 
                          description: "General OTC dosage guidance" 
                        },
                        priority: { 
                          type: "string", 
                          enum: ["high", "medium", "low"],
                          description: "Relevance to the described symptoms" 
                        }
                      },
                      required: ["medicine_index", "reason", "dosage_suggestion", "priority"],
                      additionalProperties: false
                    }
                  },
                  medical_advice: { 
                    type: "string", 
                    description: "Important health advice or warnings for the customer" 
                  },
                  consult_doctor: { 
                    type: "boolean", 
                    description: "Whether symptoms warrant professional consultation" 
                  }
                },
                required: ["recommendations", "medical_advice", "consult_doctor"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_medicines" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI service temporarily unavailable');
    }

    const aiResponse = await response.json();
    
    // Extract structured data from tool call
    let result;
    try {
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments) 
          : toolCall.function.arguments;
        result = args;
      } else {
        // Fallback: try to parse content as JSON
        const content = aiResponse.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No structured output from AI');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({
          recommendations: [],
          medical_advice: "Unable to process recommendations. Please consult a pharmacist directly.",
          consult_doctor: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map index-based recommendations to full medicine details
    const enrichedRecommendations = (result.recommendations || [])
      .map((rec: any) => {
        const idx = rec.medicine_index;
        if (idx === undefined || idx === null || idx < 0 || idx >= medicinesWithIndex.length) {
          return null;
        }
        const med = medicinesWithIndex[idx];
        return {
          id: med.id,
          medicine_name: med.name,
          company_name: med.company,
          selling_price: med.price,
          quantity: med.qty,
          rack_no: med.rack,
          batch_no: med.batch,
          reason: rec.reason,
          dosage_suggestion: rec.dosage_suggestion,
          priority: rec.priority || 'medium',
        };
      })
      .filter(Boolean);

    console.log(`Returning ${enrichedRecommendations.length} recommendations`);

    return new Response(
      JSON.stringify({
        recommendations: enrichedRecommendations,
        medical_advice: result.medical_advice || "Please consult a doctor for proper diagnosis.",
        consult_doctor: result.consult_doctor !== false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in medicine-recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
