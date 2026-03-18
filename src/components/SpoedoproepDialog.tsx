import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Users, ChevronRight, ChevronLeft, AlertTriangle, Check, Bell, Mail, Smartphone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { format } from 'date-fns';
import { nl, fr, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { sendPush } from '@/lib/sendPush';
import confetti from 'canvas-confetti';

interface SpoedoproepProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    task_date: string | null;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    club_id: string;
    spots_available: number;
    compensation_type?: string;
    hourly_rate?: number | null;
    expense_amount?: number | null;
  };
}

type BonusType = 'bonus' | 'double_points' | 'both';

interface SendResult {
  pushCount: number;
  emailCount: number;
  notifCount: number;
}

const SpoedoproepDialog = ({ open, onOpenChange, task }: SpoedoproepProps) => {
  const { language } = useLanguage();
  const [step, setStep] = useState(1);
  const [poolSize, setPoolSize] = useState<number | null>(null);
  const [poolIds, setPoolIds] = useState<string[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);

  // Step 1 form
  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [bonusAmount, setBonusAmount] = useState<number>(10);
  const [bonusType, setBonusType] = useState<BonusType>('bonus');
  const [message, setMessage] = useState('');
  const [channelPush, setChannelPush] = useState(true);
  const [channelNotif, setChannelNotif] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);

  // Step 3
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const confettiFired = useRef(false);

  const t = useCallback((nl_: string, fr_: string, en_: string) => {
    return language === 'nl' ? nl_ : language === 'fr' ? fr_ : en_;
  }, [language]);

  const dateLocale = language === 'nl' ? nl : language === 'fr' ? fr : enUS;

  const formattedDate = task.task_date
    ? format(new Date(task.task_date), 'EEEE d MMMM yyyy', { locale: dateLocale })
    : '';

  const formattedTime = task.start_time
    ? `${task.start_time}${task.end_time ? ` - ${task.end_time}` : ''}`
    : '';

  // Build default message
  const buildDefaultMessage = useCallback(() => {
    const bonusPart = bonusEnabled
      ? language === 'nl'
        ? ` + €${bonusAmount} bonus${bonusType === 'double_points' || bonusType === 'both' ? ' / dubbele punten' : ''} voor wie nu inschrijft!`
        : language === 'fr'
          ? ` + ${bonusAmount}€ bonus${bonusType === 'double_points' || bonusType === 'both' ? ' / points doubles' : ''} !`
          : ` + €${bonusAmount} bonus${bonusType === 'double_points' || bonusType === 'both' ? ' / double points' : ''} for signing up now!`
      : '';

    if (language === 'nl') {
      return `🚨 SPOEDOPROEP — ${task.title} op ${formattedDate} om ${formattedTime} te ${task.location || '...'}. We zoeken dringend ${task.spots_available} extra vrijwilligers.${bonusPart} Schrijf je snel in via de app!`;
    }
    if (language === 'fr') {
      return `🚨 APPEL D'URGENCE — ${task.title} le ${formattedDate} à ${formattedTime} à ${task.location || '...'}. Nous cherchons d'urgence ${task.spots_available} bénévoles supplémentaires.${bonusPart} Inscrivez-vous vite via l'app !`;
    }
    return `🚨 URGENT CALL — ${task.title} on ${formattedDate} at ${formattedTime} at ${task.location || '...'}. We urgently need ${task.spots_available} more volunteers.${bonusPart} Sign up now via the app!`;
  }, [task, formattedDate, formattedTime, bonusEnabled, bonusAmount, bonusType, language]);

  // Load pool on open
  useEffect(() => {
    if (!open) {
      setStep(1);
      setResult(null);
      confettiFired.current = false;
      return;
    }

    const loadPool = async () => {
      setLoadingPool(true);
      try {
        // Get active season
        const { data: season } = await supabase
          .from('seasons')
          .select('id')
          .eq('club_id', task.club_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        // Get tasks for this club
        const { data: clubTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('club_id', task.club_id);

        const taskIds = (clubTasks || []).map(t => t.id);

        // Get signups with assigned/completed status
        let signupVolunteers: string[] = [];
        if (taskIds.length > 0) {
          const { data: signups } = await supabase
            .from('task_signups')
            .select('volunteer_id')
            .in('task_id', taskIds)
            .in('status', ['assigned', 'completed']);
          signupVolunteers = (signups || []).map(s => s.volunteer_id);
        }

        // Get active club memberships
        const { data: memberships } = await supabase
          .from('club_memberships')
          .select('volunteer_id')
          .eq('club_id', task.club_id)
          .eq('status', 'actief');

        const memberVolunteers = (memberships || []).map(m => m.volunteer_id);

        // Deduplicate
        const uniqueIds = [...new Set([...signupVolunteers, ...memberVolunteers])];
        setPoolIds(uniqueIds);
        setPoolSize(uniqueIds.length);
      } catch (e) {
        console.error('[Spoedoproep] Failed to load pool:', e);
        setPoolSize(0);
      } finally {
        setLoadingPool(false);
      }
    };

    loadPool();
  }, [open, task.club_id]);

  // Set default message when opening or when bonus changes
  useEffect(() => {
    if (open && step === 1) {
      setMessage(buildDefaultMessage());
    }
  }, [open, buildDefaultMessage, bonusEnabled, bonusAmount, bonusType]);

  // Countdown timer
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    if (!task.task_date) return;
    const interval = setInterval(() => {
      const taskTime = new Date(task.task_date!);
      if (task.start_time) {
        const [h, m] = task.start_time.split(':').map(Number);
        taskTime.setHours(h, m, 0);
      }
      const diff = taskTime.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown(t('Taak is al begonnen', 'La tâche a déjà commencé', 'Task has already started'));
      } else {
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        setCountdown(
          t(`Taak begint over ${hours}u ${mins}min`, `La tâche commence dans ${hours}h ${mins}min`, `Task starts in ${hours}h ${mins}min`)
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [task.task_date, task.start_time, t]);

  // Fire confetti on result
  useEffect(() => {
    if (result && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#f59e0b', '#ef4444'],
      });
    }
  }, [result]);

  const handleSend = async () => {
    setSending(true);
    let pushCount = 0;
    let emailCount = 0;
    let notifCount = 0;

    try {
      const promises: Promise<void>[] = [];

      for (const volunteerId of poolIds) {
        // Push
        if (channelPush) {
          promises.push(
            sendPush({
              userId: volunteerId,
              title: t('🚨 Spoedoproep', '🚨 Appel d\'urgence', '🚨 Urgent Call'),
              message: message.slice(0, 200),
              url: `/volunteer-dashboard`,
              type: 'urgent',
            }).then(() => { pushCount++; })
          );
        }

        // In-app notification
        if (channelNotif) {
          promises.push(
            (async () => {
              await supabase.from('notifications').insert({
                user_id: volunteerId,
                title: t('🚨 Spoedoproep', '🚨 Appel d\'urgence', '🚨 Urgent Call'),
                message: message.slice(0, 500),
                type: 'urgent',
                metadata: { task_id: task.id, action: 'spoedoproep' } as any,
              });
              notifCount++;
            })()
          );
        }

        // Email via queue
        if (channelEmail) {
          promises.push(
            (async () => {
              await supabase.rpc('enqueue_email', {
                queue_name: 'transactional_emails',
                payload: {
                  to_user_id: volunteerId,
                  template_name: 'spoedoproep',
                  subject: t('🚨 Spoedoproep: ' + task.title, '🚨 Appel d\'urgence: ' + task.title, '🚨 Urgent Call: ' + task.title),
                  body: message,
                  metadata: { task_id: task.id, bonus_enabled: bonusEnabled, bonus_amount: bonusAmount },
                } as any,
              });
              emailCount++;
            })()
          );
        }
      }

      await Promise.allSettled(promises);
      setResult({ pushCount, emailCount, notifCount });
      setStep(3);
    } catch (e) {
      console.error('[Spoedoproep] Send failed:', e);
    } finally {
      setSending(false);
    }
  };

  const channelsSelected = [channelPush, channelNotif, channelEmail].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-destructive/15">
              <Zap className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold truncate">
                {t('Spoedoproep', 'Appel d\'urgence', 'Urgent Call')}
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{task.title}</p>
            </div>
            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive shrink-0">
              {t(`Stap ${step}/3`, `Étape ${step}/3`, `Step ${step}/3`)}
            </Badge>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-1 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-destructive' : 'bg-muted'
            )} />
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Warning banner */}
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {t(
                  'Dit verstuurt een spoedoproep naar je volledige vrijwilligerspool. Gebruik dit enkel bij dringende onderbezetting.',
                  'Ceci envoie un appel d\'urgence à tout votre pool de bénévoles. Utilisez-le uniquement en cas de sous-effectif urgent.',
                  'This sends an urgent call to your entire volunteer pool. Only use this for urgent understaffing.'
                )}
              </p>
            </div>

            {/* Pool size */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              {loadingPool ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('Laden...', 'Chargement...', 'Loading...')}</span>
                </div>
              ) : (
                <span className="text-sm font-medium">
                  {t(
                    `${poolSize ?? 0} vrijwilligers bereikbaar in je pool`,
                    `${poolSize ?? 0} bénévoles accessibles dans votre pool`,
                    `${poolSize ?? 0} volunteers reachable in your pool`
                  )}
                </span>
              )}
            </div>

            {/* Bonus toggle */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {t('Spoedbonus aanbieden', 'Offrir un bonus d\'urgence', 'Offer urgency bonus')}
                </label>
                <Switch checked={bonusEnabled} onCheckedChange={setBonusEnabled} />
              </div>

              {bonusEnabled && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {t('Bonus bedrag (€)', 'Montant bonus (€)', 'Bonus amount (€)')}
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={bonusAmount}
                        onChange={e => setBonusAmount(Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                      <Select value={bonusType} onValueChange={v => setBonusType(v as BonusType)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bonus">{t('Eenmalige bonus', 'Bonus unique', 'One-time bonus')}</SelectItem>
                          <SelectItem value="double_points">{t('Dubbele loyaliteitspunten', 'Points doubles', 'Double loyalty points')}</SelectItem>
                          <SelectItem value="both">{t('Beide', 'Les deux', 'Both')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t('Bericht aanpassen', 'Personnaliser le message', 'Customize message')}
              </label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('Kanalen', 'Canaux', 'Channels')}
              </label>
              <div className="space-y-2">
                {[
                  { id: 'push', checked: channelPush, set: setChannelPush, icon: Smartphone, label: t('Push-melding', 'Notification push', 'Push notification') },
                  { id: 'notif', checked: channelNotif, set: setChannelNotif, icon: Bell, label: t('In-app notificatie', 'Notification in-app', 'In-app notification') },
                  { id: 'email', checked: channelEmail, set: setChannelEmail, icon: Mail, label: t('E-mail', 'E-mail', 'Email') },
                ].map(ch => (
                  <label key={ch.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={ch.checked} onCheckedChange={v => ch.set(!!v)} />
                    <ch.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{ch.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={channelsSelected === 0 || !message.trim() || poolSize === 0}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('Volgende', 'Suivant', 'Next')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('Bereik', 'Portée', 'Reach')}</span>
                <span className="font-semibold">{poolSize} {t('vrijwilligers', 'bénévoles', 'volunteers')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('Kanalen', 'Canaux', 'Channels')}</span>
                <div className="flex gap-1">
                  {channelPush && <Badge variant="secondary" className="text-[10px]">Push</Badge>}
                  {channelNotif && <Badge variant="secondary" className="text-[10px]">In-app</Badge>}
                  {channelEmail && <Badge variant="secondary" className="text-[10px]">E-mail</Badge>}
                </div>
              </div>
              {bonusEnabled && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bonus</span>
                  <span className="font-semibold text-amber-600">€{bonusAmount} — {
                    bonusType === 'bonus' ? t('Eenmalig', 'Unique', 'One-time')
                    : bonusType === 'double_points' ? t('Dubbele punten', 'Points doubles', 'Double points')
                    : t('Beide', 'Les deux', 'Both')
                  }</span>
                </div>
              )}
            </div>

            {/* Countdown */}
            {countdown && (
              <div className="text-center text-sm font-medium text-destructive bg-destructive/10 rounded-lg p-2">
                ⏱ {countdown}
              </div>
            )}

            {/* Message preview */}
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1 font-medium">{t('Voorvertoning bericht', 'Aperçu du message', 'Message preview')}</p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>

            {/* Warning */}
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive font-medium">
                {t(
                  'Deze actie kan niet ongedaan gemaakt worden.',
                  'Cette action ne peut pas être annulée.',
                  'This action cannot be undone.'
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('Terug', 'Retour', 'Back')}
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {t('Verzenden...', 'Envoi...', 'Sending...')}</>
                ) : (
                  <>{t('Verstuur spoedoproep', 'Envoyer l\'appel', 'Send urgent call')}</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && result && (
          <div className="space-y-4 text-center py-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-accent/15">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-bold">
              {t('Spoedoproep verstuurd!', 'Appel d\'urgence envoyé !', 'Urgent call sent!')}
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {channelPush && (
                <Badge variant="secondary" className="gap-1">
                  <Smartphone className="w-3 h-3" /> {result.pushCount} push
                </Badge>
              )}
              {channelEmail && (
                <Badge variant="secondary" className="gap-1">
                  <Mail className="w-3 h-3" /> {result.emailCount} {t('e-mails in wachtrij', 'e-mails en file', 'emails queued')}
                </Badge>
              )}
              {channelNotif && (
                <Badge variant="secondary" className="gap-1">
                  <Bell className="w-3 h-3" /> {result.notifCount} in-app
                </Badge>
              )}
            </div>
            <Button onClick={() => onOpenChange(false)} className="mt-2">
              {t('Sluiten', 'Fermer', 'Close')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SpoedoproepDialog;
