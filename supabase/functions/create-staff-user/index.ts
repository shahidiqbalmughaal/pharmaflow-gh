import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateStaffRequest {
  email: string;
  password: string;
  fullName: string;
  shopId: string;
  role: 'owner' | 'manager' | 'cashier';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-staff-user: Starting request');

    // Create Supabase client with the service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is authenticated and is an admin/super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('create-staff-user: No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.log('create-staff-user: User authentication failed', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('create-staff-user: User authenticated', user.id);

    // Check if the user is an admin (super admin)
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    // Check if user is an owner of a shop
    const { data: ownerData } = await supabaseAdmin
      .from('shop_staff')
      .select('shop_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('is_active', true);

    const isAdmin = !!roleData;
    const isOwner = ownerData && ownerData.length > 0;

    if (!isAdmin && !isOwner) {
      console.log('create-staff-user: User is not authorized to create staff');
      return new Response(
        JSON.stringify({ error: 'Access denied. Only admins and shop owners can create staff.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateStaffRequest = await req.json();
    const { email, password, fullName, shopId, role } = body;

    console.log('create-staff-user: Creating staff for shop', shopId, 'with role', role);

    // Validate input
    if (!email || !password || !fullName || !shopId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, fullName, shopId, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not admin, check if user owns the specified shop
    if (!isAdmin) {
      const ownsShop = ownerData?.some(o => o.shop_id === shopId);
      if (!ownsShop) {
        return new Response(
          JSON.stringify({ error: 'You can only add staff to shops you own' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Owners cannot create other owners
      if (role === 'owner') {
        return new Response(
          JSON.stringify({ error: 'Only super admins can create shop owners' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      // User exists, just add them to shop_staff
      userId = existingUser.id;
      console.log('create-staff-user: User already exists, adding to shop_staff', userId);
      
      // Check if already assigned to this shop
      const { data: existingStaff } = await supabaseAdmin
        .from('shop_staff')
        .select('id')
        .eq('user_id', userId)
        .eq('shop_id', shopId)
        .maybeSingle();

      if (existingStaff) {
        return new Response(
          JSON.stringify({ error: 'User is already assigned to this shop' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: fullName }
      });

      if (createError) {
        console.error('create-staff-user: Error creating user', createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log('create-staff-user: Created new user', userId);

      // Create profile for the user
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName,
          current_shop_id: shopId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('create-staff-user: Error creating profile', profileError);
      }

      // Assign app role based on staff role
      let appRole = 'salesman';
      if (role === 'owner') appRole = 'admin';
      else if (role === 'manager') appRole = 'manager';

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: appRole
        });

      if (roleError) {
        console.error('create-staff-user: Error assigning role', roleError);
      }
    }

    // Add user to shop_staff
    const { error: staffError } = await supabaseAdmin
      .from('shop_staff')
      .insert({
        user_id: userId,
        shop_id: shopId,
        role,
        is_active: true
      });

    if (staffError) {
      console.error('create-staff-user: Error adding to shop_staff', staffError);
      return new Response(
        JSON.stringify({ error: staffError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('create-staff-user: Successfully created staff member');

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: existingUser ? 'User added to shop' : 'New staff account created'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('create-staff-user: Unexpected error', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});