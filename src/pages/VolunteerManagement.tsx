import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Search, FileSignature, CheckCircle, Clock, UserCheck, Filter, Send, CalendarDays, ChevronRight, Plus, Star, Tag, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import CreateSeasonDialog from '@/components/CreateSeasonDialog';
import SendSeasonContractDialog from '@/components/SendSeasonContractDialog';
import ContractTypePicker, { ContractTypeKey, CONTRACT_TYPES } from '@/components/ContractTypePicker';
import ContractStatusIndicator from '@/components/ContractStatusIndicator';

interface VolunteerRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  contracts: { id: string; status: string; category: string; template_name: string; signing_url: string | null; signed_at: string | null }[];
  check_in_count: number;
  is_paying: boolean;
  avg_rating: number | null;
  review_count: number;
  memberContractTypes: ContractTypeKey[];
  membership_id: string | null;
}

const VolunteerManagement = () => {
  const { clubId } = useClubContext();
  const { language } = useLanguage();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [volunteers, setVolunteers] = useState<VolunteerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string } | null>(null);

  // Dialogs
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showSendContract, setShowSendContract] = useState(false);
  const [showBulkContractType, setShowBulkContractType] = useState(false);
  const [bulkContractTypes, setBulkContractTypes] = useState<Set<ContractTypeKey>>(new Set());
  const [filterMemberType, setFilterMemberType] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Auto-create season on first load
  const ensureSeason = useCallback(async () => {
    if (!clubId) return null;

    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .limit(1);

    if (seasons?.[0]) return seasons[0];

    // Auto-create current sport season (July-June)
    const now = new Date();
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const endYear = startYear + 1;
    const name = `Seizoen ${startYear}-${endYear}`;

    const { data: created, error } = await supabase
      .from('seasons')
      .insert({
        club_id: clubId,
        name,
        start_date: `${startYear}-07-01`,
        end_date: `${endYear}-06-30`,
        is_active: true,
      })
      .select('id, name, start_date, end_date')
      .single();

    if (error) {
      console.error('Auto-create season error:', error);
      return null;
    }

    toast.success(t(`${name} automatisch aangemaakt`, `${name} créée automatiquement`, `${name} auto-created`));
    return created;
  }, [clubId]);

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);

    const season = await ensureSeason();
    if (season) {
      setActiveSeason({ id: season.id, name: season.name });
    }

    // Parallel: contracts, templates, check-ins, club members, memberships
    const [contractsRes, templatesRes, checkInsRes, membersRes, membershipsRes] = await Promise.all([
      supabase.from('season_contracts').select('id, volunteer_id, status, template_id, signing_url, signed_at').eq('club_id', clubId),
      supabase.from('season_contract_templates').select('id, name, category').or(`club_id.eq.${clubId},is_system.eq.true`),
      season
        ? supabase.from('season_checkins').select('volunteer_id, season_contract_id').eq('club_id', clubId)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from('club_members').select('user_id').eq('club_id', clubId),
      supabase.from('club_memberships').select('id, volunteer_id').eq('club_id', clubId),
    ]);

    const contracts = contractsRes.data || [];
    const templates = templatesRes.data || [];
    const checkIns = (checkInsRes as any).data || [];
    const members = membersRes.data || [];
    const memberships = membershipsRes.data || [];

    // Map volunteer_id -> membership_id
    const membershipMap = new Map(memberships.map(m => [m.volunteer_id, m.id]));

    // Fetch member_contract_types
    const msIds = memberships.map(m => m.id);
    let ctMap = new Map<string, ContractTypeKey[]>();
    if (msIds.length > 0) {
      const { data: ctData } = await supabase.from('member_contract_types' as any).select('membership_id, contract_type').in('membership_id', msIds);
      (ctData as any[] || []).forEach((ct: any) => {
        const arr = ctMap.get(ct.membership_id) || [];
        arr.push(ct.contract_type);
        ctMap.set(ct.membership_id, arr);
      });
    }

    // Count check-ins per volunteer
    const checkInCounts: Record<string, number> = {};
    checkIns.forEach((ci: any) => {
      checkInCounts[ci.volunteer_id] = (checkInCounts[ci.volunteer_id] || 0) + 1;
    });

    // Get unique volunteer IDs (from contracts, check-ins, and members)
    const volunteerIds = [...new Set([
      ...contracts.map(c => c.volunteer_id),
      ...Object.keys(checkInCounts),
      ...members.map(m => m.user_id),
    ])];

    if (volunteerIds.length === 0) {
      setVolunteers([]);
      setLoading(false);
      return;
    }

    const [profilesRes, reviewsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', volunteerIds),
      supabase.from('task_reviews' as any).select('reviewee_id, rating').eq('reviewer_role', 'club').in('reviewee_id', volunteerIds),
    ]);

    const profiles = profilesRes.data || [];
    const templateMap = new Map(templates.map(t => [t.id, t]));

    // Calculate avg ratings
    const ratingData: Record<string, { sum: number; count: number }> = {};
    ((reviewsRes.data || []) as any[]).forEach((r: any) => {
      if (!ratingData[r.reviewee_id]) ratingData[r.reviewee_id] = { sum: 0, count: 0 };
      ratingData[r.reviewee_id].sum += r.rating;
      ratingData[r.reviewee_id].count += 1;
    });

    const rows: VolunteerRow[] = profiles.map(p => {
      const volContracts = contracts
        .filter(c => c.volunteer_id === p.id)
        .map(c => {
          const tmpl = templateMap.get(c.template_id);
          return {
            id: c.id,
            status: c.status,
            category: tmpl?.category || 'event_support',
            template_name: tmpl?.name || 'Contract',
            signing_url: (c as any).signing_url || null,
            signed_at: (c as any).signed_at || null,
          };
        });

      const count = checkInCounts[p.id] || 0;
      const rd = ratingData[p.id];
      const msId = membershipMap.get(p.id) || null;

      return {
        id: p.id,
        full_name: p.full_name || t('Onbekend', 'Inconnu', 'Unknown'),
        email: p.email || '',
        avatar_url: p.avatar_url,
        contracts: volContracts,
        check_in_count: count,
        is_paying: count >= 4,
        avg_rating: rd ? rd.sum / rd.count : null,
        review_count: rd?.count || 0,
        memberContractTypes: msId ? ctMap.get(msId) || [] : [],
        membership_id: msId,
      };
    });

    setVolunteers(rows.sort((a, b) => b.check_in_count - a.check_in_count));
    setLoading(false);
  }, [clubId, ensureSeason]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryLabels: Record<string, string> = {
    steward: 'Steward',
    bar_catering: t('Bar & Catering', 'Bar & Traiteur', 'Bar & Catering'),
    terrain_material: t('Terrein', 'Terrain', 'Terrain'),
    admin_ticketing: t('Admin / Ticketing', 'Admin / Billetterie', 'Admin / Ticketing'),
    event_support: t('Event Support', 'Support événement', 'Event Support'),
    custom: 'Custom',
  };

  const filtered = useMemo(() => {
    return volunteers.filter(v => {
      if (search && !v.full_name.toLowerCase().includes(search.toLowerCase()) && !v.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && !v.contracts.some(c => c.category === filterCategory)) return false;
      if (filterMemberType !== 'all' && !v.memberContractTypes.includes(filterMemberType as ContractTypeKey)) return false;
      if (filterStatus === 'signed' && !v.contracts.some(c => c.status === 'signed')) return false;
      if (filterStatus === 'pending' && !v.contracts.some(c => c.status !== 'signed')) return false;
      if (filterStatus === 'no_contract' && v.contracts.some(c => c.status === 'signed')) return false;
      if (filterStatus === 'paying' && !v.is_paying) return false;
      if (filterStatus === 'trial' && v.is_paying) return false;
      return true;
    });
  }, [volunteers, search, filterCategory, filterStatus, filterMemberType]);

  const stats = useMemo(() => ({
    total: volunteers.length,
    signed: volunteers.filter(v => v.contracts.some(c => c.status === 'signed')).length,
    paying: volunteers.filter(v => v.is_paying).length,
    trial: volunteers.filter(v => !v.is_paying).length,
  }), [volunteers]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(v => v.id)));
    }
  };

  const openSendDialog = (ids?: string[]) => {
    if (ids) setSelectedIds(new Set(ids));
    setShowSendContract(true);
  };

  const handleBulkSetContractType = async () => {
    if (bulkContractTypes.size === 0 || selectedIds.size === 0) return;
    const vols = volunteers.filter(v => selectedIds.has(v.id) && v.membership_id);
    let success = 0;
    for (const vol of vols) {
      await supabase.from('member_contract_types' as any).delete().eq('membership_id', vol.membership_id);
      const inserts = Array.from(bulkContractTypes).map(ct => ({ membership_id: vol.membership_id, contract_type: ct }));
      const { error } = await supabase.from('member_contract_types' as any).insert(inserts);
      if (!error) success++;
    }
    toast.success(t(`${success} vrijwilligers bijgewerkt`, `${success} bénévoles mis à jour`, `${success} volunteers updated`));
    setShowBulkContractType(false);
    setBulkContractTypes(new Set());
    setSelectedIds(new Set());
    loadData();
  };

  return (
    <ClubPageLayout>
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              {t('Vrijwilligersbeheer', 'Gestion des bénévoles', 'Volunteer Management')}
            </h1>
            {activeSeason ? (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5" />
                {activeSeason.name}
                <button onClick={() => setShowCreateSeason(true)} className="text-primary hover:underline text-xs">
                  {t('Wijzig', 'Modifier', 'Change')}
                </button>
              </p>
            ) : (
              <Button variant="outline" size="sm" className="mt-1" onClick={() => setShowCreateSeason(true)}>
                <Plus className="w-4 h-4 mr-1" />
                {t('Seizoen aanmaken', 'Créer saison', 'Create season')}
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <>
                <Button onClick={() => openSendDialog()} className="gap-2">
                  <Send className="w-4 h-4" />
                  {t(`Contract versturen (${selectedIds.size})`, `Envoyer contrat (${selectedIds.size})`, `Send contract (${selectedIds.size})`)}
                </Button>
                <Button variant="outline" onClick={() => setShowBulkContractType(true)} className="gap-2">
                  <Tag className="w-4 h-4" />
                  {t('Stel contracttype in', 'Définir type', 'Set contract type')}
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={loadData}>
              {t('Vernieuwen', 'Actualiser', 'Refresh')}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('Totaal', 'Total', 'Total'), value: stats.total, icon: Users, color: 'text-primary' },
            { label: t('Contract getekend', 'Contrat signé', 'Contract signed'), value: stats.signed, icon: CheckCircle, color: 'text-green-600' },
            { label: t('Actief (≥4x)', 'Actif (≥4x)', 'Active (≥4x)'), value: stats.paying, icon: UserCheck, color: 'text-blue-600' },
            { label: t('Proefperiode', 'Période d\'essai', 'Trial'), value: stats.trial, icon: Clock, color: 'text-yellow-600' },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm">
              <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('Zoek op naam of e-mail...', 'Rechercher par nom ou e-mail...', 'Search by name or email...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('Contracttype', 'Type de contrat', 'Contract type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Alle types', 'Tous les types', 'All types')}</SelectItem>
              {Object.entries(categoryLabels).filter(([k]) => k !== 'custom').map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMemberType} onValueChange={setFilterMemberType}>
            <SelectTrigger className="w-full md:w-48">
              <Tag className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('Lidtype', 'Type membre', 'Member type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Alle lidtypes', 'Tous les types', 'All member types')}</SelectItem>
              {CONTRACT_TYPES.map(ct => (
                <SelectItem key={ct.key} value={ct.key}>{ct.icon} {language === 'nl' ? ct.nl : language === 'fr' ? ct.fr : ct.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Alle', 'Tous', 'All')}</SelectItem>
              <SelectItem value="signed">{t('Getekend', 'Signé', 'Signed')}</SelectItem>
              <SelectItem value="pending">{t('In afwachting', 'En attente', 'Pending')}</SelectItem>
              <SelectItem value="no_contract">{t('Zonder geldig contract', 'Sans contrat valide', 'Without valid contract')}</SelectItem>
              <SelectItem value="paying">{t('Actief (≥4x)', 'Actif (≥4x)', 'Active (≥4x)')}</SelectItem>
              <SelectItem value="trial">{t('Proefperiode', 'Essai', 'Trial')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk action bar */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-muted-foreground">
              {selectedIds.size > 0
                ? t(`${selectedIds.size} geselecteerd`, `${selectedIds.size} sélectionné(s)`, `${selectedIds.size} selected`)
                : t('Alles selecteren', 'Tout sélectionner', 'Select all')}
            </span>
          </div>
        )}

        {/* Volunteer List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p>{t('Laden...', 'Chargement...', 'Loading...')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('Geen vrijwilligers gevonden', 'Aucun bénévole trouvé', 'No volunteers found')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((vol, i) => (
              <motion.div key={vol.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className={`bg-card rounded-2xl p-4 border shadow-sm hover:shadow-md transition-shadow ${
                  selectedIds.has(vol.id) ? 'border-primary/40 bg-primary/5' : 'border-border'
                }`}>
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <Checkbox
                    checked={selectedIds.has(vol.id)}
                    onCheckedChange={() => toggleSelect(vol.id)}
                    className="shrink-0"
                  />

                  {/* Avatar */}
                  <Avatar className="h-11 w-11 shrink-0">
                    {vol.avatar_url && <AvatarImage src={vol.avatar_url} alt={vol.full_name} />}
                    <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                      {vol.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name & email */}
                   <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{vol.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{vol.email}</p>
                    {vol.avg_rating !== null && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium text-foreground">{vol.avg_rating.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">({vol.review_count})</span>
                      </div>
                    )}
                    {vol.memberContractTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {vol.memberContractTypes.map(ct => (
                          <span key={ct} className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-secondary/50 text-secondary-foreground font-medium capitalize">
                            {ct.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contract status indicator */}
                  <ContractStatusIndicator
                    contracts={vol.contracts}
                    volunteerId={vol.id}
                    volunteerName={vol.full_name}
                    language={language}
                    onResend={(id) => openSendDialog([id])}
                  />

                  {/* Contract badges */}
                  <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                    {vol.contracts.length === 0 ? (
                      <Badge variant="outline" className="text-[10px]">{t('Geen contract', 'Pas de contrat', 'No contract')}</Badge>
                    ) : (
                      vol.contracts.map(c => (
                        <Badge key={c.id} variant={c.status === 'signed' ? 'default' : 'secondary'} className="text-[10px]">
                          {c.status === 'signed' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                          {categoryLabels[c.category] || c.template_name}
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Attendance */}
                  <div className="text-center shrink-0 min-w-[60px]">
                    <p className={`text-lg font-bold ${vol.is_paying ? 'text-green-600' : 'text-yellow-600'}`}>
                      {vol.check_in_count}x
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {vol.is_paying ? t('Actief', 'Actif', 'Active') : t('Proef', 'Essai', 'Trial')}
                    </p>
                  </div>

                  {/* 4-times indicator */}
                  <div className="hidden sm:flex items-center gap-1">
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className={`w-2.5 h-2.5 rounded-full ${vol.check_in_count >= n ? 'bg-green-500' : 'bg-muted'}`} />
                    ))}
                  </div>

                  {/* Send contract button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); openSendDialog([vol.id]); }}
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{t('Contract', 'Contrat', 'Contract')}</span>
                  </Button>
                </div>

                {/* Mobile contract badges */}
                <div className="md:hidden flex items-center gap-1.5 flex-wrap mt-3">
                  {vol.contracts.length === 0 ? (
                    <Badge variant="outline" className="text-[10px]">{t('Geen contract', 'Pas de contrat', 'No contract')}</Badge>
                  ) : (
                    vol.contracts.map(c => (
                      <Badge key={c.id} variant={c.status === 'signed' ? 'default' : 'secondary'} className="text-[10px]">
                        {categoryLabels[c.category] || c.template_name}
                      </Badge>
                    ))
                  )}
                </div>
              </motion.div>
            ))}
          </div>
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
            onCreated={loadData}
          />
          {activeSeason && (
            <SendSeasonContractDialog
              open={showSendContract}
              onClose={() => { setShowSendContract(false); setSelectedIds(new Set()); }}
              clubId={clubId}
              seasonId={activeSeason.id}
              language={language}
              volunteers={filtered.map(v => ({ id: v.id, full_name: v.full_name, email: v.email, avatar_url: v.avatar_url }))}
              preSelectedIds={[...selectedIds]}
              onSent={loadData}
            />
          )}

          {/* Bulk contract type dialog */}
          {showBulkContractType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowBulkContractType(false)}>
              <div className="bg-card rounded-2xl shadow-elevated p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-heading font-semibold text-foreground mb-1">
                  {t('Contracttype instellen', 'Définir le type de contrat', 'Set contract type')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t(`Voor ${selectedIds.size} geselecteerde vrijwilligers`, `Pour ${selectedIds.size} bénévoles sélectionnés`, `For ${selectedIds.size} selected volunteers`)}
                </p>
                <ContractTypePicker
                  selected={bulkContractTypes}
                  onChange={setBulkContractTypes}
                  language={language}
                  multiSelect={true}
                />
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowBulkContractType(false)}>
                    {t('Annuleren', 'Annuler', 'Cancel')}
                  </Button>
                  <Button className="flex-1" onClick={handleBulkSetContractType} disabled={bulkContractTypes.size === 0}>
                    {t('Opslaan', 'Enregistrer', 'Save')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ClubPageLayout>
  );
};

export default VolunteerManagement;
