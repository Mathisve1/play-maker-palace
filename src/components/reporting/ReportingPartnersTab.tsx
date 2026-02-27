import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))', 'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))', '#6366f1', '#14b8a6',
];

interface Props {
  partners: any[];
  partnerMembers: any[];
  partnerTaskAssignments: any[];
  signups: any[];
  tasks: any[];
  filteredTaskIds: Set<string>;
}

export default function ReportingPartnersTab({
  partners, partnerMembers, partnerTaskAssignments, signups, tasks, filteredTaskIds,
}: Props) {
  // Partner report
  const partnerReport = useMemo(() => {
    return partners.map((p: any) => {
      const members = partnerMembers.filter((m: any) => m.partner_id === p.id);
      const assignments = partnerTaskAssignments.filter((a: any) =>
        members.some((m: any) => m.id === a.partner_member_id) && filteredTaskIds.has(a.task_id)
      );
      const withAccount = members.filter((m: any) => m.user_id).length;
      // Partner tasks (assigned to this partner)
      const partnerTasks = tasks.filter((t: any) => t.assigned_partner_id === p.id && filteredTaskIds.has(t.id));
      const totalSpots = partnerTasks.reduce((s: number, t: any) => s + (t.spots_available || 0), 0);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        totalMembers: members.length,
        withAccount,
        accountRate: members.length > 0 ? Math.round((withAccount / members.length) * 100) : 0,
        totalAssignments: assignments.length,
        totalTasks: partnerTasks.length,
        fillRate: totalSpots > 0 ? Math.round((assignments.length / totalSpots) * 100) : 0,
      };
    }).sort((a, b) => b.totalAssignments - a.totalAssignments);
  }, [partners, partnerMembers, partnerTaskAssignments, tasks, filteredTaskIds]);

  // Own vs partner volunteers
  const ownVsPartner = useMemo(() => {
    const ownAssigned = signups.filter((s: any) => filteredTaskIds.has(s.task_id) && s.status === 'assigned').length;
    const partnerAssigned = partnerTaskAssignments.filter((a: any) => filteredTaskIds.has(a.task_id)).length;
    return [
      { name: 'Eigen vrijwilligers', value: ownAssigned },
      { name: 'Partner medewerkers', value: partnerAssigned },
    ].filter(d => d.value > 0);
  }, [signups, partnerTaskAssignments, filteredTaskIds]);

  // Per partner bar chart
  const perPartnerChart = useMemo(() => {
    return partnerReport.slice(0, 10).map(p => ({
      name: p.name.length > 15 ? p.name.slice(0, 13) + '…' : p.name,
      Medewerkers: p.totalMembers,
      Ingezet: p.totalAssignments,
    }));
  }, [partnerReport]);

  const totalPartnerMembers = partnerMembers.length;
  const totalWithAccount = partnerMembers.filter((m: any) => m.user_id).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{partners.length}</p>
          <p className="text-xs text-muted-foreground">Partners</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalPartnerMembers}</p>
          <p className="text-xs text-muted-foreground">Totaal medewerkers</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalWithAccount}</p>
          <p className="text-xs text-muted-foreground">Met account</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">
            {totalPartnerMembers > 0 ? Math.round((totalWithAccount / totalPartnerMembers) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground">Registratie rate</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Eigen vs partner inzet</CardTitle></CardHeader>
          <CardContent>
            {ownVsPartner.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={ownVsPartner} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {ownVsPartner.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Geen data</p>}
          </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Medewerkers per partner</CardTitle></CardHeader>
          <CardContent>
            {perPartnerChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={perPartnerChart}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip /><Legend />
                  <Bar dataKey="Medewerkers" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ingezet" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Geen data</p>}
          </CardContent></Card>
      </div>

      {/* Partner detail table */}
      <Card><CardHeader><CardTitle className="text-base">Partner overzicht</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table>
          <TableHeader><TableRow>
            <TableHead>Partner</TableHead>
            <TableHead>Categorie</TableHead>
            <TableHead className="text-center">Medewerkers</TableHead>
            <TableHead className="text-center">Met account</TableHead>
            <TableHead className="text-center">Registratie %</TableHead>
            <TableHead className="text-center">Ingezet</TableHead>
            <TableHead className="text-center">Taken</TableHead>
            <TableHead className="text-center">Bezetting</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {partnerReport.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen partners gevonden</TableCell></TableRow>
            ) : partnerReport.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.category}</TableCell>
                <TableCell className="text-center">{p.totalMembers}</TableCell>
                <TableCell className="text-center">{p.withAccount}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={p.accountRate >= 80 ? 'default' : p.accountRate >= 50 ? 'secondary' : 'destructive'}>
                    {p.accountRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{p.totalAssignments}</TableCell>
                <TableCell className="text-center">{p.totalTasks}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={p.fillRate >= 80 ? 'default' : p.fillRate >= 50 ? 'secondary' : 'destructive'}>
                    {p.fillRate}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div></CardContent></Card>
    </div>
  );
}
