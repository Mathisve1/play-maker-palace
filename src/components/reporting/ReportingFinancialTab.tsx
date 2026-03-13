import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))', 'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
];

const YEARLY_LIMIT = 3233.91;

interface Props {
  payments: any[];
  sepaItems: any[];
  tasks: any[];
  events: any[];
  signups: any[];
  profiles: any[];
  filteredTaskIds: Set<string>;
  complianceDeclarations: any[];
  chartType: string;
}

export default function ReportingFinancialTab({
  payments, sepaItems, tasks, events, signups, profiles, filteredTaskIds, complianceDeclarations, chartType,
}: Props) {
  // Payment status pie
  const paymentStatusPie = useMemo(() => {
    const filtered = payments.filter(p => filteredTaskIds.has(p.task_id));
    const paid = filtered.filter(p => p.status === 'succeeded' || p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const pending = filtered.filter(p => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const failed = filtered.filter(p => p.status === 'failed').reduce((s: number, p: any) => s + Number(p.amount), 0);
    return [
      { name: 'Betaald', value: Math.round(paid * 100) / 100 },
      { name: 'Openstaand', value: Math.round(pending * 100) / 100 },
      ...(failed > 0 ? [{ name: 'Mislukt', value: Math.round(failed * 100) / 100 }] : []),
    ].filter(d => d.value > 0);
  }, [payments, filteredTaskIds]);

  // SEPA payment totals
  const sepaTotalPaid = useMemo(() => {
    return sepaItems.filter(s => filteredTaskIds.has(s.task_id))
      .reduce((s: number, p: any) => s + Number(p.amount), 0);
  }, [sepaItems, filteredTaskIds]);

  // Cost per event
  const costPerEvent = useMemo(() => {
    const eventMap = Object.fromEntries(events.map((e: any) => [e.id, e]));
    const costs: Record<string, { name: string; amount: number }> = {};
    payments.filter(p => (p.status === 'succeeded' || p.status === 'paid')).forEach((p: any) => {
      const task = tasks.find((t: any) => t.id === p.task_id);
      if (!task?.event_id) return;
      const ev = eventMap[task.event_id];
      if (!ev) return;
      if (!costs[ev.id]) costs[ev.id] = { name: ev.title, amount: 0 };
      costs[ev.id].amount += Number(p.amount);
    });
    return Object.values(costs).sort((a, b) => b.amount - a.amount).slice(0, 15)
      .map(c => ({ name: c.name.length > 20 ? c.name.slice(0, 18) + '…' : c.name, Kosten: Math.round(c.amount * 100) / 100 }));
  }, [payments, tasks, events]);

  // Budget prognose (next 3 months based on avg monthly spending)
  const budgetPrognose = useMemo(() => {
    const monthly: Record<string, number> = {};
    payments.filter(p => (p.status === 'succeeded' || p.status === 'paid') && p.paid_at).forEach((p: any) => {
      const m = format(parseISO(p.paid_at), 'yyyy-MM');
      monthly[m] = (monthly[m] || 0) + Number(p.amount);
    });
    const vals = Object.values(monthly);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    const result = sorted.map(([month, amount]) => ({ month, Werkelijk: Math.round(amount), Prognose: null as number | null }));
    // Add 3 future months
    if (sorted.length > 0) {
      const last = parseISO(sorted[sorted.length - 1][0] + '-01');
      for (let i = 1; i <= 3; i++) {
        const future = new Date(last);
        future.setMonth(future.getMonth() + i);
        result.push({ month: format(future, 'yyyy-MM'), Werkelijk: null as any, Prognose: Math.round(avg) });
      }
    }
    return result;
  }, [payments]);

  // Compliance overview: volunteers near limit
  const complianceOverview = useMemo(() => {
    const profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
    // Group payments by volunteer
    const volTotals: Record<string, number> = {};
    payments.filter(p => p.status === 'succeeded' || p.status === 'paid').forEach((p: any) => {
      volTotals[p.volunteer_id] = (volTotals[p.volunteer_id] || 0) + Number(p.amount);
    });
    // Add external income from declarations
    complianceDeclarations.forEach((d: any) => {
      volTotals[d.volunteer_id] = (volTotals[d.volunteer_id] || 0) + Number(d.external_income || 0);
    });
    
    return Object.entries(volTotals)
      .map(([id, total]) => ({
        id,
        name: profileMap[id]?.full_name || 'Onbekend',
        total: Math.round(total * 100) / 100,
        percent: Math.min(100, Math.round((total / YEARLY_LIMIT) * 100)),
        status: total >= YEARLY_LIMIT ? 'red' : total >= YEARLY_LIMIT * 0.8 ? 'orange' : 'green',
      }))
      .filter(v => v.percent >= 60)
      .sort((a, b) => b.percent - a.percent);
  }, [payments, complianceDeclarations, profiles]);


  const renderPieChart = (data: any[]) => (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip /><Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">€{totalFees.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Stripe Fees</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{complianceOverview.filter(v => v.status === 'red').length}</p>
          <p className="text-xs text-muted-foreground">Over limiet</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{complianceOverview.filter(v => v.status === 'orange').length}</p>
          <p className="text-xs text-muted-foreground">Nabij limiet (80%+)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">€{YEARLY_LIMIT}</p>
          <p className="text-xs text-muted-foreground">Jaargrens</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Betalingsstatus</CardTitle></CardHeader>
          <CardContent>{paymentStatusPie.length > 0 ? renderPieChart(paymentStatusPie) : <p className="text-sm text-muted-foreground text-center py-8">Geen data</p>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Stripe vs SEPA</CardTitle></CardHeader>
          <CardContent>{paymentMethodPie.length > 0 ? renderPieChart(paymentMethodPie) : <p className="text-sm text-muted-foreground text-center py-8">Geen data</p>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Kosten per evenement</CardTitle></CardHeader>
          <CardContent>
            {costPerEvent.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costPerEvent}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip /><Bar dataKey="Kosten" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Geen data</p>}
          </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Budget prognose</CardTitle></CardHeader>
          <CardContent>
            {budgetPrognose.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetPrognose}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip /><Legend />
                  <Bar dataKey="Werkelijk" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Prognose" fill={COLORS[2]} radius={[4, 4, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Geen data</p>}
          </CardContent></Card>
      </div>

      {/* Compliance table */}
      {complianceOverview.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Vrijwilligers nabij jaargrens (60%+)</CardTitle></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Naam</TableHead>
              <TableHead className="text-right">Totaal inkomen</TableHead>
              <TableHead className="text-center">% gebruikt</TableHead>
              <TableHead className="text-right">Resterend</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {complianceOverview.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-right">€{v.total.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{v.percent}%</TableCell>
                  <TableCell className="text-right">€{Math.max(0, YEARLY_LIMIT - v.total).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={v.status === 'red' ? 'destructive' : v.status === 'orange' ? 'secondary' : 'default'}>
                      {v.status === 'red' ? 'Over limiet' : v.status === 'orange' ? 'Waarschuwing' : 'OK'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div></CardContent></Card>
      )}
    </div>
  );
}
