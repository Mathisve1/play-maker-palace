import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, FileSignature, CheckCircle, Clock, UserCheck, Filter, Send, QrCode, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface VolunteerRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  contracts: { id: string; status: string; category: string; template_name: string }[];
  check_in_count: number;
  is_paying: boolean;
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

  useEffect(() => {
    if (!clubId) return;
    loadData();
  }, [clubId]);

  const loadData = async () => {
    if (!clubId) return;
    setLoading(true);

    // Get active season
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .limit(1);

    const season = seasons?.[0];
    if (season) {
      setActiveSeason({ id: season.id, name: season.name });
    }

    // Get all contracts for this club
    const { data: contracts } = await supabase
      .from('season_contracts')
      .select('id, volunteer_id, status, template_id')
      .eq('club_id', clubId);

    // Get templates
    const { data: templates } = await supabase
      .from('season_contract_templates')
      .select('id, name, category')
      .or(`club_id.eq.${clubId},is_system.eq.true`);

    // Get check-ins for the active season
    const checkInQuery = supabase
      .from('volunteer_check_ins')
      .select('volunteer_id')
      .eq('club_id', clubId);
    
    if (season) {
      checkInQuery.eq('season_id', season.id);
    }
    const { data: checkIns } = await checkInQuery;

    // Count check-ins per volunteer
    const checkInCounts: Record<string, number> = {};
    (checkIns || []).forEach(ci => {
      checkInCounts[ci.volunteer_id] = (checkInCounts[ci.volunteer_id] || 0) + 1;
    });

    // Get unique volunteer IDs
    const volunteerIds = [...new Set([
      ...(contracts || []).map(c => c.volunteer_id),
      ...Object.keys(checkInCounts),
    ])];

    if (volunteerIds.length === 0) {
      setVolunteers([]);
      setLoading(false);
      return;
    }

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', volunteerIds);

    const templateMap = new Map((templates || []).map(t => [t.id, t]));

    const rows: VolunteerRow[] = (profiles || []).map(p => {
      const volContracts = (contracts || [])
        .filter(c => c.volunteer_id === p.id)
        .map(c => {
          const tmpl = templateMap.get(c.template_id);
          return {
            id: c.id,
            status: c.status,
            category: tmpl?.category || 'event_support',
            template_name: tmpl?.name || 'Contract',
          };
        });

      const count = checkInCounts[p.id] || 0;

      return {
        id: p.id,
        full_name: p.full_name || t('Onbekend', 'Inconnu', 'Unknown'),
        email: p.email || '',
        avatar_url: p.avatar_url,
        contracts: volContracts,
        check_in_count: count,
        is_paying: count >= 4,
      };
    });

    setVolunteers(rows.sort((a, b) => b.check_in_count - a.check_in_count));
    setLoading(false);
  };

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
      if (filterStatus === 'signed' && !v.contracts.some(c => c.status === 'signed')) return false;
      if (filterStatus === 'pending' && !v.contracts.some(c => c.status !== 'signed')) return false;
      if (filterStatus === 'paying' && !v.is_paying) return false;
      if (filterStatus === 'trial' && v.is_paying) return false;
      return true;
    });
  }, [volunteers, search, filterCategory, filterStatus]);

  const stats = useMemo(() => ({
    total: volunteers.length,
    signed: volunteers.filter(v => v.contracts.some(c => c.status === 'signed')).length,
    paying: volunteers.filter(v => v.is_paying).length,
    trial: volunteers.filter(v => !v.is_paying).length,
  }), [volunteers]);

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
            {activeSeason && (
              <p className="text-sm text-muted-foreground mt-1">{activeSeason.name}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            {t('Vernieuwen', 'Actualiser', 'Refresh')}
          </Button>
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
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Alle', 'Tous', 'All')}</SelectItem>
              <SelectItem value="signed">{t('Getekend', 'Signé', 'Signed')}</SelectItem>
              <SelectItem value="pending">{t('In afwachting', 'En attente', 'Pending')}</SelectItem>
              <SelectItem value="paying">{t('Actief (≥4x)', 'Actif (≥4x)', 'Active (≥4x)')}</SelectItem>
              <SelectItem value="trial">{t('Proefperiode', 'Essai', 'Trial')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
            {!activeSeason && (
              <p className="text-xs mt-2">{t('Maak eerst een seizoen aan om te beginnen.', 'Créez d\'abord une saison pour commencer.', 'Create a season first to get started.')}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((vol, i) => (
              <motion.div key={vol.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
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
                  </div>

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

                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
    </ClubPageLayout>
  );
};

export default VolunteerManagement;
