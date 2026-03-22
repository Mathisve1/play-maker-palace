import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar, MapPin, Users, ChevronRight, Gift, Tag } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { motion } from 'framer-motion';

interface EventTask {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  start_time?: string | null;
  end_time?: string | null;
  expense_reimbursement?: boolean;
  expense_amount?: number | null;
}

interface EventGroup {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  tasks: EventTask[];
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  status: string;
  club_name?: string;
}

interface ActiveCampaign {
  id: string;
  campaign_type: 'dashboard_banner' | 'task_tag' | 'local_coupon';
  title: string;
  description: string | null;
  reward_value_cents: number | null;
  image_url: string | null;
  sponsors: { name: string; brand_color: string; logo_url: string | null } | null;
}

interface EventDetailDialogProps {
  event: EventData | null;
  groups: EventGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  signupCounts: Record<string, number>;
  isSignedUp: (taskId: string) => boolean;
  getSignupStatus: (taskId: string) => string | null;
  onTaskClick: (taskId: string) => void;
  activeCampaigns?: ActiveCampaign[];
  campaignTaskLinks?: {campaign_id: string, task_id: string}[];
}

const labels = {
  nl: { groups: 'Groepen', tasks: 'taken', spots: 'plaatsen', noGroups: 'Nog geen groepen aangemaakt.', signedUp: 'Ingeschreven', assigned: 'Toegekend', signUp: 'Inschrijven' },
  fr: { groups: 'Groupes', tasks: 'tâches', spots: 'places', noGroups: 'Aucun groupe créé.', signedUp: 'Inscrit', assigned: 'Attribué', signUp: "S'inscrire" },
  en: { groups: 'Groups', tasks: 'tasks', spots: 'spots', noGroups: 'No groups created yet.', signedUp: 'Signed up', assigned: 'Assigned', signUp: 'Sign up' },
};

const EventDetailDialog = ({ event, groups, open, onOpenChange, language, signupCounts, isSignedUp, getSignupStatus, onTaskClick, activeCampaigns, campaignTaskLinks }: EventDetailDialogProps) => {
  if (!event) return null;
  const l = labels[language];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading">{event.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
              {event.event_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(event.event_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.location}
                </span>
              )}
              {event.club_name && <span>{event.club_name}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>

        {event.description && (
          <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
        )}

        <div className="mt-4 space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{l.noGroups}</p>
          ) : (
            groups.sort((a, b) => a.sort_order - b.sort_order).map((group, gi) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.05 }}
                className="rounded-xl border border-border overflow-hidden"
              >
                <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: group.color + '15' }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                  <h3 className="font-medium text-foreground text-sm">{group.name}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">{group.tasks.length} {l.tasks}</span>
                </div>
                <div className="divide-y divide-border">
                  {group.tasks.map(task => {
                    const signed = isSignedUp(task.id);
                    const status = getSignupStatus(task.id);
                    const isAssigned = status === 'assigned';
                    const taskCampaigns = campaignTaskLinks && activeCampaigns ? campaignTaskLinks.filter(l => l.task_id === task.id).map(l => activeCampaigns.find(c => c.id === l.campaign_id)).filter(Boolean) as any[] : [];
                    return (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task.id)}
                        className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {signupCounts[task.id] || 0}/{task.spots_available} {l.spots}
                            </span>
                            {task.expense_reimbursement && task.expense_amount && (
                              <span>€{task.expense_amount}</span>
                            )}
                            {taskCampaigns.map((c: any) => (
                              <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${c.sponsors?.brand_color || '#6366f1'}15`, color: c.sponsors?.brand_color || '#6366f1', border: `1px solid ${c.sponsors?.brand_color || '#6366f1'}40` }}>
                                {c.campaign_type === 'local_coupon' ? <Gift className="w-2.5 h-2.5" /> : <Tag className="w-2.5 h-2.5" />}
                                {c.campaign_type === 'local_coupon' ? `Reward: €${(c.reward_value_cents / 100).toFixed(0)}` : `Sponsored`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isAssigned ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium border border-accent/30 text-accent-foreground bg-accent/10">
                              {l.assigned}
                            </span>
                          ) : signed ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium border border-primary/30 text-primary bg-primary/5">
                              {l.signedUp}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-muted text-muted-foreground">
                              {l.signUp} →
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                  {group.tasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {language === 'nl' ? 'Geen taken in deze groep' : language === 'fr' ? 'Aucune tâche dans ce groupe' : 'No tasks in this group'}
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailDialog;
