import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Notification message templates per language
const NOTIFICATION_TEMPLATES: Record<string, Record<string, { title: string; message: string }>> = {
  task_reminder: {
    nl: { title: '📋 Taakherinnering', message: 'Je hebt een taak die binnenkort begint.' },
    fr: { title: '📋 Rappel de tâche', message: 'Vous avez une tâche qui commence bientôt.' },
    en: { title: '📋 Task Reminder', message: 'You have a task starting soon.' },
  },
  contract_update: {
    nl: { title: '📝 Contractupdate', message: 'Er is een update voor je contract.' },
    fr: { title: '📝 Mise à jour du contrat', message: 'Il y a une mise à jour de votre contrat.' },
    en: { title: '📝 Contract Update', message: 'There is an update to your contract.' },
  },
  club_invitation: {
    nl: { title: '🎉 Clubuitnodiging', message: 'Je bent uitgenodigd voor een club!' },
    fr: { title: '🎉 Invitation au club', message: 'Vous êtes invité(e) à rejoindre un club !' },
    en: { title: '🎉 Club Invitation', message: 'You have been invited to join a club!' },
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, user_id, title, message, url, data, broadcast } = await req.json();

    const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID') || 'e0d35921-dd83-4e98-a289-f9d1bb1694cc';
    const onesignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!onesignalAppId || !onesignalApiKey) {
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // === BROADCAST MODE ===
    if (broadcast) {
      const finalTitle = title || '📢 De 12e Man';
      const finalMessage = message || 'Je hebt een nieuwe melding.';

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, onesignal_player_id, push_notifications_enabled, in_app_notifications_enabled');

      const profiles = allProfiles || [];
      const pushSubscriptionIds = profiles
        .filter((p: any) => p.onesignal_player_id && p.push_notifications_enabled !== false)
        .map((p: any) => p.onesignal_player_id);

      let pushResult: any = { skipped: true, reason: 'no_push_subscribers' };

      if (pushSubscriptionIds.length > 0) {
        const pushPayload: any = {
          app_id: onesignalAppId,
          include_subscription_ids: pushSubscriptionIds,
          headings: { en: finalTitle, nl: finalTitle, fr: finalTitle },
          contents: { en: finalMessage, nl: finalMessage, fr: finalMessage },
        };
        if (url) pushPayload.url = url;
        if (data) pushPayload.data = data;

        const pushRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${onesignalApiKey}`,
          },
          body: JSON.stringify(pushPayload),
        });

        pushResult = await pushRes.json();
        console.log('OneSignal broadcast result:', JSON.stringify(pushResult));
      }

      const inAppRecipients = profiles.filter((p: any) => p.in_app_notifications_enabled !== false);
      if (inAppRecipients.length > 0) {
        const inAppNotifs = inAppRecipients.map((p: any) => ({
          user_id: p.id,
          type: type || 'broadcast',
          title: finalTitle,
          message: finalMessage,
        }));
        await supabase.from('notifications').insert(inAppNotifs);
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'broadcast',
          result: pushResult,
          push_targets: pushSubscriptionIds.length,
          in_app_targets: inAppRecipients.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === SINGLE USER MODE ===
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id or broadcast=true required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onesignal_player_id, full_name, language, push_notifications_enabled, in_app_notifications_enabled')
      .eq('id', user_id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found', user_id }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lang = profile.language || 'nl';

    let finalTitle = title;
    let finalMessage = message;

    if (!finalTitle && type && NOTIFICATION_TEMPLATES[type]) {
      const tpl = NOTIFICATION_TEMPLATES[type][lang] || NOTIFICATION_TEMPLATES[type]['nl'];
      finalTitle = tpl.title;
      finalMessage = tpl.message;
    }

    finalTitle = finalTitle || '📢 De 12e Man';
    finalMessage = finalMessage || 'Je hebt een nieuwe melding.';

    let pushResult: any = { skipped: true, reason: 'push_disabled_or_no_subscription' };
    let inAppInserted = false;

    if (profile.push_notifications_enabled !== false && profile.onesignal_player_id) {
      const pushPayload: any = {
        app_id: onesignalAppId,
        include_subscription_ids: [profile.onesignal_player_id],
        headings: { en: finalTitle, nl: finalTitle, fr: finalTitle },
        contents: { en: finalMessage, nl: finalMessage, fr: finalMessage },
      };

      if (url) pushPayload.url = url;
      if (data) pushPayload.data = data;

      const pushRes = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${onesignalApiKey}`,
        },
        body: JSON.stringify(pushPayload),
      });

      pushResult = await pushRes.json();
      console.log('OneSignal push result:', JSON.stringify(pushResult));
    }

    if (profile.in_app_notifications_enabled !== false) {
      await supabase.from('notifications').insert({
        user_id,
        type: type || 'general',
        title: finalTitle,
        message: finalMessage,
      });
      inAppInserted = true;
    }

    return new Response(
      JSON.stringify({ success: true, result: pushResult, in_app_sent: inAppInserted }),
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
