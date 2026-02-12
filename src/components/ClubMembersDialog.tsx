import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, UserPlus, Copy, Trash2, Shield, ChevronDown, Info } from 'lucide-react';

type ClubRole = 'bestuurder' | 'beheerder' | 'medewerker';

interface Member {
  id: string;
  user_id: string;
  role: ClubRole;
  profile?: { full_name: string | null; email: string | null };
}

interface Invitation {
  id: string;
  email: string | null;
  role: ClubRole;
  status: string;
  invite_token: string;
  expires_at: string;
}

interface Props {
  clubId: string;
  currentUserId: string;
  isOwner: boolean;
  currentUserRole: ClubRole;
  onClose: () => void;
}

const roleLabels: Record<ClubRole, string> = {
  bestuurder: 'Bestuurder',
  beheerder: 'Beheerder',
  medewerker: 'Medewerker',
};

const roleColors: Record<ClubRole, string> = {
  bestuurder: 'bg-primary/10 text-primary',
  beheerder: 'bg-accent/10 text-accent-foreground',
  medewerker: 'bg-muted text-muted-foreground',
};

const ClubMembersDialog = ({ clubId, currentUserId, isOwner, currentUserRole, onClose }: Props) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRolesInfo, setShowRolesInfo] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ClubRole>('medewerker');
  const [inviting, setInviting] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);

  const canManage = isOwner || currentUserRole === 'bestuurder';
  const canInvite = canManage || currentUserRole === 'beheerder';

  useEffect(() => {
    fetchData();
  }, [clubId]);

  const fetchData = async () => {
    // Fetch members
    const { data: membersData } = await supabase
      .from('club_members')
      .select('id, user_id, role')
      .eq('club_id', clubId);

    if (membersData && membersData.length > 0) {
      const userIds = membersData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setMembers(
        membersData.map(m => ({
          ...m,
          role: m.role as ClubRole,
          profile: profileMap.get(m.user_id) || null,
        }))
      );
    }

    // Fetch invitations
    const { data: invData } = await supabase
      .from('club_invitations')
      .select('id, email, role, status, invite_token, expires_at')
      .eq('club_id', clubId)
      .eq('status', 'pending');

    setInvitations((invData || []).map(i => ({ ...i, role: i.role as ClubRole })));
    setLoading(false);
  };

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('club_invitations')
      .insert({
        club_id: clubId,
        email: inviteEmail.trim(),
        role: inviteRole,
        invited_by: session.user.id,
      })
      .select('invite_token')
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      // Send email via edge function
      try {
        // Get club name for the email
        const { data: club } = await supabase
          .from('clubs')
          .select('name')
          .eq('id', clubId)
          .maybeSingle();

        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-invite?action=send-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: inviteEmail.trim(),
              invite_token: data.invite_token,
              role: inviteRole,
              club_name: club?.name || '',
            }),
          }
        );
      } catch (e) {
        console.error('Email sending failed:', e);
      }
      toast.success(`Uitnodiging verstuurd naar ${inviteEmail}`);
      setInviteEmail('');
      fetchData();
    }
    setInviting(false);
  };

  const handleGenerateLink = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('club_invitations')
      .insert({
        club_id: clubId,
        role: inviteRole,
        invited_by: session.user.id,
      })
      .select('invite_token')
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      const link = `${window.location.origin}/club-invite/${data.invite_token}`;
      await navigator.clipboard.writeText(link);
      toast.success('Uitnodigingslink gekopieerd!');
      fetchData();
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: ClubRole) => {
    const { error } = await supabase
      .from('club_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Rol bijgewerkt');
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    }
    setShowRoleDropdown(null);
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (userId === currentUserId) {
      toast.error('Je kunt jezelf niet verwijderen');
      return;
    }
    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Lid verwijderd');
      setMembers(prev => prev.filter(m => m.id !== memberId));
    }
  };

  const handleDeleteInvitation = async (invId: string) => {
    const { error } = await supabase
      .from('club_invitations')
      .delete()
      .eq('id', invId);

    if (error) {
      toast.error(error.message);
    } else {
      setInvitations(prev => prev.filter(i => i.id !== invId));
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/club-invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link gekopieerd!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-elevated p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Leden beheren
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles info toggle */}
        <div className="mb-5">
          <button
            onClick={() => setShowRolesInfo(!showRolesInfo)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-4 h-4" />
            Wat kunnen de verschillende rollen?
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRolesInfo ? 'rotate-180' : ''}`} />
          </button>

          {showRolesInfo && (
            <div className="mt-3 space-y-3 p-4 rounded-xl bg-muted/30 border border-border text-sm">
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full bg-primary`} />
                  Bestuurder
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Volledige toegang: rollen toewijzen &amp; wijzigen, Stripe koppelen/ontkoppelen, betalingen uitvoeren, contracten aanmaken, uitsturen &amp; toekennen, taken beheren, en andere leden tot medebestuurder benoemen.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full bg-accent-foreground`} />
                  Beheerder
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Kan bijna alles: taken beheren, contracten aanmaken &amp; uitsturen, betalingen uitvoeren, en leden uitnodigen. Kan <strong>geen</strong> rollen wijzigen en <strong>geen</strong> Stripe-gegevens aanpassen of ontkoppelen.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full bg-muted-foreground`} />
                  Medewerker
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Kan taken bekijken &amp; beheren, contracten aanmaken &amp; uitsturen, en het dagelijkse werk uitvoeren. Kan <strong>geen</strong> rollen wijzigen en <strong>geen</strong> betalingen uitvoeren.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Invite section */}
        {canInvite && (
          <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Nieuw lid uitnodigen
            </h3>
            <div className="flex gap-2 mb-2">
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as ClubRole)}
                className="px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {canManage && <option value="beheerder">Beheerder</option>}
                <option value="medewerker">Medewerker</option>
              </select>
            </div>

            {/* Email invite */}
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                placeholder="E-mailadres"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleInviteByEmail}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Verstuur
              </button>
            </div>

            {/* Generate link */}
            <button
              onClick={handleGenerateLink}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Copy className="w-3.5 h-3.5" />
              Genereer uitnodigingslink
            </button>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Leden ({members.length})
          </h3>
          {loading ? (
            <div className="py-4 text-center text-muted-foreground text-sm">Laden...</div>
          ) : (
            members.map(member => (
              <div key={member.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.profile?.full_name || 'Onbekend'}
                      {member.user_id === currentUserId && <span className="text-muted-foreground ml-1">(jij)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canManage && member.user_id !== currentUserId ? (
                    <div className="relative">
                      <button
                        onClick={() => setShowRoleDropdown(showRoleDropdown === member.id ? null : member.id)}
                        className={`px-2.5 py-1 text-xs rounded-full font-medium flex items-center gap-1 ${roleColors[member.role]}`}
                      >
                        {roleLabels[member.role]}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showRoleDropdown === member.id && (
                        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-elevated py-1 z-10 min-w-[140px]">
                          {(['bestuurder', 'beheerder', 'medewerker'] as ClubRole[]).map(r => (
                            <button
                              key={r}
                              onClick={() => handleUpdateRole(member.id, r)}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 ${member.role === r ? 'font-semibold text-primary' : 'text-foreground'}`}
                            >
                              {roleLabels[r]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${roleColors[member.role]}`}>
                      {roleLabels[member.role]}
                    </span>
                  )}
                  {canManage && member.user_id !== currentUserId && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.user_id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Openstaande uitnodigingen ({invitations.length})
            </h3>
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/10 border border-dashed border-border">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{inv.email || 'Via link'}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[inv.role]} · Verloopt {new Date(inv.expires_at).toLocaleDateString('nl-BE')}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => copyInviteLink(inv.invite_token)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteInvitation(inv.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubMembersDialog;
