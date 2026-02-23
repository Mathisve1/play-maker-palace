import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, user_id, title, message, url, data } = await req.json();

    const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const onesignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!onesignalAppId || !onesignalApiKey) {
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user's OneSignal player ID from profiles
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from('profiles')
      .select('onesignal_player_id, full_name')
      .eq('id', user_id)
      .single();

    if (!profile?.onesignal_player_id) {
      return new Response(
        JSON.stringify({ error: 'User has no push subscription', user_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push via OneSignal REST API
    const pushPayload: any = {
      app_id: onesignalAppId,
      include_subscription_ids: [profile.onesignal_player_id],
      headings: { en: title },
      contents: { en: message },
    };

    if (url) {
      pushPayload.url = url;
    }

    if (data) {
      pushPayload.data = data;
    }

    const pushRes = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${onesignalApiKey}`,
      },
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushRes.json();
    console.log('OneSignal push result:', JSON.stringify(pushResult));

    return new Response(
      JSON.stringify({ success: true, result: pushResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
