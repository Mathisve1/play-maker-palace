import { useState, useEffect, useMemo } from 'react';
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
  Users, Plus, Loader2, Edit3, AlertCircle, CreditCard
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClubPageLayout from '@/components/ClubPageLayout';
import CreateSeasonDialog from '@/components/CreateSeasonDialog';
import SendSeasonContractDialog from '@/components/SendSeasonContractDialog';

const SeasonContractManager = () => {
  const { language } = useLanguage();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Active season
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [contractStats, setContractStats] = useState<Record<string, number>>({});

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
    // Load active season + billing in parallel
    const [seasonRes, billingRes] = await Promise.all([
      supabase.from('seasons').select('*').eq('club_id', cId).eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('club_billing').select('*').eq('club_id', cId).maybeSingle(),
    ]);

    setActiveSeason(seasonRes.data);

    if (!billingRes.data) {
      const { data: newBilling } = await supabase.from('club_billing').insert({ club_id: cId }).select().single();
      setBilling(newBilling);
    } else {
      setBilling(billingRes.data);
    }

    const season = seasonRes.data;
    if (!season) return;

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

  const isFreeTrialExhausted = billing && billing.free_contracts_used >= billing.free_contracts_limit;

  const handleSendClick = () => {
    if (isFreeTrialExhausted) {
      setShowBillingModal(true);
    } else {
      setShowSendContract(true);
    }
  };

  const handleAcceptBilling = async () => {
    if (!clubId || !activeSeason) return;
    // Log billing events for each selected volunteer
    for (const volId of selectedVols) {
      await supabase.from('billing_events').insert({
        club_id: clubId,
        event_type: 'paid_contract_created',
        volunteer_id: volId,
        season_id: activeSeason.id,
        amount_cents: billing?.volunteer_price_cents || 1500,
      });
    }
    // Update billing counts
    await supabase.from('club_billing')
      .update({
        current_season_volunteers_billed: (billing?.current_season_volunteers_billed || 0) + selectedVols.size,
      })
      .eq('club_id', clubId);

    setShowBillingModal(false);
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
          <Button onClick={() => setShowCreateSeason(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('Nieuw seizoen', 'Nouvelle saison', 'New season')}
          </Button>
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
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">{t('Actief seizoen', 'Saison active', 'Active season')}</TabsTrigger>
              <TabsTrigger value="send">{t('Contracten versturen', 'Envoyer contrats', 'Send contracts')}</TabsTrigger>
              <TabsTrigger value="signed">{t('Ondertekend', 'Signés', 'Signed')}</TabsTrigger>
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
          </Tabs>
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
          )}
        </>
      )}
    </ClubPageLayout>
  );
};

export default SeasonContractManager;
