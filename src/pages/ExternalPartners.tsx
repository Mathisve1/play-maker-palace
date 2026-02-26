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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Users, Mail, Eye, Calendar, Download, Trash2, Loader2, Upload, X } from 'lucide-react';
import Logo from '@/components/Logo';

interface Partner {
  id: string;
  name: string;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  external_payroll: boolean;
  logo_url: string | null;
  created_at: string;
  member_count?: number;
}

interface PartnerMember {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
}

interface EventAccess {
  id: string;
  event_id: string;
  max_spots: number | null;
  event_title?: string;
  event_date?: string | null;
  signup_count?: number;
}

const categoryLabels: Record<string, Record<string, string>> = {
  nl: { horeca: 'Horeca', stewards: 'Stewards', supporters: 'Supporters', andere: 'Andere' },
  fr: { horeca: 'Horeca', stewards: 'Stewards', supporters: 'Supporters', andere: 'Autre' },
  en: { horeca: 'Catering', stewards: 'Stewards', supporters: 'Supporters', andere: 'Other' },
};

const categoryColors: Record<string, string> = {
  horeca: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  stewards: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  supporters: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  andere: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const ExternalPartners = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', category: 'stewards', custom_category: '', contact_name: '', contact_email: '', external_payroll: false });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>(['']);

  // Detail view
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [members, setMembers] = useState<PartnerMember[]>([]);
  const [eventAccess, setEventAccess] = useState<EventAccess[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Event access
  const [events, setEvents] = useState<{ id: string; title: string; event_date: string | null }[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [maxSpots, setMaxSpots] = useState('');
  const [addingEvent, setAddingEvent] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: ownedClubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id);
      let cid = ownedClubs?.[0]?.id;
      if (!cid) {
        const { data: memberships } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id);
        cid = memberships?.[0]?.club_id;
      }
      if (!cid) { navigate('/club-dashboard'); return; }
      setClubId(cid);
      await fetchPartners(cid);
      
      const { data: evts } = await supabase.from('events').select('id, title, event_date').eq('club_id', cid).order('event_date', { ascending: false });
      setEvents(evts || []);
      setLoading(false);
    };
    init();
  }, []);

  const fetchPartners = async (cid: string) => {
    const { data } = await supabase.from('external_partners').select('*').eq('club_id', cid).order('created_at', { ascending: false });
    if (data) {
      // Get member counts
      const partnersWithCounts = await Promise.all(data.map(async (p: any) => {
        const { count } = await supabase.from('partner_members').select('*', { count: 'exact', head: true }).eq('partner_id', p.id);
        return { ...p, member_count: count || 0 };
      }));
      setPartners(partnersWithCounts);
    }
  };

  const handleCreatePartner = async () => {
    if (!clubId || !newPartner.name.trim()) return;
    setCreating(true);
    try {
      const finalCategory = newPartner.category === 'andere' ? (newPartner.custom_category.trim() || 'andere') : newPartner.category;

      // Upload logo if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `partner-logos/${clubId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('club-logos').upload(path, logoFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('club-logos').getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }

      const { data: partner, error } = await supabase.from('external_partners').insert({
        club_id: clubId,
        name: newPartner.name.trim(),
        category: finalCategory,
        contact_name: newPartner.contact_name || null,
        contact_email: newPartner.contact_email || null,
        external_payroll: newPartner.external_payroll,
        logo_url: logoUrl,
      }).select('id').single();

      if (error) throw error;

      // Send invitations to all provided emails
      const { data: { session } } = await supabase.auth.getSession();
      if (session && partner) {
        const validEmails = inviteEmails.filter(e => e.trim());
        const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).maybeSingle();
        
        for (const email of validEmails) {
          try {
            const { data: inv, error: invErr } = await supabase.from('club_invitations').insert({
              club_id: clubId,
              email: email.trim(),
              role: 'medewerker' as any,
              invited_by: session.user.id,
            }).select('invite_token').single();

            if (invErr) continue;

            await supabase.functions.invoke('club-invite?action=send-email', {
              body: { email: email.trim(), invite_token: inv.invite_token, role: 'partner_admin', club_name: club?.name, partner_id: partner.id, partner_name: newPartner.name.trim() },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
          } catch { /* skip failed individual invites */ }
        }

        if (validEmails.length > 0) {
          toast.success(language === 'nl' ? `${validEmails.length} uitnodiging(en) verstuurd!` : `${validEmails.length} invitation(s) sent!`);
        }
      }

      toast.success(language === 'nl' ? 'Partner aangemaakt!' : 'Partner created!');
      setShowCreate(false);
      setNewPartner({ name: '', category: 'stewards', custom_category: '', contact_name: '', contact_email: '', external_payroll: false });
      setLogoFile(null);
      setLogoPreview(null);
      setInviteEmails(['']);
      await fetchPartners(clubId);
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreating(false);
  };

  const handleSelectPartner = async (partner: Partner) => {
    setSelectedPartner(partner);
    setLoadingDetail(true);
    const [membersRes, accessRes] = await Promise.all([
      supabase.from('partner_members').select('id, full_name, email, phone, date_of_birth').eq('partner_id', partner.id),
      supabase.from('partner_event_access').select('id, event_id, max_spots').eq('partner_id', partner.id),
    ]);
    setMembers(membersRes.data || []);

    // Enrich event access with event info and signup counts
    const accessData = accessRes.data || [];
    const enriched = await Promise.all(accessData.map(async (a: any) => {
      const evt = events.find(e => e.id === a.event_id);
      const { count } = await supabase.from('partner_event_signups').select('*', { count: 'exact', head: true }).eq('partner_event_access_id', a.id);
      return { ...a, event_title: evt?.title || '?', event_date: evt?.event_date, signup_count: count || 0 };
    }));
    setEventAccess(enriched);
    setLoadingDetail(false);
  };

  const handleInviteAdmin = async () => {
    if (!selectedPartner || !inviteEmail.trim() || !clubId) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Create invitation record
      const { data: inv, error: invErr } = await supabase.from('club_invitations').insert({
        club_id: clubId,
        email: inviteEmail.trim(),
        role: 'medewerker' as any,
        invited_by: session.user.id,
      }).select('invite_token').single();

      if (invErr) throw invErr;

      // Send email via edge function with partner metadata
      const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).maybeSingle();
      await supabase.functions.invoke('club-invite?action=send-email', {
        body: { email: inviteEmail.trim(), invite_token: inv.invite_token, role: 'partner_admin', club_name: club?.name, partner_id: selectedPartner.id, partner_name: selectedPartner.name },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      toast.success(language === 'nl' ? 'Uitnodiging verstuurd!' : 'Invitation sent!');
      setShowInvite(false);
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setInviting(false);
  };

  const handleAddEventAccess = async () => {
    if (!selectedPartner || !selectedEventId) return;
    setAddingEvent(true);
    const { error } = await supabase.from('partner_event_access').insert({
      partner_id: selectedPartner.id,
      event_id: selectedEventId,
      max_spots: maxSpots ? parseInt(maxSpots) : null,
    });
    if (error) {
      toast.error(error.message?.includes('duplicate') ? (language === 'nl' ? 'Dit evenement is al opengesteld.' : 'Event already added.') : error.message);
    } else {
      toast.success(language === 'nl' ? 'Evenement opengesteld!' : 'Event access added!');
      setShowAddEvent(false);
      setSelectedEventId('');
      setMaxSpots('');
      handleSelectPartner(selectedPartner);
    }
    setAddingEvent(false);
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!clubId) return;
    const { error } = await supabase.from('external_partners').delete().eq('id', partnerId);
    if (error) toast.error(error.message);
    else {
      toast.success(language === 'nl' ? 'Partner verwijderd.' : 'Partner deleted.');
      setSelectedPartner(null);
      await fetchPartners(clubId);
    }
  };

  const handleExportAttendees = async (accessId: string, eventTitle: string) => {
    setExporting(true);
    try {
      const { data: signups } = await supabase
        .from('partner_event_signups')
        .select('status, partner_member_id')
        .eq('partner_event_access_id', accessId);

      if (!signups?.length) { toast.info(language === 'nl' ? 'Geen inschrijvingen.' : 'No signups.'); setExporting(false); return; }

      const memberIds = signups.map(s => s.partner_member_id);
      const { data: memberData } = await supabase.from('partner_members').select('id, full_name, date_of_birth, email, phone').in('id', memberIds);

      const partner = selectedPartner;
      const lines = ['Naam,Geboortedatum,E-mail,Telefoon,Partner,Status'];
      signups.forEach(s => {
        const m = memberData?.find(md => md.id === s.partner_member_id);
        if (m) lines.push(`"${m.full_name}","${m.date_of_birth || ''}","${m.email || ''}","${m.phone || ''}","${partner?.name || ''}","${s.status}"`);
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aanwezigen-${eventTitle.replace(/\s/g, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(language === 'nl' ? 'Export gedownload!' : 'Export downloaded!');
    } catch (err: any) {
      toast.error(err.message);
    }
    setExporting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/club-dashboard')} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <Logo size="sm" />
          <h1 className="text-lg font-heading font-semibold text-foreground flex-1">
            {language === 'nl' ? 'Externe Partners' : language === 'fr' ? 'Partenaires Externes' : 'External Partners'}
          </h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {language === 'nl' ? 'Nieuw' : 'New'}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-4">
        {/* Partner detail view */}
        {selectedPartner ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPartner(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                {language === 'nl' ? 'Terug' : 'Back'}
              </Button>
              <h2 className="text-xl font-heading font-semibold flex-1">{selectedPartner.name}</h2>
              <Badge className={categoryColors[selectedPartner.category]}>
                {categoryLabels[language]?.[selectedPartner.category] || selectedPartner.category}
              </Badge>
              {selectedPartner.external_payroll && (
                <Badge variant="outline" className="text-xs">Externe Payroll</Badge>
              )}
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
                    <Mail className="w-4 h-4 mr-1" />
                    {language === 'nl' ? 'Beheerder uitnodigen' : 'Invite admin'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddEvent(true)}>
                    <Calendar className="w-4 h-4 mr-1" />
                    {language === 'nl' ? 'Evenement openstellen' : 'Add event'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePartner(selectedPartner.id)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    {language === 'nl' ? 'Verwijderen' : 'Delete'}
                  </Button>
                </div>

                {/* Members (read-only for club owner) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {language === 'nl' ? `Medewerkers (${members.length})` : `Members (${members.length})`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{language === 'nl' ? 'Nog geen medewerkers toegevoegd door de partner.' : 'No members added yet.'}</p>
                    ) : (
                      <div className="space-y-2">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div>
                              <p className="text-sm font-medium">{m.full_name}</p>
                              <p className="text-xs text-muted-foreground">{m.email || ''} {m.date_of_birth ? `• ${m.date_of_birth}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Event access */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {language === 'nl' ? 'Opengestelde evenementen' : 'Event access'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {eventAccess.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{language === 'nl' ? 'Nog geen evenementen opengesteld.' : 'No events assigned yet.'}</p>
                    ) : (
                      <div className="space-y-2">
                        {eventAccess.map(ea => (
                          <div key={ea.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                              <p className="text-sm font-medium">{ea.event_title}</p>
                              <p className="text-xs text-muted-foreground">
                                {ea.event_date ? new Date(ea.event_date).toLocaleDateString() : ''}
                                {ea.max_spots ? ` • Max ${ea.max_spots} spots` : ''}
                                {` • ${ea.signup_count} ${language === 'nl' ? 'inschrijvingen' : 'signups'}`}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleExportAttendees(ea.id, ea.event_title || '')} disabled={exporting}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        ) : (
          /* Partner list */
          <>
            {partners.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">{language === 'nl' ? 'Nog geen externe partners.' : 'No external partners yet.'}</p>
              </div>
            ) : (
              partners.map(p => (
                <Card key={p.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => handleSelectPartner(p)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <Badge className={`text-xs ${categoryColors[p.category] || categoryColors['andere']}`}>
                          {categoryLabels[language]?.[p.category] || p.category}
                        </Badge>
                        {p.external_payroll && <Badge variant="outline" className="text-xs">Externe Payroll</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {p.contact_name || ''}{p.contact_name && p.contact_email ? ' • ' : ''}{p.contact_email || ''}
                        {` • ${p.member_count || 0} ${language === 'nl' ? 'medewerkers' : 'members'}`}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}
      </main>

      {/* Create Partner Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        setShowCreate(open);
        if (!open) { setLogoFile(null); setLogoPreview(null); setInviteEmails(['']); }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'nl' ? 'Nieuwe partner aanmaken' : 'Create new partner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Logo upload */}
            <div>
              <Label>{language === 'nl' ? 'Logo (optioneel)' : 'Logo (optional)'}</Label>
              <div className="mt-1 flex items-center gap-3">
                {logoPreview ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoFile(file);
                          setLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">{language === 'nl' ? 'Upload het logo van de partnerorganisatie' : 'Upload the partner organization logo'}</p>
              </div>
            </div>

            <div>
              <Label>{language === 'nl' ? 'Naam' : 'Name'} *</Label>
              <Input value={newPartner.name} onChange={e => setNewPartner(p => ({ ...p, name: e.target.value }))} placeholder="Stewards VZW Antwerp" />
            </div>

            <div>
              <Label>{language === 'nl' ? 'Categorie' : 'Category'}</Label>
              <Select value={newPartner.category} onValueChange={v => setNewPartner(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stewards">Stewards</SelectItem>
                  <SelectItem value="horeca">Horeca</SelectItem>
                  <SelectItem value="supporters">Supporters</SelectItem>
                  <SelectItem value="andere">{language === 'nl' ? 'Andere...' : 'Other...'}</SelectItem>
                </SelectContent>
              </Select>
              {newPartner.category === 'andere' && (
                <Input
                  className="mt-2"
                  value={newPartner.custom_category}
                  onChange={e => setNewPartner(p => ({ ...p, custom_category: e.target.value }))}
                  placeholder={language === 'nl' ? 'Specificeer categorie...' : 'Specify category...'}
                />
              )}
            </div>

            <div>
              <Label>{language === 'nl' ? 'Contactpersoon' : 'Contact name'}</Label>
              <Input value={newPartner.contact_name} onChange={e => setNewPartner(p => ({ ...p, contact_name: e.target.value }))} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={newPartner.contact_email} onChange={e => setNewPartner(p => ({ ...p, contact_email: e.target.value }))} />
            </div>

            {/* Invite partner admins */}
            <div>
              <Label className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {language === 'nl' ? 'Verantwoordelijken uitnodigen' : 'Invite administrators'}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'nl' ? 'Nodig verantwoordelijken uit die hun medewerkers kunnen beheren via het partner portaal.' : 'Invite administrators who can manage their staff via the partner portal.'}
              </p>
              <div className="space-y-2">
                {inviteEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={e => {
                        const updated = [...inviteEmails];
                        updated[idx] = e.target.value;
                        setInviteEmails(updated);
                      }}
                      placeholder={`verantwoordelijke${idx + 1}@partner.be`}
                    />
                    {inviteEmails.length > 1 && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setInviteEmails(inviteEmails.filter((_, i) => i !== idx))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setInviteEmails([...inviteEmails, ''])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {language === 'nl' ? 'Nog iemand toevoegen' : 'Add another'}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={newPartner.external_payroll} onCheckedChange={c => setNewPartner(p => ({ ...p, external_payroll: !!c }))} id="payroll" />
              <Label htmlFor="payroll" className="cursor-pointer">{language === 'nl' ? 'Externe Payroll (medewerkers hebben al een contract)' : 'External Payroll (members have existing contracts)'}</Label>
            </div>
            <Button onClick={handleCreatePartner} disabled={creating || !newPartner.name.trim()} className="w-full">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {language === 'nl' ? 'Aanmaken & uitnodigen' : 'Create & invite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Admin Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'nl' ? 'Partner beheerder uitnodigen' : 'Invite partner admin'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="beheerder@partner.be" />
            </div>
            <Button onClick={handleInviteAdmin} disabled={inviting || !inviteEmail.trim()} className="w-full">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              {language === 'nl' ? 'Uitnodiging versturen' : 'Send invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event Access Dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'nl' ? 'Evenement openstellen' : 'Add event access'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'nl' ? 'Evenement' : 'Event'}</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger><SelectValue placeholder={language === 'nl' ? 'Selecteer...' : 'Select...'} /></SelectTrigger>
                <SelectContent>
                  {events.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.title}{e.event_date ? ` (${new Date(e.event_date).toLocaleDateString()})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'nl' ? 'Max plaatsen (optioneel)' : 'Max spots (optional)'}</Label>
              <Input type="number" min={1} value={maxSpots} onChange={e => setMaxSpots(e.target.value)} />
            </div>
            <Button onClick={handleAddEventAccess} disabled={addingEvent || !selectedEventId} className="w-full">
              {addingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {language === 'nl' ? 'Openstellen' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExternalPartners;
