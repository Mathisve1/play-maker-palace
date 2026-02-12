import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, CheckCircle, Clock, AlertTriangle, Download, Send, ExternalLink, Loader2, RefreshCw, Unlink, Settings, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import Logo from '@/components/Logo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Language } from '@/i18n/translations';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Payment {
  id: string;
  task_id: string;
  club_id: string;
  volunteer_id: string;
  amount: number;
  stripe_fee: number | null;
  total_charged: number | null;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_receipt_url: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface TaskInfo {
  id: string;
  title: string;
  task_date: string | null;
  expense_amount: number | null;
}

interface VolunteerInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  stripe_account_id: string | null;
}

interface SignatureInfo {
  task_id: string;
  volunteer_id: string;
  status: string;
}

const translations = {
  nl: {
    title: 'Betalingsoverzicht',
    back: 'Terug naar dashboard',
    noPayments: 'Nog geen betalingen.',
    totalPaid: 'Totaal betaald',
    totalOpen: 'Nog te betalen',
    sendPayment: 'Verstuur vergoeding',
    sending: 'Verwerken...',
    pending: 'In afwachting',
    processing: 'Verwerken',
    succeeded: 'Betaald',
    failed: 'Mislukt',
    receipt: 'Betaalbewijs',
    paidOn: 'Betaald op',
    fee: 'Stripe fee',
    total: 'Totaal belast',
    contractNotSigned: 'Contract nog niet getekend',
    noStripeVolunteer: 'Vrijwilliger heeft geen Stripe account',
    noStripeClub: 'Koppel eerst je Stripe account',
    connectStripe: 'Koppel Stripe Account',
    stripeConnected: 'Stripe gekoppeld',
    stripeNotReady: 'Stripe account niet volledig',
    stripeStatus: 'Stripe Account Status',
    chargesEnabled: 'Betalingen ontvangen',
    payoutsEnabled: 'Uitbetalingen',
    detailsSubmitted: 'Gegevens ingediend',
    verificationPending: 'Verificatie loopt (kan tot 7 dagen duren)',
    accountReady: 'Account volledig actief',
    updateAccount: 'Account bijwerken',
    disconnectAccount: 'Ontkoppelen',
    disconnectConfirm: 'Weet je zeker dat je je Stripe account wilt ontkoppelen? Je kunt daarna geen betalingen meer verwerken.',
    disconnectTitle: 'Stripe ontkoppelen',
    cancel: 'Annuleren',
    yes: 'Ja, ontkoppelen',
    refreshStatus: 'Status verversen',
    assignedVolunteers: 'Toegekende vrijwilligers',
    allPayments: 'Alle betalingen',
  },
  fr: {
    title: 'Aperçu des paiements',
    back: 'Retour au tableau de bord',
    noPayments: 'Aucun paiement.',
    totalPaid: 'Total payé',
    totalOpen: 'Restant à payer',
    sendPayment: 'Envoyer remboursement',
    sending: 'Traitement...',
    pending: 'En attente',
    processing: 'En cours',
    succeeded: 'Payé',
    failed: 'Échoué',
    receipt: 'Reçu',
    paidOn: 'Payé le',
    fee: 'Frais Stripe',
    total: 'Total facturé',
    contractNotSigned: 'Contrat pas encore signé',
    noStripeVolunteer: 'Le bénévole n\'a pas de compte Stripe',
    noStripeClub: 'Connectez d\'abord votre compte Stripe',
    connectStripe: 'Connecter Stripe',
    stripeConnected: 'Stripe connecté',
    stripeNotReady: 'Compte Stripe incomplet',
    stripeStatus: 'Statut du compte Stripe',
    chargesEnabled: 'Paiements activés',
    payoutsEnabled: 'Versements activés',
    detailsSubmitted: 'Détails soumis',
    verificationPending: 'Vérification en cours (jusqu\'à 7 jours)',
    accountReady: 'Compte entièrement actif',
    updateAccount: 'Mettre à jour le compte',
    disconnectAccount: 'Déconnecter',
    disconnectConfirm: 'Êtes-vous sûr de vouloir déconnecter votre compte Stripe ? Vous ne pourrez plus traiter les paiements.',
    disconnectTitle: 'Déconnecter Stripe',
    cancel: 'Annuler',
    yes: 'Oui, déconnecter',
    refreshStatus: 'Actualiser le statut',
    assignedVolunteers: 'Bénévoles assignés',
    allPayments: 'Tous les paiements',
  },
  en: {
    title: 'Payments Overview',
    back: 'Back to dashboard',
    noPayments: 'No payments yet.',
    totalPaid: 'Total paid',
    totalOpen: 'Still to pay',
    sendPayment: 'Send reimbursement',
    sending: 'Processing...',
    pending: 'Pending',
    processing: 'Processing',
    succeeded: 'Paid',
    failed: 'Failed',
    receipt: 'Receipt',
    paidOn: 'Paid on',
    fee: 'Stripe fee',
    total: 'Total charged',
    contractNotSigned: 'Contract not yet signed',
    noStripeVolunteer: 'Volunteer has no Stripe account',
    noStripeClub: 'Connect your Stripe account first',
    connectStripe: 'Connect Stripe Account',
    stripeConnected: 'Stripe connected',
    stripeNotReady: 'Stripe account incomplete',
    stripeStatus: 'Stripe Account Status',
    chargesEnabled: 'Charges enabled',
    payoutsEnabled: 'Payouts enabled',
    detailsSubmitted: 'Details submitted',
    verificationPending: 'Verification pending (up to 7 days)',
    accountReady: 'Account fully active',
    updateAccount: 'Update account',
    disconnectAccount: 'Disconnect',
    disconnectConfirm: 'Are you sure you want to disconnect your Stripe account? You won\'t be able to process payments.',
    disconnectTitle: 'Disconnect Stripe',
    cancel: 'Cancel',
    yes: 'Yes, disconnect',
    refreshStatus: 'Refresh status',
    assignedVolunteers: 'Assigned volunteers',
    allPayments: 'All payments',
  },
};

const PaymentsOverview = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language];

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<Map<string, TaskInfo>>(new Map());
  const [volunteers, setVolunteers] = useState<Map<string, VolunteerInfo>>(new Map());
  const [signatures, setSignatures] = useState<SignatureInfo[]>([]);
  const [assignedSignups, setAssignedSignups] = useState<{ task_id: string; volunteer_id: string }[]>([]);
  const [clubStripeId, setClubStripeId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [sendingPayment, setSendingPayment] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    requirements?: { currently_due?: string[]; eventually_due?: string[]; pending_verification?: string[] };
  } | null>(null);
  const [loadingStripeStatus, setLoadingStripeStatus] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      // Get club
      const { data: club } = await supabase
        .from('clubs')
        .select('id, stripe_account_id')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (!club) {
        // Check membership
        const { data: membership } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (membership) {
          const { data: c } = await supabase
            .from('clubs')
            .select('id, stripe_account_id')
            .eq('id', membership.club_id)
            .maybeSingle();
          if (c) {
            setClubId(c.id);
            setClubStripeId(c.stripe_account_id);
          }
        }
      } else {
        setClubId(club.id);
        setClubStripeId(club.stripe_account_id);
      }

      const activeClubId = club?.id;
      if (!activeClubId) { setLoading(false); return; }

      // Get tasks with expense reimbursement
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, task_date, expense_amount')
        .eq('club_id', activeClubId)
        .eq('expense_reimbursement', true);

      const taskMap = new Map<string, TaskInfo>();
      tasksData?.forEach(t => taskMap.set(t.id, t));
      setTasks(taskMap);

      if (!tasksData || tasksData.length === 0) { setLoading(false); return; }

      const taskIds = tasksData.map(t => t.id);

      // Get assigned signups for these tasks
      const { data: signupsData } = await supabase
        .from('task_signups')
        .select('task_id, volunteer_id')
        .in('task_id', taskIds)
        .eq('status', 'assigned');
      setAssignedSignups(signupsData || []);

      // Get volunteer profiles
      const volunteerIds = [...new Set(signupsData?.map(s => s.volunteer_id) || [])];
      if (volunteerIds.length > 0) {
        const { data: volProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, stripe_account_id')
          .in('id', volunteerIds);
        const volMap = new Map<string, VolunteerInfo>();
        volProfiles?.forEach(v => volMap.set(v.id, v));
        setVolunteers(volMap);
      }

      // Get signature requests
      const { data: sigs } = await supabase
        .from('signature_requests')
        .select('task_id, volunteer_id, status')
        .in('task_id', taskIds);
      setSignatures(sigs || []);

      // Get payments
      const { data: paymentsData } = await supabase
        .from('volunteer_payments')
        .select('*')
        .eq('club_id', activeClubId)
        .order('created_at', { ascending: false });
      setPayments((paymentsData as Payment[]) || []);

      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { account_type: 'club' },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error connecting Stripe');
    }
    setConnectingStripe(false);
  };

  const fetchStripeStatus = async (accountId: string) => {
    setLoadingStripeStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-status', {
        body: { account_id: accountId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStripeStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch Stripe status:', err);
    }
    setLoadingStripeStatus(false);
  };

  useEffect(() => {
    if (clubStripeId) {
      fetchStripeStatus(clubStripeId);
    }
  }, [clubStripeId]);

  const handleDisconnectStripe = async () => {
    if (!clubId) return;
    setDisconnecting(true);
    try {
      await supabase
        .from('clubs')
        .update({ stripe_account_id: null })
        .eq('id', clubId);
      setClubStripeId(null);
      setStripeStatus(null);
      toast.success('Stripe account ontkoppeld');
    } catch (err: any) {
      toast.error(err.message || 'Fout bij ontkoppelen');
    }
    setDisconnecting(false);
  };

  const handleSendPayment = async (taskId: string, volunteerId: string) => {
    const key = `${taskId}-${volunteerId}`;
    setSendingPayment(key);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-transfer', {
        body: { task_id: taskId, volunteer_id: volunteerId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Betaling aangemaakt! Voltooi de betaling via Stripe.');

      // Refresh payments
      if (clubId) {
        const { data: paymentsData } = await supabase
          .from('volunteer_payments')
          .select('*')
          .eq('club_id', clubId)
          .order('created_at', { ascending: false });
        setPayments((paymentsData as Payment[]) || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Er ging iets mis');
    }
    setSendingPayment(null);
  };

  const getSignatureStatus = (taskId: string, volunteerId: string) => {
    return signatures.find(s => s.task_id === taskId && s.volunteer_id === volunteerId);
  };

  const getPayment = (taskId: string, volunteerId: string) => {
    return payments.find(p => p.task_id === taskId && p.volunteer_id === volunteerId);
  };

  const totalPaid = payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0);
  const totalOpen = assignedSignups.reduce((sum, s) => {
    const payment = getPayment(s.task_id, s.volunteer_id);
    if (!payment || payment.status === 'failed') {
      const task = tasks.get(s.task_id);
      return sum + (task?.expense_amount || 25);
    }
    return sum;
  }, 0);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'succeeded': return t.succeeded;
      case 'processing': return t.processing;
      case 'failed': return t.failed;
      default: return t.pending;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/club-dashboard" showText={false} />
          <button
            onClick={() => navigate('/club-dashboard')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            {t.title}
          </h1>
        </motion.div>

        {/* Stripe connection status */}
        <div className="mt-6">
          {!clubStripeId ? (
            <div className="bg-card rounded-2xl shadow-card border border-primary/20 p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t.noStripeClub}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Stripe Connect is vereist om betalingen aan vrijwilligers te doen.
                </p>
              </div>
              <button
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {connectingStripe ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                {t.connectStripe}
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-2xl shadow-card border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  {t.stripeStatus}
                </h3>
                <button
                  onClick={() => fetchStripeStatus(clubStripeId!)}
                  disabled={loadingStripeStatus}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title={t.refreshStatus}
                >
                  <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingStripeStatus ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingStripeStatus && !stripeStatus ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Laden...
                </div>
              ) : stripeStatus ? (
                <>
                  {/* Overall status */}
                  {stripeStatus.charges_enabled && stripeStatus.payouts_enabled ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">{t.accountReady}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                      <ShieldAlert className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{t.verificationPending}</span>
                    </div>
                  )}

                  {/* Detail badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={stripeStatus.details_submitted ? 'default' : 'secondary'} className="gap-1">
                      {stripeStatus.details_submitted ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {t.detailsSubmitted}
                    </Badge>
                    <Badge variant={stripeStatus.charges_enabled ? 'default' : 'secondary'} className="gap-1">
                      {stripeStatus.charges_enabled ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {t.chargesEnabled}
                    </Badge>
                    <Badge variant={stripeStatus.payouts_enabled ? 'default' : 'secondary'} className="gap-1">
                      {stripeStatus.payouts_enabled ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {t.payoutsEnabled}
                    </Badge>
                  </div>

                  {/* Requirements info */}
                  {stripeStatus.requirements?.currently_due && stripeStatus.requirements.currently_due.length > 0 && (
                    <div className="p-3 rounded-xl bg-muted/50 border border-border">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                        <Info className="w-3.5 h-3.5 text-primary" />
                        Actie vereist
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stripe vereist nog aanvullende informatie. Klik op "{t.updateAccount}" om dit af te ronden.
                      </p>
                    </div>
                  )}

                  {stripeStatus.requirements?.pending_verification && stripeStatus.requirements.pending_verification.length > 0 && (
                    <div className="p-3 rounded-xl bg-muted/50 border border-border">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-yellow-600" />
                        Verificatie in behandeling
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stripe controleert je gegevens. Dit kan tot 7 dagen duren.
                      </p>
                    </div>
                  )}
                </>
              ) : null}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                >
                  {connectingStripe ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  {t.updateAccount}
                </button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="px-4 py-2 rounded-xl border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      {t.disconnectAccount}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.disconnectTitle}</AlertDialogTitle>
                      <AlertDialogDescription>{t.disconnectConfirm}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDisconnectStripe}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {disconnecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        {t.yes}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-card rounded-2xl shadow-card border border-transparent p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t.totalPaid}</p>
            <p className="text-2xl font-heading font-bold text-green-600 mt-1">€{totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-card rounded-2xl shadow-card border border-transparent p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t.totalOpen}</p>
            <p className="text-2xl font-heading font-bold text-primary mt-1">€{totalOpen.toFixed(2)}</p>
          </div>
        </div>

        {/* Assigned volunteers needing payment */}
        <div className="mt-8">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{t.assignedVolunteers}</h2>
          <div className="space-y-3">
            {assignedSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t.noPayments}</p>
            ) : (
              assignedSignups.map((signup) => {
                const task = tasks.get(signup.task_id);
                const vol = volunteers.get(signup.volunteer_id);
                const sig = getSignatureStatus(signup.task_id, signup.volunteer_id);
                const payment = getPayment(signup.task_id, signup.volunteer_id);
                const key = `${signup.task_id}-${signup.volunteer_id}`;
                const contractSigned = sig?.status === 'completed';
                const canPay = clubStripeId && vol?.stripe_account_id && contractSigned && (!payment || payment.status === 'failed');

                return (
                  <div
                    key={key}
                    className={`bg-card rounded-2xl shadow-card border p-4 ${
                      payment?.status === 'succeeded' ? 'border-green-200 bg-green-50/30' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-10 h-10 shrink-0">
                          {vol?.avatar_url && <AvatarImage src={vol.avatar_url} alt={vol.full_name || ''} />}
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {(vol?.full_name || vol?.email || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{vol?.full_name || 'Onbekend'}</p>
                          <p className="text-xs text-muted-foreground truncate">{task?.title}</p>
                          <p className="text-xs font-semibold text-primary mt-0.5">€{task?.expense_amount?.toFixed(2) || '25.00'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {payment ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs">
                              {statusIcon(payment.status)}
                              <span className="font-medium">{statusLabel(payment.status)}</span>
                            </div>
                            {payment.stripe_receipt_url && (
                              <a
                                href={payment.stripe_receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                                title={t.receipt}
                              >
                                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        ) : !contractSigned ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t.contractNotSigned}
                          </span>
                        ) : !vol?.stripe_account_id ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t.noStripeVolunteer}
                          </span>
                        ) : null}

                        {canPay && (
                          <button
                            onClick={() => handleSendPayment(signup.task_id, signup.volunteer_id)}
                            disabled={sendingPayment === key}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {sendingPayment === key ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            {sendingPayment === key ? t.sending : t.sendPayment}
                          </button>
                        )}
                      </div>
                    </div>

                    {payment?.status === 'succeeded' && payment.paid_at && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>{t.paidOn}: {new Date(payment.paid_at).toLocaleDateString(
                          language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}</span>
                        {payment.stripe_fee != null && <span>{t.fee}: €{payment.stripe_fee.toFixed(2)}</span>}
                        {payment.total_charged != null && <span>{t.total}: €{payment.total_charged.toFixed(2)}</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentsOverview;
