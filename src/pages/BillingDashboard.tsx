import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
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
  CheckCircle, Handshake, TrendingUp, FileText, Package
} from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { generateInvoicePdf } from '@/lib/generateInvoicePdf';

const BillingDashboard = () => {
  const { language } = useLanguage();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [seatInput, setSeatInput] = useState('');
  const [savingSeats, setSavingSeats] = useState(false);
  const [contractTypeBreakdown, setContractTypeBreakdown] = useState<{ category: string; count: number; cost: number }[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: club } = await supabase.from('clubs').select('id, name').eq('owner_id', user.id).limit(1).single();
      if (!club) { setLoading(false); return; }
      setClubId(club.id);
      setClubName(club.name);
      await loadData(club.id);
      setLoading(false);
    };
    init();
  }, []);

  const loadData = async (cId: string) => {
    const [billingRes, eventsRes, invoicesRes] = await Promise.all([
      supabase.from('club_billing').select('*').eq('club_id', cId).maybeSingle(),
      supabase.from('billing_events').select('*').eq('club_id', cId).order('created_at', { ascending: false }).limit(50),
      supabase.from('monthly_invoices').select('*').eq('club_id', cId).order('invoice_year', { ascending: false }).order('invoice_month', { ascending: false }).limit(24),
    ]);

    if (!billingRes.data) {
      // Auto-create billing record
      const { data: newBilling } = await supabase.from('club_billing').insert({ club_id: cId }).select().single();
      setBilling(newBilling);
    } else {
      setBilling(billingRes.data);
    }
    setSeatInput(billingRes.data?.partner_seats_purchased?.toString() || '0');
    setEvents(eventsRes.data || []);
    setInvoices(invoicesRes.data || []);
  };

  const isFree = billing && billing.free_contracts_used < billing.free_contracts_limit;
  const freeProgress = billing ? Math.min((billing.free_contracts_used / billing.free_contracts_limit) * 100, 100) : 0;

  const currentVolunteerCost = billing ? billing.current_season_volunteers_billed * (billing.volunteer_price_cents / 100) : 0;
  const currentSeatCost = billing ? billing.partner_seats_purchased * (billing.partner_seat_price_cents / 100) : 0;
  const totalMonthlyCost = currentVolunteerCost + currentSeatCost;

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
      // Log billing event
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
    free_contract_used: t('Gratis contract', 'Contrat gratuit', 'Free contract'),
    paid_contract_created: t('Betaald contract', 'Contrat payant', 'Paid contract'),
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

        {/* Status cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Free trial status */}
          <Card className={isFree ? 'border-primary/30' : ''}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                {isFree ? <Gift className="w-5 h-5 text-primary" /> : <CreditCard className="w-5 h-5 text-primary" />}
                <span className="text-sm font-medium text-foreground">
                  {isFree
                    ? t('Gratis testperiode', 'Période d\'essai', 'Free trial')
                    : t('Betaald plan', 'Plan payant', 'Paid plan')}
                </span>
              </div>
              {isFree ? (
                <>
                  <p className="text-2xl font-bold text-foreground">{billing?.free_contracts_used || 0} / {billing?.free_contracts_limit || 2}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('gratis contracten gebruikt', 'contrats gratuits utilisés', 'free contracts used')}</p>
                  <Progress value={freeProgress} className="mt-3 h-2" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">€{(billing?.volunteer_price_cents || 1500) / 100}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('per vrijwilliger / seizoen', 'par bénévole / saison', 'per volunteer / season')}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Volunteers billed */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{t('Vrijwilligers dit seizoen', 'Bénévoles cette saison', 'Volunteers this season')}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{billing?.current_season_volunteers_billed || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">= €{currentVolunteerCost.toFixed(2)}</p>
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

        {/* Monthly total */}
        <Card className="border-primary/20">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Geschatte maandelijkse kost', 'Coût mensuel estimé', 'Estimated monthly cost')}</p>
              <p className="text-3xl font-bold text-primary">€{totalMonthlyCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('Facturatie op de 1e van elke maand', 'Facturation le 1er de chaque mois', 'Billed on the 1st of each month')}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-primary/20" />
          </CardContent>
        </Card>

        <Tabs defaultValue="pricing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pricing">{t('Prijzen', 'Tarifs', 'Pricing')}</TabsTrigger>
            <TabsTrigger value="seats">{t('Partner zitjes', 'Sièges partenaires', 'Partner seats')}</TabsTrigger>
            <TabsTrigger value="invoices">{t('Facturen', 'Factures', 'Invoices')}</TabsTrigger>
            <TabsTrigger value="history">{t('Geschiedenis', 'Historique', 'History')}</TabsTrigger>
          </TabsList>

          {/* Pricing comparison */}
          <TabsContent value="pricing">
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Free tier */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-muted" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-heading font-bold text-foreground">{t('Gratis', 'Gratuit', 'Free')}</h3>
                  </div>
                  <p className="text-3xl font-bold text-foreground mt-3">€0</p>
                  <p className="text-xs text-muted-foreground mb-6">{t('voor altijd', 'pour toujours', 'forever')}</p>
                  <ul className="space-y-3 text-sm">
                    {[
                      t('2 seizoenscontracten', '2 contrats saisonniers', '2 season contracts'),
                      t('5 contractsjablonen', '5 modèles de contrats', '5 contract templates'),
                      t('Alle platformfeatures', 'Toutes les fonctionnalités', 'All platform features'),
                      t('Briefings & veiligheid', 'Briefings & sécurité', 'Briefings & safety'),
                      t('Community & badges', 'Communauté & badges', 'Community & badges'),
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Paid tier */}
              <Card className="relative overflow-hidden border-primary/30 shadow-card">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <div className="absolute top-3 right-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {t('Populair', 'Populaire', 'Popular')}
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-heading font-bold text-foreground">{t('Betaald', 'Payant', 'Paid')}</h3>
                  </div>
                  <p className="text-3xl font-bold text-primary mt-3">€15</p>
                  <p className="text-xs text-muted-foreground mb-6">{t('per vrijwilliger / seizoen', 'par bénévole / saison', 'per volunteer / season')}</p>
                  <ul className="space-y-3 text-sm">
                    {[
                      t('Onbeperkt contracten', 'Contrats illimités', 'Unlimited contracts'),
                      t('€15/vrijwilliger/seizoen', '€15/bénévole/saison', '€15/volunteer/season'),
                      t('SEPA-uitbetalingen', 'Paiements SEPA', 'SEPA payouts'),
                      t('Automatische facturatie', 'Facturation automatique', 'Automated invoicing'),
                      t('Partnerzitjes (bulk)', 'Sièges partenaires (en lot)', 'Partner seats (bulk)'),
                      t('Prioritaire support', 'Support prioritaire', 'Priority support'),
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
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
                    'Je betaalt pas wanneer je meer dan 2 seizoenscontracten actief hebt. Facturatie gebeurt maandelijks op de 1e van elke maand.',
                    'Vous ne payez qu\'à partir du 3e contrat saisonnier actif. La facturation est mensuelle, le 1er de chaque mois.',
                    'You only pay when you have more than 2 active season contracts. Billing happens monthly on the 1st of each month.'
                  ),
                },
                {
                  q: t('Wat als een vrijwilliger stopt?', 'Et si un bénévole arrête ?', 'What if a volunteer leaves?'),
                  a: t(
                    'Je betaalt enkel voor actieve vrijwilligers. Als een contract wordt beëindigd, worden er geen verdere kosten in rekening gebracht voor die vrijwilliger.',
                    'Vous ne payez que pour les bénévoles actifs. Si un contrat est résilié, aucun frais supplémentaire n\'est facturé.',
                    'You only pay for active volunteers. If a contract is terminated, no further charges apply for that volunteer.'
                  ),
                },
                {
                  q: t('Hoe werkt de facturatie?', 'Comment fonctionne la facturation ?', 'How does billing work?'),
                  a: t(
                    'Elke maand op de 1e wordt automatisch een factuur gegenereerd op basis van je actieve contracten en partnerzitjes. Je vindt alle facturen in het tabblad "Facturen".',
                    'Chaque mois, le 1er, une facture est automatiquement générée. Retrouvez toutes vos factures dans l\'onglet "Factures".',
                    'On the 1st of each month, an invoice is automatically generated based on your active contracts and partner seats. Find all invoices in the "Invoices" tab.'
                  ),
                },
                {
                  q: t('Wat zijn partnerzitjes?', 'Que sont les sièges partenaires ?', 'What are partner seats?'),
                  a: t(
                    'Partnerzitjes zijn onbenoemde plaatsen die je in bulk aankoopt voor externe partners (bijv. steward-vzw\'s). Ze kosten €15 per zitje per seizoen en kunnen per wedstrijd vrij worden toegewezen.',
                    'Les sièges partenaires sont des places anonymes achetées en lot pour les partenaires externes. €15/siège/saison, attribuables librement par match.',
                    'Partner seats are unnamed spots purchased in bulk for external partners (e.g. steward organizations). €15/seat/season, freely assignable per match.'
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

          {/* Partner seats management */}
          <TabsContent value="seats">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-1">{t('Partner zitjes beheren', 'Gérer les sièges partenaires', 'Manage partner seats')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      'Koop zitjes voor externe partners. Deze staan niet op naam — je wijst ze vrij toe per wedstrijd. Prijs: €15 per zitje per seizoen.',
                      'Achetez des sièges pour partenaires externes. Ceux-ci ne sont pas nominatifs. Prix: €15/siège/saison.',
                      'Buy seats for external partners. These are not named — assign them freely per match. Price: €15/seat/season.'
                    )}
                  </p>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1 max-w-xs">
                    <Label>{t('Aantal zitjes', 'Nombre de sièges', 'Number of seats')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={seatInput}
                      onChange={e => setSeatInput(e.target.value)}
                    />
                  </div>
                  <Button onClick={updateSeats} disabled={savingSeats}>
                    {savingSeats ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {t('Opslaan', 'Enregistrer', 'Save')}
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">{t('Hoe werkt het?', 'Comment ça marche?', 'How does it work?')}</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>{t('Koop een pool van zitjes voor het hele seizoen', 'Achetez un pool de sièges pour toute la saison', 'Buy a pool of seats for the entire season')}</li>
                    <li>{t('Wijs zitjes vrij toe aan externe partners per evenement', 'Attribuez librement des sièges aux partenaires par événement', 'Freely assign seats to external partners per event')}</li>
                    <li>{t('Bv: 20 naar Steward VZW, 80 naar Horeca XXX', 'Ex: 20 pour Steward ASBL, 80 pour Horeca XXX', 'E.g.: 20 to Steward VZW, 80 to Horeca XXX')}</li>
                    <li>{t('Verdeling kan per wedstrijd wijzigen', 'La répartition peut changer par match', 'Allocation can change per match')}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
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
                        <span>{inv.partner_seats_count} {t('zitjes', 'sièges', 'seats')}</span>
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

          {/* Billing events history */}
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
                        ev.event_type === 'payment_succeeded' ? 'bg-green-500' : 'bg-primary'
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
