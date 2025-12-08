import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Invalid token or user not found:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has appropriate role (admin, manager, or salesman)
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['admin', 'manager', 'salesman'];
    const hasValidRole = userRoles?.some(r => validRoles.includes(r.role));
    
    if (!hasValidRole) {
      console.error('User lacks required role:', user.id);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id, 'with roles:', userRoles?.map(r => r.role));

    const { symptoms, currentMedicineId } = await req.json();
    
    console.log('Received request with symptoms:', symptoms);
    console.log('Current medicine ID:', currentMedicineId);

    if (!symptoms || symptoms.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Symptoms description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch available medicines (in stock and not expired)
    const today = new Date().toISOString().split('T')[0];
    const { data: medicines, error: medicinesError } = await supabase
      .from('medicines')
      .select('id, medicine_name, company_name, quantity, selling_price, expiry_date, rack_no, batch_no')
      .gt('quantity', 0)
      .gte('expiry_date', today)
      .order('medicine_name');

    if (medicinesError) {
      console.error('Error fetching medicines:', medicinesError);
      throw new Error('Failed to fetch medicines inventory');
    }

    console.log(`Found ${medicines?.length || 0} available medicines`);

    // Format medicines list for AI context
    const medicinesList = medicines?.map(m => 
      `- ${m.medicine_name} (${m.company_name}) - Rs. ${m.selling_price} - ${m.quantity} in stock - Rack: ${m.rack_no}`
    ).join('\n') || 'No medicines currently in stock';

    // Call Lovable AI for recommendations
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a knowledgeable pharmacy assistant for Al-Rehman Pharmacy. Your role is to suggest appropriate medicines based on symptoms described by the customer.

IMPORTANT GUIDELINES:
1. Only recommend medicines from the available inventory list provided
2. For each recommendation, explain briefly why it might help with the described symptoms
3. Always advise customers to consult a doctor for proper diagnosis and prescription
4. If symptoms seem serious or require immediate medical attention, clearly state that
5. Never claim to diagnose conditions - only suggest over-the-counter relief options
6. Prioritize medicines that are commonly used for the described symptoms
7. Consider cost-effectiveness when multiple options are available

Available Medicines Inventory:
${medicinesList}

Response Format:
Provide 3-5 medicine recommendations in JSON format with this structure:
{
  "recommendations": [
    {
      "medicine_name": "exact name from inventory",
      "reason": "brief explanation why this helps",
      "dosage_suggestion": "general OTC dosage guidance",
      "priority": "high/medium/low based on relevance"
    }
  ],
  "medical_advice": "important health advice or warnings",
  "consult_doctor": true/false (true if symptoms warrant professional consultation)
}`;

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
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log('AI response received');

    // Parse the AI response
    let recommendations;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw content:', content);
      // Return a fallback response
      recommendations = {
        recommendations: [],
        medical_advice: "Unable to process recommendations at this time. Please consult a pharmacist directly.",
        consult_doctor: true
      };
    }

    // Enrich recommendations with full medicine details from database
    if (recommendations.recommendations && medicines) {
      recommendations.recommendations = recommendations.recommendations.map((rec: any) => {
        const medicine = medicines.find(m => 
          m.medicine_name.toLowerCase() === rec.medicine_name.toLowerCase()
        );
        if (medicine) {
          return {
            ...rec,
            id: medicine.id,
            company_name: medicine.company_name,
            selling_price: medicine.selling_price,
            quantity: medicine.quantity,
            rack_no: medicine.rack_no,
            batch_no: medicine.batch_no
          };
        }
        return rec;
      }).filter((rec: any) => rec.id); // Only include medicines found in inventory
    }

    console.log('Returning recommendations:', recommendations.recommendations?.length || 0);

    return new Response(
      JSON.stringify(recommendations),
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
