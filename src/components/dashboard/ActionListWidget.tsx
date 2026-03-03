import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Inbox, UserCheck, FileSignature, Ticket, Users, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActionCount {
  task_signup: number;
  enrollment: number;
  contract: number;
  day_signup: number;
  ticket: number;
}

const categoryConfig = {
  task_signup: { icon: UserCheck, label: { nl: 'Aanmeldingen', en: 'Signups' }, color: 'text-blue-600 bg-blue-500/10' },
  enrollment: { icon: Users, label: { nl: 'Inschrijvingen', en: 'Enrollments' }, color: 'text-yellow-600 bg-yellow-500/10' },
  contract: { icon: FileSignature, label: { nl: 'Contracten', en: 'Contracts' }, color: 'text-indigo-600 bg-indigo-500/10' },
  day_signup: { icon: Clock, label: { nl: 'Dag-aanmeldingen', en: 'Day signups' }, color: 'text-orange-600 bg-orange-500/10' },
  ticket: { icon: Ticket, label: { nl: 'Tickets', en: 'Tickets' }, color: 'text-purple-600 bg-purple-500/10' },
};

interface ActionListWidgetProps {
  clubId: string;
  language: Language;
}

export const ActionListWidget = ({ clubId, language }: ActionListWidgetProps) => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<ActionCount>({ task_signup: 0, enrollment: 0, contract: 0, day_signup: 0, ticket: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const c: ActionCount = { task_signup: 0, enrollment: 0, contract: 0, day_signup: 0, ticket: 0 };

      // Task signups
      const { data: tasks } = await supabase.from('tasks').select('id, contract_template_id').eq('club_id', clubId).eq('status', 'open');
      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        const { data: signups } = await supabase.from('task_signups').select('id, task_id, status').in('task_id', taskIds).in('status', ['pending', 'assigned']);
        const tasksWithContract = new Set(tasks.filter(t => t.contract_template_id).map(t => t.id));
        
        // Existing tickets
        const { data: tickets } = await supabase.from('volunteer_tickets').select('volunteer_id, task_id').eq('club_id', clubId).in('task_id', taskIds);
        const ticketSet = new Set((tickets || []).map(t => `${t.volunteer_id}_${t.task_id}`));

        (signups || []).forEach(s => {
          if (s.status === 'pending') c.task_signup++;
          if (s.status === 'assigned' && tasksWithContract.has(s.task_id)) c.contract++;
        });
      }

      // Monthly plans
      const { data: plans } = await supabase.from('monthly_plans').select('id, contract_template_id').eq('club_id', clubId).eq('status', 'published');
      if (plans && plans.length > 0) {
        const planIds = plans.map(p => p.id);
        const { data: enrollments } = await supabase.from('monthly_enrollments').select('id, plan_id, approval_status, contract_status').in('plan_id', planIds);
        const enrs = enrollments || [];
        const plansWithContract = new Set(plans.filter(p => p.contract_template_id).map(p => p.id));

        enrs.forEach(e => {
          if (e.approval_status === 'pending') c.enrollment++;
          if (e.approval_status === 'approved' && e.contract_status === 'pending' && plansWithContract.has(e.plan_id)) c.contract++;
        });

        if (enrs.length > 0) {
          const enrIds = enrs.map(e => e.id);
          const { data: daySignups } = await supabase.from('monthly_day_signups').select('id, status, ticket_barcode').in('enrollment_id', enrIds);
          (daySignups || []).forEach(ds => {
            if (ds.status === 'pending') c.day_signup++;
            if (ds.status === 'assigned' && !ds.ticket_barcode) c.ticket++;
          });
        }
      }

      setCounts(c);
      setLoading(false);
    };
    load();
  }, [clubId]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const activeCategories = (Object.entries(counts) as [keyof ActionCount, number][]).filter(([, v]) => v > 0);

  return (
    <div
      className="w-full h-full bg-card rounded-2xl border border-border p-4 flex flex-col cursor-pointer hover:shadow-md transition-all group"
      onClick={() => navigate('/command-center')}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Inbox className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground flex-1">
          {language === 'nl' ? 'Actielijst' : 'Action List'}
        </h3>
        {total > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
            {total}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-xs text-muted-foreground">
            {language === 'nl' ? 'Alles afgehandeld! 🎉' : 'All caught up! 🎉'}
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-1.5 overflow-auto">
          {activeCategories.map(([type, count]) => {
            const cfg = categoryConfig[type];
            const Icon = cfg.icon;
            return (
              <div key={type} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${cfg.color}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-xs text-foreground flex-1">{cfg.label[language]}</span>
                <span className="text-xs font-semibold text-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-end mt-2 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        {language === 'nl' ? 'Bekijk actielijst' : 'View action list'} <ChevronRight className="w-3 h-3 ml-0.5" />
      </div>
    </div>
  );
};
