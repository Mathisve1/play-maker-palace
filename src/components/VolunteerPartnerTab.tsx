import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, CheckCircle, Clock, MapPin, Calendar, XCircle, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';

interface PartnerInfo {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
}

interface PartnerMembership {
  id: string;
  partner_id: string;
  partner: PartnerInfo;
}

interface PartnerTaskAssignment {
  id: string;
  task_id: string;
  task_title: string;
  task_date: string | null;
  task_location: string | null;
  club_name: string;
  created_at: string;
}

const labels: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Mijn Partner',
    noPartner: 'Je bent momenteel niet verbonden aan een partner organisatie.',
    noPartnerSub: 'Een partner kan je uitnodigen als medewerker. Dit verschijnt dan hier.',
    connectedTo: 'Verbonden met',
    category: 'Categorie',
    contact: 'Contactpersoon',
    assignments: 'Toegewezen taken',
    noAssignments: 'Geen taken toegewezen via deze partner.',
    assignedOn: 'Toegewezen op',
  },
  fr: {
    title: 'Mon Partenaire',
    noPartner: 'Vous n\'êtes pas encore lié à une organisation partenaire.',
    noPartnerSub: 'Un partenaire peut vous inviter comme membre. Cela apparaîtra ici.',
    connectedTo: 'Connecté à',
    category: 'Catégorie',
    contact: 'Contact',
    assignments: 'Tâches assignées',
    noAssignments: 'Aucune tâche assignée via ce partenaire.',
    assignedOn: 'Assigné le',
  },
  en: {
    title: 'My Partner',
    noPartner: 'You are not currently connected to a partner organisation.',
    noPartnerSub: 'A partner can invite you as a member. It will appear here.',
    connectedTo: 'Connected to',
    category: 'Category',
    contact: 'Contact',
    assignments: 'Assigned tasks',
    noAssignments: 'No tasks assigned via this partner.',
    assignedOn: 'Assigned on',
  },
};

interface Props {
  language: Language;
  userId: string;
  navigate: (path: string) => void;
}

const VolunteerPartnerTab = ({ language, userId, navigate }: Props) => {
  const [memberships, setMemberships] = useState<PartnerMembership[]>([]);
  const [assignments, setAssignments] = useState<PartnerTaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const l = labels[language];

  useEffect(() => {
    const load = async () => {
      // Fetch partner memberships
      const { data: memberData } = await (supabase as any)
        .from('partner_members')
        .select('id, partner_id, external_partners(id, name, category, logo_url, contact_name, contact_email)')
        .eq('user_id', userId);

      if (memberData && memberData.length > 0) {
        const parsed = memberData.map((m: any) => ({
          id: m.id,
          partner_id: m.partner_id,
          partner: m.external_partners,
        }));
        setMemberships(parsed);

        // Fetch assignments for these partner_member ids
        const memberIds = parsed.map((m: any) => m.id);
        const { data: assignData } = await (supabase as any)
          .from('partner_task_assignments')
          .select('id, task_id, partner_member_id, created_at')
          .in('partner_member_id', memberIds)
          .order('created_at', { ascending: false });

        if (assignData && assignData.length > 0) {
          const taskIds = [...new Set(assignData.map((a: any) => a.task_id))] as string[];
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('id, title, task_date, location, clubs(name)')
            .in('id', taskIds);
          const taskMap = new Map(tasksData?.map(t => [t.id, t]) || []);

          setAssignments(assignData.map((a: any) => {
            const task = taskMap.get(a.task_id) as any;
            return {
              id: a.id,
              task_id: a.task_id,
              task_title: task?.title || 'Taak',
              task_date: task?.task_date,
              task_location: task?.location,
              club_name: task?.clubs?.name || '',
              created_at: a.created_at,
            };
          }));
        }
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">{l.title}</h1>

      {memberships.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{l.noPartner}</p>
          <p className="text-xs text-muted-foreground mt-1">{l.noPartnerSub}</p>
        </div>
      ) : (
        <>
          {/* Partner cards */}
          {memberships.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-primary/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {m.partner.logo_url ? (
                    <img src={m.partner.logo_url} alt={m.partner.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-foreground text-lg">{m.partner.name}</h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent-foreground">
                      <CheckCircle className="w-3 h-3" />
                      {l.connectedTo}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {l.category}: {m.partner.category}
                  </p>
                  {m.partner.contact_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {l.contact}: {m.partner.contact_name}
                      {m.partner.contact_email && ` · ${m.partner.contact_email}`}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Partner task assignments */}
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              {l.assignments}
            </h2>
            {assignments.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">{l.noAssignments}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a, i) => {
                  const isPast = a.task_date ? new Date(a.task_date) < new Date() : false;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => navigate(`/task/${a.task_id}`)}
                      className={`bg-card rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all ${
                        isPast ? 'border-border opacity-60' : 'border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{a.task_title}</p>
                          <p className="text-xs text-muted-foreground">{a.club_name}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            {a.task_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(a.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', {
                                  weekday: 'short', day: 'numeric', month: 'short',
                                })}
                              </span>
                            )}
                            {a.task_location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {a.task_location}
                              </span>
                            )}
                          </div>
                        </div>
                        {isPast ? (
                          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-muted text-muted-foreground">
                            {language === 'nl' ? 'Afgelopen' : 'Past'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-primary/10 text-primary">
                            {language === 'nl' ? 'Actief' : 'Active'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VolunteerPartnerTab;
