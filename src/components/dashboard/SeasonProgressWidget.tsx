import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { motion } from 'framer-motion';
import { CalendarRange, Users, FileSignature, CheckCircle, Timer, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import CloseSeasonWizard from '@/components/CloseSeasonWizard';

interface Props {
  clubId: string | null;
  language: Language;
}

const t3 = (l: Language, nl: string, fr: string, en: string) =>
  l === 'nl' ? nl : l === 'fr' ? fr : en;

interface SeasonData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export const SeasonProgressWidget = ({ clubId, language }: Props) => {
  const navigate = useNavigate();
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [stats, setStats] = useState({ activeVols: 0, signedContracts: 0, sentContracts: 0, attendanceRate: 0 });
  const [showCloseWizard, setShowCloseWizard] = useState(false);

  const loadSeason = async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date, is_active')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .maybeSingle();
    setSeason(data as SeasonData | null);
  };

  const loadStats = async () => {
    if (!clubId) return;
    const [membersRes, contractsRes, signupsRes, checkinsRes] = await Promise.all([
      supabase.from('club_memberships').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'active'),
      supabase.from('season_contracts' as any).select('id, signature_status').eq('club_id', clubId),
      supabase.from('task_signups').select('volunteer_id, checked_in_at, task_id'),
      supabase.from('season_checkins' as any).select('id', { count: 'exact', head: true }).eq('club_id', clubId),
    ]);

    const contracts = (contractsRes.data || []) as any[];
    const signedContracts = contracts.filter(c => c.signature_status === 'signed').length;
    const sentContracts = contracts.length;
    const activeVols = new Set((signupsRes.data || []).filter((s: any) => s.checked_in_at).map((s: any) => s.volunteer_id)).size;

    // Attendance: checked in / total assigned
    const totalAssigned = (signupsRes.data || []).length;
    const totalCheckedIn = (signupsRes.data || []).filter((s: any) => s.checked_in_at).length;
    const attendanceRate = totalAssigned > 0 ? Math.round((totalCheckedIn / totalAssigned) * 100) : 0;

    setStats({ activeVols, signedContracts, sentContracts, attendanceRate });
  };

  useEffect(() => {
    loadSeason();
    loadStats();
  }, [clubId]);

  // Realtime subscription on seasons table
  useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`season-widget-${clubId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'seasons',
        filter: `club_id=eq.${clubId}`,
      }, () => {
        loadSeason();
        loadStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clubId]);

  // Calculate progress
  const now = new Date();
  let weeksElapsed = 0;
  let totalWeeks = 0;
  let daysRemaining = 0;
  let progressPercent = 0;

  if (season) {
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);
    totalWeeks = Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 86400000)));
    weeksElapsed = Math.min(totalWeeks, Math.max(0, Math.round((now.getTime() - start.getTime()) / (7 * 86400000))));
    progressPercent = Math.min(100, Math.round((weeksElapsed / totalWeeks) * 100));
    daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  }

  const showExpiryBanner = season && daysRemaining > 0 && daysRemaining <= 30;

  if (!season) {
    return (
      <div className="w-full h-full bg-card rounded-2xl border border-border p-4 flex flex-col items-center justify-center text-center">
        <CalendarRange className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">
          {t3(language, 'Geen actief seizoen', 'Pas de saison active', 'No active season')}
        </p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/season-contracts')}>
          {t3(language, 'Seizoen aanmaken', 'Créer une saison', 'Create season')} →
        </Button>
      </div>
    );
  }

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';
  const startLabel = new Date(season.start_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const endLabel = new Date(season.end_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <div className="w-full h-full bg-card rounded-2xl border border-border p-4 flex flex-col gap-3 overflow-hidden">
        {/* Expiry banner */}
        {showExpiryBanner && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs"
          >
            <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              ⏰ {t3(language,
                `Het seizoen eindigt over ${daysRemaining} dagen. Vergeet geen contracten te sluiten.`,
                `La saison se termine dans ${daysRemaining} jours. N'oubliez pas de clôturer les contrats.`,
                `Season ends in ${daysRemaining} days. Don't forget to close contracts.`
              )}
            </span>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground truncate">{season.name}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{startLabel} — {endLabel}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] gap-1 shrink-0"
            onClick={() => setShowCloseWizard(true)}
          >
            <CheckCircle className="w-3 h-3" />
            {t3(language, 'Sluit af', 'Clôturer', 'Close')}
          </Button>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>{weeksElapsed}/{totalWeeks} {t3(language, 'weken', 'semaines', 'weeks')}</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/30 rounded-xl px-2.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Users className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold text-foreground leading-none">{stats.activeVols}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {t3(language, 'Vrijwilligers', 'Bénévoles', 'Volunteers')}
            </p>
          </div>
          <div className="bg-muted/30 rounded-xl px-2.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <FileSignature className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold text-foreground leading-none">
              {stats.signedContracts}<span className="text-xs text-muted-foreground font-normal">/{stats.sentContracts}</span>
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {t3(language, 'Contracten', 'Contrats', 'Contracts')}
            </p>
          </div>
          <div className="bg-muted/30 rounded-xl px-2.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <CheckCircle className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold text-foreground leading-none">{stats.attendanceRate}%</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {t3(language, 'Aanwezigheid', 'Présence', 'Attendance')}
            </p>
          </div>
        </div>
      </div>

      {/* Close Season Wizard */}
      {showCloseWizard && season && (
        <CloseSeasonWizard
          open={showCloseWizard}
          onClose={() => setShowCloseWizard(false)}
          clubId={clubId!}
          seasonId={season.id}
          seasonName={season.name}
          language={language}
          onCompleted={() => {
            setShowCloseWizard(false);
            loadSeason();
            loadStats();
          }}
        />
      )}
    </>
  );
};
