import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Key, Plus, Trash2, Copy, Play, BookOpen, Code2, TestTube, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  calls_this_hour: number;
  created_at: string;
}

const RESOURCES = [
  { value: 'volunteers', label: 'Vrijwilligers', desc: 'Profielen van vrijwilligers gelinkt aan jouw club' },
  { value: 'tasks', label: 'Taken', desc: 'Alle taken van jouw club' },
  { value: 'events', label: 'Evenementen', desc: 'Alle evenementen van jouw club' },
  { value: 'signups', label: 'Inschrijvingen', desc: 'Alle taak-inschrijvingen' },
  { value: 'payments', label: 'Betalingen', desc: 'Vrijwilligersbetalingen' },
  { value: 'sepa_batches', label: 'SEPA Batches', desc: 'SEPA uitbetalingsbatches met items' },
  { value: 'compliance', label: 'Compliance', desc: 'Maandelijkse compliance-verklaringen' },
  { value: 'contracts', label: 'Contracten', desc: 'Seizoenscontracten' },
  { value: 'tickets', label: 'Tickets', desc: 'Vrijwilligerstickets' },
  { value: 'partners', label: 'Partners', desc: 'Externe partners' },
];

const L = {
  nl: {
    title: 'Club Data API', subtitle: 'Koppel jouw clubdata aan externe tools via een beveiligde REST API.',
    keys: 'API Keys', docs: 'Documentatie', tester: 'Live Tester',
    newKey: 'Nieuwe key', keyName: 'Key naam', generate: 'Genereren',
    prefix: 'Prefix', name: 'Naam', status: 'Status', lastUsed: 'Laatst gebruikt',
    calls: 'Calls/uur', created: 'Aangemaakt', actions: 'Acties',
    active: 'Actief', revoked: 'Ingetrokken', revoke: 'Intrekken', never: 'Nooit',
    keyCreated: 'API key aangemaakt', keyCreatedDesc: 'Kopieer deze key nu — hij wordt niet meer getoond.',
    copied: 'Gekopieerd naar klembord', keyRevoked: 'API key ingetrokken',
    resource: 'Resource', format: 'Formaat', test: 'Test', testing: 'Testen...',
    noKeys: 'Nog geen API keys. Maak er een aan om te beginnen.',
    rateLimit: 'Rate limit: 100 calls per uur per key',
  },
  fr: {
    title: 'API de données club', subtitle: 'Connectez vos données club à des outils externes via une API REST sécurisée.',
    keys: 'Clés API', docs: 'Documentation', tester: 'Testeur',
    newKey: 'Nouvelle clé', keyName: 'Nom de la clé', generate: 'Générer',
    prefix: 'Préfixe', name: 'Nom', status: 'Statut', lastUsed: 'Dernier usage',
    calls: 'Appels/h', created: 'Créé', actions: 'Actions',
    active: 'Actif', revoked: 'Révoqué', revoke: 'Révoquer', never: 'Jamais',
    keyCreated: 'Clé API créée', keyCreatedDesc: 'Copiez cette clé maintenant — elle ne sera plus affichée.',
    copied: 'Copié', keyRevoked: 'Clé API révoquée',
    resource: 'Ressource', format: 'Format', test: 'Tester', testing: 'Test...',
    noKeys: 'Pas encore de clés API. Créez-en une pour commencer.',
    rateLimit: 'Limite: 100 appels par heure par clé',
  },
  en: {
    title: 'Club Data API', subtitle: 'Connect your club data to external tools via a secure REST API.',
    keys: 'API Keys', docs: 'Documentation', tester: 'Live Tester',
    newKey: 'New key', keyName: 'Key name', generate: 'Generate',
    prefix: 'Prefix', name: 'Name', status: 'Status', lastUsed: 'Last used',
    calls: 'Calls/hr', created: 'Created', actions: 'Actions',
    active: 'Active', revoked: 'Revoked', revoke: 'Revoke', never: 'Never',
    keyCreated: 'API key created', keyCreatedDesc: 'Copy this key now — it will not be shown again.',
    copied: 'Copied to clipboard', keyRevoked: 'API key revoked',
    resource: 'Resource', format: 'Format', test: 'Test', testing: 'Testing...',
    noKeys: 'No API keys yet. Create one to get started.',
    rateLimit: 'Rate limit: 100 calls per hour per key',
  },
};

const ReportingApiTab = () => {
  const { clubId, userId } = useClubContext();
  const { language } = useLanguage();
  const t = L[language] || L.nl;
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Tester state
  const [testResource, setTestResource] = useState('tasks');
  const [testFormat, setTestFormat] = useState('json');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const loadKeys = async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await supabase
      .from('club_api_keys')
      .select('id, key_prefix, name, is_active, last_used_at, calls_this_hour, created_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    setKeys((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadKeys(); }, [clubId]);

  const generateKey = async () => {
    if (!clubId || !userId) return;
    setGenerating(true);
    const apiKey = crypto.randomUUID() + '-' + crypto.randomUUID();
    const { error } = await supabase.from('club_api_keys').insert({
      club_id: clubId,
      api_key: apiKey,
      name: newKeyName || 'API Key',
      created_by: userId,
    } as any);
    if (error) {
      toast.error(error.message);
    } else {
      setCreatedKey(apiKey);
      setNewKeyName('');
      loadKeys();
      toast.success(t.keyCreated);
    }
    setGenerating(false);
  };

  const revokeKey = async (id: string) => {
    await supabase.from('club_api_keys').update({ is_active: false } as any).eq('id', id);
    toast.success(t.keyRevoked);
    loadKeys();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success(t.copied);
  };

  const runTest = async () => {
    if (!keys.some(k => k.is_active)) {
      toast.error('Maak eerst een actieve API key aan');
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    const activeKey = keys.find(k => k.is_active);
    if (!activeKey) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/club-data-api`;
      // We can't use the real key from the table (we only have prefix), so we need to explain
      setTestResult(
        `// Gebruik de volgende URL om data op te halen:\n\n` +
        `curl -H "Authorization: Bearer <jouw-api-key>" \\\n` +
        `  "${baseUrl}?resource=${testResource}&format=${testFormat}&limit=10"\n\n` +
        `// Vervang <jouw-api-key> door de key die je bij het aanmaken hebt gekopieerd.`
      );
    } catch (err) {
      setTestResult(`Error: ${err}`);
    }
    setTestLoading(false);
  };

  const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/club-data-api`;

  return (
    <div className="space-y-6">
      {/* Key Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-5 h-5 text-primary" /> {t.keys}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t.rateLimit}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t.keyName}
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={generateKey} disabled={generating} size="sm">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t.generate}
            </Button>
          </div>

          {keys.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground py-4">{t.noKeys}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.prefix}</TableHead>
                    <TableHead>{t.name}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.lastUsed}</TableHead>
                    <TableHead>{t.calls}</TableHead>
                    <TableHead>{t.created}</TableHead>
                    <TableHead>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-mono text-xs">{k.key_prefix}...</TableCell>
                      <TableCell>{k.name}</TableCell>
                      <TableCell>
                        <Badge variant={k.is_active ? 'default' : 'secondary'}>
                          {k.is_active ? t.active : t.revoked}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {k.last_used_at ? format(new Date(k.last_used_at), 'dd/MM HH:mm') : t.never}
                      </TableCell>
                      <TableCell>{k.calls_this_hour}</TableCell>
                      <TableCell className="text-xs">{format(new Date(k.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {k.is_active && (
                          <Button variant="ghost" size="icon" onClick={() => revokeKey(k.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Created key dialog */}
      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.keyCreated}</DialogTitle>
            <DialogDescription>{t.keyCreatedDesc}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-muted p-3 rounded text-xs font-mono break-all select-all">
              {createdKey}
            </code>
            <Button size="icon" variant="outline" onClick={() => copyKey(createdKey!)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-primary" /> {t.docs}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Base URL</h4>
                  <code className="bg-muted px-2 py-1 rounded text-xs break-all">{baseUrl}</code>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Authenticatie</h4>
                  <code className="bg-muted px-2 py-1 rounded text-xs">Authorization: Bearer &lt;jouw-api-key&gt;</code>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Query Parameters</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                    <li><code>resource</code> — Verplicht. Zie beschikbare resources hieronder.</li>
                    <li><code>format</code> — <code>json</code> (standaard) of <code>csv</code></li>
                    <li><code>from</code> / <code>to</code> — Optioneel datumfilter (ISO 8601)</li>
                    <li><code>limit</code> — Max aantal resultaten (standaard & max: 1000)</li>
                    <li><code>offset</code> — Paginatie offset</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Beschikbare Resources</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RESOURCES.map((r) => (
                      <div key={r.value} className="bg-muted/50 rounded p-2">
                        <code className="text-xs font-bold text-primary">{r.value}</code>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="curl">
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">
{`# Haal taken op als JSON
curl -H "Authorization: Bearer JOUW_API_KEY" \\
  "${baseUrl}?resource=tasks&limit=50"

# Haal vrijwilligers op als CSV
curl -H "Authorization: Bearer JOUW_API_KEY" \\
  "${baseUrl}?resource=volunteers&format=csv"

# Betalingen met datumfilter
curl -H "Authorization: Bearer JOUW_API_KEY" \\
  "${baseUrl}?resource=payments&from=2025-01-01&to=2025-12-31"`}
              </pre>
            </TabsContent>

            <TabsContent value="js">
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">
{`const API_KEY = "JOUW_API_KEY";
const BASE = "${baseUrl}";

// Haal taken op
const response = await fetch(
  \`\${BASE}?resource=tasks&limit=50\`,
  { headers: { Authorization: \`Bearer \${API_KEY}\` } }
);
const { data, count } = await response.json();
console.log(\`\${count} taken opgehaald\`, data);

// CSV export voor Excel
const csv = await fetch(
  \`\${BASE}?resource=volunteers&format=csv\`,
  { headers: { Authorization: \`Bearer \${API_KEY}\` } }
);
const text = await csv.text();`}
              </pre>
            </TabsContent>

            <TabsContent value="python">
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">
{`import requests

API_KEY = "JOUW_API_KEY"
BASE = "${baseUrl}"
headers = {"Authorization": f"Bearer {API_KEY}"}

# Haal taken op
resp = requests.get(f"{BASE}?resource=tasks&limit=50", headers=headers)
data = resp.json()
print(f"{data['count']} taken opgehaald")

# CSV voor pandas
import pandas as pd
import io
csv_resp = requests.get(f"{BASE}?resource=volunteers&format=csv", headers=headers)
df = pd.read_csv(io.StringIO(csv_resp.text))
print(df.head())`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Live Tester */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TestTube className="w-5 h-5 text-primary" /> {t.tester}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium">{t.resource}</label>
              <Select value={testResource} onValueChange={setTestResource}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{t.format}</label>
              <Select value={testFormat} onValueChange={setTestFormat}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runTest} disabled={testLoading} size="sm">
              {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {testLoading ? t.testing : t.test}
            </Button>
          </div>
          {testResult && (
            <pre className="bg-muted p-4 rounded text-xs overflow-x-auto max-h-[400px] whitespace-pre-wrap font-mono">
              {testResult}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportingApiTab;
