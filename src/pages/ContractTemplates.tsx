import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Edit3, Loader2, ShieldCheck, Plus, Eye, BookOpen, Award,
  ShieldAlert, CalendarPlus, Megaphone, Layout, Copy, Trash2
} from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import { seasonTemplateNames } from '@/data/seasonContractTemplates';
import { toast } from 'sonner';

interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  is_system: boolean;
  created_at: string;
}

interface BriefingTemplate {
  id: string;
  title: string;
  task_id: string;
  task_title?: string;
  created_at: string;
  group_count: number;
}

interface CertificateDesign {
  id: string;
  name: string;
  accent_color: string | null;
  issuer_name: string | null;
  created_at: string;
}

interface ClosingTemplate {
  id: string;
  name: string;
  created_at: string;
  item_count: number;
}

interface EventTemplate {
  id: string;
  name: string;
  description: string | null;
  groups: any;
  location: string | null;
  created_at: string;
}

const ContractTemplates = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contracts');

  // Data
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [briefingTemplates, setBriefingTemplates] = useState<BriefingTemplate[]>([]);
  const [certificateDesigns, setCertificateDesigns] = useState<CertificateDesign[]>([]);
  const [closingTemplates, setClosingTemplates] = useState<ClosingTemplate[]>([]);
  const [eventTemplates, setEventTemplates] = useState<EventTemplate[]>([]);

  const categoryLabels: Record<string, string> = {
    steward: 'Steward',
    bar_catering: t('Bar & Catering', 'Bar & Traiteur', 'Bar & Catering'),
    terrain_material: t('Terrein', 'Terrain', 'Terrain'),
    admin_ticketing: 'Admin / Ticketing',
    event_support: 'Event Support',
    custom: 'Custom',
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: club } = await supabase.from('clubs').select('id').eq('owner_id', user.id).limit(1).single();
      if (!club) {
        const { data: membership } = await supabase.from('club_members').select('club_id').eq('user_id', user.id).limit(1).maybeSingle();
        if (membership) {
          setClubId(membership.club_id);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setClubId(club.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!clubId) return;
    loadAllTemplates();
  }, [clubId]);

  const loadAllTemplates = async () => {
    if (!clubId) return;
    setLoading(true);

    const [contractsRes, briefingsRes, certsRes, closingRes, closingItemsRes, eventTmplRes] = await Promise.all([
      supabase.from('season_contract_templates').select('id, name, category, is_system, created_at')
        .or(`club_id.eq.${clubId},is_system.eq.true`).order('category'),
      supabase.from('briefings').select('id, title, task_id, created_at').eq('club_id', clubId).order('created_at', { ascending: false }),
      supabase.from('certificate_designs').select('id, name, accent_color, issuer_name, created_at').eq('club_id', clubId).order('created_at', { ascending: false }),
      supabase.from('closing_templates').select('id, name, created_at').eq('club_id', clubId).order('created_at'),
      supabase.from('closing_template_items').select('id, template_id'),
      supabase.from('event_templates').select('id, name, description, groups, location, created_at').eq('club_id', clubId).order('created_at', { ascending: false }),
    ]);

    setContractTemplates(contractsRes.data || []);
    setEventTemplates((eventTmplRes.data || []) as EventTemplate[]);
    setCertificateDesigns((certsRes.data || []) as CertificateDesign[]);

    // Briefings - enrich with task titles
    const briefings = briefingsRes.data || [];
    if (briefings.length > 0) {
      const taskIds = [...new Set(briefings.map((b: any) => b.task_id))];
      const { data: tasks } = await supabase.from('tasks').select('id, title').in('id', taskIds);
      const taskMap = new Map((tasks || []).map(t => [t.id, t.title]));

      // Count groups per briefing
      const briefingIds = briefings.map((b: any) => b.id);
      const { data: groups } = await supabase.from('briefing_groups').select('id, briefing_id').in('briefing_id', briefingIds);
      const groupCountMap = new Map<string, number>();
      (groups || []).forEach((g: any) => {
        groupCountMap.set(g.briefing_id, (groupCountMap.get(g.briefing_id) || 0) + 1);
      });

      setBriefingTemplates(briefings.map((b: any) => ({
        ...b,
        task_title: taskMap.get(b.task_id) || '—',
        group_count: groupCountMap.get(b.id) || 0,
      })));
    } else {
      setBriefingTemplates([]);
    }

    // Closing templates - count items
    const closings = closingRes.data || [];
    const items = closingItemsRes.data || [];
    const itemCountMap = new Map<string, number>();
    items.forEach((item: any) => {
      itemCountMap.set(item.template_id, (itemCountMap.get(item.template_id) || 0) + 1);
    });
    setClosingTemplates(closings.map((c: any) => ({
      ...c,
      item_count: itemCountMap.get(c.id) || 0,
    })));

    setLoading(false);
  };

  const systemContracts = contractTemplates.filter(t => t.is_system);
  const customContracts = contractTemplates.filter(t => !t.is_system);

  const tabCounts = {
    contracts: Object.keys(seasonTemplateNames).length + customContracts.length,
    briefings: briefingTemplates.length,
    certificates: certificateDesigns.length,
    closing: closingTemplates.length,
    events: eventTemplates.length,
  };

  if (loading) {
    return (
      <ClubPageLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </ClubPageLayout>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <PageNavTabs tabs={[
          { label: t('Overzicht', 'Aperçu', 'Overview'), path: '/volunteer-management' },
          { label: t('Contracten', 'Contrats', 'Contracts'), path: '/season-contracts' },
          { label: 'Contract Builder', path: '/contract-builder' },
          { label: t('Sjablonen', 'Modèles', 'Templates'), path: '/contract-templates' },
          { label: 'Briefings', path: '/briefing-builder' },
          { label: t('Vergoedingen', 'Indemnités', 'Payments'), path: '/sepa-payouts' },
          { label: 'Compliance', path: '/compliance' },
        ]} />

        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {t('Sjablonenbeheer', 'Gestion des modèles', 'Template Management')} 📋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              'Beheer al je sjablonen op één plek: contracten, briefings, certificaten, sluitingsprocedures en evenementen.',
              'Gérez tous vos modèles en un seul endroit : contrats, briefings, certificats, procédures de clôture et événements.',
              'Manage all your templates in one place: contracts, briefings, certificates, closing procedures and events.'
            )}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="contracts" className="gap-1.5 data-[state=active]:bg-background">
              <FileText className="w-3.5 h-3.5" />
              {t('Contracten', 'Contrats', 'Contracts')}
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-0.5">{tabCounts.contracts}</Badge>
            </TabsTrigger>
            <TabsTrigger value="briefings" className="gap-1.5 data-[state=active]:bg-background">
              <Megaphone className="w-3.5 h-3.5" />
              Briefings
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-0.5">{tabCounts.briefings}</Badge>
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-1.5 data-[state=active]:bg-background">
              <Award className="w-3.5 h-3.5" />
              {t('Certificaten', 'Certificats', 'Certificates')}
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-0.5">{tabCounts.certificates}</Badge>
            </TabsTrigger>
            <TabsTrigger value="closing" className="gap-1.5 data-[state=active]:bg-background">
              <ShieldAlert className="w-3.5 h-3.5" />
              {t('Sluitingsprocedures', 'Procédures de clôture', 'Closing Procedures')}
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-0.5">{tabCounts.closing}</Badge>
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1.5 data-[state=active]:bg-background">
              <CalendarPlus className="w-3.5 h-3.5" />
              {t('Evenementen', 'Événements', 'Events')}
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-0.5">{tabCounts.events}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ═══ CONTRACTS TAB ═══ */}
          <TabsContent value="contracts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                {t('Standaardsjablonen (seizoen)', 'Modèles standards (saison)', 'Default templates (season)')}
              </h2>
              <Button size="sm" onClick={() => navigate('/contract-builder')}>
                <Plus className="w-4 h-4 mr-1" />
                {t('Nieuw sjabloon', 'Nouveau modèle', 'New template')}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(seasonTemplateNames).map(([cat, name]) => (
                <Card key={cat} className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="text-[10px] mb-2">{categoryLabels[cat] || cat}</Badge>
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('Wettelijk conform seizoenscontract', 'Contrat saisonnier conforme', 'Legally compliant season contract')}
                        </p>
                      </div>
                      <FileText className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 w-full"
                      onClick={() => navigate(`/contract-builder?season_type=${cat}&club_id=${clubId}`)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      {t('Bewerken', 'Modifier', 'Edit')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {customContracts.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {t('Eigen sjablonen', 'Modèles personnalisés', 'Custom templates')}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {customContracts.map(tmpl => (
                    <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <Badge variant="secondary" className="text-[10px] mb-2">{categoryLabels[tmpl.category] || tmpl.category}</Badge>
                        <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tmpl.created_at).toLocaleDateString()}
                        </p>
                        <Button variant="outline" size="sm" className="mt-4 w-full"
                          onClick={() => navigate(`/contract-builder?template_id=${tmpl.id}&club_id=${clubId}`)}>
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          {t('Bewerken', 'Modifier', 'Edit')}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ BRIEFINGS TAB ═══ */}
          <TabsContent value="briefings" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t(
                  'Briefings die je hebt aangemaakt voor taken. Hergebruik ze als sjabloon voor nieuwe events.',
                  'Briefings créés pour des tâches. Réutilisez-les comme modèle pour de nouveaux événements.',
                  'Briefings created for tasks. Reuse them as templates for new events.'
                )}
              </p>
              <Button size="sm" onClick={() => navigate('/briefing-builder')}>
                <Plus className="w-4 h-4 mr-1" />
                {t('Nieuwe briefing', 'Nouveau briefing', 'New briefing')}
              </Button>
            </div>
            {briefingTemplates.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title={t('Nog geen briefings', 'Pas encore de briefings', 'No briefings yet')}
                description={t(
                  'Maak je eerste briefing aan via de briefing builder.',
                  'Créez votre premier briefing via le constructeur de briefings.',
                  'Create your first briefing via the briefing builder.'
                )}
                actionLabel={t('Briefing aanmaken', 'Créer un briefing', 'Create briefing')}
                onAction={() => navigate('/briefing-builder')}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {briefingTemplates.map(b => (
                  <Card key={b.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{b.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {t('Taak', 'Tâche', 'Task')}: {b.task_title}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                              {b.group_count} {t('groepen', 'groupes', 'groups')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(b.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Megaphone className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                      </div>
                      <Button variant="outline" size="sm" className="mt-4 w-full"
                        onClick={() => navigate(`/briefing-builder?briefing=${b.id}`)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {t('Bekijken', 'Voir', 'View')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ CERTIFICATES TAB ═══ */}
          <TabsContent value="certificates" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t(
                  'Certificaatontwerpen voor trainingen en events. Pas het design aan met je clublogo en huisstijl.',
                  'Conceptions de certificats pour formations et événements. Personnalisez avec votre logo et identité.',
                  'Certificate designs for trainings and events. Customize with your club logo and branding.'
                )}
              </p>
              <Button size="sm" onClick={() => navigate('/academy/certificate-builder')}>
                <Plus className="w-4 h-4 mr-1" />
                {t('Nieuw ontwerp', 'Nouveau design', 'New design')}
              </Button>
            </div>
            {certificateDesigns.length === 0 ? (
              <EmptyState
                icon={Award}
                title={t('Nog geen certificaten', 'Pas de certificats', 'No certificates yet')}
                description={t(
                  'Ontwerp je eerste certificaatsjabloon voor trainingen.',
                  'Créez votre premier modèle de certificat pour les formations.',
                  'Design your first certificate template for trainings.'
                )}
                actionLabel={t('Certificaat ontwerpen', 'Concevoir un certificat', 'Design certificate')}
                onAction={() => navigate('/academy/certificate-builder')}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {certificateDesigns.map(cert => (
                  <Card key={cert.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{cert.name}</p>
                          {cert.issuer_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('Uitgever', 'Émetteur', 'Issuer')}: {cert.issuer_name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {cert.accent_color && (
                              <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: cert.accent_color }} />
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(cert.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Award className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                      </div>
                      <Button variant="outline" size="sm" className="mt-4 w-full"
                        onClick={() => navigate('/academy/certificate-builder')}>
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        {t('Bewerken', 'Modifier', 'Edit')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ CLOSING PROCEDURES TAB ═══ */}
          <TabsContent value="closing" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t(
                  'Sjablonen voor afsluitprocedures na events. Definieer checklijsten die automatisch worden toegepast.',
                  'Modèles de procédures de clôture après événements. Définissez des listes de contrôle appliquées automatiquement.',
                  'Closing procedure templates after events. Define checklists that are applied automatically.'
                )}
              </p>
              <Button size="sm" variant="outline" onClick={() => navigate('/safety')}>
                <ShieldAlert className="w-4 h-4 mr-1" />
                {t('Naar Safety', 'Vers Sécurité', 'Go to Safety')}
              </Button>
            </div>
            {closingTemplates.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title={t('Nog geen sluitingsprocedures', 'Pas de procédures', 'No closing procedures yet')}
                description={t(
                  'Maak sluitingsprocedures aan via het Safety-dashboard bij een event.',
                  'Créez des procédures de clôture via le tableau de bord Sécurité lors d\'un événement.',
                  'Create closing procedures via the Safety dashboard during an event.'
                )}
                actionLabel={t('Naar Safety', 'Vers Sécurité', 'Go to Safety')}
                onAction={() => navigate('/safety')}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {closingTemplates.map(tmpl => (
                  <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                              {tmpl.item_count} {t('stappen', 'étapes', 'steps')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(tmpl.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ShieldAlert className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ EVENT TEMPLATES TAB ═══ */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t(
                  'Bewaar evenementconfiguaties als sjabloon en maak snel nieuwe events aan.',
                  'Sauvegardez les configurations d\'événements comme modèle et créez rapidement de nouveaux événements.',
                  'Save event configurations as templates and quickly create new events.'
                )}
              </p>
              <Button size="sm" onClick={() => navigate('/events-manager')}>
                <Plus className="w-4 h-4 mr-1" />
                {t('Naar evenementen', 'Vers événements', 'Go to events')}
              </Button>
            </div>
            {eventTemplates.length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                title={t('Nog geen event sjablonen', 'Pas de modèles', 'No event templates yet')}
                description={t(
                  'Sla een event op als sjabloon via het evenementenbeheer.',
                  'Enregistrez un événement comme modèle via la gestion d\'événements.',
                  'Save an event as a template via the events manager.'
                )}
                actionLabel={t('Naar evenementen', 'Vers événements', 'Go to events')}
                onAction={() => navigate('/events-manager')}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {eventTemplates.map(tmpl => {
                  const taskCount = Array.isArray(tmpl.groups) ? tmpl.groups.length : 0;
                  return (
                    <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                            {tmpl.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tmpl.description}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              {taskCount > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {taskCount} {t('taken', 'tâches', 'tasks')}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(tmpl.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <CalendarPlus className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClubPageLayout>
  );
};

/* ── Empty State Component ── */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: any;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>
      <Button variant="outline" size="sm" onClick={onAction}>
        <Plus className="w-3.5 h-3.5 mr-1" />
        {actionLabel}
      </Button>
    </CardContent>
  </Card>
);

export default ContractTemplates;
