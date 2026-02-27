import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))', 'hsl(var(--chart-4, 280 65% 60%))',
  '#ef4444',
];

const YEARLY_LIMIT = 3233.91;

interface Props {
  signatureRequests: any[];
  complianceDeclarations: any[];
  payments: any[];
  profiles: any[];
}

export default function ReportingComplianceTab({
  signatureRequests, complianceDeclarations, payments, profiles,
}: Props) {
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.id, p])), [profiles]);

  // Contract status pie
  const contractPie = useMemo(() => {
    const signed = signatureRequests.filter((s: any) => s.status === 'completed').length;
    const pending = signatureRequests.filter((s: any) => s.status === 'pending').length;
    const sent = signatureRequests.filter((s: any) => s.status === 'sent' || s.status === 'awaiting').length;
    return [
      { name: 'Ondertekend', value: signed },
      { name: 'Verzonden', value: sent },
      { name: 'In afwachting', value: pending },
    ].filter(d => d.value > 0);
  }, [signatureRequests]);

  // Average signing time
  const avgSigningDays = useMemo(() => {
    const completed = signatureRequests.filter((s: any) => s.status === 'completed' && s.created_at && s.updated_at);
    if (completed.length === 0) return null;
    const totalDays = completed.reduce((sum: number, s: any) => {
      return sum + Math.max(0, differenceInDays(parseISO(s.updated_at), parseISO(s.created_at)));
    }, 0);
    return Math.round(totalDays / completed.length * 10) / 10;
  }, [signatureRequests]);

  // Contract signed %
  const signedPercent = useMemo(() => {
    if (signatureRequests.length === 0) return 0;
    return Math.round((signatureRequests.filter((s: any) => s.status === 'completed').length / signatureRequests.length) * 100);
  }, [signatureRequests]);

  // Compliance: volunteers near limit
  const complianceList = useMemo(() => {
    const volTotals: Record<string, { internal: number; external: number }> = {};
    payments.filter(p => p.status === 'succeeded' || p.status === 'paid').forEach((p: any) => {
      if (!volTotals[p.volunteer_id]) volTotals[p.volunteer_id] = { internal: 0, external: 0 };
      volTotals[p.volunteer_id].internal += Number(p.amount);
    });
    complianceDeclarations.forEach((d: any) => {
      if (!volTotals[d.volunteer_id]) volTotals[d.volunteer_id] = { internal: 0, external: 0 };
      volTotals[d.volunteer_id].external += Number(d.external_income || 0);
    });
    return Object.entries(volTotals)
      .map(([id, totals]) => ({
        id,
        name: profileMap[id]?.full_name || 'Onbekend',
        internal: Math.round(totals.internal * 100) / 100,
        external: Math.round(totals.external * 100) / 100,
        total: Math.round((totals.internal + totals.external) * 100) / 100,
        percent: Math.min(100, Math.round(((totals.internal + totals.external) / YEARLY_LIMIT) * 100)),
        status: (totals.internal + totals.external) >= YEARLY_LIMIT ? 'red' as const
          : (totals.internal + totals.external) >= YEARLY_LIMIT * 0.8 ? 'orange' as const : 'green' as const,
      }))
      .filter(v => v.percent >= 80)
      .sort((a, b) => b.percent - a.percent);
  }, [payments, complianceDeclarations, profileMap]);

  // Declaration status per month
  const declarationMonths = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const volIds = [...new Set(complianceDeclarations.map((d: any) => d.volunteer_id))];
    const monthStats: { month: number; declared: number; total: number }[] = [];
    for (let m = 1; m <= currentMonth; m++) {
      const declared = volIds.filter(vid =>
        complianceDeclarations.some((d: any) => d.volunteer_id === vid && d.declaration_month === m && d.declaration_year === currentYear)
      ).length;
      monthStats.push({ month: m, declared, total: volIds.length });
    }
    return monthStats;
  }, [complianceDeclarations]);

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
          <p className="text-2xl font-bold text-foreground">{signatureRequests.length}</p>
          <p className="text-xs text-muted-foreground">Totaal contracten</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{signedPercent}%</p>
          <p className="text-xs text-muted-foreground">Ondertekend</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{avgSigningDays !== null ? `${avgSigningDays}d` : '—'}</p>
          <p className="text-xs text-muted-foreground">Gem. doorlooptijd</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{complianceList.length}</p>
          <p className="text-xs text-muted-foreground">Nabij jaargrens</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Contractstatus</CardTitle></CardHeader>
          <CardContent>{contractPie.length > 0 ? renderPieChart(contractPie) : <p className="text-sm text-muted-foreground text-center py-8">Geen contracten</p>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Declaratiestatus per maand</CardTitle></CardHeader>
          <CardContent>
            {declarationMonths.length > 0 ? (
              <div className="space-y-2">
                {declarationMonths.map(m => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-sm w-16 text-muted-foreground">Maand {m.month}</span>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all"
                        style={{ width: m.total > 0 ? `${(m.declared / m.total) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{m.declared}/{m.total}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Geen declaraties</p>}
          </CardContent></Card>
      </div>

      {/* Volunteers near limit */}
      {complianceList.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Vrijwilligers nabij jaargrens (80%+)</CardTitle></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Naam</TableHead>
              <TableHead className="text-right">Intern</TableHead>
              <TableHead className="text-right">Extern</TableHead>
              <TableHead className="text-right">Totaal</TableHead>
              <TableHead className="text-center">% gebruikt</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {complianceList.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-right">€{v.internal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">€{v.external.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">€{v.total.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{v.percent}%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={v.status === 'red' ? 'destructive' : 'secondary'}>
                      {v.status === 'red' ? 'Over limiet' : 'Waarschuwing'}
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
