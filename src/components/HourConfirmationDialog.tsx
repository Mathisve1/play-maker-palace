import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';
import { Clock, CheckCircle, AlertTriangle, MessageCircle, Calculator } from 'lucide-react';

interface HourConfirmation {
  id: string;
  task_id: string;
  volunteer_id: string;
  volunteer_reported_hours: number | null;
  club_reported_hours: number | null;
  volunteer_approved: boolean;
  club_approved: boolean;
  final_hours: number | null;
  final_amount: number | null;
  status: string;
}

interface HourConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  volunteerId: string;
  volunteerName: string;
  hourlyRate: number;
  estimatedHours: number;
  role: 'club' | 'volunteer';
  language: Language;
  onConfirmed?: () => void;
  onOpenChat?: () => void;
}

const DAILY_MAX_EUROS = 40.67; // Wettelijk dagplafond 2026

const labels = {
  nl: {
    title: 'Uren bevestigen',
    subtitle: 'Beide partijen moeten de gewerkte uren bevestigen voor betaling.',
    hourlyRate: 'Uurloon',
    estimatedHours: 'Geschatte uren',
    yourHours: 'Jouw opgegeven uren',
    otherHours: 'Opgegeven door',
    club: 'Club',
    volunteer: 'Vrijwilliger',
    enterHours: 'Gewerkte uren invoeren',
    submit: 'Bevestigen',
    submitting: 'Bezig...',
    approved: 'Goedgekeurd',
    waitingOther: 'Wacht op bevestiging van de andere partij',
    hoursMatch: 'Uren komen overeen! Betaling kan worden verwerkt.',
    hoursMismatch: 'Uren komen niet overeen. Bespreek dit via chat of accepteer het gemiddelde.',
    acceptAverage: 'Gemiddelde accepteren',
    total: 'Totaal bedrag',
    dailyMaxWarning: 'Let op: het bedrag is begrensd op €{max}/dag (wettelijk plafond).',
    chatFirst: 'Bespreek via chat',
    averageExplanation: 'Het gemiddelde van beide opgaven wordt gebruikt als compromis.',
    confirmed: 'Uren bevestigd!',
    averageAccepted: 'Gemiddelde geaccepteerd en goedgekeurd.',
  },
  fr: {
    title: 'Confirmer les heures',
    subtitle: 'Les deux parties doivent confirmer les heures travaillées avant le paiement.',
    hourlyRate: 'Taux horaire',
    estimatedHours: 'Heures estimées',
    yourHours: 'Vos heures déclarées',
    otherHours: 'Déclaré par',
    club: 'Club',
    volunteer: 'Bénévole',
    enterHours: 'Entrer les heures travaillées',
    submit: 'Confirmer',
    submitting: 'En cours...',
    approved: 'Approuvé',
    waitingOther: "En attente de la confirmation de l'autre partie",
    hoursMatch: 'Les heures correspondent ! Le paiement peut être traité.',
    hoursMismatch: 'Les heures ne correspondent pas. Discutez via le chat ou acceptez la moyenne.',
    acceptAverage: 'Accepter la moyenne',
    total: 'Montant total',
    dailyMaxWarning: 'Attention : le montant est plafonné à €{max}/jour (plafond légal).',
    chatFirst: 'Discuter via chat',
    averageExplanation: "La moyenne des deux déclarations est utilisée comme compromis.",
    confirmed: 'Heures confirmées !',
    averageAccepted: 'Moyenne acceptée et approuvée.',
  },
  en: {
    title: 'Confirm hours',
    subtitle: 'Both parties must confirm hours worked before payment.',
    hourlyRate: 'Hourly rate',
    estimatedHours: 'Estimated hours',
    yourHours: 'Your reported hours',
    otherHours: 'Reported by',
    club: 'Club',
    volunteer: 'Volunteer',
    enterHours: 'Enter hours worked',
    submit: 'Confirm',
    submitting: 'Submitting...',
    approved: 'Approved',
    waitingOther: 'Waiting for confirmation from the other party',
    hoursMatch: 'Hours match! Payment can be processed.',
    hoursMismatch: "Hours don't match. Discuss via chat or accept the average.",
    acceptAverage: 'Accept average',
    total: 'Total amount',
    dailyMaxWarning: 'Note: amount is capped at €{max}/day (legal limit).',
    chatFirst: 'Discuss via chat',
    averageExplanation: 'The average of both reports is used as a compromise.',
    confirmed: 'Hours confirmed!',
    averageAccepted: 'Average accepted and approved.',
  },
};

const HourConfirmationDialog = ({
  open, onOpenChange, taskId, volunteerId, volunteerName, hourlyRate, estimatedHours,
  role, language, onConfirmed, onOpenChat,
}: HourConfirmationDialogProps) => {
  const l = labels[language];
  const [confirmation, setConfirmation] = useState<HourConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchConfirmation = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('hour_confirmations')
        .select('*')
        .eq('task_id', taskId)
        .eq('volunteer_id', volunteerId)
        .maybeSingle();
      setConfirmation(data || null);
      setLoading(false);
    };
    fetchConfirmation();
  }, [open, taskId, volunteerId]);

  const calculateAmount = (h: number) => {
    const raw = h * hourlyRate;
    return Math.min(raw, DAILY_MAX_EUROS);
  };

  const handleSubmitHours = async () => {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    setSubmitting(true);

    try {
      if (confirmation) {
        // Update existing record
        const updateData: Record<string, unknown> = role === 'club'
          ? { club_reported_hours: h, club_approved: true, status: 'submitted' }
          : { volunteer_reported_hours: h, volunteer_approved: true, status: 'submitted' };

        // Check if both sides match now
        const otherHours = role === 'club' ? confirmation.volunteer_reported_hours : confirmation.club_reported_hours;
        if (otherHours !== null && otherHours === h) {
          updateData.final_hours = h;
          updateData.final_amount = calculateAmount(h);
          updateData.status = 'approved';
          updateData.volunteer_approved = true;
          updateData.club_approved = true;
        }

        const { error } = await (supabase as any)
          .from('hour_confirmations')
          .update(updateData)
          .eq('id', confirmation.id);
        if (error) throw error;

        setConfirmation(prev => prev ? { ...prev, ...updateData as any } : null);
      } else {
        // Create new record
        const insertData: Record<string, unknown> = {
          task_id: taskId,
          volunteer_id: volunteerId,
          status: 'submitted',
        };
        if (role === 'club') {
          insertData.club_reported_hours = h;
          insertData.club_approved = true;
        } else {
          insertData.volunteer_reported_hours = h;
          insertData.volunteer_approved = true;
        }

        const { data, error } = await (supabase as any)
          .from('hour_confirmations')
          .insert(insertData)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        setConfirmation(data);
      }
      toast.success(l.confirmed);
      setHours('');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
    setSubmitting(false);
  };

  const handleAcceptAverage = async () => {
    if (!confirmation || confirmation.volunteer_reported_hours === null || confirmation.club_reported_hours === null) return;
    setSubmitting(true);
    try {
      const avg = (confirmation.volunteer_reported_hours + confirmation.club_reported_hours) / 2;
      const amount = calculateAmount(avg);
      const { error } = await (supabase as any)
        .from('hour_confirmations')
        .update({
          final_hours: avg,
          final_amount: amount,
          status: 'approved',
          volunteer_approved: true,
          club_approved: true,
        })
        .eq('id', confirmation.id);
      if (error) throw error;
      setConfirmation(prev => prev ? { ...prev, final_hours: avg, final_amount: amount, status: 'approved', volunteer_approved: true, club_approved: true } : null);
      toast.success(l.averageAccepted);
      onConfirmed?.();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
    setSubmitting(false);
  };

  const myHours = role === 'club' ? confirmation?.club_reported_hours : confirmation?.volunteer_reported_hours;
  const otherHours = role === 'club' ? confirmation?.volunteer_reported_hours : confirmation?.club_reported_hours;
  const myApproved = role === 'club' ? confirmation?.club_approved : confirmation?.volunteer_approved;
  const isApproved = confirmation?.status === 'approved';
  const bothSubmitted = confirmation?.volunteer_reported_hours !== null && confirmation?.club_reported_hours !== null && confirmation?.volunteer_reported_hours !== undefined && confirmation?.club_reported_hours !== undefined;
  const hoursMatch = bothSubmitted && confirmation!.volunteer_reported_hours === confirmation!.club_reported_hours;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-heading">
            <Clock className="w-5 h-5 text-primary" /> {l.title}
          </DialogTitle>
          <DialogDescription>{volunteerName} — {l.subtitle}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{l.hourlyRate}</p>
                <p className="text-lg font-bold text-foreground">€{hourlyRate.toFixed(2)}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{l.estimatedHours}</p>
                <p className="text-lg font-bold text-foreground">{estimatedHours}u</p>
              </div>
            </div>

            {/* Approved state */}
            {isApproved && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">{l.hoursMatch}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Uren</p>
                    <p className="text-lg font-bold text-foreground">{confirmation!.final_hours}u</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{l.total}</p>
                    <p className="text-lg font-bold text-green-600">€{confirmation!.final_amount?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Not yet approved */}
            {!isApproved && (
              <>
                {/* Show submitted hours */}
                {(myHours !== null && myHours !== undefined) && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">{l.yourHours}</p>
                    <p className="text-lg font-bold text-primary">{myHours}u → €{calculateAmount(myHours).toFixed(2)}</p>
                  </div>
                )}
                {(otherHours !== null && otherHours !== undefined) && (
                  <div className="bg-muted/50 border border-border rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">{l.otherHours} {role === 'club' ? l.volunteer : l.club}</p>
                    <p className="text-lg font-bold text-foreground">{otherHours}u → €{calculateAmount(otherHours).toFixed(2)}</p>
                  </div>
                )}

                {/* Hours mismatch */}
                {bothSubmitted && !hoursMatch && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{l.hoursMismatch}</p>
                        <p className="text-xs text-muted-foreground mt-1">{l.averageExplanation}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="bg-background rounded-lg px-3 py-1.5">
                            <Calculator className="w-3 h-3 inline mr-1" />
                            <span className="text-sm font-medium">
                              {((confirmation!.volunteer_reported_hours! + confirmation!.club_reported_hours!) / 2).toFixed(1)}u = €{calculateAmount((confirmation!.volunteer_reported_hours! + confirmation!.club_reported_hours!) / 2).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {onOpenChat && (
                            <button onClick={onOpenChat} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <MessageCircle className="w-3.5 h-3.5" /> {l.chatFirst}
                            </button>
                          )}
                          <button onClick={handleAcceptAverage} disabled={submitting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                            <Calculator className="w-3.5 h-3.5" /> {l.acceptAverage}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting message */}
                {myApproved && !bothSubmitted && (
                  <p className="text-sm text-muted-foreground text-center py-2">{l.waitingOther}</p>
                )}

                {/* Enter hours form */}
                {!myApproved && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-muted-foreground">{l.enterHours}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0.5}
                        max={24}
                        step={0.5}
                        value={hours}
                        onChange={e => setHours(e.target.value)}
                        placeholder={String(estimatedHours)}
                        className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-sm text-muted-foreground">uren</span>
                    </div>
                    {hours && parseFloat(hours) > 0 && (
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground uppercase">{l.total}</p>
                        <p className="text-lg font-bold text-foreground">€{calculateAmount(parseFloat(hours)).toFixed(2)}</p>
                        {parseFloat(hours) * hourlyRate > DAILY_MAX_EUROS && (
                          <p className="text-[10px] text-yellow-600 mt-1">
                            {l.dailyMaxWarning.replace('{max}', DAILY_MAX_EUROS.toFixed(2))}
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      onClick={handleSubmitHours}
                      disabled={submitting || !hours || parseFloat(hours) <= 0}
                      className="w-full py-2.5 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {submitting ? l.submitting : l.submit}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HourConfirmationDialog;
