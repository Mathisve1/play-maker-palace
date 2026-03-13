import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Loader2, Check, XCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';
import { sendPush } from '@/lib/sendPush';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ShiftSwapDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  clubId: string;
  currentUserId: string;
  language: Language;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface OtherVolunteer {
  volunteer_id: string;
  full_name: string;
}

interface SwapRequest {
  id: string;
  status: string;
  requester_id: string;
  target_id: string;
  reason: string | null;
  created_at: string;
  requester_name?: string;
  target_name?: string;
}

const ShiftSwapDialog = ({ open, onClose, taskId, taskTitle, clubId, currentUserId, language }: ShiftSwapDialogProps) => {
  const [volunteers, setVolunteers] = useState<OtherVolunteer[]>([]);
  const [existingSwaps, setExistingSwaps] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const load = async () => {
      // Get other volunteers signed up for this task
      const { data: signups } = await supabase
        .from('task_signups')
        .select('volunteer_id')
        .eq('task_id', taskId)
        .neq('volunteer_id', currentUserId);

      if (signups && signups.length > 0) {
        const ids = signups.map(s => s.volunteer_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ids);
        setVolunteers((profiles || []).map(p => ({ volunteer_id: p.id, full_name: p.full_name || 'Onbekend' })));
      } else {
        setVolunteers([]);
      }

      // Get existing swap requests for this task involving current user
      const { data: swaps } = await (supabase as any)
        .from('shift_swaps')
        .select('*')
        .eq('task_id', taskId)
        .or(`requester_id.eq.${currentUserId},target_id.eq.${currentUserId}`)
        .in('status', ['pending_target', 'pending_club']);

      if (swaps && swaps.length > 0) {
        const userIds = [...new Set(swaps.flatMap((s: any) => [s.requester_id, s.target_id]))];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds as string[]);
        const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || 'Onbekend']));
        setExistingSwaps(swaps.map((s: any) => ({
          ...s,
          requester_name: nameMap[s.requester_id],
          target_name: nameMap[s.target_id],
        })));
      } else {
        setExistingSwaps([]);
      }

      setLoading(false);
    };
    load();
  }, [open, taskId, currentUserId]);

  const handleSendRequest = async () => {
    if (!selectedTarget) return;
    setSending(true);
    const { error } = await (supabase as any).from('shift_swaps').insert({
      club_id: clubId,
      task_id: taskId,
      requester_id: currentUserId,
      target_id: selectedTarget,
      reason: reason.trim() || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t3(language, 'Ruilverzoek verstuurd!', 'Demande envoyée!', 'Swap request sent!'));
      sendPush({ userId: selectedTarget, type: 'shift_swap_request', title: '🔄 Shift-ruil verzoek', message: `Iemand wil van shift ruilen voor "${taskTitle}"`, url: `/task/${taskId}` });
      onClose();
    }
    setSending(false);
  };

  const handleRespond = async (swapId: string, accept: boolean) => {
    setRespondingTo(swapId);
    const swap = existingSwaps.find(s => s.id === swapId);
    if (accept) {
      await (supabase as any).from('shift_swaps').update({
        status: 'pending_club',
        target_responded_at: new Date().toISOString(),
      }).eq('id', swapId);
      toast.success(t3(language, 'Ruilverzoek geaccepteerd! Wacht op goedkeuring club.', 'Accepté! En attente de la validation du club.', 'Accepted! Waiting for club approval.'));
      if (swap) {
        sendPush({ userId: swap.requester_id, type: 'shift_swap_accepted', title: '✅ Ruil geaccepteerd', message: `Je ruilverzoek voor "${taskTitle}" is geaccepteerd. Wacht op goedkeuring club.`, url: `/task/${taskId}` });
      }
    } else {
      await (supabase as any).from('shift_swaps').update({
        status: 'rejected_target',
        target_responded_at: new Date().toISOString(),
      }).eq('id', swapId);
      toast.info(t3(language, 'Ruilverzoek geweigerd', 'Demande refusée', 'Swap request declined'));
      if (swap) {
        sendPush({ userId: swap.requester_id, type: 'shift_swap_rejected', title: '❌ Ruil geweigerd', message: `Je ruilverzoek voor "${taskTitle}" is geweigerd.`, url: `/task/${taskId}` });
      }
    }
    setRespondingTo(null);
    onClose();
  };

  const incomingSwaps = existingSwaps.filter(s => s.target_id === currentUserId && s.status === 'pending_target');
  const outgoingSwaps = existingSwaps.filter(s => s.requester_id === currentUserId);
  const availableTargets = volunteers.filter(v => !existingSwaps.some(s =>
    (s.requester_id === currentUserId && s.target_id === v.volunteer_id) ||
    (s.target_id === currentUserId && s.requester_id === v.volunteer_id)
  ));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-heading font-semibold text-foreground">
                  {t3(language, 'Shift ruilen', 'Échanger de shift', 'Swap shift')}
                </h2>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{taskTitle}</p>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-4">
                {/* Incoming swap requests */}
                {incomingSwaps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t3(language, 'Inkomende verzoeken', 'Demandes reçues', 'Incoming requests')}
                    </h3>
                    {incomingSwaps.map(swap => (
                      <div key={swap.id} className="rounded-xl border border-border p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{swap.requester_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{swap.requester_name}</span>
                          <span className="text-xs text-muted-foreground">{t3(language, 'wil ruilen', 'veut échanger', 'wants to swap')}</span>
                        </div>
                        {swap.reason && <p className="text-xs text-muted-foreground italic">"{swap.reason}"</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(swap.id, true)}
                            disabled={respondingTo === swap.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> {t3(language, 'Accepteren', 'Accepter', 'Accept')}
                          </button>
                          <button
                            onClick={() => handleRespond(swap.id, false)}
                            disabled={respondingTo === swap.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> {t3(language, 'Weigeren', 'Refuser', 'Decline')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outgoing pending */}
                {outgoingSwaps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t3(language, 'Jouw verzoeken', 'Vos demandes', 'Your requests')}
                    </h3>
                    {outgoingSwaps.map(swap => (
                      <div key={swap.id} className="rounded-xl border border-border p-3 flex items-center justify-between">
                        <div>
                          <span className="text-sm text-foreground">{swap.target_name}</span>
                          <span className="ml-2 px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">
                            {swap.status === 'pending_target' ? t3(language, 'Wacht op reactie', 'En attente', 'Waiting') : t3(language, 'Wacht op club', 'En attente du club', 'Awaiting club')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New swap request */}
                {availableTargets.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t3(language, 'Nieuw ruilverzoek', 'Nouvelle demande', 'New swap request')}
                    </h3>
                    <div className="space-y-2">
                      {availableTargets.map(v => (
                        <button
                          key={v.volunteer_id}
                          onClick={() => setSelectedTarget(v.volunteer_id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                            selectedTarget === v.volunteer_id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">{v.full_name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{v.full_name}</span>
                          {selectedTarget === v.volunteer_id && <Check className="w-4 h-4 text-primary ml-auto" />}
                        </button>
                      ))}
                    </div>
                    {selectedTarget && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            {t3(language, 'Reden (optioneel)', 'Raison (optionnel)', 'Reason (optional)')}
                          </label>
                          <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            maxLength={500}
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            placeholder={t3(language, 'Waarom wil je ruilen?', 'Pourquoi voulez-vous échanger?', 'Why do you want to swap?')}
                          />
                        </div>
                        <button
                          onClick={handleSendRequest}
                          disabled={sending}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                          {t3(language, 'Ruilverzoek versturen', 'Envoyer la demande', 'Send swap request')}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {availableTargets.length === 0 && incomingSwaps.length === 0 && outgoingSwaps.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t3(language, 'Geen andere vrijwilligers om mee te ruilen.', 'Aucun autre bénévole disponible.', 'No other volunteers to swap with.')}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShiftSwapDialog;
