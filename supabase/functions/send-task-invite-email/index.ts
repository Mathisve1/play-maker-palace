import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { volunteer_email, volunteer_name, task_title, task_date, task_location, club_name } = await req.json();

    if (!volunteer_email || !task_title || !club_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Format date
    const formattedDate = task_date
      ? new Date(task_date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Datum nog te bevestigen';

    const firstName = (volunteer_name || 'Vrijwilliger').split(' ')[0];

    const subject = `🎉 ${club_name} nodigt je uit voor: ${task_title}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f5;color:#18181b;">
        <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:inline-flex;align-items:center;justify-content:center;">
                <span style="font-size:28px;">🤝</span>
              </div>
            </div>
            <h1 style="font-size:22px;font-weight:700;text-align:center;margin:0 0 8px;">
              Hallo ${firstName}!
            </h1>
            <p style="text-align:center;color:#71717a;font-size:15px;margin:0 0 24px;">
              <strong>${club_name}</strong> heeft je uitgenodigd als vrijwilliger.
            </p>

            <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin-bottom:24px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:6px 0;color:#71717a;font-size:13px;width:90px;">Taak</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;">${task_title}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#71717a;font-size:13px;">Datum</td>
                  <td style="padding:6px 0;font-size:14px;">${formattedDate}</td>
                </tr>
                ${task_location ? `<tr>
                  <td style="padding:6px 0;color:#71717a;font-size:13px;">Locatie</td>
                  <td style="padding:6px 0;font-size:14px;">📍 ${task_location}</td>
                </tr>` : ''}
              </table>
            </div>

            <div style="text-align:center;">
              <a href="${supabaseUrl.replace('/rest/v1', '').replace('https://', 'https://').split('.supabase.co')[0] ? Deno.env.get('SITE_URL') || 'https://play-maker-palace.lovable.app' : 'https://play-maker-palace.lovable.app'}/dashboard"
                style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#ffffff;font-weight:600;font-size:14px;padding:12px 32px;border-radius:12px;text-decoration:none;">
                Bekijk in de app →
              </a>
            </div>

            <p style="text-align:center;color:#a1a1aa;font-size:12px;margin-top:24px;">
              Je ontvangt deze e-mail omdat je lid bent van ${club_name}.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enqueue the email
    const messageId = `task-invite-${task_title.slice(0, 20)}-${volunteer_email}-${Date.now()}`;

    // Log as pending
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'task-invite',
      recipient_email: volunteer_email,
      status: 'pending',
      metadata: { club_name, task_title },
    });

    // Try to enqueue via pgmq
    const { error: queueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: volunteer_email,
        subject,
        html,
        from_name: club_name,
      },
    });

    if (queueError) {
      console.error('Failed to enqueue invite email:', queueError);
      // Update log
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'task-invite',
        recipient_email: volunteer_email,
        status: 'failed',
        error_message: queueError.message,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-task-invite-email error:', err);
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden bij het versturen van de uitnodiging.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
