import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Settings2, CalendarDays, Radio, Ticket, Copy, Check, AlertCircle, Loader2, Send, RefreshCw, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';

const PROVIDERS = [
  { value: 'eventsquare', label: 'EventSquare' },
  { value: 'weezevent', label: 'Weezevent' },
  { value: 'eventbrite', label: 'Eventbrite' },
  { value: 'ticketmaster_sport', label: 'Ticketmaster Sport' },
  { value: 'roboticket', label: 'Roboticket' },
  { value: 'tymes', label: 'Tymes' },
  { value: 'eventix', label: 'Weeztix' },
  { value: 'yourticketprovider', label: 'YourTicketProvider' },
  { value: 'paylogic_seetickets', label: 'Paylogic / See Tickets' },
  { value: 'ticketmatic', label: 'Ticketmatic' },
];

const t = {
  nl: {
    back: 'Terug naar dashboard',
    title: 'Ticketing Dashboard',
    setup: 'Ticketing Setup',
    planning: 'Planning',
    live: 'Live Opvolging',
    provider: 'Ticketing Provider',
    selectProvider: 'Selecteer provider',
    apiKey: 'API Key',
    clientSecret: 'Client Secret',
    eventId: 'Event ID (extern)',
    webhookUrl: 'Webhook URL',
    webhookCopy: 'Kopieer deze URL naar je ticketingprovider',
    save: 'Opslaan',
    saving: 'Opslaan...',
    test: 'Test verbinding',
    testing: 'Testen...',
    saved: 'Configuratie opgeslagen',
    testSuccess: 'Verbinding geslaagd!',
    testFail: 'Verbinding mislukt',
    selectEvent: 'Selecteer evenement',
    volunteer: 'Vrijwilliger',
    task: 'Taak',
    ticketStatus: 'Ticketstatus',
    actions: 'Acties',
    generate: 'Genereer Ticket',
    generateAll: 'Genereer Alle Tickets',
    generating: 'Genereren...',
    noTicket: 'Geen ticket',
    sent: 'Verzonden',
    checkedIn: 'Ingecheckt',
    checkedInAt: 'Ingecheckt om',
    progress: 'stewards ingecheckt',
    noVolunteers: 'Geen vrijwilligers voor dit evenement',
    noEvents: 'Geen evenementen beschikbaar',
    logs: 'API Logs',
    logAction: 'Actie',
    logStatus: 'Status',
    logTime: 'Tijdstip',
    logError: 'Fout',
    success: 'Succes',
    error: 'Fout',
    noConfig: 'Configureer eerst je ticketing provider in de Setup tab.',
    copied: 'Gekopieerd!',
  },
  fr: {
    back: 'Retour au tableau de bord',
    title: 'Tableau de bord Ticketing',
    setup: 'Configuration',
    planning: 'Planification',
    live: 'Suivi en direct',
    provider: 'Fournisseur de tickets',
    selectProvider: 'Sélectionner le fournisseur',
    apiKey: 'Clé API',
    clientSecret: 'Secret Client',
    eventId: "ID de l'événement (externe)",
    webhookUrl: 'URL Webhook',
    webhookCopy: 'Copiez cette URL dans votre fournisseur de tickets',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    test: 'Tester la connexion',
    testing: 'Test...',
    saved: 'Configuration enregistrée',
    testSuccess: 'Connexion réussie !',
    testFail: 'Connexion échouée',
    selectEvent: "Sélectionner l'événement",
    volunteer: 'Bénévole',
    task: 'Tâche',
    ticketStatus: 'Statut du ticket',
    actions: 'Actions',
    generate: 'Générer le ticket',
    generateAll: 'Générer tous les tickets',
    generating: 'Génération...',
    noTicket: 'Pas de ticket',
    sent: 'Envoyé',
    checkedIn: 'Enregistré',
    checkedInAt: 'Enregistré à',
    progress: 'stewards enregistrés',
    noVolunteers: 'Aucun bénévole pour cet événement',
    noEvents: 'Aucun événement disponible',
    logs: 'Logs API',
    logAction: 'Action',
    logStatus: 'Statut',
    logTime: 'Heure',
    logError: 'Erreur',
    success: 'Succès',
    error: 'Erreur',
    noConfig: "Configurez d'abord votre fournisseur dans l'onglet Configuration.",
    copied: 'Copié !',
  },
  en: {
    back: 'Back to dashboard',
    title: 'Ticketing Dashboard',
    setup: 'Ticketing Setup',
    planning: 'Planning',
    live: 'Live Tracking',
    provider: 'Ticketing Provider',
    selectProvider: 'Select provider',
    apiKey: 'API Key',
    clientSecret: 'Client Secret',
    eventId: 'Event ID (external)',
    webhookUrl: 'Webhook URL',
    webhookCopy: 'Copy this URL to your ticketing provider',
    save: 'Save',
    saving: 'Saving...',
    test: 'Test connection',
    testing: 'Testing...',
    saved: 'Configuration saved',
    testSuccess: 'Connection successful!',
    testFail: 'Connection failed',
    selectEvent: 'Select event',
    volunteer: 'Volunteer',
    task: 'Task',
    ticketStatus: 'Ticket status',
    actions: 'Actions',
    generate: 'Generate Ticket',
    generateAll: 'Generate All Tickets',
    generating: 'Generating...',
    noTicket: 'No ticket',
    sent: 'Sent',
    checkedIn: 'Checked in',
    checkedInAt: 'Checked in at',
    progress: 'stewards checked in',
    noVolunteers: 'No volunteers for this event',
    noEvents: 'No events available',
    logs: 'API Logs',
    logAction: 'Action',
    logStatus: 'Status',
    logTime: 'Time',
    logError: 'Error',
    success: 'Success',
    error: 'Error',
    noConfig: 'Please configure your ticketing provider in the Setup tab first.',
    copied: 'Copied!',
  },
};

interface VolunteerTicketRow {
  id: string;
  volunteer_id: string;
  task_id: string | null;
  status: string;
  checked_in_at: string | null;
  external_ticket_id: string | null;
  error_message: string | null;
  volunteer_name: string;
  task_title: string;
}

interface LogEntry {
  id: string;
  action: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const TicketingDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const labels = t[language as keyof typeof t] || t.nl;

  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('setup');

  // Setup state
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [eventIdExternal, setEventIdExternal] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [configId, setConfigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  // Provider-specific config data
  const [configData, setConfigData] = useState<Record<string, string>>({});

  // Planning state
  const [events, setEvents] = useState<{ id: string; title: string; event_date: string | null }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [volunteers, setVolunteers] = useState<VolunteerTicketRow[]>([]);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);

  // Load club & config
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }

      // Find club
      const { data: clubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id).limit(1);
      let cid = clubs?.[0]?.id;
      if (!cid) {
        const { data: members } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1);
        cid = members?.[0]?.club_id;
      }
      if (!cid) { navigate('/club-dashboard'); return; }
      setClubId(cid);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ebxpdscmebdmyqjwmpun';
      const generatedWebhook = `https://${projectId}.supabase.co/functions/v1/ticketing-webhook?club_id=${cid}`;
      setWebhookUrl(generatedWebhook);

      // Load config
      const { data: config } = await supabase.from('ticketing_configs').select('*').eq('club_id', cid).maybeSingle();
      if (config) {
        setConfigId(config.id);
        setProvider(config.provider);
        setApiKey(config.api_key);
        setClientSecret(config.client_secret || '');
        setEventIdExternal(config.event_id_external || '');
        if (config.webhook_url) setWebhookUrl(config.webhook_url);
        if ((config as any).config_data) setConfigData((config as any).config_data);
      }

      // Load events
      const { data: evts } = await supabase.from('events').select('id, title, event_date').eq('club_id', cid).order('event_date', { ascending: false });
      setEvents(evts || []);

      setLoading(false);
    };
    init();
  }, [navigate]);

  // Load volunteers + tickets when event changes
  useEffect(() => {
    if (!clubId || !selectedEventId) { setVolunteers([]); return; }
    const loadVolunteers = async () => {
      // Get tasks for this event
      const { data: tasks } = await supabase.from('tasks').select('id, title').eq('event_id', selectedEventId).eq('club_id', clubId);
      if (!tasks?.length) { setVolunteers([]); return; }

      const taskIds = tasks.map(t => t.id);
      const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.title]));

      // Get assigned signups
      const { data: signups } = await supabase.from('task_signups').select('volunteer_id, task_id').in('task_id', taskIds).eq('status', 'assigned');
      if (!signups?.length) { setVolunteers([]); return; }

      const volIds = [...new Set(signups.map(s => s.volunteer_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', volIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || 'Onbekend']));

      // Get existing tickets
      const { data: tickets } = await supabase.from('volunteer_tickets').select('*').eq('club_id', clubId).eq('event_id', selectedEventId);
      const ticketMap = Object.fromEntries((tickets || []).map(t => [t.volunteer_id + '_' + t.task_id, t]));

      const rows: VolunteerTicketRow[] = signups.map(s => {
        const ticket = ticketMap[s.volunteer_id + '_' + s.task_id];
        return {
          id: ticket?.id || `${s.volunteer_id}_${s.task_id}`,
          volunteer_id: s.volunteer_id,
          task_id: s.task_id,
          status: ticket?.status || 'none',
          checked_in_at: ticket?.checked_in_at || null,
          external_ticket_id: ticket?.external_ticket_id || null,
          error_message: ticket?.error_message || null,
          volunteer_name: profileMap[s.volunteer_id] || 'Onbekend',
          task_title: taskMap[s.task_id] || '',
        };
      });
      setVolunteers(rows);
    };
    loadVolunteers();
  }, [clubId, selectedEventId]);

  // Realtime subscription for volunteer_tickets
  useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel('volunteer_tickets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteer_tickets', filter: `club_id=eq.${clubId}` }, (payload) => {
        const updated = payload.new as any;
        if (!updated) return;
        setVolunteers(prev => prev.map(v =>
          (v.volunteer_id === updated.volunteer_id && v.task_id === updated.task_id)
            ? { ...v, status: updated.status, checked_in_at: updated.checked_in_at, external_ticket_id: updated.external_ticket_id, error_message: updated.error_message, id: updated.id }
            : v
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clubId]);

  // Load logs
  const loadLogs = useCallback(async () => {
    if (!clubId) return;
    const { data } = await supabase.from('ticketing_logs').select('id, action, status, error_message, created_at').eq('club_id', clubId).order('created_at', { ascending: false }).limit(50);
    setLogs(data || []);
  }, [clubId]);

  useEffect(() => { if (logsOpen) loadLogs(); }, [logsOpen, loadLogs]);

  // Save config
  const handleSaveConfig = async () => {
    if (!clubId || !provider) return;
    setSaving(true);
    const saveData: any = {
      club_id: clubId,
      provider: provider as any,
      api_key: apiKey,
      client_secret: clientSecret,
      event_id_external: eventIdExternal,
      webhook_url: webhookUrl,
      is_active: true,
      config_data: configData,
    };
    if (configId) {
      const { error } = await supabase.from('ticketing_configs').update(saveData).eq('id', configId);
      if (error) toast.error(error.message);
      else toast.success(labels.saved);
    } else {
      const { data, error } = await supabase.from('ticketing_configs').insert(saveData).select().single();
      if (error) toast.error(error.message);
      else { setConfigId(data.id); toast.success(labels.saved); }
    }
    setSaving(false);
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!clubId) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-generate', {
        body: { action: 'test', club_id: clubId },
      });
      if (error) throw error;
      if (data?.success) toast.success(labels.testSuccess);
      else toast.error(labels.testFail + ': ' + (data?.error || ''));
    } catch (e: any) {
      toast.error(labels.testFail + ': ' + e.message);
    }
    setTesting(false);
  };

  // Generate ticket
  const handleGenerateTicket = async (volunteerId: string, taskId: string) => {
    if (!clubId || !selectedEventId) return;
    const key = volunteerId + '_' + taskId;
    setGeneratingIds(prev => new Set(prev).add(key));
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-generate', {
        body: {
          action: 'create_ticket',
          club_id: clubId,
          event_id: selectedEventId,
          volunteer_id: volunteerId,
          task_id: taskId,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(labels.sent);
        // Reload volunteers
        setSelectedEventId(prev => prev);
      } else {
        toast.error(data?.error || labels.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setGeneratingIds(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  // Generate all tickets
  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    const noTicket = volunteers.filter(v => v.status === 'none');
    for (const v of noTicket) {
      await handleGenerateTicket(v.volunteer_id, v.task_id || '');
    }
    setGeneratingAll(false);
  };

  // Copy webhook URL
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success(labels.copied);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'checked_in': return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{labels.checkedIn}</Badge>;
      case 'sent': return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">{labels.sent}</Badge>;
      default: return <Badge variant="secondary">{labels.noTicket}</Badge>;
    }
  };

  // Progress calculations
  const totalVolunteers = volunteers.length;
  const checkedInCount = volunteers.filter(v => v.status === 'checked_in').length;
  const sentCount = volunteers.filter(v => v.status === 'sent').length;
  const progressPercent = totalVolunteers > 0 ? Math.round((checkedInCount / totalVolunteers) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/club-dashboard')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Logo />
          <h1 className="text-lg font-bold text-foreground ml-2">{labels.title}</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="setup" className="gap-2">
              <Settings2 className="w-4 h-4" />
              {labels.setup}
            </TabsTrigger>
            <TabsTrigger value="planning" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              {labels.planning}
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2">
              <Radio className="w-4 h-4" />
              {labels.live}
            </TabsTrigger>
          </TabsList>

          {/* SETUP TAB */}
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  {labels.setup}
                </CardTitle>
                <CardDescription>
                  {language === 'nl' ? 'Configureer je externe ticketingprovider' : language === 'fr' ? 'Configurez votre fournisseur de tickets externe' : 'Configure your external ticketing provider'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>{labels.provider}</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder={labels.selectProvider} />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Provider-specific fields */}
                {provider === 'weezevent' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>API Key <span className="text-xs text-muted-foreground">(Back-office → Outils → Clé API)</span></Label>
                        <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Votre Weezevent API key" />
                      </div>
                      <div className="space-y-2">
                        <Label>Username <span className="text-xs text-muted-foreground">(Organisateur login)</span></Label>
                        <Input value={configData.username || ''} onChange={e => setConfigData(prev => ({ ...prev, username: e.target.value }))} placeholder="votre@email.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Password <span className="text-xs text-muted-foreground">(Organisateur wachtwoord)</span></Label>
                        <Input type="password" value={configData.password || ''} onChange={e => setConfigData(prev => ({ ...prev, password: e.target.value }))} placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <Label>Event ID <span className="text-xs text-muted-foreground">(Weezevent event nummer)</span></Label>
                        <Input value={eventIdExternal} onChange={e => setEventIdExternal(e.target.value)} placeholder="49015" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ticket ID <span className="text-xs text-muted-foreground">(Prijscategorie voor vrijwilligers, optioneel)</span></Label>
                      <Input value={configData.ticket_id || ''} onChange={e => setConfigData(prev => ({ ...prev, ticket_id: e.target.value }))} placeholder="198251" />
                    </div>
                  </>
                ) : provider === 'eventbrite' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Private Token <span className="text-xs text-muted-foreground">(eventbrite.com → API Keys)</span></Label>
                        <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Jouw Eventbrite private OAuth token" />
                      </div>
                      <div className="space-y-2">
                        <Label>Organization ID <span className="text-xs text-muted-foreground">(optioneel, voor events lijst)</span></Label>
                        <Input value={configData.organization_id || ''} onChange={e => setConfigData(prev => ({ ...prev, organization_id: e.target.value }))} placeholder="123456789" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Event ID <span className="text-xs text-muted-foreground">(Eventbrite event ID uit de URL)</span></Label>
                      <Input value={eventIdExternal} onChange={e => setEventIdExternal(e.target.value)} placeholder="123456789012" />
                    </div>
                  </>
                ) : provider === 'eventix' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Access Token <span className="text-xs text-muted-foreground">(OAuth Bearer token via Weeztix dashboard)</span></Label>
                        <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Jouw Weeztix Bearer access token" />
                      </div>
                      <div className="space-y-2">
                        <Label>Company GUID <span className="text-xs text-muted-foreground">(Te vinden in Weeztix dashboard URL)</span></Label>
                        <Input value={configData.company_guid || ''} onChange={e => setConfigData(prev => ({ ...prev, company_guid: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Event GUID <span className="text-xs text-muted-foreground">(optioneel, voor filtering)</span></Label>
                      <Input value={eventIdExternal} onChange={e => setEventIdExternal(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{labels.apiKey}</Label>
                        <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk_live_..." />
                      </div>
                      <div className="space-y-2">
                        <Label>{labels.clientSecret}</Label>
                        <Input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="cs_..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{labels.eventId}</Label>
                      <Input value={eventIdExternal} onChange={e => setEventIdExternal(e.target.value)} placeholder="evt_123..." />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>{labels.webhookUrl}</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted" />
                    <Button type="button" variant="outline" size="icon" onClick={handleCopyWebhook}>
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{labels.webhookCopy}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSaveConfig} disabled={saving || !provider}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{labels.saving}</> : labels.save}
                  </Button>
                  <Button variant="outline" onClick={handleTestConnection} disabled={testing || !configId}>
                    {testing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{labels.testing}</> : labels.test}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLANNING TAB */}
          <TabsContent value="planning">
            {!configId ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{labels.noConfig}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="w-full sm:w-80">
                      <SelectValue placeholder={labels.selectEvent} />
                    </SelectTrigger>
                    <SelectContent>
                      {events.length === 0 ? (
                        <SelectItem value="__none" disabled>{labels.noEvents}</SelectItem>
                      ) : events.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.title} {e.event_date ? `(${new Date(e.event_date).toLocaleDateString()})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEventId && volunteers.some(v => v.status === 'none') && (
                    <Button onClick={handleGenerateAll} disabled={generatingAll} className="gap-2">
                      {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {labels.generateAll}
                    </Button>
                  )}
                </div>

                {selectedEventId && (
                  <Card>
                    <CardContent className="p-0">
                      {volunteers.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          {labels.noVolunteers}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{labels.volunteer}</TableHead>
                              <TableHead>{labels.task}</TableHead>
                              <TableHead>{labels.ticketStatus}</TableHead>
                              <TableHead className="text-right">{labels.actions}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {volunteers.map(v => (
                              <TableRow key={v.id}>
                                <TableCell className="font-medium">{v.volunteer_name}</TableCell>
                                <TableCell className="text-muted-foreground">{v.task_title}</TableCell>
                                <TableCell>
                                  <StatusBadge status={v.status} />
                                  {v.error_message && (
                                    <p className="text-xs text-destructive mt-1">{v.error_message}</p>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {v.status === 'none' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleGenerateTicket(v.volunteer_id, v.task_id || '')}
                                      disabled={generatingIds.has(v.volunteer_id + '_' + v.task_id)}
                                      className="gap-1.5"
                                    >
                                      {generatingIds.has(v.volunteer_id + '_' + v.task_id) ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Ticket className="w-3.5 h-3.5" />
                                      )}
                                      {labels.generate}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* LIVE TAB */}
          <TabsContent value="live">
            {!configId ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{labels.noConfig}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder={labels.selectEvent} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title} {e.event_date ? `(${new Date(e.event_date).toLocaleDateString()})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedEventId && (
                  <>
                    {/* Progress card */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-foreground">
                            {checkedInCount} / {totalVolunteers} {labels.progress}
                          </span>
                          <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> {labels.checkedIn}: {checkedInCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" /> {labels.sent}: {sentCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground" /> {labels.noTicket}: {totalVolunteers - checkedInCount - sentCount}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Live table */}
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{labels.volunteer}</TableHead>
                              <TableHead>{labels.task}</TableHead>
                              <TableHead>{labels.ticketStatus}</TableHead>
                              <TableHead>{labels.checkedInAt}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {volunteers.map(v => (
                              <TableRow key={v.id} className={v.status === 'checked_in' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                                <TableCell className="font-medium">{v.volunteer_name}</TableCell>
                                <TableCell className="text-muted-foreground">{v.task_title}</TableCell>
                                <TableCell><StatusBadge status={v.status} /></TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {v.checked_in_at ? new Date(v.checked_in_at).toLocaleTimeString() : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Logs section */}
        {configId && (
          <div className="mt-8">
            <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {labels.logs}
                  </span>
                  {logsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="p-0">
                    {logs.length === 0 ? (
                      <p className="p-6 text-center text-muted-foreground text-sm">
                        {language === 'nl' ? 'Geen logs beschikbaar' : language === 'fr' ? 'Aucun log disponible' : 'No logs available'}
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{labels.logAction}</TableHead>
                            <TableHead>{labels.logStatus}</TableHead>
                            <TableHead>{labels.logError}</TableHead>
                            <TableHead>{labels.logTime}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs">{log.action}</TableCell>
                              <TableCell>
                                <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className={log.status === 'success' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-300' : ''}>
                                  {log.status === 'success' ? labels.success : labels.error}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-destructive max-w-[200px] truncate">{log.error_message || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </main>
    </div>
  );
};

export default TicketingDashboard;
