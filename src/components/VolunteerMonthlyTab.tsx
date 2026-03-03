import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Language } from '@/i18n/translations';
import {
  Calendar, CalendarDays, Clock, MapPin, Euro, CheckCircle,
  ChevronLeft, ChevronRight, FileSignature, Users,
} from 'lucide-react';

const MONTH_NL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

interface MonthlyPlan {
  id: string;
  club_id: string;
  year: number;
  month: number;
  title: string;
  status: string;
  clubs?: { name: string; logo_url: string | null };
}

interface PlanTask {
  id: string;
  plan_id: string;
  task_date: string;
  title: string;
  category: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  compensation_type: string;
  daily_rate: number | null;
  hourly_rate: number | null;
  estimated_hours: number | null;
  spots_available: number;
}

interface DaySignup {
  id: string;
  plan_task_id: string;
  status: string;
  checked_in_at: string | null;
  hour_status: string;
}

interface Enrollment {
  id: string;
  plan_id: string;
  contract_status: string;
}

const labels: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Maandplanning',
    subtitle: 'Bekijk beschikbare maandplannen en schrijf je in',
    noPlans: 'Geen gepubliceerde maandplannen gevonden',
    enroll: 'Inschrijven voor deze maand',
    enrolled: 'Ingeschreven',
    signUp: 'Aanmelden',
    signedUp: 'Aangemeld',
    available: 'beschikbaar',
    yourSchedule: 'Jouw planning',
    availableTasks: 'Beschikbare taken',
    day: 'dag',
    hour: 'uur',
    checkedIn: 'Ingecheckt',
    pending: 'Wacht op check-in',
  },
  fr: {
    title: 'Planning mensuel',
    subtitle: 'Consultez les plans mensuels et inscrivez-vous',
    noPlans: 'Aucun plan mensuel publié',
    enroll: "S'inscrire pour ce mois",
    enrolled: 'Inscrit',
    signUp: "S'inscrire",
    signedUp: 'Inscrit',
    available: 'disponible(s)',
    yourSchedule: 'Votre planning',
    availableTasks: 'Tâches disponibles',
    day: 'jour',
    hour: 'heure',
    checkedIn: 'Enregistré',
    pending: "En attente d'enregistrement",
  },
  en: {
    title: 'Monthly Planning',
    subtitle: 'View available monthly plans and sign up',
    noPlans: 'No published monthly plans found',
    enroll: 'Enroll for this month',
    enrolled: 'Enrolled',
    signUp: 'Sign up',
    signedUp: 'Signed up',
    available: 'available',
    yourSchedule: 'Your schedule',
    availableTasks: 'Available tasks',
    day: 'day',
    hour: 'hour',
    checkedIn: 'Checked in',
    pending: 'Awaiting check-in',
  },
};

interface VolunteerMonthlyTabProps {
  language: Language;
  userId: string;
}

const VolunteerMonthlyTab = ({ language, userId }: VolunteerMonthlyTabProps) => {
  const l = labels[language];
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [daySignups, setDaySignups] = useState<DaySignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [viewYear, viewMonth, userId]);

  const loadData = async () => {
    setLoading(true);

    // Get published plans for this month
    const { data: plansData } = await supabase
      .from('monthly_plans')
      .select('*, clubs(name, logo_url)')
      .eq('year', viewYear)
      .eq('month', viewMonth)
      .eq('status', 'published');

    const plansList = (plansData || []) as unknown as MonthlyPlan[];
    setPlans(plansList);

    if (plansList.length > 0) {
      const planIds = plansList.map(p => p.id);

      const [tasksRes, enrollRes] = await Promise.all([
        supabase.from('monthly_plan_tasks').select('*').in('plan_id', planIds).order('task_date').order('start_time'),
        supabase.from('monthly_enrollments').select('*').in('plan_id', planIds).eq('volunteer_id', userId),
      ]);

      setTasks((tasksRes.data || []) as unknown as PlanTask[]);
      const enrs = (enrollRes.data || []) as unknown as Enrollment[];
      setEnrollments(enrs);

      if (enrs.length > 0) {
        const { data: signups } = await supabase
          .from('monthly_day_signups')
          .select('*')
          .in('enrollment_id', enrs.map(e => e.id))
          .eq('volunteer_id', userId);
        setDaySignups((signups || []) as unknown as DaySignup[]);
      } else {
        setDaySignups([]);
      }
    } else {
      setTasks([]);
      setEnrollments([]);
      setDaySignups([]);
    }

    setLoading(false);
  };

  const enrollInPlan = async (planId: string) => {
    const { error } = await supabase.from('monthly_enrollments').insert({
      plan_id: planId,
      volunteer_id: userId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(language === 'nl' ? 'Ingeschreven!' : 'Enrolled!');
    loadData();
  };

  const signUpForDay = async (enrollmentId: string, planTaskId: string) => {
    const barcode = `MP-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from('monthly_day_signups').insert({
      enrollment_id: enrollmentId,
      plan_task_id: planTaskId,
      volunteer_id: userId,
      ticket_barcode: barcode,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(language === 'nl' ? 'Aangemeld voor deze dag!' : 'Signed up!');
    loadData();
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      Bar: 'bg-amber-500/20 text-amber-700', Logistiek: 'bg-blue-500/20 text-blue-700',
      Catering: 'bg-orange-500/20 text-orange-700', Onderhoud: 'bg-green-500/20 text-green-700',
      Administratie: 'bg-purple-500/20 text-purple-700', Kantine: 'bg-rose-500/20 text-rose-700',
      Jeugdwerking: 'bg-cyan-500/20 text-cyan-700',
    };
    return map[cat] || 'bg-muted text-muted-foreground';
  };

  const isSignedUp = (taskId: string) => daySignups.some(ds => ds.plan_task_id === taskId);
  const getSignup = (taskId: string) => daySignups.find(ds => ds.plan_task_id === taskId);

  // Group tasks by day
  const tasksByDate = tasks.reduce<Record<string, PlanTask[]>>((acc, t) => {
    if (!acc[t.task_date]) acc[t.task_date] = [];
    acc[t.task_date].push(t);
    return acc;
  }, {});

  const mySignedUpTasks = tasks.filter(t => isSignedUp(t.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          {l.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{l.subtitle}</p>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
        <h2 className="text-lg font-bold">{MONTH_NL[viewMonth - 1]} {viewYear}</h2>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Laden...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{l.noPlans}</p>
        </div>
      ) : (
        plans.map(plan => {
          const enrollment = enrollments.find(e => e.plan_id === plan.id);
          const planTasks = tasks.filter(t => t.plan_id === plan.id);

          return (
            <div key={plan.id} className="space-y-4">
              {/* Plan header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {plan.clubs?.logo_url ? (
                        <img src={plan.clubs.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {(plan.clubs?.name || '?')[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{plan.clubs?.name}</h3>
                        <p className="text-xs text-muted-foreground">{plan.title} · {planTasks.length} taken</p>
                      </div>
                    </div>
                    {enrollment ? (
                      <Badge variant="default" className="bg-green-600">{l.enrolled}</Badge>
                    ) : (
                      <Button size="sm" onClick={() => enrollInPlan(plan.id)}>
                        <FileSignature className="w-4 h-4 mr-1" /> {l.enroll}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* My schedule (if enrolled) */}
              {enrollment && mySignedUpTasks.filter(t => t.plan_id === plan.id).length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{l.yourSchedule}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {mySignedUpTasks.filter(t => t.plan_id === plan.id).map(t => {
                      const d = new Date(t.task_date);
                      const signup = getSignup(t.id);
                      return (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
                          <div className="text-center min-w-[40px]">
                            <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(language === 'nl' ? 'nl-BE' : 'fr-BE', { weekday: 'short' })}</p>
                            <p className="text-lg font-bold">{d.getDate()}</p>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{t.title}</span>
                              <Badge variant="outline" className={`text-[10px] ${categoryColor(t.category)}`}>{t.category}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {t.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.start_time}–{t.end_time}</span>}
                              {t.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>}
                              <span className="flex items-center gap-1">
                                <Euro className="w-3 h-3" />
                                {t.compensation_type === 'daily' ? `€${t.daily_rate}/${l.day}` : `€${t.hourly_rate}/${l.hour}`}
                              </span>
                            </div>
                          </div>
                          {signup?.checked_in_at ? (
                            <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />{l.checkedIn}</Badge>
                          ) : (
                            <Badge variant="secondary">{l.pending}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Available tasks by date */}
              {enrollment && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{l.availableTasks}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(tasksByDate)
                      .filter(([_, ts]) => ts.some(t => t.plan_id === plan.id))
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, dateTasks]) => {
                        const d = new Date(date);
                        const isPast = d < new Date(new Date().toISOString().split('T')[0]);
                        return (
                          <div key={date} className={isPast ? 'opacity-50' : ''}>
                            <p className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                              {d.toLocaleDateString(language === 'nl' ? 'nl-BE' : 'fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <div className="space-y-1.5">
                              {dateTasks.filter(t => t.plan_id === plan.id).map(t => {
                                const signedUp = isSignedUp(t.id);
                                return (
                                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{t.title}</span>
                                        <Badge variant="outline" className={`text-[10px] ${categoryColor(t.category)}`}>{t.category}</Badge>
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                        {t.start_time && <span><Clock className="w-3 h-3 inline mr-0.5" />{t.start_time}–{t.end_time}</span>}
                                        {t.location && <span><MapPin className="w-3 h-3 inline mr-0.5" />{t.location}</span>}
                                        <span><Euro className="w-3 h-3 inline mr-0.5" />{t.compensation_type === 'daily' ? `€${t.daily_rate}` : `€${t.hourly_rate}/u`}</span>
                                        <span><Users className="w-3 h-3 inline mr-0.5" />{t.spots_available} {l.available}</span>
                                      </div>
                                    </div>
                                    {signedUp ? (
                                      <Badge variant="default" className="shrink-0">{l.signedUp}</Badge>
                                    ) : !isPast ? (
                                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => signUpForDay(enrollment.id, t.id)}>
                                        {l.signUp}
                                      </Button>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default VolunteerMonthlyTab;
