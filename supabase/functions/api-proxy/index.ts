import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SECURITY: Whitelist of allowed API endpoints to prevent SSRF attacks
const ALLOWED_ENDPOINTS = [
  '/products',
  '/inventory',
  '/orders',
  '/daily-sold-medicines',
  '/sold-medicines-by-date-range',
  '/export-report',
  '/getDailySoldMedicines',
  '/getSoldMedicinesByDateRange',
  '/exportReport'
];

// Validate endpoint against whitelist
function isValidEndpoint(endpoint: string): boolean {
  if (!endpoint || typeof endpoint !== 'string') {
    return false;
  }
  
  // Normalize endpoint - remove leading/trailing slashes for comparison
  const normalizedEndpoint = endpoint.replace(/^\/+|\/+$/g, '');
  
  // Check against whitelist (case-insensitive)
  return ALLOWED_ENDPOINTS.some(allowed => {
    const normalizedAllowed = allowed.replace(/^\/+|\/+$/g, '').toLowerCase();
    return normalizedEndpoint.toLowerCase() === normalizedAllowed;
  });
}

// Sanitize endpoint to prevent path traversal
function sanitizeEndpoint(endpoint: string): string {
  // Remove any path traversal attempts
  let sanitized = endpoint.replace(/\.\./g, '');
  // Remove any encoded path traversal
  sanitized = sanitized.replace(/%2e%2e/gi, '');
  sanitized = sanitized.replace(/%252e%252e/gi, '');
  // Ensure it starts with a single /
  sanitized = '/' + sanitized.replace(/^\/+/, '');
  return sanitized;
}

// Validate and sanitize parameters
function validateParams(params: Record<string, unknown> | undefined): Record<string, string> {
  const sanitizedParams: Record<string, string> = {};
  
  if (!params || typeof params !== 'object') {
    return sanitizedParams;
  }
  
  for (const [key, value] of Object.entries(params)) {
    // Only allow string, number, boolean values
    if (value === undefined || value === null) continue;
    
    // Validate key - only alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      console.warn(`Rejected invalid parameter key: ${key}`);
      continue;
    }
    
    // Convert value to string and validate
    const stringValue = String(value);
    
    // Reject values with potential injection patterns
    if (stringValue.includes('<script') || 
        stringValue.includes('javascript:') ||
        stringValue.includes('data:') ||
        stringValue.match(/[<>'"`;]/)) {
      console.warn(`Rejected potentially malicious parameter value for key: ${key}`);
      continue;
    }
    
    // Limit value length to prevent DOS
    if (stringValue.length > 1000) {
      console.warn(`Rejected parameter value exceeding length limit for key: ${key}`);
      continue;
    }
    
    sanitizedParams[key] = stringValue;
  }
  
  return sanitizedParams;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized - Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Invalid token:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: Verify user has appropriate role (admin or manager only)
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const hasAccess = userRoles?.some(r => r.role === 'admin' || r.role === 'manager');
    if (!hasAccess) {
      console.error(`User ${user.id} attempted API access without proper role`);
      return new Response(JSON.stringify({ error: 'Forbidden - Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: Get API credentials from secrets (not database)
    const apiKey = Deno.env.get('EXTERNAL_API_KEY');
    const apiBaseUrl = Deno.env.get('EXTERNAL_API_BASE_URL');

    if (!apiKey || !apiBaseUrl) {
      console.error('External API credentials not configured in secrets');
      return new Response(JSON.stringify({ 
        error: 'API settings not configured',
        message: 'Please configure EXTERNAL_API_KEY and EXTERNAL_API_BASE_URL in secrets'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    const { endpoint, params } = requestBody;

    // SECURITY: Validate endpoint is in whitelist
    if (!isValidEndpoint(endpoint)) {
      console.error(`Rejected invalid endpoint: ${endpoint} for user: ${user.id}`);
      return new Response(JSON.stringify({ 
        error: 'Invalid endpoint',
        message: 'The requested endpoint is not allowed'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: Sanitize endpoint to prevent path traversal
    const sanitizedEndpoint = sanitizeEndpoint(endpoint);

    // SECURITY: Validate and sanitize parameters
    const sanitizedParams = validateParams(params);

    // Construct API URL
    const url = new URL(`${apiBaseUrl}${sanitizedEndpoint}`);
    
    // Add sanitized query parameters
    for (const [key, value] of Object.entries(sanitizedParams)) {
      url.searchParams.append(key, value);
    }

    console.log(`Calling external API: ${url.toString()} for user: ${user.id}`);

    // Make API call
    const apiResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`API error: ${apiResponse.status} - ${errorText}`);
      return new Response(JSON.stringify({ 
        error: `API call failed: ${apiResponse.statusText}`
      }), {
        status: apiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await apiResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in api-proxy function:', error);
    // SECURITY: Return generic error message, don't expose internal details
    return new Response(JSON.stringify({ 
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});