import { useEffect, useState, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, Calendar, Plus, LogOut, Loader2, Check, X, Trash2, UserPlus, MapPin, Handshake, FileSpreadsheet, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
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
  national_id: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  shirt_size: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
}

interface EventWithAccess {
  access_id: string;
  event_id: string;
  event_title: string;
  event_date: string | null;
  max_spots: number | null;
  signups: { id: string; partner_member_id: string; status: string; member_name?: string }[];
  partner_tasks: { id: string; title: string; description: string | null; task_date: string | null; location: string | null; spots_available: number; partner_acceptance_status: string; }[];
}

interface StandaloneTask {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  event_id: string | null;
  event_title?: string | null;
  partner_acceptance_status: string;
  assigned_members?: string[]; // member ids assigned to this task
}

const EMPTY_MEMBER = {
  full_name: '', email: '', phone: '', date_of_birth: '',
  national_id: '', address: '', city: '', postal_code: '',
  shirt_size: '', emergency_contact_name: '', emergency_contact_phone: '', notes: '',
};

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventWithAccess[]>([]);
  const [standaloneTasks, setStandaloneTasks] = useState<StandaloneTask[]>([]);
  const [userId, setUserId] = useState('');

  // Add member
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ ...EMPTY_MEMBER });
  const [addingMember, setAddingMember] = useState(false);

  // Edit member
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // CSV Import
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signup
  const [showSignup, setShowSignup] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [signingUp, setSigningUp] = useState(false);

  // Task assignment
  const [showAssignTask, setShowAssignTask] = useState<string | null>(null);
  const [assignMembers, setAssignMembers] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Ticket view
  const [viewTicket, setViewTicket] = useState<{ barcode: string; memberName: string } | null>(null);

  const nl = language === 'nl';

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/partner-login'); return; }
      setUserId(session.user.id);

      const { data: adminRecords } = await supabase.from('partner_admins').select('partner_id').eq('user_id', session.user.id);
      if (!adminRecords?.length) { navigate('/partner-login'); return; }

      const partnerId = adminRecords[0].partner_id;
      const { data: partnerData } = await supabase.from('external_partners').select('id, name, category, external_payroll, club_id').eq('id', partnerId).maybeSingle();
      if (!partnerData) { navigate('/partner-login'); return; }

      const { data: club } = await supabase.from('clubs').select('name').eq('id', partnerData.club_id).maybeSingle();
      setPartner({ ...partnerData, club_name: club?.name || '' });

      await fetchData(partnerId);
      setLoading(false);
    };
    init();
  }, []);

  const fetchData = async (partnerId: string) => {
    const [membersRes, accessRes, allTasksRes] = await Promise.all([
      supabase.from('partner_members').select('*').eq('partner_id', partnerId).order('created_at'),
      supabase.from('partner_event_access').select('id, event_id, max_spots').eq('partner_id', partnerId),
      supabase.from('tasks').select('id, title, description, task_date, location, spots_available, event_id, partner_acceptance_status').eq('partner_only', true).eq('assigned_partner_id', partnerId),
    ]);
    const mems = (membersRes.data || []) as Member[];
    setMembers(mems);

    const allPartnerTasks = allTasksRes.data || [];
    const accessData = accessRes.data || [];
    const eventAccessIds = new Set(accessData.map((a: any) => a.event_id));

    // Fetch all task assignments for this partner's tasks
    const taskIds = allPartnerTasks.map(t => t.id);
    let assignmentMap: Record<string, string[]> = {};
    if (taskIds.length > 0) {
      const { data: assignments } = await supabase.from('partner_task_assignments').select('task_id, partner_member_id').in('task_id', taskIds);
      (assignments || []).forEach((a: any) => {
        if (!assignmentMap[a.task_id]) assignmentMap[a.task_id] = [];
        assignmentMap[a.task_id].push(a.partner_member_id);
      });
    }

    const eventsEnriched: EventWithAccess[] = await Promise.all(accessData.map(async (a: any) => {
      const { data: evt } = await supabase.from('events').select('title, event_date').eq('id', a.event_id).maybeSingle();
      const { data: signups } = await supabase.from('partner_event_signups').select('id, partner_member_id, status').eq('partner_event_access_id', a.id);
      const enrichedSignups = (signups || []).map((s: any) => {
        const member = mems.find(m => m.id === s.partner_member_id);
        return { ...s, member_name: member?.full_name || '?' };
      });
      const partnerTasks = allPartnerTasks.filter(t => t.event_id === a.event_id);
      return { access_id: a.id, event_id: a.event_id, event_title: evt?.title || '?', event_date: evt?.event_date, max_spots: a.max_spots, signups: enrichedSignups, partner_tasks: partnerTasks };
    }));
    setEvents(eventsEnriched);

    const tasksWithoutAccess = allPartnerTasks.filter(t => !t.event_id || !eventAccessIds.has(t.event_id));
    const uniqueEventIds = [...new Set(tasksWithoutAccess.filter(t => t.event_id).map(t => t.event_id!))];
    let eventMap: Record<string, string> = {};
    if (uniqueEventIds.length > 0) {
      const { data: evts } = await supabase.from('events').select('id, title').in('id', uniqueEventIds);
      (evts || []).forEach((e: any) => { eventMap[e.id] = e.title; });
    }
    setStandaloneTasks(tasksWithoutAccess.map(t => ({
      ...t,
      event_title: t.event_id ? eventMap[t.event_id] || null : null,
      partner_acceptance_status: t.partner_acceptance_status || 'pending',
      assigned_members: assignmentMap[t.id] || [],
    })));
  };

  const handleAcceptTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({ partner_acceptance_status: 'accepted' }).eq('id', taskId);
    if (error) { toast.error(error.message); return; }
    toast.success(nl ? 'Taak aanvaard!' : 'Task accepted!');
    if (partner) await fetchData(partner.id);
  };

  const handleRejectTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({ partner_acceptance_status: 'rejected' }).eq('id', taskId);
    if (error) { toast.error(error.message); return; }
    toast.success(nl ? 'Taak geweigerd.' : 'Task rejected.');
    if (partner) await fetchData(partner.id);
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
      national_id: newMember.national_id || null,
      address: newMember.address || null,
      city: newMember.city || null,
      postal_code: newMember.postal_code || null,
      shirt_size: newMember.shirt_size || null,
      emergency_contact_name: newMember.emergency_contact_name || null,
      emergency_contact_phone: newMember.emergency_contact_phone || null,
      notes: newMember.notes || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(nl ? 'Medewerker toegevoegd!' : 'Member added!');
      setShowAddMember(false);
      setNewMember({ ...EMPTY_MEMBER });
      await fetchData(partner.id);
    }
    setAddingMember(false);
  };

  const handleUpdateMember = async () => {
    if (!partner || !editMember) return;
    const { error } = await supabase.from('partner_members').update({
      full_name: editMember.full_name,
      email: editMember.email,
      phone: editMember.phone,
      date_of_birth: editMember.date_of_birth,
      national_id: editMember.national_id,
      address: editMember.address,
      city: editMember.city,
      postal_code: editMember.postal_code,
      shirt_size: editMember.shirt_size,
      emergency_contact_name: editMember.emergency_contact_name,
      emergency_contact_phone: editMember.emergency_contact_phone,
      notes: editMember.notes,
    }).eq('id', editMember.id);
    if (error) toast.error(error.message);
    else {
      toast.success(nl ? 'Medewerker bijgewerkt!' : 'Member updated!');
      setEditMember(null);
      await fetchData(partner.id);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!partner) return;
    await supabase.from('partner_members').delete().eq('id', memberId);
    toast.success(nl ? 'Medewerker verwijderd.' : 'Member removed.');
    await fetchData(partner.id);
  };

  // CSV/Excel Import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error(nl ? 'Bestand is leeg of heeft geen gegevens.' : 'File is empty.'); return; }

      // Detect separator
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

      const rows = lines.slice(1).map(line => {
        const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter(row => {
        // Must have at least a name
        const name = row['naam'] || row['name'] || row['volledige naam'] || row['full_name'] || row['full name'] || '';
        return name.trim().length > 0;
      });

      setCsvData(rows);
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const mapCsvField = (row: Record<string, string>, ...keys: string[]): string => {
    for (const k of keys) {
      if (row[k]?.trim()) return row[k].trim();
    }
    return '';
  };

  const handleImportMembers = async () => {
    if (!partner || !csvData.length) return;
    setImporting(true);
    const inserts = csvData.map(row => ({
      partner_id: partner.id,
      full_name: mapCsvField(row, 'naam', 'name', 'volledige naam', 'full_name', 'full name'),
      email: mapCsvField(row, 'email', 'e-mail', 'mail') || null,
      phone: mapCsvField(row, 'telefoon', 'phone', 'gsm', 'tel') || null,
      date_of_birth: mapCsvField(row, 'geboortedatum', 'date_of_birth', 'dob', 'birth') || null,
      national_id: mapCsvField(row, 'rijksregisternummer', 'national_id', 'rrn', 'nationaal nummer') || null,
      address: mapCsvField(row, 'adres', 'address', 'straat') || null,
      city: mapCsvField(row, 'stad', 'city', 'gemeente', 'woonplaats') || null,
      postal_code: mapCsvField(row, 'postcode', 'postal_code', 'zip') || null,
      shirt_size: mapCsvField(row, 'maat', 'shirt_size', 'kledingmaat', 'size', 't-shirt') || null,
      emergency_contact_name: mapCsvField(row, 'noodcontact', 'emergency_contact_name', 'noodcontact naam') || null,
      emergency_contact_phone: mapCsvField(row, 'noodcontact telefoon', 'emergency_contact_phone', 'noodcontact tel') || null,
      notes: mapCsvField(row, 'opmerkingen', 'notes', 'nota') || null,
    }));

    const { error } = await supabase.from('partner_members').insert(inserts);
    if (error) toast.error(error.message);
    else {
      toast.success(nl ? `${inserts.length} medewerkers geïmporteerd!` : `${inserts.length} members imported!`);
      setShowImport(false);
      setCsvData([]);
      await fetchData(partner.id);
    }
    setImporting(false);
  };

  // Task member assignment
  const handleAssignMembers = async (taskId: string) => {
    if (!partner || !assignMembers.length) return;
    setAssigning(true);
    const inserts = assignMembers.map(mid => ({
      task_id: taskId,
      partner_member_id: mid,
      assigned_by: userId,
    }));
    const { error } = await supabase.from('partner_task_assignments').insert(inserts);
    if (error) toast.error(error.message);
    else {
      toast.success(nl ? 'Medewerkers toegewezen!' : 'Members assigned!');
      setShowAssignTask(null);
      setAssignMembers([]);
      await fetchData(partner.id);
    }
    setAssigning(false);
  };

  const handleUnassignMember = async (taskId: string, memberId: string) => {
    await supabase.from('partner_task_assignments').delete().eq('task_id', taskId).eq('partner_member_id', memberId);
    toast.success(nl ? 'Toewijzing verwijderd.' : 'Unassigned.');
    if (partner) await fetchData(partner.id);
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
      toast.success(nl ? 'Medewerkers ingeschreven!' : 'Members signed up!');
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

    const { data: signup } = await supabase.from('partner_event_signups').select('partner_member_id, partner_event_access_id').eq('id', signupId).maybeSingle();
    if (signup) {
      const { data: access } = await supabase.from('partner_event_access').select('event_id').eq('id', signup.partner_event_access_id).maybeSingle();
      const { data: member } = await supabase.from('partner_members').select('user_id').eq('id', signup.partner_member_id).maybeSingle();
      const barcode = `PT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      await supabase.from('volunteer_tickets').insert({
        club_id: partner.club_id,
        event_id: access?.event_id || null,
        volunteer_id: member?.user_id || userId,
        barcode,
        status: 'sent',
      });
    }

    toast.success(nl ? 'Goedgekeurd & ticket aangemaakt!' : 'Approved & ticket created!');
    await fetchData(partner.id);
  };

  const handleReject = async (signupId: string) => {
    await supabase.from('partner_event_signups').update({ status: 'rejected' }).eq('id', signupId);
    toast.success(nl ? 'Afgewezen.' : 'Rejected.');
    if (partner) await fetchData(partner.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!partner) return null;

  const MemberForm = ({ data, onChange, onSubmit, submitLabel, submitting }: {
    data: typeof EMPTY_MEMBER;
    onChange: (d: typeof EMPTY_MEMBER) => void;
    onSubmit: () => void;
    submitLabel: string;
    submitting: boolean;
  }) => (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>{nl ? 'Volledige naam' : 'Full name'} *</Label>
          <Input value={data.full_name} onChange={e => onChange({ ...data, full_name: e.target.value })} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input type="email" value={data.email} onChange={e => onChange({ ...data, email: e.target.value })} />
        </div>
        <div>
          <Label>{nl ? 'Telefoon' : 'Phone'}</Label>
          <Input value={data.phone} onChange={e => onChange({ ...data, phone: e.target.value })} />
        </div>
        <div>
          <Label>{nl ? 'Geboortedatum' : 'Date of birth'}</Label>
          <Input type="date" value={data.date_of_birth} onChange={e => onChange({ ...data, date_of_birth: e.target.value })} />
        </div>
        <div>
          <Label>{nl ? 'Rijksregisternr.' : 'National ID'}</Label>
          <Input value={data.national_id} onChange={e => onChange({ ...data, national_id: e.target.value })} placeholder="XX.XX.XX-XXX.XX" />
        </div>
        <div className="col-span-2">
          <Label>{nl ? 'Adres' : 'Address'}</Label>
          <Input value={data.address} onChange={e => onChange({ ...data, address: e.target.value })} />
        </div>
        <div>
          <Label>{nl ? 'Postcode' : 'Postal code'}</Label>
          <Input value={data.postal_code} onChange={e => onChange({ ...data, postal_code: e.target.value })} />
        </div>
        <div>
          <Label>{nl ? 'Stad/Gemeente' : 'City'}</Label>
          <Input value={data.city} onChange={e => onChange({ ...data, city: e.target.value })} />
        </div>
        <div>
          <Label>{nl ? 'Kledingmaat' : 'Shirt size'}</Label>
          <Select value={data.shirt_size} onValueChange={v => onChange({ ...data, shirt_size: v })}>
            <SelectTrigger><SelectValue placeholder={nl ? 'Kies maat' : 'Select size'} /></SelectTrigger>
            <SelectContent>
              {SHIRT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{nl ? 'Noodcontact naam' : 'Emergency contact'}</Label>
          <Input value={data.emergency_contact_name} onChange={e => onChange({ ...data, emergency_contact_name: e.target.value })} />
        </div>
        <div>
          <Label>{nl ? 'Noodcontact tel.' : 'Emergency phone'}</Label>
          <Input value={data.emergency_contact_phone} onChange={e => onChange({ ...data, emergency_contact_phone: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>{nl ? 'Opmerkingen' : 'Notes'}</Label>
          <Textarea value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} rows={2} />
        </div>
      </div>
      <Button onClick={onSubmit} disabled={submitting || !data.full_name.trim()} className="w-full">
        {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {submitLabel}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-8">
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
              {nl ? 'Medewerkers' : 'Members'} ({members.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1">
              <Calendar className="w-4 h-4" />
              {nl ? 'Taken & Events' : 'Tasks & Events'}
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-3 mt-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowAddMember(true)}>
                <UserPlus className="w-4 h-4 mr-1" />
                {nl ? 'Toevoegen' : 'Add'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                {nl ? 'Importeer Excel/CSV' : 'Import Excel/CSV'}
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.xls,.xlsx" className="hidden" onChange={handleFileSelect} />
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {nl ? 'Voeg je eerste medewerker toe of importeer vanuit een Excel-bestand.' : 'Add your first member or import from an Excel file.'}
              </p>
            ) : (
              members.map(m => (
                <Card key={m.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                        {m.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)}>
                        <p className="text-sm font-medium truncate">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.email || ''}{m.phone ? ` • ${m.phone}` : ''}
                          {m.shirt_size ? ` • ${m.shirt_size}` : ''}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)}>
                        {expandedMember === m.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditMember(m)}>
                        <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteMember(m.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>

                    {expandedMember === m.id && (
                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                        {m.date_of_birth && <div><span className="text-muted-foreground">{nl ? 'Geboortedatum:' : 'DOB:'}</span> {m.date_of_birth}</div>}
                        {m.national_id && <div><span className="text-muted-foreground">{nl ? 'Rijksregister:' : 'National ID:'}</span> {m.national_id}</div>}
                        {m.address && <div className="col-span-2"><span className="text-muted-foreground">{nl ? 'Adres:' : 'Address:'}</span> {m.address}{m.postal_code ? `, ${m.postal_code}` : ''}{m.city ? ` ${m.city}` : ''}</div>}
                        {m.emergency_contact_name && <div className="col-span-2"><span className="text-muted-foreground">{nl ? 'Noodcontact:' : 'Emergency:'}</span> {m.emergency_contact_name}{m.emergency_contact_phone ? ` (${m.emergency_contact_phone})` : ''}</div>}
                        {m.notes && <div className="col-span-2"><span className="text-muted-foreground">{nl ? 'Nota:' : 'Notes:'}</span> {m.notes}</div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Events & Tasks Tab */}
          <TabsContent value="events" className="space-y-4 mt-4">
            {/* Standalone partner tasks */}
            {standaloneTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Handshake className="w-4 h-4 text-primary" />
                  {nl ? 'Toegewezen taken' : 'Assigned tasks'}
                </h3>
                <div className="space-y-2">
                  {standaloneTasks.map(task => (
                    <Card key={task.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.event_title && <p className="text-[11px] text-primary mt-0.5">{task.event_title}</p>}
                            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                            <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] text-muted-foreground">
                              {task.task_date && <span>{new Date(task.task_date).toLocaleDateString()}</span>}
                              {task.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{task.location}</span>}
                              <span>{task.spots_available} {nl ? 'plaatsen' : 'spots'}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {task.partner_acceptance_status === 'pending' ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAcceptTask(task.id)}>
                                  <Check className="w-3 h-3 mr-1" />{nl ? 'Aanvaarden' : 'Accept'}
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRejectTask(task.id)}>
                                  <X className="w-3 h-3 mr-1" />{nl ? 'Weigeren' : 'Reject'}
                                </Button>
                              </div>
                            ) : (
                              <Badge variant={task.partner_acceptance_status === 'accepted' ? 'default' : 'destructive'} className="text-xs">
                                {task.partner_acceptance_status === 'accepted' ? (nl ? '✅ Aanvaard' : '✅ Accepted') : (nl ? '❌ Geweigerd' : '❌ Rejected')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Assignment section for accepted tasks */}
                        {task.partner_acceptance_status === 'accepted' && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5" />
                                {nl ? 'Toegewezen medewerkers' : 'Assigned members'} ({task.assigned_members?.length || 0}/{task.spots_available})
                              </p>
                              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => {
                                setShowAssignTask(task.id);
                                setAssignMembers([]);
                              }}>
                                <Plus className="w-3 h-3 mr-0.5" />{nl ? 'Toewijzen' : 'Assign'}
                              </Button>
                            </div>
                            {(task.assigned_members || []).length > 0 && (
                              <div className="space-y-1">
                                {task.assigned_members!.map(mid => {
                                  const mem = members.find(m => m.id === mid);
                                  return (
                                    <div key={mid} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-xs">
                                      <span>{mem?.full_name || '?'}</span>
                                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleUnassignMember(task.id, mid)}>
                                        <X className="w-3 h-3 text-muted-foreground" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Events with access */}
            {events.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  {nl ? 'Opengestelde evenementen' : 'Available events'}
                </h3>
                {events.map(evt => (
                  <Card key={evt.access_id} className="mb-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{evt.event_title}</span>
                        <Button size="sm" variant="outline" onClick={() => { setShowSignup(evt.access_id); setSelectedMembers([]); }}>
                          <Plus className="w-3 h-3 mr-1" />{nl ? 'Inschrijven' : 'Sign up'}
                        </Button>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {evt.event_date ? new Date(evt.event_date).toLocaleDateString() : ''}
                        {evt.max_spots ? ` • Max ${evt.max_spots} plaatsen` : ''}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {evt.partner_tasks.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Handshake className="w-3.5 h-3.5" />
                            {nl ? 'Toegewezen taken' : 'Assigned tasks'}
                          </p>
                          <div className="space-y-2">
                            {evt.partner_tasks.map(task => (
                              <div key={task.id} className="p-3 rounded-lg border border-border bg-muted/30">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{task.title}</p>
                                    {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                                    <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] text-muted-foreground">
                                      {task.task_date && <span>{new Date(task.task_date).toLocaleDateString()}</span>}
                                      {task.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{task.location}</span>}
                                      <span>{task.spots_available} {nl ? 'plaatsen' : 'spots'}</span>
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    {task.partner_acceptance_status === 'pending' ? (
                                      <div className="flex gap-1">
                                        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAcceptTask(task.id)}>
                                          <Check className="w-3 h-3 mr-1" />{nl ? 'Aanvaarden' : 'Accept'}
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRejectTask(task.id)}>
                                          <X className="w-3 h-3 mr-1" />{nl ? 'Weigeren' : 'Reject'}
                                        </Button>
                                      </div>
                                    ) : (
                                      <Badge variant={task.partner_acceptance_status === 'accepted' ? 'default' : 'destructive'} className="text-xs">
                                        {task.partner_acceptance_status === 'accepted' ? (nl ? '✅ Aanvaard' : '✅ Accepted') : (nl ? '❌ Geweigerd' : '❌ Rejected')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {evt.signups.length === 0 && evt.partner_tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{nl ? 'Nog niemand ingeschreven.' : 'No signups yet.'}</p>
                      ) : evt.signups.length > 0 ? (
                        <div className="space-y-2">
                          {evt.signups.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{s.member_name}</span>
                                <Badge variant={s.status === 'approved' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                                  {s.status === 'approved' ? '✅' : s.status === 'rejected' ? '❌' : '⏳'} {s.status === 'approved' ? (nl ? 'Goedgekeurd' : 'Approved') : s.status === 'rejected' ? (nl ? 'Afgewezen' : 'Rejected') : (nl ? 'In afwachting' : 'Pending')}
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
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {events.length === 0 && standaloneTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {nl ? 'Er zijn nog geen taken of evenementen voor je opengesteld.' : 'No tasks or events available yet.'}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{nl ? 'Medewerker toevoegen' : 'Add member'}</DialogTitle>
          </DialogHeader>
          <MemberForm
            data={newMember}
            onChange={setNewMember}
            onSubmit={handleAddMember}
            submitLabel={nl ? 'Toevoegen' : 'Add'}
            submitting={addingMember}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{nl ? 'Medewerker bewerken' : 'Edit member'}</DialogTitle>
          </DialogHeader>
          {editMember && (
            <MemberForm
              data={{
                full_name: editMember.full_name || '',
                email: editMember.email || '',
                phone: editMember.phone || '',
                date_of_birth: editMember.date_of_birth || '',
                national_id: editMember.national_id || '',
                address: editMember.address || '',
                city: editMember.city || '',
                postal_code: editMember.postal_code || '',
                shirt_size: editMember.shirt_size || '',
                emergency_contact_name: editMember.emergency_contact_name || '',
                emergency_contact_phone: editMember.emergency_contact_phone || '',
                notes: editMember.notes || '',
              }}
              onChange={(d) => setEditMember({ ...editMember!, ...d })}
              onSubmit={handleUpdateMember}
              submitLabel={nl ? 'Opslaan' : 'Save'}
              submitting={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{nl ? 'CSV/Excel import preview' : 'CSV/Excel import preview'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {nl
                ? `${csvData.length} medewerkers gevonden. Ondersteunde kolommen: naam, email, telefoon, geboortedatum, rijksregisternummer, adres, postcode, stad, maat, noodcontact, opmerkingen.`
                : `${csvData.length} members found. Supported columns: name, email, phone, date_of_birth, national_id, address, postal_code, city, shirt_size, emergency contact, notes.`}
            </p>
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">{nl ? 'Naam' : 'Name'}</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">{nl ? 'Tel.' : 'Phone'}</th>
                    <th className="p-2 text-left">{nl ? 'Stad' : 'City'}</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2">{mapCsvField(row, 'naam', 'name', 'volledige naam', 'full_name', 'full name')}</td>
                      <td className="p-2">{mapCsvField(row, 'email', 'e-mail', 'mail')}</td>
                      <td className="p-2">{mapCsvField(row, 'telefoon', 'phone', 'gsm', 'tel')}</td>
                      <td className="p-2">{mapCsvField(row, 'stad', 'city', 'gemeente')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleImportMembers} disabled={importing} className="w-full">
              {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {nl ? `${csvData.length} medewerkers importeren` : `Import ${csvData.length} members`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signup Members Dialog */}
      <Dialog open={!!showSignup} onOpenChange={() => setShowSignup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{nl ? 'Medewerkers inschrijven' : 'Sign up members'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {members.filter(m => {
              const evt = events.find(e => e.access_id === showSignup);
              return !evt?.signups.some(s => s.partner_member_id === m.id);
            }).map(m => (
              <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={e => {
                  if (e.target.checked) setSelectedMembers(p => [...p, m.id]);
                  else setSelectedMembers(p => p.filter(id => id !== m.id));
                }} className="w-4 h-4 rounded border-input accent-primary" />
                <span className="text-sm">{m.full_name}</span>
              </label>
            ))}
            {members.filter(m => { const evt = events.find(e => e.access_id === showSignup); return !evt?.signups.some(s => s.partner_member_id === m.id); }).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{nl ? 'Alle medewerkers zijn al ingeschreven.' : 'All members already signed up.'}</p>
            )}
            <Button onClick={() => showSignup && handleSignupMembers(showSignup)} disabled={signingUp || !selectedMembers.length} className="w-full">
              {signingUp && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {nl ? `${selectedMembers.length} inschrijven` : `Sign up ${selectedMembers.length}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Members to Task Dialog */}
      <Dialog open={!!showAssignTask} onOpenChange={() => setShowAssignTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{nl ? 'Medewerkers toewijzen aan taak' : 'Assign members to task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const task = standaloneTasks.find(t => t.id === showAssignTask);
              const alreadyAssigned = task?.assigned_members || [];
              const available = members.filter(m => !alreadyAssigned.includes(m.id));
              return available.length > 0 ? available.map(m => (
                <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" checked={assignMembers.includes(m.id)} onChange={e => {
                    if (e.target.checked) setAssignMembers(p => [...p, m.id]);
                    else setAssignMembers(p => p.filter(id => id !== m.id));
                  }} className="w-4 h-4 rounded border-input accent-primary" />
                  <div>
                    <span className="text-sm">{m.full_name}</span>
                    {m.shirt_size && <span className="text-xs text-muted-foreground ml-2">({m.shirt_size})</span>}
                  </div>
                </label>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">{nl ? 'Alle medewerkers zijn al toegewezen.' : 'All members already assigned.'}</p>
              );
            })()}
            <Button onClick={() => showAssignTask && handleAssignMembers(showAssignTask)} disabled={assigning || !assignMembers.length} className="w-full">
              {assigning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {nl ? `${assignMembers.length} toewijzen` : `Assign ${assignMembers.length}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerDashboard;
