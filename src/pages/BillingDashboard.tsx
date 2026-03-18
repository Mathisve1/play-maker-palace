import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClubContext } from '@/contexts/ClubContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  CreditCard, Receipt, Users, Loader2, Download, Gift, AlertTriangle,
  CheckCircle, Handshake, TrendingUp, FileText, Info
} from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { generateInvoicePdf } from '@/lib/generateInvoicePdf';

interface VolunteerUsageRow {
  volunteer_id: string;
  completed_tasks: number;
  is_billed: boolean;
  volunteer_name?: string;
}

const BillingDashboard = () => {
  const { language } = useLanguage();
  const { clubId: ctxClubId, clubInfo, loading: contextLoading } = useClubContext();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [seatInput, setSeatInput] = useState('');
  const [savingSeats, setSavingSeats] = useState(false);
  const [volunteerUsage, setVolunteerUsage] = useState<VolunteerUsageRow[]>([]);

  useEffect(() => {
    if (contextLoading) return;
    if (!ctxClubId) { setLoading(false); return; }
    setClubId(ctxClubId);
    setClubName(clubInfo?.name || '');
    loadData(ctxClubId).then(() => setLoading(false));
  }, [contextLoading, ctxClubId]);

  const loadData = async (cId: string) => {
    const [billingRes, eventsRes, invoicesRes] = await Promise.all([
      supabase.from('club_billing').select('*').eq('club_id', cId).maybeSingle(),
      supabase.from('billing_events').select('*').eq('club_id', cId).order('created_at', { ascending: false }).limit(50),
      supabase.from('monthly_invoices').select('*').eq('club_id', cId).order('invoice_year', { ascending: false }).order('invoice_month', { ascending: false }).limit(24),
    ]);

    if (!billingRes.data) {
      const { data: newBilling } = await supabase.from('club_billing').insert({ club_id: cId }).select().single();
      setBilling(newBilling);
    } else {
      setBilling(billingRes.data);
    }
    setSeatInput(billingRes.data?.partner_seats_purchased?.toString() || '0');
    setEvents(eventsRes.data || []);
    setInvoices(invoicesRes.data || []);

    // Fetch per-volunteer usage for active season
    const { data: activeSeason } = await (supabase as any).from('seasons').select('id').eq('club_id', cId).eq('is_active', true).maybeSingle();
    if (activeSeason) {
      const { data: usage } = await (supabase as any)
        .from('volunteer_season_usage')
        .select('volunteer_id, completed_tasks, is_billed')
        .eq('club_id', cId)
        .eq('season_id', activeSeason.id)
        .order('completed_tasks', { ascending: false });

      if (usage && usage.length > 0) {
        // Get volunteer names
        const volIds = usage.map((u: any) => u.volunteer_id);
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', volIds);
        const nameMap = new Map<string, string>();
        (profiles || []).forEach((p: any) => nameMap.set(p.id, p.full_name || p.email || 'Onbekend'));

        setVolunteerUsage(
          usage.map((u: any) => ({
            ...u,
            volunteer_name: nameMap.get(u.volunteer_id) || 'Onbekend',
          }))
        );
      }
    }
  };


  const billedCount = billing?.current_season_volunteers_billed || 0;
  const currentVolunteerCost = billedCount * ((billing?.volunteer_price_cents || 1500) / 100);
  const currentSeatCost = billing ? billing.partner_seats_purchased * (billing.partner_seat_price_cents / 100) : 0;
  const totalSeasonCost = currentVolunteerCost + currentSeatCost;

  const updateSeats = async () => {
    if (!clubId || !billing) return;
    const seats = parseInt(seatInput) || 0;
    if (seats < 0) return;
    setSavingSeats(true);

    const { error } = await supabase.from('club_billing')
      .update({ partner_seats_purchased: seats })
      .eq('club_id', clubId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('Zitjes bijgewerkt', 'Sièges mis à jour', 'Seats updated'));
      await supabase.from('billing_events').insert({
        club_id: clubId,
        event_type: 'seats_updated',
        amount_cents: seats * (billing.partner_seat_price_cents || 1500),
        metadata: { seats_count: seats },
      });
      await loadData(clubId);
    }
    setSavingSeats(false);
  };

  const eventTypeLabels: Record<string, string> = {
    volunteer_billed: t('Vrijwilliger gefactureerd', 'Bénévole facturé', 'Volunteer billed'),
    free_contract_used: t('Gratis taak voltooid', 'Tâche gratuite complétée', 'Free task completed'),
    paid_contract_created: t('Vrijwilliger gefactureerd (3e taak)', 'Bénévole facturé (3e tâche)', 'Volunteer billed (3rd task)'),
    payment_succeeded: t('Betaling geslaagd', 'Paiement réussi', 'Payment succeeded'),
    payment_failed: t('Betaling mislukt', 'Paiement échoué', 'Payment failed'),
    seats_updated: t('Zitjes bijgewerkt', 'Sièges mis à jour', 'Seats updated'),
  };

  const monthNames = language === 'nl'
    ? ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const handleDownloadInvoice = (inv: any) => {
    generateInvoicePdf({
      clubName,
      invoiceMonth: inv.invoice_month,
      invoiceYear: inv.invoice_year,
      volunteerCount: inv.volunteer_count,
      volunteerAmountCents: inv.volunteer_amount_cents,
      partnerSeatsCount: inv.partner_seats_count,
      partnerSeatsAmountCents: inv.partner_seats_amount_cents,
      totalAmountCents: inv.total_amount_cents,
      status: inv.status,
      language,
    });
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
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">
          {t('Facturatie & Abonnement', 'Facturation & Abonnement', 'Billing & Subscription')}
        </h1>

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">
            {t(
              'Uw eerste 2 taken per vrijwilliger zijn gratis elk seizoen. Elke vrijwilliger die 3 of meer taken voltooit in dit seizoen wordt gefactureerd aan €15.',
              'Vos 2 premières tâches par bénévole sont gratuites chaque saison. Chaque bénévole qui complète 3 tâches ou plus cette saison est facturé à 15€.',
              'Your first 2 tasks per volunteer are free each season. Each volunteer completing 3 or more tasks this season is billed at €15.'
            )}
          </p>
        </div>

        {/* Status cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Billing model */}
          <Card className="border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {t('Per-vrijwilliger model', 'Modèle par bénévole', 'Per-volunteer model')}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">2 {t('gratis taken', 'tâches gratuites', 'free tasks')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('per vrijwilliger per seizoen', 'par bénévole par saison', 'per volunteer per season')}</p>
            </CardContent>
          </Card>

          {/* Volunteers billed */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{t('Gefactureerde vrijwilligers', 'Bénévoles facturés', 'Billed volunteers')}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{billedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">× €15 = €{currentVolunteerCost.toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Partner seats */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Handshake className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{t('Partner zitjes', 'Sièges partenaires', 'Partner seats')}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{billing?.partner_seats_purchased || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">= €{currentSeatCost.toFixed(2)} / {t('seizoen', 'saison', 'season')}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pricing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pricing">{t('Prijzen', 'Tarifs', 'Pricing')}</TabsTrigger>
            <TabsTrigger value="usage">{t('Per vrijwilliger', 'Par bénévole', 'Per volunteer')}</TabsTrigger>
            <TabsTrigger value="seats">{t('Partner zitjes', 'Sièges partenaires', 'Partner seats')}</TabsTrigger>
            <TabsTrigger value="invoices">{t('Facturen', 'Factures', 'Invoices')}</TabsTrigger>
            <TabsTrigger value="history">{t('Geschiedenis', 'Historique', 'History')}</TabsTrigger>
          </TabsList>

          {/* Pricing */}
          <TabsContent value="pricing">
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* How it works */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Gift className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-heading font-bold text-foreground">
                      {t('Hoe werkt het?', 'Comment ça marche ?', 'How does it work?')}
                    </h3>
                  </div>
                  <ul className="space-y-4 text-sm">
                    {[
                      { step: '1', text: t('Elke vrijwilliger kan 2 taken gratis voltooien per seizoen', 'Chaque bénévole peut effectuer 2 tâches gratuitement par saison', 'Each volunteer can complete 2 tasks for free per season'), highlight: true },
                      { step: '2', text: t('Vanaf de 3e voltooide taak wordt €15 gefactureerd voor die vrijwilliger (eenmalig per seizoen)', 'À partir de la 3e tâche complétée, 15€ sont facturés pour ce bénévole (une fois par saison)', 'From the 3rd completed task, €15 is billed for that volunteer (once per season)'), highlight: false },
                      { step: '3', text: t('Daarna onbeperkt taken — geen extra kosten', 'Ensuite tâches illimitées — sans frais supplémentaires', 'Then unlimited tasks — no extra costs'), highlight: false },
                      { step: '✓', text: t('Teller reset bij elk nieuw seizoen', 'Compteur réinitialisé chaque saison', 'Counter resets each new season'), highlight: false },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                          {item.step}
                        </span>
                        <span className="text-foreground">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Example */}
              <Card className="relative overflow-hidden border-primary/30 shadow-card">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-heading font-bold text-foreground">
                      {t('Voorbeeldberekening', 'Exemple de calcul', 'Example calculation')}
                    </h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anna — 2 {t('taken', 'tâches', 'tasks')}</span>
                      <span className="font-medium text-primary">€0 ✓ ({t('gratis', 'gratuit', 'free')})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bert — 1 {t('taak', 'tâche', 'task')}</span>
                      <span className="font-medium text-primary">€0 ✓ ({t('gratis', 'gratuit', 'free')})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clara — 5 {t('taken', 'tâches', 'tasks')}</span>
                      <span className="font-medium text-foreground">€15 ({t('3e taak bereikt', '3e tâche atteinte', '3rd task reached')})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">David — 4 {t('taken', 'tâches', 'tasks')}</span>
                      <span className="font-medium text-foreground">€15</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between font-bold">
                      <span className="text-foreground">{t('Totaal', 'Total', 'Total')}</span>
                      <span className="text-primary">€30 / {t('seizoen', 'saison', 'season')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* FAQ */}
            <div className="space-y-4">
              <h2 className="text-xl font-heading font-bold text-foreground">
                {t('Veelgestelde vragen', 'Questions fréquentes', 'Frequently asked questions')}
              </h2>
              {[
                {
                  q: t('Wanneer betaal ik?', 'Quand est-ce que je paie ?', 'When do I pay?'),
                  a: t(
                    'Je betaalt pas wanneer een vrijwilliger meer dan 2 taken voltooit in een seizoen. Op dat moment wordt eenmalig €15 gefactureerd voor die vrijwilliger. Facturatie gebeurt maandelijks op de 1e.',
                    'Vous ne payez que lorsqu\'un bénévole complète plus de 2 tâches dans une saison. À ce moment, 15€ sont facturés une seule fois pour ce bénévole. Facturation mensuelle le 1er.',
                    'You only pay when a volunteer completes more than 2 tasks in a season. At that point, €15 is billed once for that volunteer. Billed monthly on the 1st.'
                  ),
                },
                {
                  q: t('Wat als een vrijwilliger maar 2 taken doet?', 'Et si un bénévole ne fait que 2 tâches ?', 'What if a volunteer only does 2 tasks?'),
                  a: t(
                    'Dan is het volledig gratis! Je betaalt pas vanaf de 3e voltooide taak van die vrijwilliger.',
                    'C\'est entièrement gratuit ! Vous ne payez qu\'à partir de la 3e tâche complétée de ce bénévole.',
                    'It\'s completely free! You only pay from the 3rd completed task of that volunteer.'
                  ),
                },
                {
                  q: t('Reset de teller per seizoen?', 'Le compteur se réinitialise-t-il par saison ?', 'Does the counter reset per season?'),
                  a: t(
                    'Ja! Bij elk nieuw seizoen begint de teller van voltooide taken per vrijwilliger opnieuw op 0.',
                    'Oui ! Chaque nouvelle saison, le compteur de tâches complétées par bénévole repart à 0.',
                    'Yes! Each new season, the completed tasks counter per volunteer resets to 0.'
                  ),
                },
                {
                  q: t('Wat zijn partnerzitjes?', 'Que sont les sièges partenaires ?', 'What are partner seats?'),
                  a: t(
                    'Partnerzitjes zijn onbenoemde plaatsen voor externe partners. €15/zitje/seizoen.',
                    'Les sièges partenaires sont des places anonymes pour partenaires externes. €15/siège/saison.',
                    'Partner seats are unnamed spots for external partners. €15/seat/season.'
                  ),
                },
              ].map((faq, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <h4 className="font-medium text-foreground text-sm mb-2">{faq.q}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Per-volunteer usage tab */}
          <TabsContent value="usage">
            {volunteerUsage.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>{t('Nog geen voltooide taken dit seizoen.', 'Aucune tâche complétée cette saison.', 'No completed tasks this season.')}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-heading font-bold text-foreground">
                      {t('Gebruik per vrijwilliger', 'Utilisation par bénévole', 'Usage per volunteer')}
                    </h3>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Vrijwilliger', 'Bénévole', 'Volunteer')}</TableHead>
                          <TableHead className="text-right">{t('Voltooide taken', 'Tâches complétées', 'Completed tasks')}</TableHead>
                          <TableHead className="text-right">{t('Status', 'Statut', 'Status')}</TableHead>
                          <TableHead className="text-right">{t('Kost', 'Coût', 'Cost')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {volunteerUsage.map((row) => (
                          <TableRow key={row.volunteer_id}>
                            <TableCell className="font-medium text-foreground">{row.volunteer_name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span>{row.completed_tasks}</span>
                                <Progress value={Math.min((row.completed_tasks / 2) * 100, 100)} className="w-16 h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {row.is_billed ? (
                                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                                  {t('Gefactureerd', 'Facturé', 'Billed')}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  {t('Gratis', 'Gratuit', 'Free')}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {row.is_billed ? (
                                <span>€15.00</span>
                              ) : (
                                <span className="text-primary">€0</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 font-bold">
                          <TableCell>{t('Totaal', 'Total', 'Total')}</TableCell>
                          <TableCell className="text-right">{volunteerUsage.reduce((s, r) => s + r.completed_tasks, 0)}</TableCell>
                          <TableCell className="text-right">
                            {volunteerUsage.filter(r => r.is_billed).length} {t('gefactureerd', 'facturés', 'billed')}
                          </TableCell>
                          <TableCell className="text-right text-primary">
                            €{(volunteerUsage.filter(r => r.is_billed).length * 15).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {t(
                      '* Elke vrijwilliger krijgt 2 gratis taken per seizoen. Vanaf de 3e taak: €15/vrijwilliger/seizoen.',
                      '* Chaque bénévole a 2 tâches gratuites par saison. À partir de la 3e : €15/bénévole/saison.',
                      '* Each volunteer gets 2 free tasks per season. From the 3rd task: €15/volunteer/season.'
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Partner seats */}
          <TabsContent value="seats">
            <div className="space-y-4">
              {/* Explainer */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-primary" />
                    {t('Wat zijn partner zitjes?', 'Que sont les sièges partenaires ?', 'What are partner seats?')}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(
                      'Partner zitjes zijn onbenoemde plaatsen die je inkoopt voor externe partners (bv. security, catering, EHBO). In tegenstelling tot vrijwilligers, waar je pas betaalt na hun 3e check-in, koop je zitjes vooraf per seizoen.',
                      'Les sièges partenaires sont des places anonymes que vous achetez pour des partenaires externes (ex. sécurité, restauration, premiers secours). Contrairement aux bénévoles, où vous payez après leur 3e check-in, les sièges sont achetés à l\'avance par saison.',
                      'Partner seats are unnamed spots you purchase for external partners (e.g. security, catering, first aid). Unlike volunteers, where you only pay after their 3rd check-in, seats are purchased upfront per season.'
                    )}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-foreground">€15</p>
                      <p className="text-xs text-muted-foreground">{t('per zitje / seizoen', 'par siège / saison', 'per seat / season')}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{t('Onbenoemd', 'Anonyme', 'Unnamed')}</p>
                      <p className="text-xs text-muted-foreground">{t('Vrij toewijsbaar', 'Librement assignable', 'Freely assignable')}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{t('Vooraf', 'À l\'avance', 'Upfront')}</p>
                      <p className="text-xs text-muted-foreground">{t('Gefactureerd bij aankoop', 'Facturé à l\'achat', 'Billed on purchase')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manage */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-medium text-foreground">{t('Aantal zitjes aanpassen', 'Modifier le nombre de sièges', 'Adjust seat count')}</h3>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 max-w-xs">
                      <Label>{t('Aantal zitjes', 'Nombre de sièges', 'Number of seats')}</Label>
                      <Input type="number" min="0" value={seatInput} onChange={e => setSeatInput(e.target.value)} />
                    </div>
                    <Button onClick={updateSeats} disabled={savingSeats}>
                      {savingSeats ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {t('Opslaan', 'Enregistrer', 'Save')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'Huidige kosten: €' + currentSeatCost.toFixed(2) + ' voor ' + (billing?.partner_seats_purchased || 0) + ' zitjes dit seizoen.',
                      'Coût actuel : €' + currentSeatCost.toFixed(2) + ' pour ' + (billing?.partner_seats_purchased || 0) + ' sièges cette saison.',
                      'Current cost: €' + currentSeatCost.toFixed(2) + ' for ' + (billing?.partner_seats_purchased || 0) + ' seats this season.'
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Invoices */}
          <TabsContent value="invoices">
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>{t('Nog geen facturen.', 'Aucune facture.', 'No invoices yet.')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {monthNames[(inv.invoice_month - 1) % 12]} {inv.invoice_year}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{inv.volunteer_count} {t('vrijwilligers', 'bénévoles', 'volunteers')}</span>
                        <Badge variant={inv.status === 'paid' ? 'default' : 'outline'} className="text-[10px]">
                          {inv.status === 'paid' ? t('Betaald', 'Payé', 'Paid') : t('Openstaand', 'En attente', 'Pending')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-foreground">€{(inv.total_amount_cents / 100).toFixed(2)}</span>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(inv)}>
                        <Download className="w-3.5 h-3.5 mr-1" />{t('PDF', 'PDF', 'PDF')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            {events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>{t('Geen activiteiten.', 'Aucune activité.', 'No activity.')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1">
                {events.map((ev: any) => (
                  <div key={ev.id} className="bg-card rounded-lg p-3 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        ev.event_type === 'payment_failed' ? 'bg-destructive' :
                        ev.event_type === 'payment_succeeded' ? 'bg-green-500' :
                        ev.event_type === 'volunteer_billed' ? 'bg-accent' : 'bg-primary'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{eventTypeLabels[ev.event_type] || ev.event_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.created_at).toLocaleDateString()} {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {ev.amount_cents != null && (
                      <span className="text-sm font-medium text-foreground">€{(ev.amount_cents / 100).toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClubPageLayout>
  );
};

export default BillingDashboard;
