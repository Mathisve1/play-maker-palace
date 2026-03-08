import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, Calendar, Plus, LogOut, Loader2, Check, X, Trash2, UserPlus, MapPin, Handshake, FileSpreadsheet, ChevronDown, ChevronUp, UserCheck, Building2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PartnerSidebar from '@/components/PartnerSidebar';
import PartnerDashboardHome from '@/components/partner/PartnerDashboardHome';
import PartnerAttendanceTab from '@/components/partner/PartnerAttendanceTab';
import PartnerSidebar from '@/components/PartnerSidebar';
import EditProfileDialog from '@/components/EditProfileDialog';
import { Language } from '@/i18n/translations';

interface ClubInfo { id: string; name: string; logo_url: string | null; }
interface PartnerInfo { id: string; name: string; category: string; external_payroll: boolean; club_id: string; }
interface Member {
  id: string; full_name: string; email: string | null; phone: string | null;
  date_of_birth: string | null; national_id: string | null; address: string | null;
  city: string | null; postal_code: string | null; shirt_size: string | null;
  emergency_contact_name: string | null; emergency_contact_phone: string | null; notes: string | null;
}
interface ClubTask {
  id: string; title: string; description: string | null; task_date: string | null;
  location: string | null; spots_available: number; event_id: string | null;
  event_title?: string | null; partner_acceptance_status: string; assigned_members: string[];
}

const EMPTY_MEMBER = {
  full_name: '', email: '', phone: '', date_of_birth: '', national_id: '',
  address: '', city: '', postal_code: '', shirt_size: '',
  emergency_contact_name: '', emergency_contact_phone: '', notes: '',
};
const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [clubs, setClubs] = useState<ClubInfo[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [clubTasks, setClubTasks] = useState<ClubTask[]>([]);
  const [userId, setUserId] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ ...EMPTY_MEMBER });
  const [addingMember, setAddingMember] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAssignTask, setShowAssignTask] = useState<string | null>(null);
  const [assignMembers, setAssignMembers] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const nl = language === 'nl';
  const [activeTab, setActiveTab] = useState('tasks');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; email: string; avatar_url?: string | null } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/partner-login'); return; }
      setUserId(session.user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      setProfile(profileData || {
        full_name: (session.user.user_metadata?.full_name as string) || '',
        email: session.user.email || '',
        avatar_url: null,
      });

      const { data: adminRecords } = await supabase.from('partner_admins').select('partner_id').eq('user_id', session.user.id);
      if (!adminRecords?.length) { navigate('/partner-login'); return; }
      const partnerId = adminRecords[0].partner_id;
      const { data: partnerData } = await supabase.from('external_partners').select('id, name, category, external_payroll, club_id').eq('id', partnerId).maybeSingle();
      if (!partnerData) { navigate('/partner-login'); return; }
      setPartner(partnerData);
      // Fetch all clubs linked via partner_clubs junction
      const { data: partnerClubs } = await supabase.from('partner_clubs').select('club_id').eq('partner_id', partnerId);
      const clubIds = (partnerClubs || []).map((pc: any) => pc.club_id);
      if (clubIds.length > 0) {
        const { data: clubsData } = await supabase.from('clubs').select('id, name, logo_url').in('id', clubIds);
        setClubs(clubsData || []);
        setSelectedClubId(clubIds[0]);
      }
      const { data: membersData } = await supabase.from('partner_members').select('*').eq('partner_id', partnerId).order('created_at');
      setMembers((membersData || []) as Member[]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (partner && selectedClubId) fetchClubTasks(partner.id, selectedClubId);
  }, [selectedClubId, partner]);

  const fetchClubTasks = async (partnerId: string, clubId: string) => {
    const { data: tasks } = await supabase.from('tasks')
      .select('id, title, description, task_date, location, spots_available, event_id, partner_acceptance_status')
      .eq('partner_only', true).eq('assigned_partner_id', partnerId).eq('club_id', clubId);
    const allTasks = tasks || [];
    const taskIds = allTasks.map(t => t.id);
    let assignmentMap: Record<string, string[]> = {};
    if (taskIds.length > 0) {
      const { data: asgn } = await supabase.from('partner_task_assignments').select('task_id, partner_member_id').in('task_id', taskIds);
      (asgn || []).forEach((a: any) => {
        if (!assignmentMap[a.task_id]) assignmentMap[a.task_id] = [];
        assignmentMap[a.task_id].push(a.partner_member_id);
      });
    }
    const eventIds = [...new Set(allTasks.filter(t => t.event_id).map(t => t.event_id!))];
    let eventMap: Record<string, string> = {};
    if (eventIds.length > 0) {
      const { data: evts } = await supabase.from('events').select('id, title').in('id', eventIds);
      (evts || []).forEach((e: any) => { eventMap[e.id] = e.title; });
    }
    setClubTasks(allTasks.map(t => ({
      ...t, event_title: t.event_id ? eventMap[t.event_id] || null : null,
      partner_acceptance_status: t.partner_acceptance_status || 'pending',
      assigned_members: assignmentMap[t.id] || [],
    })));
  };

  const refreshAll = async () => {
    if (!partner) return;
    const { data: md } = await supabase.from('partner_members').select('*').eq('partner_id', partner.id).order('created_at');
    setMembers((md || []) as Member[]);
    if (selectedClubId) await fetchClubTasks(partner.id, selectedClubId);
  };

  const handleAcceptTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({ partner_acceptance_status: 'accepted' }).eq('id', taskId);
    if (error) { toast.error(error.message); return; }
    toast.success(nl ? 'Taak aanvaard!' : 'Task accepted!');
    await refreshAll();
  };
  const handleRejectTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({ partner_acceptance_status: 'rejected' }).eq('id', taskId);
    if (error) { toast.error(error.message); return; }
    toast.success(nl ? 'Taak geweigerd.' : 'Task rejected.');
    await refreshAll();
  };

  const handleAddMember = async () => {
    if (!partner || !newMember.full_name.trim()) return;
    setAddingMember(true);
    const { error } = await supabase.from('partner_members').insert({
      partner_id: partner.id, full_name: newMember.full_name.trim(),
      email: newMember.email || null, phone: newMember.phone || null,
      date_of_birth: newMember.date_of_birth || null, national_id: newMember.national_id || null,
      address: newMember.address || null, city: newMember.city || null,
      postal_code: newMember.postal_code || null, shirt_size: newMember.shirt_size || null,
      emergency_contact_name: newMember.emergency_contact_name || null,
      emergency_contact_phone: newMember.emergency_contact_phone || null,
      notes: newMember.notes || null,
    });
    if (error) toast.error(error.message);
    else { toast.success(nl ? 'Toegevoegd!' : 'Added!'); setShowAddMember(false); setNewMember({ ...EMPTY_MEMBER }); await refreshAll(); }
    setAddingMember(false);
  };

  const handleUpdateMember = async () => {
    if (!partner || !editMember) return;
    const { error } = await supabase.from('partner_members').update({
      full_name: editMember.full_name, email: editMember.email, phone: editMember.phone,
      date_of_birth: editMember.date_of_birth, national_id: editMember.national_id,
      address: editMember.address, city: editMember.city, postal_code: editMember.postal_code,
      shirt_size: editMember.shirt_size, emergency_contact_name: editMember.emergency_contact_name,
      emergency_contact_phone: editMember.emergency_contact_phone, notes: editMember.notes,
    }).eq('id', editMember.id);
    if (error) toast.error(error.message);
    else { toast.success(nl ? 'Bijgewerkt!' : 'Updated!'); setEditMember(null); await refreshAll(); }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!partner) return;
    await supabase.from('partner_members').delete().eq('id', memberId);
    toast.success(nl ? 'Verwijderd.' : 'Removed.');
    await refreshAll();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error(nl ? 'Leeg bestand.' : 'Empty file.'); return; }
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter(row => (row['naam'] || row['name'] || row['volledige naam'] || row['full_name'] || row['full name'] || '').trim().length > 0);
      setCsvData(rows);
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const mapCsvField = (row: Record<string, string>, ...keys: string[]): string => {
    for (const k of keys) { if (row[k]?.trim()) return row[k].trim(); }
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
      date_of_birth: mapCsvField(row, 'geboortedatum', 'date_of_birth', 'dob') || null,
      national_id: mapCsvField(row, 'rijksregisternummer', 'national_id', 'rrn') || null,
      address: mapCsvField(row, 'adres', 'address', 'straat') || null,
      city: mapCsvField(row, 'stad', 'city', 'gemeente') || null,
      postal_code: mapCsvField(row, 'postcode', 'postal_code', 'zip') || null,
      shirt_size: mapCsvField(row, 'maat', 'shirt_size', 'size') || null,
      emergency_contact_name: mapCsvField(row, 'noodcontact', 'emergency_contact_name') || null,
      emergency_contact_phone: mapCsvField(row, 'noodcontact telefoon', 'emergency_contact_phone') || null,
      notes: mapCsvField(row, 'opmerkingen', 'notes') || null,
    }));
    const { error } = await supabase.from('partner_members').insert(inserts);
    if (error) toast.error(error.message);
    else { toast.success(`${inserts.length} ${nl ? 'geïmporteerd!' : 'imported!'}`); setShowImport(false); setCsvData([]); await refreshAll(); }
    setImporting(false);
  };

  const handleAssignMembers = async (taskId: string) => {
    if (!partner || !assignMembers.length) return;
    setAssigning(true);
    const { error } = await supabase.from('partner_task_assignments').insert(
      assignMembers.map(mid => ({ task_id: taskId, partner_member_id: mid, assigned_by: userId }))
    );
    if (error) toast.error(error.message);
    else { toast.success(nl ? 'Toegewezen!' : 'Assigned!'); setShowAssignTask(null); setAssignMembers([]); await refreshAll(); }
    setAssigning(false);
  };

  const handleUnassignMember = async (taskId: string, memberId: string) => {
    await supabase.from('partner_task_assignments').delete().eq('task_id', taskId).eq('partner_member_id', memberId);
    toast.success(nl ? 'Verwijderd.' : 'Removed.');
    await refreshAll();
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!partner) return null;

  const selectedClub = clubs.find(c => c.id === selectedClubId);
  const pendingTasks = clubTasks.filter(t => t.partner_acceptance_status === 'pending');
  const acceptedTasks = clubTasks.filter(t => t.partner_acceptance_status === 'accepted');
  const rejectedTasks = clubTasks.filter(t => t.partner_acceptance_status === 'rejected');

  const MemberForm = ({ data, onChange, onSubmit, submitLabel, submitting }: {
    data: typeof EMPTY_MEMBER; onChange: (d: typeof EMPTY_MEMBER) => void;
    onSubmit: () => void; submitLabel: string; submitting: boolean;
  }) => (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>{nl ? 'Volledige naam' : 'Full name'} *</Label><Input value={data.full_name} onChange={e => onChange({ ...data, full_name: e.target.value })} /></div>
        <div><Label>E-mail</Label><Input type="email" value={data.email} onChange={e => onChange({ ...data, email: e.target.value })} /></div>
        <div><Label>{nl ? 'Telefoon' : 'Phone'}</Label><Input value={data.phone} onChange={e => onChange({ ...data, phone: e.target.value })} /></div>
        <div><Label>{nl ? 'Geboortedatum' : 'DOB'}</Label><Input type="date" value={data.date_of_birth} onChange={e => onChange({ ...data, date_of_birth: e.target.value })} /></div>
        <div><Label>{nl ? 'Rijksregisternr.' : 'National ID'}</Label><Input value={data.national_id} onChange={e => onChange({ ...data, national_id: e.target.value })} placeholder="XX.XX.XX-XXX.XX" /></div>
        <div className="col-span-2"><Label>{nl ? 'Adres' : 'Address'}</Label><Input value={data.address} onChange={e => onChange({ ...data, address: e.target.value })} /></div>
        <div><Label>{nl ? 'Postcode' : 'Zip'}</Label><Input value={data.postal_code} onChange={e => onChange({ ...data, postal_code: e.target.value })} /></div>
        <div><Label>{nl ? 'Stad' : 'City'}</Label><Input value={data.city} onChange={e => onChange({ ...data, city: e.target.value })} /></div>
        <div>
          <Label>{nl ? 'Kledingmaat' : 'Size'}</Label>
          <Select value={data.shirt_size} onValueChange={v => onChange({ ...data, shirt_size: v })}>
            <SelectTrigger><SelectValue placeholder={nl ? 'Maat' : 'Size'} /></SelectTrigger>
            <SelectContent>{SHIRT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>{nl ? 'Noodcontact' : 'Emergency'}</Label><Input value={data.emergency_contact_name} onChange={e => onChange({ ...data, emergency_contact_name: e.target.value })} /></div>
        <div><Label>{nl ? 'Noodcontact tel.' : 'Emerg. phone'}</Label><Input value={data.emergency_contact_phone} onChange={e => onChange({ ...data, emergency_contact_phone: e.target.value })} /></div>
        <div className="col-span-2"><Label>{nl ? 'Opmerkingen' : 'Notes'}</Label><Textarea value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} rows={2} /></div>
      </div>
      <Button onClick={onSubmit} disabled={submitting || !data.full_name.trim()} className="w-full">
        {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{submitLabel}
      </Button>
    </div>
  );

  const TaskCard = ({ task }: { task: ClubTask }) => (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{task.title}</p>
            {task.event_title && <p className="text-[11px] text-primary mt-0.5">{task.event_title}</p>}
            {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
            <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] text-muted-foreground">
              {task.task_date && <span>{new Date(task.task_date).toLocaleDateString()}</span>}
              {task.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{task.location}</span>}
              <span>{task.spots_available} {nl ? 'plaatsen' : 'spots'}</span>
            </div>
          </div>
          <div className="shrink-0">
            {task.partner_acceptance_status === 'pending' ? (
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs" onClick={() => handleAcceptTask(task.id)}><Check className="w-3 h-3 mr-1" />{nl ? 'Aanvaarden' : 'Accept'}</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRejectTask(task.id)}><X className="w-3 h-3 mr-1" />{nl ? 'Weigeren' : 'Reject'}</Button>
              </div>
            ) : (
              <Badge variant={task.partner_acceptance_status === 'accepted' ? 'default' : 'destructive'} className="text-xs">
                {task.partner_acceptance_status === 'accepted' ? '✅' : '❌'}
              </Badge>
            )}
          </div>
        </div>
        {task.partner_acceptance_status === 'accepted' && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />{nl ? 'Medewerkers' : 'Members'} ({task.assigned_members.length}/{task.spots_available})
              </p>
              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => { setShowAssignTask(task.id); setAssignMembers([]); }}>
                <Plus className="w-3 h-3 mr-0.5" />{nl ? 'Toewijzen' : 'Assign'}
              </Button>
            </div>
            {task.assigned_members.length > 0 && (
              <div className="space-y-1">
                {task.assigned_members.map(mid => {
                  const mem = members.find(m => m.id === mid);
                  return (
                    <div key={mid} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-xs">
                      <span>{mem?.full_name || '?'}{mem?.shirt_size ? ` (${mem.shirt_size})` : ''}</span>
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
  );

  const handleLogoutWrapped = async () => { await supabase.auth.signOut(); navigate('/partner-login'); };

  const sidebarEl = (
    <PartnerSidebar
      partnerName={partner.name}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogoutWrapped}
      onOpenProfile={() => setShowProfileDialog(true)}
    />
  );

  return (
    <DashboardLayout sidebar={sidebarEl}>
      <div className="max-w-2xl mx-auto">
        {/* Club selector */}
        {clubs.length > 1 && (
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block"><Building2 className="w-3 h-3 inline mr-1" />{nl ? 'Selecteer club' : 'Select club'}</Label>
            <div className="flex gap-2 flex-wrap">
              {clubs.map(club => (
                <Button key={club.id} size="sm" variant={selectedClubId === club.id ? 'default' : 'outline'} onClick={() => setSelectedClubId(club.id)} className="gap-1.5">
                  {club.logo_url && <img src={club.logo_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                  {club.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {clubTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{nl ? 'Nog geen taken voor deze club.' : 'No tasks for this club yet.'}</p>
            ) : (
              <>
                {pendingTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Handshake className="w-4 h-4 text-amber-500" />{nl ? 'Wachtend' : 'Pending'} ({pendingTasks.length})</h3>
                    <div className="space-y-2">{pendingTasks.map(t => <TaskCard key={t.id} task={t} />)}</div>
                  </div>
                )}
                {acceptedTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" />{nl ? 'Aanvaard' : 'Accepted'} ({acceptedTasks.length})</h3>
                    <div className="space-y-2">{acceptedTasks.map(t => <TaskCard key={t.id} task={t} />)}</div>
                  </div>
                )}
                {rejectedTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><X className="w-4 h-4 text-red-500" />{nl ? 'Geweigerd' : 'Rejected'} ({rejectedTasks.length})</h3>
                    <div className="space-y-2">{rejectedTasks.map(t => <TaskCard key={t.id} task={t} />)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowAddMember(true)}><UserPlus className="w-4 h-4 mr-1" />{nl ? 'Toevoegen' : 'Add'}</Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}><FileSpreadsheet className="w-4 h-4 mr-1" />Import CSV</Button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{nl ? 'Voeg medewerkers toe of importeer CSV.' : 'Add members or import CSV.'}</p>
            ) : members.map(m => (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">{m.full_name.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)}>
                      <p className="text-sm font-medium truncate">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{m.email || ''}{m.phone ? ` • ${m.phone}` : ''}{m.shirt_size ? ` • ${m.shirt_size}` : ''}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)}>
                      {expandedMember === m.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditMember(m)}><UserPlus className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteMember(m.id)}><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                  </div>
                  {expandedMember === m.id && (
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                      {m.date_of_birth && <div><span className="text-muted-foreground">{nl ? 'Geboortedatum:' : 'DOB:'}</span> {m.date_of_birth}</div>}
                      {m.national_id && <div><span className="text-muted-foreground">{nl ? 'Rijksregister:' : 'ID:'}</span> {m.national_id}</div>}
                      {m.address && <div className="col-span-2"><span className="text-muted-foreground">{nl ? 'Adres:' : 'Address:'}</span> {m.address}{m.postal_code ? `, ${m.postal_code}` : ''}{m.city ? ` ${m.city}` : ''}</div>}
                      {m.emergency_contact_name && <div className="col-span-2"><span className="text-muted-foreground">{nl ? 'Noodcontact:' : 'Emergency:'}</span> {m.emergency_contact_name}{m.emergency_contact_phone ? ` (${m.emergency_contact_phone})` : ''}</div>}
                      {m.notes && <div className="col-span-2"><span className="text-muted-foreground">{nl ? 'Nota:' : 'Notes:'}</span> {m.notes}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{nl ? 'Medewerker toevoegen' : 'Add member'}</DialogTitle></DialogHeader>
          <MemberForm data={newMember} onChange={setNewMember} onSubmit={handleAddMember} submitLabel={nl ? 'Toevoegen' : 'Add'} submitting={addingMember} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{nl ? 'Bewerken' : 'Edit'}</DialogTitle></DialogHeader>
          {editMember && <MemberForm data={{ full_name: editMember.full_name || '', email: editMember.email || '', phone: editMember.phone || '', date_of_birth: editMember.date_of_birth || '', national_id: editMember.national_id || '', address: editMember.address || '', city: editMember.city || '', postal_code: editMember.postal_code || '', shirt_size: editMember.shirt_size || '', emergency_contact_name: editMember.emergency_contact_name || '', emergency_contact_phone: editMember.emergency_contact_phone || '', notes: editMember.notes || '' }} onChange={(d) => setEditMember({ ...editMember!, ...d })} onSubmit={handleUpdateMember} submitLabel={nl ? 'Opslaan' : 'Save'} submitting={false} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>CSV Import</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{csvData.length} {nl ? 'medewerkers gevonden.' : 'members found.'}</p>
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0"><tr><th className="p-2 text-left">{nl ? 'Naam' : 'Name'}</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">{nl ? 'Stad' : 'City'}</th></tr></thead>
                <tbody>{csvData.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2">{mapCsvField(row, 'naam', 'name', 'volledige naam', 'full_name', 'full name')}</td>
                    <td className="p-2">{mapCsvField(row, 'email', 'e-mail', 'mail')}</td>
                    <td className="p-2">{mapCsvField(row, 'stad', 'city', 'gemeente')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <Button onClick={handleImportMembers} disabled={importing} className="w-full">
              {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{csvData.length} {nl ? 'importeren' : 'import'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAssignTask} onOpenChange={() => setShowAssignTask(null)}>
        <DialogContent><DialogHeader><DialogTitle>{nl ? 'Medewerkers toewijzen' : 'Assign members'}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {(() => {
              const task = clubTasks.find(t => t.id === showAssignTask);
              const already = task?.assigned_members || [];
              const avail = members.filter(m => !already.includes(m.id));
              return avail.length > 0 ? avail.map(m => (
                <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" checked={assignMembers.includes(m.id)} onChange={e => {
                    if (e.target.checked) setAssignMembers(p => [...p, m.id]);
                    else setAssignMembers(p => p.filter(id => id !== m.id));
                  }} className="w-4 h-4 rounded border-input accent-primary" />
                  <div><span className="text-sm">{m.full_name}</span>{m.shirt_size && <span className="text-xs text-muted-foreground ml-2">({m.shirt_size})</span>}</div>
                </label>
              )) : <p className="text-sm text-muted-foreground text-center py-4">{nl ? 'Iedereen al toegewezen.' : 'All assigned.'}</p>;
            })()}
            <Button onClick={() => showAssignTask && handleAssignMembers(showAssignTask)} disabled={assigning || !assignMembers.length} className="w-full">
              {assigning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{assignMembers.length} {nl ? 'toewijzen' : 'assign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {userId && (
        <EditProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          userId={userId}
          language={language as Language}
          onProfileUpdated={(updated) => {
            setProfile(prev => prev ? { ...prev, full_name: updated.full_name || prev.full_name, avatar_url: updated.avatar_url } : prev);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default PartnerDashboard;
