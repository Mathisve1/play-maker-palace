/**
 * BuddiesCard — "Mijn Vaste Maatjes"
 *
 * A self-contained card that manages the full buddy lifecycle for a volunteer:
 *   • Shows accepted buddy with a remove action
 *   • Shows incoming pending requests (from other volunteers) with Accept / Reject
 *   • Shows own pending outgoing invite (with cancel)
 *   • Search bar to find volunteers and send a request
 *
 * Push notification is sent to the receiver when a new request is created.
 *
 * Usage:
 *   <BuddiesCard userId={userId} language={language} />
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Heart, UserPlus, UserCheck, Search, X, Loader2, Clock,
} from 'lucide-react';
import { Language } from '@/i18n/translations';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BuddyProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface BuddyRow {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  other: BuddyProfile;
  iAmRequester: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const L: Record<Language, Record<string, string>> = {
  nl: {
    title: '👫 Mijn Vaste Maatjes',
    desc: 'Je maatje verschijnt bovenaan de takenslijst zodat jullie samen kunnen werken.',
    accepted: 'Jouw vaste maatje',
    remove: 'Verwijder maatje',
    incoming: 'Openstaande uitnodigingen',
    requestFrom: 'wil jou toevoegen als zijn/haar vaste maatje',
    accept: 'Accepteer',
    reject: 'Weiger',
    outgoing: 'Uitnodiging verstuurd',
    outgoingDesc: 'wacht op jouw antwoord...',
    cancelInvite: 'Annuleer uitnodiging',
    noMaatje: 'Je hebt nog geen vaste maatje.',
    inviteTitle: 'Zoek een vrijwilliger in jouw club...',
    searchPlaceholder: 'Typ een naam...',
    sendInvite: 'Voeg toe',
    sending: 'Versturen...',
    inviteSent: '✅ Uitnodiging verstuurd!',
    noResults: 'Niemand gevonden. Probeer een andere naam.',
    confirmRemove: 'Weet je zeker dat je dit maatje wil verwijderen?',
  },
  fr: {
    title: '👫 Mes Équipiers Fixes',
    desc: 'Votre équipier apparaît en haut de la liste des tâches pour travailler ensemble.',
    accepted: 'Votre équipier fixe',
    remove: 'Supprimer l\'équipier',
    incoming: 'Invitations en attente',
    requestFrom: 'veut vous ajouter comme équipier fixe',
    accept: 'Accepter',
    reject: 'Refuser',
    outgoing: 'Invitation envoyée',
    outgoingDesc: 'en attente de réponse...',
    cancelInvite: 'Annuler l\'invitation',
    noMaatje: 'Vous n\'avez pas encore d\'équipier fixe.',
    inviteTitle: 'Rechercher un bénévole dans votre club...',
    searchPlaceholder: 'Tapez un nom...',
    sendInvite: 'Ajouter',
    sending: 'Envoi...',
    inviteSent: '✅ Invitation envoyée !',
    noResults: 'Personne trouvé. Essayez un autre nom.',
    confirmRemove: 'Êtes-vous sûr de vouloir supprimer cet équipier ?',
  },
  en: {
    title: '👫 My Regular Buddies',
    desc: 'Your buddy appears at the top of the task list so you can work together.',
    accepted: 'Your regular buddy',
    remove: 'Remove buddy',
    incoming: 'Incoming requests',
    requestFrom: 'wants to add you as their regular buddy',
    accept: 'Accept',
    reject: 'Reject',
    outgoing: 'Invite sent',
    outgoingDesc: 'waiting for their response...',
    cancelInvite: 'Cancel invite',
    noMaatje: 'You don\'t have a regular buddy yet.',
    inviteTitle: 'Search a volunteer in your club...',
    searchPlaceholder: 'Type a name...',
    sendInvite: 'Add',
    sending: 'Sending...',
    inviteSent: '✅ Invite sent!',
    noResults: 'Nobody found. Try a different name.',
    confirmRemove: 'Are you sure you want to remove this buddy?',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  language: Language;
}

export const BuddiesCard = ({ userId, language }: Props) => {
  const l = L[language] ?? L.nl;

  const [accepted, setAccepted] = useState<BuddyRow | null>(null);
  const [pendingReceived, setPendingReceived] = useState<BuddyRow[]>([]);
  const [pendingSent, setPendingSent] = useState<BuddyRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BuddyProfile[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('volunteer_buddies')
      .select('id, requester_id, receiver_id, status')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    if (!rows?.length) { setLoading(false); return; }

    // Collect other-party IDs to fetch profiles
    const otherIds = rows.map(r =>
      r.requester_id === userId ? r.receiver_id : r.requester_id
    );
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', otherIds);
    const pm = new Map((profiles || []).map((p: any) => [p.id, p]));

    const enriched: BuddyRow[] = rows.map(r => {
      const otherId = r.requester_id === userId ? r.receiver_id : r.requester_id;
      return {
        id: r.id,
        requester_id: r.requester_id,
        receiver_id: r.receiver_id,
        status: r.status as BuddyRow['status'],
        other: pm.get(otherId) ?? { id: otherId, full_name: null, avatar_url: null },
        iAmRequester: r.requester_id === userId,
      };
    });

    setAccepted(enriched.find(r => r.status === 'accepted') ?? null);
    setPendingReceived(enriched.filter(r => r.status === 'pending' && !r.iAmRequester));
    setPendingSent(enriched.find(r => r.status === 'pending' && r.iAmRequester) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // ── Search ──────────────────────────────────────────────────────────────────

  const onSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    searchRef.current = setTimeout(async () => {
      // Exclude self + already-related users
      const excludeIds = [
        userId,
        ...(accepted ? [accepted.other.id] : []),
        ...(pendingSent ? [pendingSent.other.id] : []),
        ...pendingReceived.map(r => r.other.id),
      ];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${q.trim()}%`)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(6);
      setSearchResults((data || []) as BuddyProfile[]);
    }, 280);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const sendRequest = async (target: BuddyProfile) => {
    setSendingTo(target.id);

    const { error } = await supabase
      .from('volunteer_buddies')
      .insert({ requester_id: userId, receiver_id: target.id, status: 'pending' });

    if (error) {
      setSendingTo(null);
      toast.error(language === 'nl' ? 'Er ging iets mis. Probeer opnieuw.' : 'Something went wrong.');
      return;
    }

    // Push notification to receiver
    try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      const myName = myProfile?.full_name || (language === 'nl' ? 'Een vrijwilliger' : 'A volunteer');
      const pushTitle = language === 'nl' ? '👫 Nieuw maatje verzoek' : language === 'fr' ? '👫 Nouvelle demande d\'équipier' : '👫 New buddy request';
      const pushMsg = language === 'nl'
        ? `${myName} wil jou toevoegen als zijn/haar vaste maatje!`
        : language === 'fr'
        ? `${myName} veut vous ajouter comme équipier fixe !`
        : `${myName} wants to add you as their regular buddy!`;

      await supabase.functions.invoke('send-native-push', {
        body: {
          type: 'buddy_request',
          user_id: target.id,
          title: pushTitle,
          message: pushMsg,
          url: '/volunteer-details',
        },
      });
    } catch {
      // Push failure is non-fatal — request was already saved
    }

    setSendingTo(null);
    toast.success(l.inviteSent);
    setSearchQuery('');
    setSearchResults([]);
    load();
  };

  const respond = async (rowId: string, accept: boolean) => {
    const { error } = await supabase
      .from('volunteer_buddies')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', rowId);
    if (error) { toast.error('Er ging iets mis.'); return; }
    toast.success(accept
      ? (language === 'nl' ? '🎉 Maatje geaccepteerd!' : '🎉 Buddy accepted!')
      : (language === 'nl' ? 'Uitnodiging geweigerd.' : 'Request rejected.'));
    load();
  };

  const remove = async (rowId: string) => {
    if (!window.confirm(l.confirmRemove)) return;
    const { error } = await supabase
      .from('volunteer_buddies')
      .delete()
      .eq('id', rowId);
    if (error) { toast.error('Er ging iets mis.'); return; }
    toast.success(language === 'nl' ? 'Maatje verwijderd.' : 'Buddy removed.');
    setAccepted(null);
    load();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center gap-4 p-5 border-b border-border/60 bg-pink-500/5">
        <div className="w-14 h-14 rounded-2xl bg-pink-500/15 flex items-center justify-center shrink-0">
          <Heart className="w-7 h-7 text-pink-500" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-heading font-bold text-foreground">{l.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{l.desc}</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── SECTION 1: Accepted buddy ── */}
            {accepted ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{l.accepted}</p>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-pink-50 border-2 border-pink-200">
                  <Avatar className="w-16 h-16 shrink-0">
                    {accepted.other.avatar_url && <AvatarImage src={accepted.other.avatar_url} />}
                    <AvatarFallback className="text-lg font-bold bg-pink-100 text-pink-700">
                      {initials(accepted.other.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-foreground leading-tight">
                      {accepted.other.full_name || '—'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <UserCheck className="w-4 h-4 text-pink-500" />
                      <span className="text-sm font-semibold text-pink-600">Maatje</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[48px] min-w-[48px] rounded-xl shrink-0"
                    onClick={() => remove(accepted!.id)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* ── No buddy yet ── */
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-8 h-8 text-pink-300" />
                </div>
                <p className="text-base font-medium text-muted-foreground">{l.noMaatje}</p>
              </div>
            )}

            {/* ── SECTION 2: Incoming requests ── */}
            <AnimatePresence>
              {pendingReceived.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    {l.incoming}
                  </p>
                  <div className="space-y-3">
                    {pendingReceived.map(req => (
                      <div key={req.id}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200">
                        <Avatar className="w-14 h-14 shrink-0">
                          {req.other.avatar_url && <AvatarImage src={req.other.avatar_url} />}
                          <AvatarFallback className="text-base font-bold bg-amber-100 text-amber-700">
                            {initials(req.other.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-foreground leading-tight">
                            {req.other.full_name || '—'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                            {l.requestFrom}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="min-h-[52px] min-w-[100px] rounded-xl text-base font-bold bg-pink-500 hover:bg-pink-600 text-white"
                            onClick={() => respond(req.id, true)}
                          >
                            {l.accept}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[52px] min-w-[100px] rounded-xl text-base font-bold border-destructive/40 text-destructive hover:bg-destructive/5"
                            onClick={() => respond(req.id, false)}
                          >
                            {l.reject}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── SECTION 3: Outgoing pending ── */}
            {pendingSent && !accepted && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
                  <Avatar className="w-14 h-14 shrink-0">
                    {pendingSent.other.avatar_url && <AvatarImage src={pendingSent.other.avatar_url} />}
                    <AvatarFallback className="text-base font-bold">
                      {initials(pendingSent.other.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-foreground">{pendingSent.other.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{l.outgoing} — {l.outgoingDesc}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[48px] min-w-[48px] rounded-xl text-destructive hover:text-destructive shrink-0"
                    onClick={() => remove(pendingSent!.id)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── SECTION 4: Search & invite ── */}
            {!accepted && !pendingSent && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <p className="text-base font-semibold text-foreground">{l.inviteTitle}</p>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder={l.searchPlaceholder}
                    className="pl-11 h-14 text-base rounded-xl"
                  />
                </div>

                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="space-y-2">
                      {searchResults.map(person => (
                        <div key={person.id}
                          className="flex items-center gap-4 p-4 rounded-2xl border-2 border-border bg-card hover:border-pink-200 transition-colors">
                          <Avatar className="w-14 h-14 shrink-0">
                            {person.avatar_url && <AvatarImage src={person.avatar_url} />}
                            <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                              {initials(person.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="flex-1 text-base font-bold text-foreground">
                            {person.full_name || '—'}
                          </p>
                          <Button
                            size="sm"
                            className={cn(
                              'min-h-[52px] min-w-[110px] rounded-xl text-base font-bold shrink-0',
                              'bg-pink-500 hover:bg-pink-600 text-white',
                            )}
                            disabled={sendingTo === person.id}
                            onClick={() => sendRequest(person)}
                          >
                            {sendingTo === person.id
                              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{l.sending}</>
                              : <><UserPlus className="w-4 h-4 mr-1.5" />{l.sendInvite}</>
                            }
                          </Button>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-sm text-muted-foreground text-center py-3">
                      {l.noResults}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BuddiesCard;
