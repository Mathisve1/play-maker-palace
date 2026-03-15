import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClubContext } from '@/contexts/ClubContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Sparkles, ChevronRight, ChevronLeft, Check, SkipForward, Copy,
  Upload, MapPin, Users, Calendar, Loader2, PartyPopper, Rocket,
  Building2, Trophy, Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type WizardStep = 'welcome' | 'profile' | 'first_task' | 'invite' | 'completed';
const STEPS: WizardStep[] = ['welcome', 'profile', 'first_task', 'invite', 'completed'];

const t = (lang: string, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

// ── Step 1: Welcome ──────────────────────────────────────────────
const WelcomeStep = ({ clubName, lang, onNext }: { clubName: string; lang: string; onNext: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center text-center space-y-6 py-4"
  >
    <motion.div
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
    >
      <Rocket className="w-10 h-10 text-primary-foreground" />
    </motion.div>

    <div>
      <h2 className="text-2xl font-heading font-bold text-foreground">
        {t(lang, `Welkom bij ${clubName}!`, `Bienvenue chez ${clubName} !`, `Welcome to ${clubName}!`)}
      </h2>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
        {t(lang,
          'Laten we je club in een paar stappen klaar maken.',
          'Préparons votre club en quelques étapes.',
          "Let's set up your club in a few steps."
        )}
      </p>
    </div>

    <ul className="space-y-3 text-left w-full max-w-sm">
      {[
        { icon: Building2, text: t(lang, 'Vul je clubprofiel aan', 'Complétez votre profil club', 'Complete your club profile') },
        { icon: Calendar, text: t(lang, 'Maak je eerste taak aan', 'Créez votre première tâche', 'Create your first task') },
        { icon: Users, text: t(lang, 'Nodig vrijwilligers uit', 'Invitez des bénévoles', 'Invite volunteers') },
      ].map(({ icon: Icon, text }, i) => (
        <motion.li
          key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">{text}</span>
        </motion.li>
      ))}
    </ul>

    <Button size="lg" onClick={onNext} className="gap-2 mt-4">
      {t(lang, 'Laten we beginnen', 'Commençons', "Let's get started")}
      <ChevronRight className="w-4 h-4" />
    </Button>
  </motion.div>
);

// ── Step 2: Club Profile ─────────────────────────────────────────
const ProfileStep = ({ lang, clubId, onNext, onSkip }: {
  lang: string; clubId: string; onNext: () => void; onSkip: () => void;
}) => {
  const { clubInfo, updateClubInfo } = useClubContext();
  const [form, setForm] = useState({
    description: clubInfo?.name ? '' : '',
    sport: clubInfo?.sport || '',
    location: clubInfo?.location || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates: any = {};
    if (form.description) updates.description = form.description;
    if (form.sport) updates.sport = form.sport;
    if (form.location) updates.location = form.location;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('clubs').update(updates).eq('id', clubId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      updateClubInfo(updates);
    }
    setSaving(false);
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-foreground">
          {t(lang, 'Clubprofiel voltooien', 'Compléter le profil club', 'Complete club profile')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t(lang, 'Deze info wordt getoond aan vrijwilligers', 'Ces infos sont visibles par les bénévoles', 'This info is shown to volunteers')}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>{t(lang, 'Sporttype', 'Type de sport', 'Sport type')}</Label>
          <Input value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
            placeholder={t(lang, 'bv. Voetbal, Atletiek...', 'ex. Football, Athlétisme...', 'e.g. Football, Athletics...')} />
        </div>
        <div>
          <Label>{t(lang, 'Stad / Locatie', 'Ville / Lieu', 'City / Location')}</Label>
          <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder={t(lang, 'bv. Brugge', 'ex. Bruges', 'e.g. Bruges')} />
        </div>
        <div>
          <Label>{t(lang, 'Beschrijving', 'Description', 'Description')}</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t(lang, 'Vertel iets over je club...', 'Parlez de votre club...', 'Tell something about your club...')}
            rows={3} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1 gap-1">
          <SkipForward className="w-4 h-4" />
          {t(lang, 'Overslaan', 'Passer', 'Skip')}
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t(lang, 'Opslaan & verder', 'Enregistrer', 'Save & continue')}
        </Button>
      </div>
    </motion.div>
  );
};

// ── Step 3: First Task ───────────────────────────────────────────
const FirstTaskStep = ({ lang, clubId, onNext, onSkip }: {
  lang: string; clubId: string; onNext: () => void; onSkip: () => void;
}) => {
  const [form, setForm] = useState({ title: '', task_date: '', start_time: '', end_time: '', location: '', spots_available: '5' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title) { toast.error(t(lang, 'Titel is verplicht', 'Le titre est requis', 'Title is required')); return; }
    setSaving(true);
    const { error } = await supabase.from('tasks').insert({
      club_id: clubId,
      title: form.title,
      task_date: form.task_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      spots_available: parseInt(form.spots_available) || 5,
      status: 'open',
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(t(lang, 'Taak aangemaakt!', 'Tâche créée !', 'Task created!'));
    setSaving(false);
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-foreground">
          {t(lang, 'Eerste taak aanmaken', 'Créer votre première tâche', 'Create your first task')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t(lang, 'Waar heb je vrijwilligers voor nodig?', 'De quoi avez-vous besoin ?', 'What do you need volunteers for?')}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>{t(lang, 'Titel', 'Titre', 'Title')} *</Label>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={t(lang, 'bv. Stewards thuiswedstrijd', 'ex. Stewards match à domicile', 'e.g. Stewards home match')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t(lang, 'Datum', 'Date', 'Date')}</Label>
            <Input type="date" value={form.task_date} onChange={e => setForm(f => ({ ...f, task_date: e.target.value }))} />
          </div>
          <div>
            <Label>{t(lang, 'Locatie', 'Lieu', 'Location')}</Label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder={t(lang, 'bv. Stadion', 'ex. Stade', 'e.g. Stadium')} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>{t(lang, 'Start', 'Début', 'Start')}</Label>
            <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
          </div>
          <div>
            <Label>{t(lang, 'Einde', 'Fin', 'End')}</Label>
            <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
          </div>
          <div>
            <Label>{t(lang, 'Plaatsen', 'Places', 'Spots')}</Label>
            <Input type="number" min="1" value={form.spots_available} onChange={e => setForm(f => ({ ...f, spots_available: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1 gap-1">
          <SkipForward className="w-4 h-4" />
          {t(lang, 'Overslaan', 'Passer', 'Skip')}
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t(lang, 'Aanmaken & verder', 'Créer & continuer', 'Create & continue')}
        </Button>
      </div>
    </motion.div>
  );
};

// ── Step 4: Invite Volunteers ────────────────────────────────────
const InviteStep = ({ lang, clubId, userId, onNext, onSkip }: {
  lang: string; clubId: string; userId: string; onNext: () => void; onSkip: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [emails, setEmails] = useState('');
  const [sending, setSending] = useState(false);

  const inviteUrl = `${window.location.origin}/club-invite/${clubId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success(t(lang, 'Link gekopieerd!', 'Lien copié !', 'Link copied!'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvites = async () => {
    const emailList = emails.split(/[,;\n]/).map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0) return;
    setSending(true);

    for (const email of emailList) {
      await supabase.functions.invoke('club-invite', {
        body: { club_id: clubId, email, role: 'medewerker', invited_by: userId },
      });
    }

    toast.success(t(lang,
      `${emailList.length} uitnodiging(en) verstuurd!`,
      `${emailList.length} invitation(s) envoyée(s) !`,
      `${emailList.length} invitation(s) sent!`
    ));
    setSending(false);
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-foreground">
          {t(lang, 'Vrijwilligers uitnodigen', 'Inviter des bénévoles', 'Invite volunteers')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t(lang, 'Deel je link of stuur uitnodigingen per e-mail', 'Partagez votre lien ou envoyez des invitations', 'Share your link or send email invitations')}
        </p>
      </div>

      {/* Shareable link */}
      <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          {t(lang, 'Deelbare link', 'Lien partageable', 'Shareable link')}
        </Label>
        <div className="flex gap-2">
          <Input value={inviteUrl} readOnly className="text-xs bg-background" />
          <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1">
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Email invites */}
      <div className="space-y-2">
        <Label>{t(lang, 'E-mailadressen (gescheiden door komma)', "E-mails (séparés par des virgules)", 'Email addresses (comma separated)')}</Label>
        <Textarea
          value={emails} onChange={e => setEmails(e.target.value)}
          placeholder="jan@voorbeeld.be, marie@voorbeeld.be"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1 gap-1">
          <SkipForward className="w-4 h-4" />
          {t(lang, 'Overslaan', 'Passer', 'Skip')}
        </Button>
        <Button onClick={emails.trim() ? handleSendInvites : onNext} disabled={sending} className="flex-1 gap-1">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {emails.trim()
            ? t(lang, 'Versturen & verder', 'Envoyer & continuer', 'Send & continue')
            : t(lang, 'Verder', 'Continuer', 'Continue')
          }
        </Button>
      </div>
    </motion.div>
  );
};

// ── Step 5: Done ─────────────────────────────────────────────────
const DoneStep = ({ lang, onFinish }: { lang: string; onFinish: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center text-center space-y-6 py-6"
  >
    <motion.div
      initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
    >
      <PartyPopper className="w-12 h-12 text-primary" />
    </motion.div>

    <div>
      <h2 className="text-2xl font-heading font-bold text-foreground">
        {t(lang, 'Je club is klaar! 🎉', 'Votre club est prêt ! 🎉', 'Your club is ready! 🎉')}
      </h2>
      <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
        {t(lang,
          'Ontdek je dashboard, beheer taken en bouw je vrijwilligerscommunity.',
          'Découvrez votre tableau de bord, gérez les tâches et développez votre communauté.',
          'Explore your dashboard, manage tasks and grow your volunteer community.'
        )}
      </p>
    </div>

    <ul className="space-y-2 text-left w-full max-w-xs">
      {[
        t(lang, '📊 Dashboard met live statistieken', '📊 Tableau de bord en temps réel', '📊 Dashboard with live stats'),
        t(lang, '📋 Taken & evenementen beheren', '📋 Gérer tâches & événements', '📋 Manage tasks & events'),
        t(lang, '👥 Vrijwilligers volgen & belonen', '👥 Suivre & récompenser les bénévoles', '👥 Track & reward volunteers'),
      ].map((text, i) => (
        <motion.li
          key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="text-sm text-foreground py-1"
        >
          {text}
        </motion.li>
      ))}
    </ul>

    <Button size="lg" onClick={onFinish} className="gap-2 mt-2">
      <Trophy className="w-5 h-5" />
      {t(lang, 'Ga naar Dashboard', 'Accéder au tableau de bord', 'Go to Dashboard')}
    </Button>
  </motion.div>
);

// ── Main Wizard ──────────────────────────────────────────────────
interface ClubOnboardingWizardProps {
  onComplete: () => void;
  initialStep?: WizardStep;
}

const ClubOnboardingWizard = ({ onComplete, initialStep = 'welcome' }: ClubOnboardingWizardProps) => {
  const { language } = useLanguage();
  const { userId, clubId, clubInfo } = useClubContext();
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep);

  const stepIdx = STEPS.indexOf(currentStep);
  const progress = Math.round(((stepIdx) / (STEPS.length - 1)) * 100);

  const updateStep = useCallback(async (step: WizardStep) => {
    if (userId) {
      await supabase.from('profiles').update({ club_onboarding_step: step }).eq('id', userId);
    }
  }, [userId]);

  const goNext = useCallback(async () => {
    const nextIdx = stepIdx + 1;
    if (nextIdx >= STEPS.length) return;
    const next = STEPS[nextIdx];
    setCurrentStep(next);
    await updateStep(next);
    if (next === 'completed') {
      // Also mark as completed so wizard won't show again
      await updateStep('completed');
    }
  }, [stepIdx, updateStep]);

  const handleFinish = useCallback(async () => {
    await updateStep('completed');
    onComplete();
  }, [updateStep, onComplete]);

  if (!clubId || !userId) return null;

  const stepLabels: Record<WizardStep, string> = {
    welcome: t(language, 'Welkom', 'Bienvenue', 'Welcome'),
    profile: t(language, 'Profiel', 'Profil', 'Profile'),
    first_task: t(language, 'Eerste taak', 'Première tâche', 'First task'),
    invite: t(language, 'Uitnodigen', 'Inviter', 'Invite'),
    completed: t(language, 'Klaar', 'Terminé', 'Done'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header progress */}
        {currentStep !== 'welcome' && currentStep !== 'completed' && (
          <div className="px-6 pt-5 pb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              {STEPS.filter(s => s !== 'completed').map((s, i) => (
                <span key={s} className={cn(
                  'font-medium transition-colors',
                  i <= stepIdx ? 'text-primary' : 'text-muted-foreground/50'
                )}>
                  {stepLabels[s]}
                </span>
              ))}
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 'welcome' && (
              <WelcomeStep key="welcome" clubName={clubInfo?.name || 'Club'} lang={language} onNext={goNext} />
            )}
            {currentStep === 'profile' && (
              <ProfileStep key="profile" lang={language} clubId={clubId} onNext={goNext} onSkip={goNext} />
            )}
            {currentStep === 'first_task' && (
              <FirstTaskStep key="task" lang={language} clubId={clubId} onNext={goNext} onSkip={goNext} />
            )}
            {currentStep === 'invite' && (
              <InviteStep key="invite" lang={language} clubId={clubId} userId={userId} onNext={goNext} onSkip={goNext} />
            )}
            {currentStep === 'completed' && (
              <DoneStep key="done" lang={language} onFinish={handleFinish} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ClubOnboardingWizard;
