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
import { useOptionalClubContext } from '@/contexts/ClubContext';
import { format } from 'date-fns';
import { nl, fr, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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

interface PoolProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  language: string | null;
  push_notifications_enabled: boolean | null;
  in_app_notifications_enabled: boolean | null;
}

// ── Chunk helper for batched processing ──
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Build bonus text ──
function buildBonusText(amount: number, type: BonusType, lang: string): string {
  if (lang === 'nl') {
    return type === 'bonus' ? `€${amount} bonus`
      : type === 'double_points' ? 'Dubbele loyaliteitspunten'
      : `€${amount} bonus + dubbele punten`;
  }
  if (lang === 'fr') {
    return type === 'bonus' ? `${amount}€ de bonus`
      : type === 'double_points' ? 'Points de fidélité doublés'
      : `${amount}€ de bonus + points doublés`;
  }
  return type === 'bonus' ? `€${amount} bonus`
    : type === 'double_points' ? 'Double loyalty points'
    : `€${amount} bonus + double points`;
}

// ── Build HTML email ──
function buildSpoedEmailHtml(opts: {
  firstName: string;
  taskTitle: string;
  taskDate: string;
  taskTime: string;
  taskLocation: string;
  spotsNeeded: number;
  bonusText: string | null;
  customMessage: string;
  taskId: string;
  clubName: string;
  lang: string;
}): string {
  const { firstName, taskTitle, taskDate, taskTime, taskLocation, spotsNeeded, bonusText, customMessage, taskId, clubName, lang } = opts;

  const ctaLabel = lang === 'nl' ? 'Schrijf je nu in' : lang === 'fr' ? 'Inscrivez-vous maintenant' : 'Sign up now';
  const headerLabel = lang === 'nl' ? '🚨 SPOEDOPROEP' : lang === 'fr' ? '🚨 APPEL D\'URGENCE' : '🚨 URGENT CALL';
  const spotsLabel = lang === 'nl' ? `${spotsNeeded} vrijwilligers nodig` : lang === 'fr' ? `${spotsNeeded} bénévoles nécessaires` : `${spotsNeeded} volunteers needed`;
  const ctaUrl = `https://play-maker-palace.lovable.app/task/${taskId}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;background:#f5f5f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <!-- Red urgent banner -->
  <tr><td style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:24px 32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px;">${headerLabel}</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${spotsLabel}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;">
      ${lang === 'nl' ? `Hallo ${firstName},` : lang === 'fr' ? `Bonjour ${firstName},` : `Hi ${firstName},`}
    </p>

    <!-- Task info card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;margin:0 0 20px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-weight:700;color:#1a1a1a;font-size:16px;">${taskTitle}</p>
        ${taskDate ? `<p style="margin:0 0 2px;color:#555;font-size:13px;">📅 ${taskDate}</p>` : ''}
        ${taskTime ? `<p style="margin:0 0 2px;color:#555;font-size:13px;">🕐 ${taskTime}</p>` : ''}
        ${taskLocation ? `<p style="margin:0;color:#555;font-size:13px;">📍 ${taskLocation}</p>` : ''}
      </td></tr>
    </table>

    <!-- Custom message -->
    <p style="margin:0 0 20px;color:#333;font-size:14px;line-height:1.6;white-space:pre-wrap;">${customMessage}</p>

    ${bonusText ? `
    <!-- Bonus banner -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;margin:0 0 24px;">
      <tr><td style="padding:14px 16px;text-align:center;">
        <p style="margin:0;font-weight:700;color:#166534;font-size:15px;">💰 ${bonusText}</p>
      </td></tr>
    </table>
    ` : ''}

    <!-- CTA button -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 16px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;font-weight:700;font-size:16px;padding:14px 40px;border-radius:8px;text-decoration:none;">
          ${ctaLabel}
        </a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">${clubName} — De 12e Man</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const SpoedoproepDialog = ({ open, onOpenChange, task }: SpoedoproepProps) => {
  const { language } = useLanguage();
  const clubCtx = useOptionalClubContext();
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

  // Load pool on open — also excludes volunteers already signed up for THIS task
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
        // Parallel: club tasks, memberships, already signed up for this task
        const [clubTasksRes, membershipsRes, alreadySignedRes] = await Promise.all([
          supabase.from('tasks').select('id').eq('club_id', task.club_id),
          supabase.from('club_memberships').select('volunteer_id').eq('club_id', task.club_id).eq('status', 'actief'),
          supabase.from('task_signups').select('volunteer_id').eq('task_id', task.id),
        ]);

        const clubTaskIds = (clubTasksRes.data || []).map(t => t.id);
        const memberVolunteers = (membershipsRes.data || []).map(m => m.volunteer_id);
        const alreadyIds = new Set((alreadySignedRes.data || []).map(s => s.volunteer_id));

        // Get signups with assigned/completed status for club tasks
        let signupVolunteers: string[] = [];
        if (clubTaskIds.length > 0) {
          const { data: signups } = await supabase
            .from('task_signups')
            .select('volunteer_id')
            .in('task_id', clubTaskIds)
            .in('status', ['assigned', 'completed']);
          signupVolunteers = (signups || []).map(s => s.volunteer_id);
        }

        // Deduplicate + exclude already signed up
        const uniqueIds = [...new Set([...signupVolunteers, ...memberVolunteers])].filter(id => !alreadyIds.has(id));
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
  }, [open, task.club_id, task.id]);

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
    if (poolIds.length === 0) return;
    setSending(true);
    let pushCount = 0;
    let emailCount = 0;
    let notifCount = 0;

    try {
      // ── Step A: Pool is already loaded in poolIds (with dedup + exclusion) ──

      // ── Step B: Fetch profiles + push preferences ──
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, language, push_notifications_enabled, in_app_notifications_enabled')
        .in('id', poolIds);

      const profileMap = new Map<string, PoolProfile>();
      for (const p of (profiles || []) as PoolProfile[]) {
        profileMap.set(p.id, p);
      }

      const clubName = clubCtx?.clubInfo?.name || 'Club';

      // ── Step C: Push notifications (batches of 10) ──
      // The edge function also creates an in-app notification, so track who got push
      const pushSentIds = new Set<string>();
      if (channelPush) {
        const pushTargets = poolIds.filter(id => {
          const p = profileMap.get(id);
          return !p || p.push_notifications_enabled !== false;
        });

        const pushBatches = chunkArray(pushTargets, 10);
        for (const batch of pushBatches) {
          const results = await Promise.allSettled(
            batch.map(userId => {
              const p = profileMap.get(userId);
              const lang = p?.language || 'nl';
              return supabase.functions.invoke('send-native-push', {
                body: {
                  user_id: userId,
                  type: 'spoed_oproep',
                  title: lang === 'nl' ? '🚨 Spoedoproep!' : lang === 'fr' ? '🚨 Appel d\'urgence!' : '🚨 Urgent Call!',
                  message: message.slice(0, 200),
                  url: `/task/${task.id}`,
                },
              });
            })
          );
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
              pushSentIds.add(batch[i]);
              pushCount++;
            }
          });
        }
      }

      // ── Step D: In-app notifications (only for users who didn't get push, since edge function already creates in-app) ──
      if (channelNotif) {
        const inAppRecords = poolIds
          .filter(id => {
            // Skip users who already received in-app via push edge function
            if (pushSentIds.has(id)) return false;
            const p = profileMap.get(id);
            return !p || p.in_app_notifications_enabled !== false;
          })
          .map(id => {
            const p = profileMap.get(id);
            const lang = p?.language || 'nl';
            return {
              user_id: id,
              type: 'spoed_oproep',
              title: lang === 'nl' ? '🚨 Spoedoproep!' : lang === 'fr' ? '🚨 Appel d\'urgence!' : '🚨 Urgent Call!',
              message: message.slice(0, 500),
              metadata: {
                task_id: task.id,
                task_title: task.title,
                club_id: task.club_id,
                bonus_amount: bonusEnabled ? bonusAmount : null,
                bonus_type: bonusEnabled ? bonusType : null,
              } as any,
            };
          });

        if (inAppRecords.length > 0) {
          await supabase.from('notifications').insert(inAppRecords);
        }
        // Total in-app = direct inserts + those created by push edge function
        notifCount = inAppRecords.length + pushSentIds.size;
      }

      // ── Step E: Emails via enqueue_email (batches of 10) ──
      if (channelEmail) {
        const emailTargets = poolIds.filter(id => {
          const p = profileMap.get(id);
          return p?.email;
        });

        const emailBatches = chunkArray(emailTargets, 10);
        for (const batch of emailBatches) {
          const results = await Promise.allSettled(
            batch.map(userId => {
              const p = profileMap.get(userId)!;
              const lang = p.language || 'nl';
              const localDate = task.task_date
                ? new Date(task.task_date).toLocaleDateString(
                    lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB',
                    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                  )
                : '';

              const emailHtml = buildSpoedEmailHtml({
                firstName: p.full_name?.split(' ')[0] || (lang === 'nl' ? 'Vrijwilliger' : lang === 'fr' ? 'Bénévole' : 'Volunteer'),
                taskTitle: task.title,
                taskDate: localDate,
                taskTime: task.start_time || '',
                taskLocation: task.location || '',
                spotsNeeded: task.spots_available,
                bonusText: bonusEnabled ? buildBonusText(bonusAmount, bonusType, lang) : null,
                customMessage: message,
                taskId: task.id,
                clubName,
                lang,
              });

              const subject = lang === 'nl'
                ? `🚨 Spoedoproep: ${task.title} — ${localDate}`
                : lang === 'fr'
                ? `🚨 Appel d'urgence: ${task.title} — ${localDate}`
                : `🚨 Urgent Call: ${task.title} — ${localDate}`;

              return supabase.rpc('enqueue_email' as any, {
                queue_name: 'transactional_emails',
                payload: {
                  to: p.email,
                  subject,
                  html: emailHtml,
                  from: `De 12e Man <noreply@de12eman.be>`,
                  message_id: `spoed-${task.id}-${p.id}-${Date.now()}@de12eman.be`,
                  queued_at: new Date().toISOString(),
                  label: 'spoed-oproep',
                },
              });
            })
          );
          emailCount += results.filter(r => r.status === 'fulfilled').length;
        }
      }

      // ── Step F: Save spoed bonus to DB so it auto-credits on signup ──
      if (bonusEnabled && (bonusAmount > 0 || bonusType === 'double_points')) {
        await (supabase as any).from('spoed_bonuses').upsert({
          task_id: task.id,
          club_id: task.club_id,
          bonus_amount: bonusAmount,
          bonus_type: bonusType,
          created_by: clubCtx?.userId || '',
          is_active: true,
        }, { onConflict: 'task_id' });
      }

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
