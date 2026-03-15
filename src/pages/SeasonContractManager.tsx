import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CalendarDays, Send, FileSignature, Download, CheckCircle, Clock,
  Users, Plus, Loader2, Edit3, AlertCircle, CreditCard, UserCheck, TrendingUp, Euro,
  Archive, ChevronRight, Lock, FileText
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import CreateSeasonDialog from '@/components/CreateSeasonDialog';
import SendSeasonContractDialog from '@/components/SendSeasonContractDialog';
import CloseSeasonWizard from '@/components/CloseSeasonWizard';
import { generateSeasonReport, type SeasonReportVolunteer, type SeasonReportTaskType, type SeasonReportBatch, type MonthlyAttendance, type ContractTypeCompensation, type ContractStatusSummary } from '@/lib/generateSeasonReport';

const SeasonContractManager = () => {
  const { language } = useLanguage();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Active season
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [contractStats, setContractStats] = useState<Record<string, number>>({});
  const [attendanceKpis, setAttendanceKpis] = useState<{ totalTasks: number; avgAttendance: number; totalCompensation: number }>({ totalTasks: 0, avgAttendance: 0, totalCompensation: 0 });

  // Volunteers without contract
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [volunteersWithContract, setVolunteersWithContract] = useState<Set<string>>(new Set());
  const [selectedVols, setSelectedVols] = useState<Set<string>>(new Set());

  // Signed contracts
  const [signedContracts, setSignedContracts] = useState<any[]>([]);

  // Dialogs
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showSendContract, setShowSendContract] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showCloseWizard, setShowCloseWizard] = useState(false);

  // Archived seasons
  const [archivedSeasons, setArchivedSeasons] = useState<any[]>([]);

  // Billing
  const [billing, setBilling] = useState<any>(null);

  const categoryLabels: Record<string, string> = {
    steward: 'Steward',
    bar_catering: t('Bar & Catering', 'Bar & Traiteur', 'Bar & Catering'),
    terrain_material: t('Terrein', 'Terrain', 'Terrain'),
    admin_ticketing: 'Admin / Ticketing',
    event_support: 'Event Support',
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: club } = await supabase.from('clubs').select('id').eq('owner_id', user.id).limit(1).single();
      if (club) {
        setClubId(club.id);
        await loadData(club.id);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadData = async (cId: string) => {
    // Load active season + billing + archived seasons in parallel
    const [seasonRes, billingRes, archivedRes] = await Promise.all([
      supabase.from('seasons').select('*').eq('club_id', cId).eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('club_billing').select('*').eq('club_id', cId).maybeSingle(),
      supabase.from('seasons').select('*').eq('club_id', cId).eq('is_active', false).order('end_date', { ascending: false }),
    ]);

    setActiveSeason(seasonRes.data);
    setArchivedSeasons(archivedRes.data || []);

    if (!billingRes.data) {
      const { data: newBilling } = await supabase.from('club_billing').insert({ club_id: cId }).select().single();
      setBilling(newBilling);
    } else {
      setBilling(billingRes.data);
    }

    const season = seasonRes.data;
    if (!season) return;

    // Load attendance KPIs: task_signups for tasks in this season date range
    const seasonStart = season.start_date;
    const seasonEnd = season.end_date;
    const [tasksKpiRes, hourConfRes] = await Promise.all([
      supabase.from('tasks').select('id').eq('club_id', cId).gte('task_date', seasonStart).lte('task_date', seasonEnd),
      supabase.from('hour_confirmations').select('final_hours, final_amount, task_id').eq('status', 'auto_confirmed'),
    ]);
    const seasonTaskIds = (tasksKpiRes.data || []).map((t: any) => t.id);
    let totalSignups = 0;
    let totalCheckedIn = 0;
    if (seasonTaskIds.length > 0) {
      const [signupCountRes, checkedInRes] = await Promise.all([
        supabase.from('task_signups').select('id', { count: 'exact', head: true }).in('task_id', seasonTaskIds),
        (supabase as any).from('task_signups').select('id', { count: 'exact', head: true }).in('task_id', seasonTaskIds).not('checked_in_at', 'is', null),
      ]);
      totalSignups = signupCountRes.count || 0;
      totalCheckedIn = checkedInRes.count || 0;
    }
    const seasonHours = (hourConfRes.data || []).filter((h: any) => seasonTaskIds.includes(h.task_id));
    const totalComp = seasonHours.reduce((sum: number, h: any) => sum + (h.final_amount || 0), 0);
    setAttendanceKpis({
      totalTasks: seasonTaskIds.length,
      avgAttendance: totalSignups > 0 ? Math.round((totalCheckedIn / totalSignups) * 100) : 0,
      totalCompensation: totalComp,
    });

    // Load contract stats per template category
    const { data: contracts } = await supabase
      .from('season_contracts')
      .select('id, template_id, status, volunteer_id, signing_url, document_url, created_at')
      .eq('season_id', season.id)
      .eq('club_id', cId);

    const allContracts = contracts || [];

    // Get template categories
    const templateIds = [...new Set(allContracts.map(c => c.template_id))];
    let tmplMap = new Map<string, string>();
    let tmplNameMap = new Map<string, string>();
    if (templateIds.length > 0) {
      const { data: tmpls } = await supabase.from('season_contract_templates').select('id, category, name').in('id', templateIds);
      (tmpls || []).forEach(t => {
        tmplMap.set(t.id, t.category);
        tmplNameMap.set(t.id, t.name);
      });
    }

    // Stats
    const stats: Record<string, number> = {};
    allContracts.forEach(c => {
      const cat = tmplMap.get(c.template_id) || 'other';
      stats[cat] = (stats[cat] || 0) + 1;
    });
    setContractStats(stats);

    // Volunteers with contract in this season
    const volsWithContract = new Set(allContracts.map(c => c.volunteer_id));
    setVolunteersWithContract(volsWithContract);

    // Signed contracts enriched
    const signed = allContracts.filter(c => c.status === 'signed');
    const volIds = [...new Set(signed.map(c => c.volunteer_id))];
    let volNameMap = new Map<string, any>();
    if (volIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', volIds);
      (profiles || []).forEach(p => volNameMap.set(p.id, p));
    }
    setSignedContracts(signed.map(c => ({
      ...c,
      volunteer_name: volNameMap.get(c.volunteer_id)?.full_name || '—',
      volunteer_avatar: volNameMap.get(c.volunteer_id)?.avatar_url,
      template_category: tmplMap.get(c.template_id) || '',
      template_name: tmplNameMap.get(c.template_id) || '',
    })));

    // Load all club members
    const { data: members } = await supabase
      .from('club_memberships')
      .select('volunteer_id')
      .eq('club_id', cId)
      .eq('status', 'active');

    const memberIds = (members || []).map(m => m.volunteer_id);
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', memberIds);
      setVolunteers(profiles || []);
    }
  };

  // No more blocking — billing is automatic per volunteer when they complete 3+ tasks
  const handleSendClick = () => {
    setShowSendContract(true);
  };

  const volunteersWithoutContract = useMemo(
    () => volunteers.filter(v => !volunteersWithContract.has(v.id)),
    [volunteers, volunteersWithContract]
  );

  const toggleVol = (id: string) => {
    setSelectedVols(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateSeasonReport = async () => {
    if (!clubId || !activeSeason) return;
    setGeneratingReport(true);
    try {
      const seasonStart = activeSeason.start_date;
      const seasonEnd = activeSeason.end_date;
      const { data: club } = await supabase.from('clubs').select('name, logo_url').eq('id', clubId).single();
      const { data: seasonTasks } = await supabase.from('tasks').select('id, title, task_date').eq('club_id', clubId).gte('task_date', seasonStart).lte('task_date', seasonEnd);
      const taskIds = (seasonTasks || []).map((t: any) => t.id);
      const [hourConfsRes, contractsRes, allContractsRes] = await Promise.all([
        taskIds.length > 0
          ? supabase.from('hour_confirmations').select('*').in('task_id', taskIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('season_contracts').select('volunteer_id, template_id').eq('season_id', activeSeason.id),
        supabase.from('season_contracts').select('status, template_id').eq('season_id', activeSeason.id).eq('club_id', clubId),
      ]);
      const hourConfs = hourConfsRes.data || [];
      const contracts = contractsRes.data || [];
      const allSeasonContracts = allContractsRes.data || [];

      const templateIds = [...new Set(contracts.map((c: any) => c.template_id))];
      let tmplCatMap = new Map<string, string>();
      if (templateIds.length > 0) {
        const { data: tmpls } = await supabase.from('season_contract_templates').select('id, category').in('id', templateIds);
        (tmpls || []).forEach((t: any) => tmplCatMap.set(t.id, t.category));
      }
      const volIds = [...new Set(hourConfs.map((h: any) => h.volunteer_id))];
      let profileMap = new Map<string, string>();
      if (volIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', volIds);
        (profiles || []).forEach((p: any) => profileMap.set(p.id, p.full_name || '—'));
      }
      const volMap = new Map<string, SeasonReportVolunteer>();
      hourConfs.forEach((h: any) => {
        const existing = volMap.get(h.volunteer_id) || { name: profileMap.get(h.volunteer_id) || '—', contractType: '', taskCount: 0, hours: 0, compensation: 0 };
        existing.taskCount += 1;
        existing.hours += (h.final_hours || 0);
        existing.compensation += (h.final_amount || 0);
        volMap.set(h.volunteer_id, existing);
      });
      contracts.forEach((c: any) => { const v = volMap.get(c.volunteer_id); if (v) v.contractType = tmplCatMap.get(c.template_id) || ''; });
      const taskTypeMap = new Map<string, SeasonReportTaskType>();
      const taskTitleMap = new Map<string, string>();
      (seasonTasks || []).forEach((t: any) => taskTitleMap.set(t.id, t.title));
      hourConfs.forEach((h: any) => {
        const title = taskTitleMap.get(h.task_id) || 'Other';
        const existing = taskTypeMap.get(title) || { type: title, count: 0, totalHours: 0, totalCompensation: 0 };
        existing.count += 1; existing.totalHours += (h.final_hours || 0); existing.totalCompensation += (h.final_amount || 0);
        taskTypeMap.set(title, existing);
      });
      const { data: batches } = await supabase.from('sepa_batches').select('reference, created_at, item_count, total_amount, status').eq('club_id', clubId);
      const seasonBatches: SeasonReportBatch[] = (batches || []).filter((b: any) => b.created_at >= seasonStart && b.created_at <= seasonEnd)
        .map((b: any) => ({ reference: b.reference, date: b.created_at, itemCount: b.item_count || 0, totalAmount: b.total_amount || 0, status: b.status }));
      const totalHours = [...volMap.values()].reduce((s, v) => s + v.hours, 0);
      const totalComp = [...volMap.values()].reduce((s, v) => s + v.compensation, 0);

      // === NEW: Monthly attendance ===
      const taskDateMap = new Map<string, string>();
      (seasonTasks || []).forEach((t: any) => { if (t.task_date) taskDateMap.set(t.id, t.task_date); });
      const monthMap = new Map<string, { signups: number; attended: number }>();
      if (taskIds.length > 0) {
        const { data: signupRows } = await supabase.from('task_signups').select('task_id, checked_in_at').in('task_id', taskIds);
        (signupRows || []).forEach((s: any) => {
          const taskDate = taskDateMap.get(s.task_id);
          if (!taskDate) return;
          const monthKey = taskDate.substring(0, 7); // "YYYY-MM"
          const entry = monthMap.get(monthKey) || { signups: 0, attended: 0 };
          entry.signups += 1;
          if (s.checked_in_at) entry.attended += 1;
          monthMap.set(monthKey, entry);
        });
      }
      const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';
      const monthlyAtt: MonthlyAttendance[] = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => {
          const d = new Date(key + '-01');
          return {
            month: key,
            label: d.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
            signups: val.signups,
            attended: val.attended,
            rate: val.signups > 0 ? Math.round((val.attended / val.signups) * 100) : 0,
          };
        });

      // === NEW: Compensation per contract type ===
      const compByType = new Map<string, { totalCompensation: number; volunteers: Set<string> }>();
      contracts.forEach((c: any) => {
        const cat = tmplCatMap.get(c.template_id) || 'Other';
        const vol = volMap.get(c.volunteer_id);
        const entry = compByType.get(cat) || { totalCompensation: 0, volunteers: new Set() };
        entry.volunteers.add(c.volunteer_id);
        if (vol) entry.totalCompensation += vol.compensation;
        compByType.set(cat, entry);
      });
      const compPerType: ContractTypeCompensation[] = [...compByType.entries()].map(([type, val]) => ({
        contractType: type, totalCompensation: val.totalCompensation, volunteerCount: val.volunteers.size,
      }));

      // === NEW: Contract status ===
      const contractStatusData: ContractStatusSummary = {
        signed: allSeasonContracts.filter((c: any) => c.status === 'signed').length,
        pending: allSeasonContracts.filter((c: any) => c.status === 'pending').length,
        sent: allSeasonContracts.filter((c: any) => c.status === 'sent').length,
        total: allSeasonContracts.length,
      };
      const doc = await generateSeasonReport({
        clubName: club?.name || '—', clubLogoUrl: club?.logo_url || null,
        seasonName: activeSeason.name, seasonStart, seasonEnd,
        totalVolunteers: volMap.size, totalTasks: taskIds.length, totalHours, totalCompensation: totalComp,
        volunteers: [...volMap.values()].sort((a, b) => b.compensation - a.compensation),
        taskTypes: [...taskTypeMap.values()].sort((a, b) => b.count - a.count),
        sepaBatches: seasonBatches, language,
        monthlyAttendance: monthlyAtt,
        top5Volunteers: [...volMap.values()].sort((a, b) => b.taskCount - a.taskCount).slice(0, 5),
        compensationPerContractType: compPerType,
        contractStatus: contractStatusData,
      });
      doc.save(`seizoensrapport-${activeSeason.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success(t('Seizoensrapport gedownload!', 'Rapport de saison téléchargé!', 'Season report downloaded!'));
    } catch (err: any) { toast.error(err?.message || 'Error'); }
    setGeneratingReport(false);
  };

  if (loading) {
    return (
      <ClubPageLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ClubPageLayout>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <PageNavTabs tabs={[
          { label: 'Overzicht', path: '/volunteer-management' },
          { label: 'Contracten', path: '/season-contracts' },
          { label: 'Contract Builder', path: '/contract-builder' },
          { label: 'Sjablonen', path: '/contract-templates' },
          { label: 'Briefings', path: '/briefing-builder' },
          { label: 'Vergoedingen', path: '/sepa-payouts' },
          { label: 'Compliance', path: '/compliance' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {t('Seizoenscontracten', 'Contrats saisonniers', 'Season Contracts')}
            </h1>
            {activeSeason && (
              <p className="text-sm text-muted-foreground mt-1">
                {activeSeason.name} — {new Date(activeSeason.start_date).toLocaleDateString()} → {new Date(activeSeason.end_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {activeSeason && (
              <Button onClick={() => setShowCloseWizard(true)} variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                <Lock className="w-4 h-4 mr-1" />
                {t('Sluit seizoen af', 'Clôturer la saison', 'Close season')}
              </Button>
            )}
            <Button onClick={() => setShowCreateSeason(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              {t('Nieuw seizoen', 'Nouvelle saison', 'New season')}
            </Button>
          </div>
        </div>

        {!activeSeason ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('Geen actief seizoen. Maak een seizoen aan om te starten.', 'Aucune saison active.', 'No active season. Create one to get started.')}</p>
              <Button onClick={() => setShowCreateSeason(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-1" />{t('Seizoen aanmaken', 'Créer une saison', 'Create season')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Attendance KPI Widget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{attendanceKpis.totalTasks}</p>
                    <p className="text-xs text-muted-foreground">{t('Taken dit seizoen', 'Tâches cette saison', 'Tasks this season')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${attendanceKpis.avgAttendance < 50 ? 'text-destructive' : 'text-foreground'}`}>{attendanceKpis.avgAttendance}%</p>
                    <p className="text-xs text-muted-foreground">{t('Gem. aanwezigheidsgraad', 'Taux de présence moyen', 'Avg attendance rate')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Euro className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">€{attendanceKpis.totalCompensation.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{t('Totale vergoedingen', 'Compensations totales', 'Total compensations')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">{t('Actief seizoen', 'Saison active', 'Active season')}</TabsTrigger>
              <TabsTrigger value="send">{t('Contracten versturen', 'Envoyer contrats', 'Send contracts')}</TabsTrigger>
              <TabsTrigger value="signed">{t('Ondertekend', 'Signés', 'Signed')}</TabsTrigger>
              {archivedSeasons.length > 0 && (
                <TabsTrigger value="archived">{t('Vorige seizoenen', 'Saisons précédentes', 'Previous seasons')}</TabsTrigger>
              )}
            </TabsList>

            {/* Tab 1: Active season overview */}
            <TabsContent value="overview">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(categoryLabels).map(([cat, label]) => (
                  <Card key={cat}>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{contractStats[cat] || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="mt-4">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('Totaal contracten', 'Total contrats', 'Total contracts')}</p>
                    <p className="text-3xl font-bold text-primary">{Object.values(contractStats).reduce((a, b) => a + b, 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t('Vrijwilligers zonder contract', 'Bénévoles sans contrat', 'Volunteers without contract')}</p>
                    <p className="text-2xl font-bold text-muted-foreground">{volunteersWithoutContract.length}</p>
                  </div>
                </CardContent>
              </Card>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateSeasonReport} disabled={generatingReport}>
                  {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {t('Genereer seizoensrapport', 'Générer rapport de saison', 'Generate season report')}
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Send contracts */}
            <TabsContent value="send">
              {volunteersWithoutContract.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{t('Alle vrijwilligers hebben al een contract!', 'Tous les bénévoles ont un contrat!', 'All volunteers have a contract!')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {volunteersWithoutContract.length} {t('vrijwilligers zonder contract', 'bénévoles sans contrat', 'volunteers without contract')}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedVols(new Set(volunteersWithoutContract.map(v => v.id)))}>
                        {t('Selecteer alles', 'Tout sélectionner', 'Select all')}
                      </Button>
                      <Button
                        size="sm"
                        disabled={selectedVols.size === 0}
                        onClick={handleSendClick}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        {t(`Verstuur (${selectedVols.size})`, `Envoyer (${selectedVols.size})`, `Send (${selectedVols.size})`)}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 border border-border rounded-xl p-2 max-h-[500px] overflow-y-auto">
                    {volunteersWithoutContract.map(vol => (
                      <button
                        key={vol.id}
                        onClick={() => toggleVol(vol.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                          selectedVols.has(vol.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                          selectedVols.has(vol.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {selectedVols.has(vol.id) && <span className="text-primary-foreground text-[10px]">✓</span>}
                        </div>
                        <Avatar className="h-8 w-8 shrink-0">
                          {vol.avatar_url && <AvatarImage src={vol.avatar_url} />}
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {(vol.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{vol.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{vol.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Signed contracts */}
            <TabsContent value="signed">
              {signedContracts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <FileSignature className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{t('Nog geen ondertekende contracten.', 'Aucun contrat signé.', 'No signed contracts yet.')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {signedContracts.map((c: any) => (
                    <div key={c.id} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          {c.volunteer_avatar && <AvatarImage src={c.volunteer_avatar} />}
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {(c.volunteer_name || '?')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.volunteer_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {categoryLabels[c.template_category] || c.template_category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {c.document_url && (
                        <a href={c.document_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-muted transition-colors shrink-0">
                          <Download className="w-3.5 h-3.5" />{t('PDF', 'PDF', 'PDF')}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            {/* Tab 4: Archived seasons */}
            {archivedSeasons.length > 0 && (
              <TabsContent value="archived">
                <div className="space-y-3">
                  {archivedSeasons.map((s: any) => (
                    <Card key={s.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-muted">
                              <Archive className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(s.start_date).toLocaleDateString()} → {new Date(s.end_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {t('Afgesloten', 'Clôturé', 'Closed')}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
          </>
        )}
      </div>

      {/* Dialogs */}
      {clubId && (
        <>
          <CreateSeasonDialog
            open={showCreateSeason}
            onClose={() => setShowCreateSeason(false)}
            clubId={clubId}
            language={language}
            onCreated={() => loadData(clubId)}
          />
          {activeSeason && (
            <>
              <SendSeasonContractDialog
                open={showSendContract}
                onClose={() => setShowSendContract(false)}
                clubId={clubId}
                seasonId={activeSeason.id}
                language={language}
                volunteers={volunteersWithoutContract}
                preSelectedIds={[...selectedVols]}
                onSent={() => {
                  setSelectedVols(new Set());
                  loadData(clubId);
                }}
              />
              <CloseSeasonWizard
                open={showCloseWizard}
                onClose={() => setShowCloseWizard(false)}
                clubId={clubId}
                seasonId={activeSeason.id}
                seasonName={activeSeason.name}
                language={language}
                onCompleted={() => loadData(clubId)}
              />
            </>
          )}
        </>
      )}

      {/* Billing info removed — billing is now automatic per volunteer */}
    </ClubPageLayout>
  );
};

export default SeasonContractManager;
