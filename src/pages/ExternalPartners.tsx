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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Users, Mail, Eye, Calendar, Download, Trash2, Loader2, Upload, X, Handshake, Check, Clock, UserCheck, UserX, Ticket, ClipboardList, Send } from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';

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
  national_id?: string | null;
  city?: string | null;
  shirt_size?: string | null;
  user_id?: string | null;
}

interface EventAccess {
  id: string;
  event_id: string;
  max_spots: number | null;
  event_title?: string;
  event_date?: string | null;
  signup_count?: number;
}

interface PartnerTask {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  partner_acceptance_status: string;
  event_title?: string | null;
  event_id?: string | null;
  signups: { volunteer_name: string; status: string; member_id: string }[];
}

interface TrackingRecord {
  event_title: string;
  event_date: string | null;
  task_title: string;
  member_name: string;
  checked_in: boolean;
  checked_in_at: string | null;
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
  const nl = language === 'nl';
  const t3 = (nlStr: string, fr: string, en: string) => language === 'nl' ? nlStr : language === 'fr' ? fr : en;
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
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
  const [partnerTasks, setPartnerTasks] = useState<PartnerTask[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');

  // Selected task for members/tracking view
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<PartnerTask | null>(null);

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Member invite (volunteer account)
  const [invitingMemberId, setInvitingMemberId] = useState<string | null>(null);

  // Ticket sending
  const [sendingTicketFor, setSendingTicketFor] = useState<string | null>(null);
  const [ticketTaskId, setTicketTaskId] = useState('');
  const [sendingTicket, setSendingTicket] = useState(false);

  // Event access
  const [events, setEvents] = useState<{ id: string; title: string; event_date: string | null }[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [maxSpots, setMaxSpots] = useState('');
  const [addingEvent, setAddingEvent] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // Tracking
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: ownedClubs } = await supabase.from('clubs').select('id, name').eq('owner_id', session.user.id);
      let cid = ownedClubs?.[0]?.id;
      let cname = ownedClubs?.[0]?.name || '';
      if (!cid) {
        const { data: memberships } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id);
        cid = memberships?.[0]?.club_id;
        if (cid) {
          const { data: c } = await supabase.from('clubs').select('name').eq('id', cid).maybeSingle();
          cname = c?.name || '';
        }
      }
      if (!cid) { navigate('/club-dashboard'); return; }
      setClubId(cid);
      setClubName(cname);
      await fetchPartners(cid);
      
      const { data: evts } = await supabase.from('events').select('id, title, event_date').eq('club_id', cid).order('event_date', { ascending: false });
      setEvents(evts || []);
      setLoading(false);
    };
    init();
  }, []);

  const fetchPartners = async (cid: string) => {
    const { data: links } = await supabase.from('partner_clubs').select('partner_id').eq('club_id', cid);
    const partnerIds = (links || []).map((l: any) => l.partner_id);
    if (partnerIds.length === 0) { setPartners([]); return; }
    const { data } = await supabase.from('external_partners').select('*').in('id', partnerIds).order('created_at', { ascending: false });
    if (data) {
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
        club_id: clubId, name: newPartner.name.trim(), category: finalCategory,
        contact_name: newPartner.contact_name || null, contact_email: newPartner.contact_email || null,
        external_payroll: newPartner.external_payroll, logo_url: logoUrl,
      }).select('id').single();
      if (error) throw error;

      if (partner) {
        await supabase.from('partner_clubs').insert({ partner_id: partner.id, club_id: clubId });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session && partner) {
        const validEmails = inviteEmails.filter(e => e.trim());
        const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).maybeSingle();
        for (const email of validEmails) {
          try {
            const { data: inv, error: invErr } = await supabase.from('club_invitations').insert({
              club_id: clubId, email: email.trim(), role: 'medewerker' as any, invited_by: session.user.id,
            }).select('invite_token').single();
            if (invErr) continue;
            await supabase.functions.invoke('club-invite?action=send-email', {
              body: { email: email.trim(), invite_token: inv.invite_token, role: 'partner_admin', club_name: club?.name, partner_id: partner.id, partner_name: newPartner.name.trim() },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
          } catch { /* skip */ }
        }
        if (validEmails.length > 0) toast.success(`${validEmails.length} ${t3('uitnodiging(en) verstuurd!', 'invitation(s) envoyée(s)!', 'invitation(s) sent!')}`);
      }

      toast.success(t3('Partner aangemaakt!', 'Partenaire créé!', 'Partner created!'));
      setShowCreate(false);
      setNewPartner({ name: '', category: 'stewards', custom_category: '', contact_name: '', contact_email: '', external_payroll: false });
      setLogoFile(null); setLogoPreview(null); setInviteEmails(['']);
      await fetchPartners(clubId);
    } catch (err: any) { toast.error(err.message); }
    setCreating(false);
  };

  const handleSelectPartner = async (partner: Partner) => {
    setSelectedPartner(partner);
    setDetailTab('overview');
    setLoadingDetail(true);
    const [membersRes, accessRes, tasksRes] = await Promise.all([
      supabase.from('partner_members').select('id, full_name, email, phone, date_of_birth, national_id, city, shirt_size, user_id').eq('partner_id', partner.id),
      supabase.from('partner_event_access').select('id, event_id, max_spots').eq('partner_id', partner.id),
      supabase.from('tasks').select('id, title, description, task_date, location, spots_available, partner_acceptance_status, event_id').eq('partner_only', true).eq('assigned_partner_id', partner.id),
    ]);
    setMembers(membersRes.data || []);

    const accessData = accessRes.data || [];
    const enriched = await Promise.all(accessData.map(async (a: any) => {
      const evt = events.find(e => e.id === a.event_id);
      const { count } = await supabase.from('partner_event_signups').select('*', { count: 'exact', head: true }).eq('partner_event_access_id', a.id);
      return { ...a, event_title: evt?.title || '?', event_date: evt?.event_date, signup_count: count || 0 };
    }));
    setEventAccess(enriched);

    const allTasks = tasksRes.data || [];
    const partnerMembers = membersRes.data || [];
    const taskIds = allTasks.map(t => t.id);

    let assignmentMap: Record<string, { volunteer_name: string; status: string; member_id: string }[]> = {};
    if (taskIds.length > 0) {
      const { data: assignments } = await supabase.from('partner_task_assignments').select('task_id, partner_member_id').in('task_id', taskIds);
      (assignments || []).forEach((a: any) => {
        const member = partnerMembers.find(m => m.id === a.partner_member_id);
        if (!assignmentMap[a.task_id]) assignmentMap[a.task_id] = [];
        assignmentMap[a.task_id].push({ volunteer_name: member?.full_name || '?', status: 'assigned', member_id: a.partner_member_id });
      });
    }

    const enrichedTasks: PartnerTask[] = await Promise.all(allTasks.map(async (t: any) => {
      let eventTitle: string | null = null;
      if (t.event_id) { const evt = events.find(e => e.id === t.event_id); eventTitle = evt?.title || null; }
      const signups: { volunteer_name: string; status: string; member_id: string }[] = assignmentMap[t.id] || [];
      if (t.event_id) {
        const access = accessData.find((a: any) => a.event_id === t.event_id);
        if (access) {
          const { data: signupData } = await supabase.from('partner_event_signups').select('partner_member_id, status').eq('partner_event_access_id', access.id);
          (signupData || []).forEach((s: any) => {
            const member = partnerMembers.find(m => m.id === s.partner_member_id);
            signups.push({ volunteer_name: member?.full_name || '?', status: s.status, member_id: s.partner_member_id });
          });
        }
      }
      return { ...t, event_title: eventTitle, signups };
    }));
    setPartnerTasks(enrichedTasks);
    setLoadingDetail(false);
  };

  const fetchTracking = async (partner: Partner) => {
    setLoadingTracking(true);
    // Get all task assignments for this partner's members
    const { data: memberData } = await supabase.from('partner_members').select('id, full_name').eq('partner_id', partner.id);
    if (!memberData?.length) { setTrackingRecords([]); setLoadingTracking(false); return; }
    
    const memberIds = memberData.map(m => m.id);
    const memberMap: Record<string, string> = {};
    memberData.forEach(m => { memberMap[m.id] = m.full_name; });

    // Get task assignments
    const { data: assignments } = await supabase.from('partner_task_assignments').select('task_id, partner_member_id').in('partner_member_id', memberIds);
    if (!assignments?.length) { setTrackingRecords([]); setLoadingTracking(false); return; }

    const taskIds = [...new Set(assignments.map(a => a.task_id))];
    const { data: tasks } = await supabase.from('tasks').select('id, title, event_id, task_date').in('id', taskIds);
    const taskMap: Record<string, any> = {};
    (tasks || []).forEach(t => { taskMap[t.id] = t; });

    const eventIds = [...new Set((tasks || []).filter(t => t.event_id).map(t => t.event_id!))];
    let eventMap: Record<string, any> = {};
    if (eventIds.length > 0) {
      const { data: evts } = await supabase.from('events').select('id, title, event_date').in('id', eventIds);
      (evts || []).forEach(e => { eventMap[e.id] = e; });
    }

    // Check volunteer_tickets for check-in status (match via task_id + look up by member user_id or metadata)
    // For partner members with user_id, check volunteer_tickets
    const membersWithUser = memberData.filter(m => (m as any).user_id);
    // Re-fetch with user_id
    const { data: membersWithUserId } = await supabase.from('partner_members').select('id, full_name, user_id').eq('partner_id', partner.id);
    const userIdMap: Record<string, string | null> = {};
    (membersWithUserId || []).forEach((m: any) => { userIdMap[m.id] = m.user_id; });

    // Fetch all tickets for these tasks
    let ticketMap: Record<string, any> = {};
    if (taskIds.length > 0 && clubId) {
      const { data: tickets } = await supabase.from('volunteer_tickets').select('id, task_id, volunteer_id, status, checked_in_at, barcode').eq('club_id', clubId).in('task_id', taskIds);
      (tickets || []).forEach(t => {
        const key = `${t.task_id}_${t.volunteer_id}`;
        ticketMap[key] = t;
      });
    }

    const records: TrackingRecord[] = assignments.map(a => {
      const task = taskMap[a.task_id];
      const event = task?.event_id ? eventMap[task.event_id] : null;
      const userId = userIdMap[a.partner_member_id];
      const ticketKey = `${a.task_id}_${userId}`;
      const ticket = userId ? ticketMap[ticketKey] : null;

      return {
        event_title: event?.title || '-',
        event_date: event?.event_date || task?.task_date || null,
        task_title: task?.title || '?',
        member_name: memberMap[a.partner_member_id] || '?',
        checked_in: ticket?.status === 'checked_in',
        checked_in_at: ticket?.checked_in_at || null,
      };
    });

    // Sort by event date desc
    records.sort((a, b) => {
      const da = a.event_date ? new Date(a.event_date).getTime() : 0;
      const db = b.event_date ? new Date(b.event_date).getTime() : 0;
      return db - da;
    });

    setTrackingRecords(records);
    setLoadingTracking(false);
  };

  const handleInviteAdmin = async () => {
    if (!selectedPartner || !inviteEmail.trim() || !clubId) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: inv, error: invErr } = await supabase.from('club_invitations').insert({
        club_id: clubId, email: inviteEmail.trim(), role: 'medewerker' as any, invited_by: session.user.id,
      }).select('invite_token').single();
      if (invErr) throw invErr;
      const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).maybeSingle();
      await supabase.functions.invoke('club-invite?action=send-email', {
        body: { email: inviteEmail.trim(), invite_token: inv.invite_token, role: 'partner_admin', club_name: club?.name, partner_id: selectedPartner.id, partner_name: selectedPartner.name },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      toast.success(t3('Uitnodiging verstuurd!', 'Invitation envoyée!', 'Invitation sent!'));
      setShowInvite(false); setInviteEmail('');
    } catch (err: any) { toast.error(err.message); }
    setInviting(false);
  };

  const handleInviteMemberAsVolunteer = async (member: PartnerMember) => {
    if (!clubId || !member.email) { toast.error(t3('Deze medewerker heeft geen e-mailadres.', 'Ce membre n\'a pas d\'adresse e-mail.', 'This member has no email.')); return; }
    setInvitingMemberId(member.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: inv, error: invErr } = await supabase.from('club_invitations').insert({
        club_id: clubId, email: member.email, role: 'medewerker' as any, invited_by: session.user.id,
      }).select('invite_token').single();
      if (invErr) throw invErr;
      await supabase.functions.invoke('club-invite?action=send-email', {
        body: { email: member.email, invite_token: inv.invite_token, role: 'medewerker', club_name: clubName },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      toast.success(t3(`Uitnodiging verstuurd naar ${member.full_name}!`, `Invitation envoyée à ${member.full_name}!`, `Invitation sent to ${member.full_name}!`));
    } catch (err: any) { toast.error(err.message); }
    setInvitingMemberId(null);
  };

  const handleSendTicket = async (member: PartnerMember) => {
    if (!clubId || !ticketTaskId) return;
    setSendingTicket(true);
    try {
      // Find the task to get event_id
      const task = partnerTasks.find(t => t.id === ticketTaskId);
      const barcode = `VT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      
      // If member has user_id, use it; otherwise use a placeholder
      const volunteerId = member.user_id;
      if (!volunteerId) {
        toast.error(t3('Deze medewerker heeft nog geen vrijwilligersaccount. Stuur eerst een uitnodiging.', 'Ce membre n\'a pas encore de compte bénévole. Envoyez d\'abord une invitation.', 'This member has no volunteer account yet. Send an invitation first.'));
        setSendingTicket(false);
        return;
      }

      const { error } = await supabase.from('volunteer_tickets').insert({
        club_id: clubId,
        volunteer_id: volunteerId,
        task_id: ticketTaskId,
        event_id: task?.event_id || null,
        barcode,
        status: 'active' as any,
      });
      if (error) throw error;
      toast.success(t3(`Ticket aangemaakt voor ${member.full_name}!`, `Ticket créé pour ${member.full_name}!`, `Ticket created for ${member.full_name}!`));
      setSendingTicketFor(null);
      setTicketTaskId('');
    } catch (err: any) { toast.error(err.message); }
    setSendingTicket(false);
  };

  const handleAddEventAccess = async () => {
    if (!selectedPartner || !selectedEventId) return;
    setAddingEvent(true);
    const { error } = await supabase.from('partner_event_access').insert({
      partner_id: selectedPartner.id, event_id: selectedEventId,
      max_spots: maxSpots ? parseInt(maxSpots) : null,
    });
    if (error) {
      toast.error(error.message?.includes('duplicate') ? t3('Dit evenement is al opengesteld.', 'Cet événement est déjà ouvert.', 'Event already added.') : error.message);
    } else {
      toast.success(t3('Evenement opengesteld!', 'Accès à l\'événement ajouté!', 'Event access added!'));
      setShowAddEvent(false); setSelectedEventId(''); setMaxSpots('');
      handleSelectPartner(selectedPartner);
    }
    setAddingEvent(false);
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!clubId) return;
    const { error } = await supabase.from('external_partners').delete().eq('id', partnerId);
    if (error) toast.error(error.message);
    else { toast.success(t3('Partner verwijderd.', 'Partenaire supprimé.', 'Partner deleted.')); setSelectedPartner(null); await fetchPartners(clubId); }
  };

  const handleExportAttendees = async (accessId: string, eventTitle: string) => {
    setExporting(true);
    try {
      const { data: signups } = await supabase.from('partner_event_signups').select('status, partner_member_id').eq('partner_event_access_id', accessId);
      if (!signups?.length) { toast.info(t3('Geen inschrijvingen.', 'Aucune inscription.', 'No signups.')); setExporting(false); return; }
      const memberIds = signups.map(s => s.partner_member_id);
      const { data: memberData } = await supabase.from('partner_members').select('id, full_name, date_of_birth, email, phone').in('id', memberIds);
      const lines = ['Naam,Geboortedatum,E-mail,Telefoon,Partner,Status'];
      signups.forEach(s => {
        const m = memberData?.find(md => md.id === s.partner_member_id);
        if (m) lines.push(`"${m.full_name}","${m.date_of_birth || ''}","${m.email || ''}","${m.phone || ''}","${selectedPartner?.name || ''}","${s.status}"`);
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `aanwezigen-${eventTitle.replace(/\s/g, '_')}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(t3('Export gedownload!', 'Export téléchargé!', 'Export downloaded!'));
    } catch (err: any) { toast.error(err.message); }
    setExporting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <ClubPageLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-heading font-semibold text-foreground">
            {t3('Externe Partners', 'Partenaires Externes', 'External Partners')}
          </h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" />{t3('Nieuw', 'Nouveau', 'New')}
          </Button>
        </div>
        {selectedPartner ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPartner(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" />{t3('Terug', 'Retour', 'Back')}
              </Button>
              <h2 className="text-xl font-heading font-semibold flex-1">{selectedPartner.name}</h2>
              <Badge className={categoryColors[selectedPartner.category]}>
                {categoryLabels[language]?.[selectedPartner.category] || selectedPartner.category}
              </Badge>
              {selectedPartner.external_payroll && <Badge variant="outline" className="text-xs">{t3('Externe Payroll', 'Paie externe', 'External Payroll')}</Badge>}
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
                    <Mail className="w-4 h-4 mr-1" />{t3('Beheerder uitnodigen', 'Inviter un administrateur', 'Invite admin')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddEvent(true)}>
                    <Calendar className="w-4 h-4 mr-1" />{t3('Evenement openstellen', 'Ouvrir un événement', 'Add event')}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePartner(selectedPartner.id)}>
                    <Trash2 className="w-4 h-4 mr-1" />{t3('Verwijderen', 'Supprimer', 'Delete')}
                  </Button>
                </div>

                {/* Tabs */}
                <Tabs value={detailTab} onValueChange={(v) => {
                  if (v === 'overview') setSelectedTaskForDetail(null);
                  setDetailTab(v);
                  if (v === 'tracking' && trackingRecords.length === 0 && selectedTaskForDetail) fetchTracking(selectedPartner);
                }}>
                  <TabsList className={`w-full grid ${selectedTaskForDetail ? 'grid-cols-3' : 'grid-cols-1'}`}>
                    <TabsTrigger value="overview" className="gap-1"><Eye className="w-3.5 h-3.5" />{t3('Overzicht', 'Aperçu', 'Overview')}</TabsTrigger>
                    {selectedTaskForDetail && (
                      <TabsTrigger value="members" className="gap-1"><Users className="w-3.5 h-3.5" />{t3('Medewerkers', 'Membres', 'Members')}</TabsTrigger>
                    )}
                    {selectedTaskForDetail && (
                      <TabsTrigger value="tracking" className="gap-1"><ClipboardList className="w-3.5 h-3.5" />{t3('Opvolging', 'Suivi', 'Tracking')}</TabsTrigger>
                    )}
                  </TabsList>

                  {/* OVERVIEW TAB */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Assigned tasks */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Handshake className="w-4 h-4" />
                          {t3(`Toegewezen taken (${partnerTasks.length})`, `Tâches assignées (${partnerTasks.length})`, `Assigned tasks (${partnerTasks.length})`)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{t3('Klik op een taak om medewerkers en opvolging te bekijken.', 'Cliquez sur une tâche pour voir les membres et le suivi.', 'Click a task to view members and tracking.')}</p>
                      </CardHeader>
                      <CardContent>
                        {partnerTasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t3('Nog geen taken toegewezen.', 'Aucune tâche assignée.', 'No tasks assigned yet.')}</p>
                        ) : (
                          <div className="space-y-3">
                            {partnerTasks.map(task => (
                              <div
                                key={task.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedTaskForDetail?.id === task.id ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:border-primary/40'}`}
                                onClick={() => {
                                  setSelectedTaskForDetail(task);
                                  setDetailTab('members');
                                  // Fetch tracking for this specific task
                                  setTrackingRecords([]);
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{task.title}</p>
                                    {task.event_title && <p className="text-[11px] text-primary mt-0.5">{task.event_title}</p>}
                                    <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                                      {task.task_date && <span>{new Date(task.task_date).toLocaleDateString()}</span>}
                                      {task.location && <span>{task.location}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className="text-[10px]">
                                      <Users className="w-2.5 h-2.5 mr-0.5" />{task.signups.length}
                                    </Badge>
                                    <Badge
                                      variant={task.partner_acceptance_status === 'accepted' ? 'default' : task.partner_acceptance_status === 'rejected' ? 'destructive' : 'secondary'}
                                      className="text-xs shrink-0"
                                    >
                                      {task.partner_acceptance_status === 'accepted' ? '✅' : task.partner_acceptance_status === 'rejected' ? '❌' : '⏳'}
                                      {' '}{task.partner_acceptance_status === 'accepted' ? t3('Aanvaard', 'Accepté', 'Accepted') : task.partner_acceptance_status === 'rejected' ? t3('Geweigerd', 'Refusé', 'Rejected') : t3('Wachtend', 'En attente', 'Pending')}
                                    </Badge>
                                  </div>
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
                          <Calendar className="w-4 h-4" />{t3('Opengestelde evenementen', 'Événements ouverts', 'Event access')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {eventAccess.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t3('Nog geen evenementen opengesteld.', 'Aucun événement ouvert.', 'No events assigned yet.')}</p>
                        ) : (
                          <div className="space-y-2">
                            {eventAccess.map(ea => (
                              <div key={ea.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div>
                                  <p className="text-sm font-medium">{ea.event_title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {ea.event_date ? new Date(ea.event_date).toLocaleDateString() : ''}
                                    {ea.max_spots ? ` • Max ${ea.max_spots}` : ''}
                                    {` • ${ea.signup_count} ${t3('inschrijvingen', 'inscriptions', 'signups')}`}
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
                  </TabsContent>

                  {/* MEMBERS TAB - Only assigned members for selected task */}
                  {selectedTaskForDetail && (
                    <TabsContent value="members" className="space-y-3 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedTaskForDetail(null); setDetailTab('overview'); }}>
                          <ArrowLeft className="w-4 h-4 mr-1" />{t3('Terug', 'Retour', 'Back')}
                        </Button>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{selectedTaskForDetail.title}</p>
                          {selectedTaskForDetail.event_title && <p className="text-[11px] text-primary">{selectedTaskForDetail.event_title}</p>}
                        </div>
                      </div>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {t3(`Toegewezen medewerkers (${selectedTaskForDetail.signups.length})`, `Membres assignés (${selectedTaskForDetail.signups.length})`, `Assigned members (${selectedTaskForDetail.signups.length})`)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedTaskForDetail.signups.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t3('Nog geen medewerkers toegewezen aan deze taak.', 'Aucun membre assigné à cette tâche.', 'No members assigned to this task yet.')}</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedTaskForDetail.signups.map((s, idx) => {
                                const member = members.find(m => m.id === s.member_id);
                                return (
                                  <div key={idx} className="p-3 rounded-lg border border-border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                                        style={{ background: member?.user_id ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted))', color: member?.user_id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                                        {member?.user_id ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium">{s.volunteer_name}</p>
                                          {member?.user_id ? (
                                            <Badge variant="outline" className="text-[10px] gap-0.5 border-green-500/40 text-green-700 dark:text-green-400">
                                              <UserCheck className="w-2.5 h-2.5" />{t3('Account', 'Compte', 'Account')}
                                            </Badge>
                                          ) : member && !member.user_id ? (
                                            <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-500/40 text-amber-700 dark:text-amber-400">
                                              <UserX className="w-2.5 h-2.5" />{t3('Geen account', 'Pas de compte', 'No account')}
                                            </Badge>
                                          ) : null}
                                        </div>
                                        {member && (
                                          <p className="text-xs text-muted-foreground">
                                            {member.email || ''}{member.city ? ` • ${member.city}` : ''}{member.shirt_size ? ` • ${member.shirt_size}` : ''}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        {member && !member.user_id && member.email && (
                                          <Button
                                            variant="outline" size="sm" className="h-7 text-[11px] px-2"
                                            onClick={() => handleInviteMemberAsVolunteer(member)}
                                            disabled={invitingMemberId === member.id}
                                          >
                                            {invitingMemberId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-0.5" />}
                                            {t3('Uitnodigen', 'Inviter', 'Invite')}
                                          </Button>
                                        )}
                                        {member?.user_id && (
                                          <Button
                                            variant="outline" size="sm" className="h-7 text-[11px] px-2"
                                            onClick={() => { setSendingTicketFor(member.id); setTicketTaskId(selectedTaskForDetail.id); }}
                                          >
                                            <Ticket className="w-3 h-3 mr-0.5" />{nl ? 'Ticket' : 'Ticket'}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* TRACKING TAB - Scoped to selected task */}
                  {selectedTaskForDetail && (
                    <TabsContent value="tracking" className="space-y-4 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedTaskForDetail(null); setDetailTab('overview'); }}>
                          <ArrowLeft className="w-4 h-4 mr-1" />{t3('Terug', 'Retour', 'Back')}
                        </Button>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{selectedTaskForDetail.title}</p>
                          {selectedTaskForDetail.event_title && <p className="text-[11px] text-primary">{selectedTaskForDetail.event_title}</p>}
                        </div>
                      </div>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" />
                            {t3('Aanwezigheidsopvolging', 'Suivi des présences', 'Attendance tracking')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {loadingTracking ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                          ) : (() => {
                            const taskRecords = trackingRecords.filter(r => r.task_title === selectedTaskForDetail.title);
                            return taskRecords.length === 0 ? (
                              <p className="text-sm text-muted-foreground">{t3('Nog geen gegevens beschikbaar voor deze taak.', 'Pas encore de données pour cette tâche.', 'No data available for this task yet.')}</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border text-left">
                                      <th className="py-2 pr-3 font-medium text-muted-foreground">{t3('Medewerker', 'Membre', 'Member')}</th>
                                      <th className="py-2 pr-3 font-medium text-muted-foreground">Status</th>
                                      <th className="py-2 font-medium text-muted-foreground">{t3('Ingecheckt', 'Enregistré', 'Checked in')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {taskRecords.map((r, idx) => (
                                      <tr key={idx} className="border-b border-border/50">
                                        <td className="py-2 pr-3 font-medium">{r.member_name}</td>
                                        <td className="py-2 pr-3">
                                          {r.checked_in ? (
                                            <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-700 dark:text-green-400">
                                              <Check className="w-2.5 h-2.5 mr-0.5" />{t3('Aanwezig', 'Présent', 'Present')}
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                                              <Clock className="w-2.5 h-2.5 mr-0.5" />{t3('Niet ingecheckt', 'Non enregistré', 'Not checked in')}
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="py-2 text-muted-foreground">{r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              </>
            )}
          </div>
        ) : (
          /* Partner list */
          <>
            {partners.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">{t3('Nog geen externe partners.', 'Pas encore de partenaires externes.', 'No external partners yet.')}</p>
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
                        {p.external_payroll && <Badge variant="outline" className="text-xs">{t3('Externe Payroll', 'Paie externe', 'External Payroll')}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {p.contact_name || ''}{p.contact_name && p.contact_email ? ' • ' : ''}{p.contact_email || ''}
                        {` • ${p.member_count || 0} ${t3('medewerkers', 'membres', 'members')}`}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}
      </div>

      {/* Create Partner Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        setShowCreate(open);
        if (!open) { setLogoFile(null); setLogoPreview(null); setInviteEmails(['']); }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t3('Nieuwe partner aanmaken', 'Créer un nouveau partenaire', 'Create new partner')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t3('Logo (optioneel)', 'Logo (optionnel)', 'Logo (optional)')}</Label>
              <div className="mt-1 flex items-center gap-3">
                {logoPreview ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    <button onClick={() => { setLogoFile(null); setLogoPreview(null); }} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); } }} />
                  </label>
                )}
              </div>
            </div>
            <div><Label>{t3('Naam', 'Nom', 'Name')} *</Label><Input value={newPartner.name} onChange={e => setNewPartner(p => ({ ...p, name: e.target.value }))} placeholder="Stewards VZW Antwerp" /></div>
            <div>
              <Label>{t3('Categorie', 'Catégorie', 'Category')}</Label>
              <Select value={newPartner.category} onValueChange={v => setNewPartner(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stewards">Stewards</SelectItem>
                  <SelectItem value="horeca">Horeca</SelectItem>
                  <SelectItem value="supporters">Supporters</SelectItem>
                  <SelectItem value="andere">{t3('Andere...', 'Autre...', 'Other...')}</SelectItem>
                </SelectContent>
              </Select>
              {newPartner.category === 'andere' && <Input className="mt-2" value={newPartner.custom_category} onChange={e => setNewPartner(p => ({ ...p, custom_category: e.target.value }))} placeholder={t3('Specificeer categorie...', 'Spécifiez la catégorie...', 'Specify category...')} />}
            </div>
            <div><Label>{t3('Contactpersoon', 'Personne de contact', 'Contact name')}</Label><Input value={newPartner.contact_name} onChange={e => setNewPartner(p => ({ ...p, contact_name: e.target.value }))} /></div>
            <div><Label>E-mail</Label><Input type="email" value={newPartner.contact_email} onChange={e => setNewPartner(p => ({ ...p, contact_email: e.target.value }))} /></div>
            <div>
              <Label className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{t3('Verantwoordelijken uitnodigen', 'Inviter des administrateurs', 'Invite administrators')}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t3('Nodig verantwoordelijken uit die hun medewerkers kunnen beheren via het partner portaal.', 'Invitez des administrateurs qui peuvent gérer leur personnel via le portail partenaire.', 'Invite administrators who can manage their staff via the partner portal.')}</p>
              <div className="space-y-2">
                {inviteEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input type="email" value={email} onChange={e => { const updated = [...inviteEmails]; updated[idx] = e.target.value; setInviteEmails(updated); }} placeholder={`verantwoordelijke${idx + 1}@partner.be`} />
                    {inviteEmails.length > 1 && <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setInviteEmails(inviteEmails.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></Button>}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setInviteEmails([...inviteEmails, ''])}><Plus className="w-3.5 h-3.5 mr-1" />{t3('Nog iemand toevoegen', 'Ajouter une autre personne', 'Add another')}</Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={newPartner.external_payroll} onCheckedChange={c => setNewPartner(p => ({ ...p, external_payroll: !!c }))} id="payroll" />
              <Label htmlFor="payroll" className="cursor-pointer">{t3('Externe Payroll (medewerkers hebben al een contract)', 'Paie externe (les membres ont déjà un contrat)', 'External Payroll (members have existing contracts)')}</Label>
            </div>
            <Button onClick={handleCreatePartner} disabled={creating || !newPartner.name.trim()} className="w-full">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t3('Aanmaken & uitnodigen', 'Créer & inviter', 'Create & invite')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Admin Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t3('Partner beheerder uitnodigen', 'Inviter un administrateur partenaire', 'Invite partner admin')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>E-mail</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="beheerder@partner.be" /></div>
            <Button onClick={handleInviteAdmin} disabled={inviting || !inviteEmail.trim()} className="w-full">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              {t3('Uitnodiging versturen', 'Envoyer l\'invitation', 'Send invitation')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event Access Dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent>
          <DialogHeader><DialogTitle>{nl ? 'Evenement openstellen' : 'Add event access'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t3('Evenement', 'Événement', 'Event')}</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger><SelectValue placeholder={t3('Selecteer...', 'Sélectionner...', 'Select...')} /></SelectTrigger>
                <SelectContent>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}{e.event_date ? ` (${new Date(e.event_date).toLocaleDateString()})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t3('Max plaatsen (optioneel)', 'Places max (optionnel)', 'Max spots (optional)')}</Label><Input type="number" min={1} value={maxSpots} onChange={e => setMaxSpots(e.target.value)} /></div>
            <Button onClick={handleAddEventAccess} disabled={addingEvent || !selectedEventId} className="w-full">
              {addingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t3('Openstellen', 'Ouvrir', 'Add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Ticket Dialog */}
      <Dialog open={!!sendingTicketFor} onOpenChange={() => setSendingTicketFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t3('Ticket versturen', 'Envoyer un ticket', 'Send ticket')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {(() => {
              const member = members.find(m => m.id === sendingTicketFor);
              if (!member) return null;
              return (
                <>
                  <p className="text-sm">{nl ? 'Ticket aanmaken voor' : 'Create ticket for'} <strong>{member.full_name}</strong></p>
                  <div>
                    <Label>{nl ? 'Taak' : 'Task'}</Label>
                    <Select value={ticketTaskId} onValueChange={setTicketTaskId}>
                      <SelectTrigger><SelectValue placeholder={nl ? 'Selecteer taak...' : 'Select task...'} /></SelectTrigger>
                      <SelectContent>
                        {partnerTasks.filter(t => t.partner_acceptance_status === 'accepted').map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.title}{t.event_title ? ` (${t.event_title})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => handleSendTicket(member)} disabled={sendingTicket || !ticketTaskId} className="w-full">
                    {sendingTicket ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ticket className="w-4 h-4 mr-2" />}
                    {nl ? 'Ticket aanmaken' : 'Create ticket'}
                  </Button>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

    </ClubPageLayout>
  );
};

export default ExternalPartners;
