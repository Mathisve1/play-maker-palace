import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Users, FileSignature, Ticket, MessageCircle } from 'lucide-react';

interface RecentActivityWidgetProps {
  clubId: string | null;
  language: Language;
}

interface ActivityItem {
  id: string;
  type: 'signup' | 'contract' | 'ticket' | 'message';
  text: string;
  time: string;
  icon: any;
  color: string;
}

export const RecentActivityWidget = ({ clubId, language }: RecentActivityWidgetProps) => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const activities: ActivityItem[] = [];

      // Recent signups
      const { data: recentSignups } = await supabase
        .from('task_signups')
        .select('id, status, signed_up_at, volunteer_id, task_id, tasks!inner(club_id, title)')
        .eq('tasks.club_id', clubId)
        .order('signed_up_at', { ascending: false })
        .limit(5);

      (recentSignups || []).forEach((s: any) => {
        activities.push({
          id: `signup-${s.id}`,
          type: 'signup',
          text: `${language === 'nl' ? 'Nieuwe aanmelding voor' : language === 'fr' ? 'Nouvelle inscription pour' : 'New signup for'} "${s.tasks?.title || '?'}"`,
          time: s.signed_up_at,
          icon: Users,
          color: 'text-primary',
        });
      });

      // Recent monthly enrollments
      const { data: recentEnrollments } = await supabase
        .from('monthly_enrollments')
        .select('id, created_at, approval_status, profiles:volunteer_id(full_name), monthly_plans!inner(club_id, title)')
        .eq('monthly_plans.club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(5);

      (recentEnrollments || []).forEach((e: any) => {
        const name = e.profiles?.full_name || '?';
        activities.push({
          id: `enroll-${e.id}`,
          type: 'signup',
          text: `${name} ${language === 'nl' ? 'schreef zich in voor' : 'enrolled in'} "${e.monthly_plans?.title || '?'}"`,
          time: e.created_at,
          icon: FileSignature,
          color: 'text-blue-600',
        });
      });

      // Sort all by time desc
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setItems(activities.slice(0, 8));
      setLoading(false);
    };
    load();
  }, [clubId, language]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="w-full h-full bg-card rounded-2xl border border-border p-4 overflow-auto">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" />
        {language === 'nl' ? 'Recente activiteit' : language === 'fr' ? 'Activité récente' : 'Recent activity'}
      </h3>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {language === 'nl' ? 'Nog geen activiteit.' : 'No activity yet.'}
        </p>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
              <item.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${item.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug truncate">{item.text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item.time)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
