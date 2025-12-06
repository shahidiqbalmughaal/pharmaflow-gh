import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authentication check - require valid JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Invalid token:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      console.error('User does not have admin role:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting inventory alerts check for admin user:', user.id);

    // Get alert settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('alert_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      console.log('No alert settings configured');
      return new Response(JSON.stringify({ message: 'No alert settings configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const alerts: any[] = [];

    // Check medicines for low stock
    const { data: lowStockMedicines } = await supabaseClient
      .from('medicines')
      .select('*')
      .lte('quantity', settings.low_stock_threshold);

    if (lowStockMedicines && lowStockMedicines.length > 0) {
      lowStockMedicines.forEach(medicine => {
        alerts.push({
          type: 'low_stock',
          itemType: 'medicine',
          item: medicine,
          message: `Low stock alert: ${medicine.medicine_name} (Batch: ${medicine.batch_no}) has only ${medicine.quantity} units remaining`,
        });
      });
    }

    // Check cosmetics for low stock
    const { data: lowStockCosmetics } = await supabaseClient
      .from('cosmetics')
      .select('*')
      .lte('quantity', settings.low_stock_threshold);

    if (lowStockCosmetics && lowStockCosmetics.length > 0) {
      lowStockCosmetics.forEach(cosmetic => {
        alerts.push({
          type: 'low_stock',
          itemType: 'cosmetic',
          item: cosmetic,
          message: `Low stock alert: ${cosmetic.product_name} (Batch: ${cosmetic.batch_no}) has only ${cosmetic.quantity} units remaining`,
        });
      });
    }

    // Check medicines for near expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + settings.expiry_warning_days);

    const { data: nearExpiryMedicines } = await supabaseClient
      .from('medicines')
      .select('*')
      .lte('expiry_date', expiryDate.toISOString().split('T')[0])
      .gt('expiry_date', new Date().toISOString().split('T')[0]);

    if (nearExpiryMedicines && nearExpiryMedicines.length > 0) {
      nearExpiryMedicines.forEach(medicine => {
        const daysUntilExpiry = Math.ceil(
          (new Date(medicine.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        alerts.push({
          type: 'near_expiry',
          itemType: 'medicine',
          item: medicine,
          message: `Expiry warning: ${medicine.medicine_name} (Batch: ${medicine.batch_no}) expires in ${daysUntilExpiry} days`,
        });
      });
    }

    // Check cosmetics for near expiry
    const { data: nearExpiryCosmetics } = await supabaseClient
      .from('cosmetics')
      .select('*')
      .lte('expiry_date', expiryDate.toISOString().split('T')[0])
      .gt('expiry_date', new Date().toISOString().split('T')[0]);

    if (nearExpiryCosmetics && nearExpiryCosmetics.length > 0) {
      nearExpiryCosmetics.forEach(cosmetic => {
        const daysUntilExpiry = Math.ceil(
          (new Date(cosmetic.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        alerts.push({
          type: 'near_expiry',
          itemType: 'cosmetic',
          item: cosmetic,
          message: `Expiry warning: ${cosmetic.product_name} (Batch: ${cosmetic.batch_no}) expires in ${daysUntilExpiry} days`,
        });
      });
    }

    console.log(`Found ${alerts.length} alerts`);

    // Send email notifications
    if (settings.email_enabled && settings.admin_emails.length > 0 && alerts.length > 0) {
      const emailContent = generateEmailContent(alerts);
      
      try {
        const emailResult = await resend.emails.send({
          from: 'Pharmacy Alerts <onboarding@resend.dev>',
          to: settings.admin_emails,
          subject: `Inventory Alerts: ${alerts.length} items require attention`,
          html: emailContent,
        });

        console.log('Email sent:', emailResult);

        // Log email alerts
        for (const alert of alerts) {
          for (const email of settings.admin_emails) {
            await supabaseClient.from('alert_history').insert({
              alert_type: alert.type,
              item_type: alert.itemType,
              item_id: alert.item.id,
              item_name: alert.itemType === 'medicine' ? alert.item.medicine_name : alert.item.product_name,
              batch_no: alert.item.batch_no,
              current_quantity: alert.item.quantity,
              expiry_date: alert.item.expiry_date,
              notification_method: 'email',
              sent_to: email,
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    // Send WhatsApp notifications
    if (settings.whatsapp_enabled && settings.admin_whatsapp_numbers.length > 0 && alerts.length > 0) {
      const whatsappMessage = generateWhatsAppMessage(alerts);
      
      for (const number of settings.admin_whatsapp_numbers) {
        const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage)}`;
        console.log('WhatsApp notification URL generated for:', number);
        
        // Log WhatsApp alerts
        for (const alert of alerts) {
          await supabaseClient.from('alert_history').insert({
            alert_type: alert.type,
            item_type: alert.itemType,
            item_id: alert.item.id,
            item_name: alert.itemType === 'medicine' ? alert.item.medicine_name : alert.item.product_name,
            batch_no: alert.item.batch_no,
            current_quantity: alert.item.quantity,
            expiry_date: alert.item.expiry_date,
            notification_method: 'whatsapp',
            sent_to: number,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      alertsFound: alerts.length,
      message: alerts.length > 0 
        ? `Sent ${alerts.length} alerts successfully`
        : 'No alerts to send',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in inventory-alerts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateEmailContent(alerts: any[]): string {
  const lowStockAlerts = alerts.filter(a => a.type === 'low_stock');
  const expiryAlerts = alerts.filter(a => a.type === 'near_expiry');

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #dc2626;">Inventory Alerts</h1>
      <p>The following items require your attention:</p>
  `;

  if (lowStockAlerts.length > 0) {
    html += `
      <h2 style="color: #ea580c;">Low Stock Alerts (${lowStockAlerts.length})</h2>
      <ul style="list-style: none; padding: 0;">
    `;
    lowStockAlerts.forEach(alert => {
      html += `
        <li style="background: #fef2f2; padding: 12px; margin: 8px 0; border-left: 4px solid #dc2626;">
          <strong>${alert.itemType === 'medicine' ? alert.item.medicine_name : alert.item.product_name}</strong><br/>
          Batch: ${alert.item.batch_no}<br/>
          Current Stock: ${alert.item.quantity} units<br/>
          Supplier: ${alert.item.supplier}
        </li>
      `;
    });
    html += `</ul>`;
  }

  if (expiryAlerts.length > 0) {
    html += `
      <h2 style="color: #f59e0b;">Near Expiry Alerts (${expiryAlerts.length})</h2>
      <ul style="list-style: none; padding: 0;">
    `;
    expiryAlerts.forEach(alert => {
      const daysUntilExpiry = Math.ceil(
        (new Date(alert.item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      html += `
        <li style="background: #fffbeb; padding: 12px; margin: 8px 0; border-left: 4px solid #f59e0b;">
          <strong>${alert.itemType === 'medicine' ? alert.item.medicine_name : alert.item.product_name}</strong><br/>
          Batch: ${alert.item.batch_no}<br/>
          Expires: ${new Date(alert.item.expiry_date).toLocaleDateString()} (${daysUntilExpiry} days)<br/>
          Current Stock: ${alert.item.quantity} units
        </li>
      `;
    });
    html += `</ul>`;
  }

  html += `
      <p style="margin-top: 20px; color: #6b7280;">
        Please take necessary action to reorder or manage these items.
      </p>
    </div>
  `;

  return html;
}

function generateWhatsAppMessage(alerts: any[]): string {
  let message = `🚨 *Pharmacy Inventory Alerts* 🚨\n\n`;
  message += `Found ${alerts.length} items requiring attention:\n\n`;

  const lowStockAlerts = alerts.filter(a => a.type === 'low_stock');
  const expiryAlerts = alerts.filter(a => a.type === 'near_expiry');

  if (lowStockAlerts.length > 0) {
    message += `📦 *Low Stock (${lowStockAlerts.length})*\n`;
    lowStockAlerts.slice(0, 5).forEach(alert => {
      const name = alert.itemType === 'medicine' ? alert.item.medicine_name : alert.item.product_name;
      message += `• ${name}\n  Batch: ${alert.item.batch_no}\n  Stock: ${alert.item.quantity}\n\n`;
    });
    if (lowStockAlerts.length > 5) {
      message += `...and ${lowStockAlerts.length - 5} more\n\n`;
    }
  }

  if (expiryAlerts.length > 0) {
    message += `⏰ *Near Expiry (${expiryAlerts.length})*\n`;
    expiryAlerts.slice(0, 5).forEach(alert => {
      const name = alert.itemType === 'medicine' ? alert.item.medicine_name : alert.item.product_name;
      const daysUntilExpiry = Math.ceil(
        (new Date(alert.item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      message += `• ${name}\n  Batch: ${alert.item.batch_no}\n  Expires in: ${daysUntilExpiry} days\n\n`;
    });
    if (expiryAlerts.length > 5) {
      message += `...and ${expiryAlerts.length - 5} more\n\n`;
    }
  }

  message += `Please review your inventory system for full details.`;

  return message;
}
