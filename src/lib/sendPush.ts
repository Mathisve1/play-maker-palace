import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget push notification helper.
 * Calls the send-native-push Edge Function.
 * Never throws — errors are silently logged.
 */
export async function sendPush(opts: {
  userId: string;
  title: string;
  message: string;
  url?: string;
  type?: string;
}) {
  try {
    await supabase.functions.invoke('send-native-push', {
      body: {
        user_id: opts.userId,
        title: opts.title,
        message: opts.message,
        url: opts.url || '/dashboard',
        type: opts.type || 'general',
      },
    });
  } catch (e) {
    console.warn('[Push] sendPush failed:', e);
  }
}

/**
 * Send push to all club owners/admins of a given club.
 */
export async function sendPushToClub(opts: {
  clubId: string;
  title: string;
  message: string;
  url?: string;
  type?: string;
}) {
  try {
    // Get club owner
    const { data: club } = await supabase.from('clubs').select('owner_id').eq('id', opts.clubId).single();
    const userIds = new Set<string>();
    if (club?.owner_id) userIds.add(club.owner_id);

    // Get club members with admin/beheerder roles
    const { data: members } = await supabase
      .from('club_memberships')
      .select('volunteer_id, club_role')
      .eq('club_id', opts.clubId);
    
    for (const m of members || []) {
      if (m.club_role === 'bestuurder' || m.club_role === 'beheerder') {
        userIds.add(m.volunteer_id);
      }
    }

    await Promise.allSettled(
      Array.from(userIds).map(uid =>
        sendPush({ userId: uid, title: opts.title, message: opts.message, url: opts.url, type: opts.type })
      )
    );
  } catch (e) {
    console.warn('[Push] sendPushToClub failed:', e);
  }
}

/**
 * Send push to ALL volunteers with active task_signups for a given event.
 */
export async function sendPushToEventVolunteers(opts: {
  eventId: string;
  title: string;
  message: string;
  url?: string;
  type?: string;
}) {
  try {
    // Get all tasks for this event
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('event_id', opts.eventId);

    if (!tasks || tasks.length === 0) return;

    const taskIds = tasks.map(t => t.id);
    // Get all assigned/pending volunteers for those tasks
    const { data: signups } = await supabase
      .from('task_signups')
      .select('volunteer_id')
      .in('task_id', taskIds)
      .in('status', ['assigned', 'pending']);

    if (!signups || signups.length === 0) return;

    const uniqueIds = [...new Set(signups.map(s => s.volunteer_id))];
    await Promise.allSettled(
      uniqueIds.map(uid =>
        sendPush({ userId: uid, title: opts.title, message: opts.message, url: opts.url, type: opts.type })
      )
    );
  } catch (e) {
    console.warn('[Push] sendPushToEventVolunteers failed:', e);
  }
}

/**
 * Send push to all followers of a club.
 */
export async function sendPushToFollowers(opts: {
  clubId: string;
  title: string;
  message: string;
  url?: string;
  type?: string;
}) {
  try {
    const { data: follows } = await supabase
      .from('club_follows')
      .select('user_id')
      .eq('club_id', opts.clubId);

    await Promise.allSettled(
      (follows || []).map(f =>
        sendPush({ userId: f.user_id, title: opts.title, message: opts.message, url: opts.url, type: opts.type })
      )
    );
  } catch (e) {
    console.warn('[Push] sendPushToFollowers failed:', e);
  }
}

/**
 * Send push to all active club members (vrijwilligers).
 */
export async function sendPushToClubMembers(opts: {
  clubId: string;
  title: string;
  message: string;
  url?: string;
  type?: string;
}) {
  try {
    const { data: members } = await supabase
      .from('club_memberships')
      .select('volunteer_id')
      .eq('club_id', opts.clubId)
      .eq('status', 'actief');

    const uniqueIds = [...new Set((members || []).map(m => m.volunteer_id))];
    await Promise.allSettled(
      uniqueIds.map(uid =>
        sendPush({ userId: uid, title: opts.title, message: opts.message, url: opts.url, type: opts.type })
      )
    );
  } catch (e) {
    console.warn('[Push] sendPushToClubMembers failed:', e);
  }
}
