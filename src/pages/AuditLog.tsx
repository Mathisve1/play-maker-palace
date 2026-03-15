import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalClubContext } from '@/contexts/ClubContext';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Filter, Shield, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface AuditEntry {
  id: string;
  club_id: string | null;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
  actor_name?: string;
}

const PAGE_SIZE = 50;

const AuditLog = () => {
  const { language } = useLanguage();
  const club = useOptionalClubContext();
  const clubId = club?.clubId;
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [actorSearch, setActorSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [actorMap, setActorMap] = useState<Record<string, string>>({});

  const loadEntries = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);

    let query = (supabase as any)
      .from('audit_logs')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (resourceFilter !== 'all') query = query.eq('resource_type', resourceFilter);
    if (dateFrom) query = query.gte('created_at', dateFrom + 'T00:00:00');
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); return; }

    const rows = (data || []) as AuditEntry[];
    setEntries(rows);
    setHasMore(rows.length === PAGE_SIZE);

    // Resolve actor names
    const actorIds = [...new Set(rows.map(r => r.actor_id).filter(Boolean))] as string[];
    const missing = actorIds.filter(id => !actorMap[id]);
    if (missing.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', missing);
      const map = { ...actorMap };
      (profiles || []).forEach(p => { map[p.id] = p.full_name || p.email || p.id; });
      setActorMap(map);
    }

    setLoading(false);
  }, [clubId, page, resourceFilter, dateFrom, dateTo]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const filteredEntries = useMemo(() => {
    if (!actorSearch) return entries;
    const q = actorSearch.toLowerCase();
    return entries.filter(e => {
      const name = e.actor_id ? (actorMap[e.actor_id] || '').toLowerCase() : '';
      return name.includes(q);
    });
  }, [entries, actorSearch, actorMap]);

  const actionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-accent/10 text-accent border-accent/20';
      case 'update': return 'bg-primary/10 text-primary border-primary/20';
      case 'delete': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const resourceTypes = ['task_signups', 'season_contracts', 'sepa_batch_items', 'volunteer_payments', 'profiles'];

  const renderDiff = (old_values: Record<string, any> | null, new_values: Record<string, any> | null) => {
    if (!old_values && !new_values) return null;
    const allKeys = new Set([...Object.keys(old_values || {}), ...Object.keys(new_values || {})]);
    // Filter out noisy fields
    const skip = new Set(['id', 'created_at', 'updated_at']);
    const keys = [...allKeys].filter(k => !skip.has(k));

    const changed = keys.filter(k => {
      const o = old_values?.[k];
      const n = new_values?.[k];
      return JSON.stringify(o) !== JSON.stringify(n);
    });

    if (changed.length === 0) return <span className="text-xs text-muted-foreground italic">—</span>;

    return (
      <div className="space-y-0.5">
        {changed.slice(0, 4).map(k => (
          <div key={k} className="text-[11px] leading-tight">
            <span className="font-mono text-muted-foreground">{k}: </span>
            {old_values?.[k] !== undefined && (
              <span className="line-through text-destructive/70">{String(old_values[k] ?? 'null').slice(0, 30)}</span>
            )}
            {old_values?.[k] !== undefined && new_values?.[k] !== undefined && <span className="text-muted-foreground"> → </span>}
            {new_values?.[k] !== undefined && (
              <span className="text-accent">{String(new_values[k] ?? 'null').slice(0, 30)}</span>
            )}
          </div>
        ))}
        {changed.length > 4 && <span className="text-[10px] text-muted-foreground">+{changed.length - 4} {t3('meer', 'plus', 'more')}</span>}
      </div>
    );
  };

  const exportCSV = () => {
    const headers = ['Datum', 'Actor', 'Actie', 'Resource', 'Resource ID', 'Oud', 'Nieuw'];
    const rows = filteredEntries.map(e => [
      new Date(e.created_at).toISOString(),
      e.actor_id ? actorMap[e.actor_id] || e.actor_id : '',
      e.action,
      e.resource_type,
      e.resource_id || '',
      e.old_values ? JSON.stringify(e.old_values) : '',
      e.new_values ? JSON.stringify(e.new_values) : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  return (
    <ClubPageLayout>
      <div className="space-y-4">
        <PageNavTabs tabs={[
          { label: t3('Rapporten', 'Rapports', 'Reports'), path: '/reporting' },
          { label: 'Analytics', path: '/analytics' },
          { label: t3('Rapport Builder', 'Rapport Builder', 'Report Builder'), path: '/report-builder' },
          { label: 'Audit Log', path: '/audit-log' },
        ]} />
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">
              {t3('Audit Log', 'Journal d\'audit', 'Audit Log')}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-4 h-4" />
            {t3('Exporteer CSV', 'Exporter CSV', 'Export CSV')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={resourceFilter} onValueChange={v => { setResourceFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t3('Alle types', 'Tous les types', 'All types')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t3('Alle types', 'Tous les types', 'All types')}</SelectItem>
              {resourceTypes.map(rt => (
                <SelectItem key={rt} value={rt}>{rt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={actorSearch}
              onChange={e => setActorSearch(e.target.value)}
              placeholder={t3('Zoek op naam...', 'Rechercher par nom...', 'Search by name...')}
              className="pl-9"
            />
          </div>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-full sm:w-40" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-full sm:w-40" />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filteredEntries.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">{t3('Geen logs gevonden', 'Aucun log trouvé', 'No logs found')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">{t3('Datum', 'Date', 'Date')}</TableHead>
                  <TableHead>{t3('Wie', 'Qui', 'Who')}</TableHead>
                  <TableHead className="w-24">{t3('Actie', 'Action', 'Action')}</TableHead>
                  <TableHead>{t3('Resource', 'Ressource', 'Resource')}</TableHead>
                  <TableHead>{t3('Wijziging', 'Modification', 'Change')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {e.actor_id ? actorMap[e.actor_id] || '...' : t3('Systeem', 'Système', 'System')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={actionColor(e.action)}>{e.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{e.resource_type}</TableCell>
                    <TableCell>{renderDiff(e.old_values, e.new_values)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t3('Pagina', 'Page', 'Page')} {page + 1}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </ClubPageLayout>
  );
};

export default AuditLog;
