import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, Plus, LogOut, Loader2, Check, X, Trash2, UserPlus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Logo from '@/components/Logo';

interface PartnerInfo {
  id: string;
  name: string;
  category: string;
  external_payroll: boolean;
  club_id: string;
  club_name?: string;
}

interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
}

interface EventWithAccess {
  access_id: string;
  event_id: string;
  event_title: string;
  event_date: string | null;
  max_spots: number | null;
  signups: { id: string; partner_member_id: string; status: string; member_name?: string }[];
}

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventWithAccess[]>([]);
  const [userId, setUserId] = useState('');

  // Add member
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ full_name: '', email: '', phone: '', date_of_birth: '' });
  const [addingMember, setAddingMember] = useState(false);

  // Signup
  const [showSignup, setShowSignup] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [signingUp, setSigningUp] = useState(false);

  // Ticket view
  const [viewTicket, setViewTicket] = useState<{ barcode: string; memberName: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setUserId(session.user.id);

      // Find partner admin record
      const { data: adminRecords } = await supabase.from('partner_admins').select('partner_id').eq('user_id', session.user.id);
      if (!adminRecords?.length) { navigate('/dashboard'); return; }

      const partnerId = adminRecords[0].partner_id;
      const { data: partnerData } = await supabase.from('external_partners').select('id, name, category, external_payroll, club_id').eq('id', partnerId).maybeSingle();
      if (!partnerData) { navigate('/dashboard'); return; }

      const { data: club } = await supabase.from('clubs').select('name').eq('id', partnerData.club_id).maybeSingle();
      setPartner({ ...partnerData, club_name: club?.name || '' });

      await fetchData(partnerId);
      setLoading(false);
    };
    init();
  }, []);

  const fetchData = async (partnerId: string) => {
    const [membersRes, accessRes] = await Promise.all([
      supabase.from('partner_members').select('*').eq('partner_id', partnerId).order('created_at'),
      supabase.from('partner_event_access').select('id, event_id, max_spots').eq('partner_id', partnerId),
    ]);
    const mems = membersRes.data || [];
    setMembers(mems);

    const accessData = accessRes.data || [];
    const eventsEnriched: EventWithAccess[] = await Promise.all(accessData.map(async (a: any) => {
      const { data: evt } = await supabase.from('events').select('title, event_date').eq('id', a.event_id).maybeSingle();
      const { data: signups } = await supabase.from('partner_event_signups').select('id, partner_member_id, status').eq('partner_event_access_id', a.id);
      const enrichedSignups = (signups || []).map((s: any) => {
        const member = mems.find(m => m.id === s.partner_member_id);
        return { ...s, member_name: member?.full_name || '?' };
      });
      return { access_id: a.id, event_id: a.event_id, event_title: evt?.title || '?', event_date: evt?.event_date, max_spots: a.max_spots, signups: enrichedSignups };
    }));
    setEvents(eventsEnriched);
  };

  const handleAddMember = async () => {
    if (!partner || !newMember.full_name.trim()) return;
    setAddingMember(true);
    const { error } = await supabase.from('partner_members').insert({
      partner_id: partner.id,
      full_name: newMember.full_name.trim(),
      email: newMember.email || null,
      phone: newMember.phone || null,
      date_of_birth: newMember.date_of_birth || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(language === 'nl' ? 'Medewerker toegevoegd!' : 'Member added!');
      setShowAddMember(false);
      setNewMember({ full_name: '', email: '', phone: '', date_of_birth: '' });
      await fetchData(partner.id);
    }
    setAddingMember(false);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!partner) return;
    await supabase.from('partner_members').delete().eq('id', memberId);
    toast.success(language === 'nl' ? 'Medewerker verwijderd.' : 'Member removed.');
    await fetchData(partner.id);
  };

  const handleSignupMembers = async (accessId: string) => {
    if (!partner || !selectedMembers.length) return;
    setSigningUp(true);
    const inserts = selectedMembers.map(mid => ({
      partner_event_access_id: accessId,
      partner_member_id: mid,
      status: 'pending',
    }));
    const { error } = await supabase.from('partner_event_signups').insert(inserts);
    if (error) toast.error(error.message);
    else {
      toast.success(language === 'nl' ? 'Medewerkers ingeschreven!' : 'Members signed up!');
      setShowSignup(null);
      setSelectedMembers([]);
      await fetchData(partner.id);
    }
    setSigningUp(false);
  };

  const handleApprove = async (signupId: string) => {
    if (!partner) return;
    const { error } = await supabase.from('partner_event_signups').update({ status: 'approved', approved_by: userId }).eq('id', signupId);
    if (error) { toast.error(error.message); return; }

    // Generate QR ticket
    const { data: signup } = await supabase.from('partner_event_signups').select('partner_member_id, partner_event_access_id').eq('id', signupId).maybeSingle();
    if (signup) {
      const { data: access } = await supabase.from('partner_event_access').select('event_id').eq('id', signup.partner_event_access_id).maybeSingle();
      const { data: member } = await supabase.from('partner_members').select('user_id').eq('id', signup.partner_member_id).maybeSingle();
      const barcode = `PT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      await supabase.from('volunteer_tickets').insert({
        club_id: partner.club_id,
        event_id: access?.event_id || null,
        volunteer_id: member?.user_id || userId, // fallback to partner admin
        barcode,
        status: 'sent',
      });
    }

    toast.success(language === 'nl' ? 'Goedgekeurd & ticket aangemaakt!' : 'Approved & ticket created!');
    await fetchData(partner.id);
  };

  const handleReject = async (signupId: string) => {
    await supabase.from('partner_event_signups').update({ status: 'rejected' }).eq('id', signupId);
    toast.success(language === 'nl' ? 'Afgewezen.' : 'Rejected.');
    if (partner) await fetchData(partner.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!partner) return null;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Logo size="sm" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-heading font-semibold text-foreground truncate">{partner.name}</h1>
            <p className="text-xs text-muted-foreground">{partner.club_name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-4">
        <Tabs defaultValue="members">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="members" className="gap-1">
              <Users className="w-4 h-4" />
              {language === 'nl' ? 'Medewerkers' : 'Members'}
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1">
              <Calendar className="w-4 h-4" />
              {language === 'nl' ? 'Evenementen' : 'Events'}
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-3 mt-4">
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <UserPlus className="w-4 h-4 mr-1" />
              {language === 'nl' ? 'Medewerker toevoegen' : 'Add member'}
            </Button>

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {language === 'nl' ? 'Voeg je eerste medewerker toe.' : 'Add your first member.'}
              </p>
            ) : (
              members.map(m => (
                <Card key={m.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{m.email || ''}{m.date_of_birth ? ` • ${m.date_of_birth}` : ''}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(m.id)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4 mt-4">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {language === 'nl' ? 'Er zijn nog geen evenementen voor je opengesteld.' : 'No events available yet.'}
              </p>
            ) : (
              events.map(evt => (
                <Card key={evt.access_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{evt.event_title}</span>
                      <Button size="sm" variant="outline" onClick={() => { setShowSignup(evt.access_id); setSelectedMembers([]); }}>
                        <Plus className="w-3 h-3 mr-1" />
                        {language === 'nl' ? 'Inschrijven' : 'Sign up'}
                      </Button>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {evt.event_date ? new Date(evt.event_date).toLocaleDateString() : ''}
                      {evt.max_spots ? ` • Max ${evt.max_spots} plaatsen` : ''}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {evt.signups.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{language === 'nl' ? 'Nog niemand ingeschreven.' : 'No signups yet.'}</p>
                    ) : (
                      <div className="space-y-2">
                        {evt.signups.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{s.member_name}</span>
                              <Badge variant={s.status === 'approved' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                                {s.status === 'approved' ? '✅ Goedgekeurd' : s.status === 'rejected' ? '❌ Afgewezen' : '⏳ In afwachting'}
                              </Badge>
                            </div>
                            {s.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleApprove(s.id)}>
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReject(s.id)}>
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'nl' ? 'Medewerker toevoegen' : 'Add member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'nl' ? 'Volledige naam' : 'Full name'} *</Label>
              <Input value={newMember.full_name} onChange={e => setNewMember(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>{language === 'nl' ? 'Telefoon' : 'Phone'}</Label>
              <Input value={newMember.phone} onChange={e => setNewMember(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>{language === 'nl' ? 'Geboortedatum' : 'Date of birth'}</Label>
              <Input type="date" value={newMember.date_of_birth} onChange={e => setNewMember(p => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <Button onClick={handleAddMember} disabled={addingMember || !newMember.full_name.trim()} className="w-full">
              {addingMember ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {language === 'nl' ? 'Toevoegen' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signup Members Dialog */}
      <Dialog open={!!showSignup} onOpenChange={() => setShowSignup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'nl' ? 'Medewerkers inschrijven' : 'Sign up members'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {members.filter(m => {
              const evt = events.find(e => e.access_id === showSignup);
              return !evt?.signups.some(s => s.partner_member_id === m.id);
            }).map(m => (
              <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(m.id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedMembers(p => [...p, m.id]);
                    else setSelectedMembers(p => p.filter(id => id !== m.id));
                  }}
                  className="w-4 h-4 rounded border-input accent-primary"
                />
                <span className="text-sm">{m.full_name}</span>
              </label>
            ))}
            {members.filter(m => { const evt = events.find(e => e.access_id === showSignup); return !evt?.signups.some(s => s.partner_member_id === m.id); }).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{language === 'nl' ? 'Alle medewerkers zijn al ingeschreven.' : 'All members already signed up.'}</p>
            )}
            <Button onClick={() => showSignup && handleSignupMembers(showSignup)} disabled={signingUp || !selectedMembers.length} className="w-full">
              {signingUp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {language === 'nl' ? `${selectedMembers.length} inschrijven` : `Sign up ${selectedMembers.length}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerDashboard;
