import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import {
  Loader2, Crown, Shield, MapPin, Phone, Clock, BookOpen, Users, Plus, X, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const GROUP_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export interface EventGroupFormValues {
  name: string;
  color: string;
  wristband_color: string;
  wristband_label: string;
  materials_note: string;
  leader_id: string;
  closing_template_id: string;
  briefing_time: string;
  briefing_location: string;
  contact_name: string;
  contact_phone: string;
  required_training_id: string;
  safety_team_ids: string[];
  club_zone_ids: string[];
}

export const emptyEventGroupForm = (color = GROUP_COLORS[0]): EventGroupFormValues => ({
  name: '', color, wristband_color: '', wristband_label: '', materials_note: '',
  leader_id: '', closing_template_id: '', briefing_time: '', briefing_location: '',
  contact_name: '', contact_phone: '', required_training_id: '',
  safety_team_ids: [], club_zone_ids: [],
});

interface Volunteer { id: string; full_name: string; }
interface SafetyTeam { id: string; name: string; leader_id: string; }
interface ClubZone { id: string; name: string; location_description: string | null; color: string; }
interface ClosingTemplate { id: string; name: string; }
interface Training { id: string; title: string; }

interface Props {
  clubId: string;
  eventId: string;
  groupId?: string | null; // null = create mode
  initialValues?: Partial<EventGroupFormValues>;
  onCancel: () => void;
  onSaved: () => void; // parent refreshes list
}

const EventGroupForm = ({ clubId, eventId, groupId, initialValues, onCancel, onSaved }: Props) => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const isEdit = !!groupId;

  const [form, setForm] = useState<EventGroupFormValues>({ ...emptyEventGroupForm(), ...initialValues });
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [safetyTeams, setSafetyTeams] = useState<SafetyTeam[]>([]);
  const [clubZones, setClubZones] = useState<ClubZone[]>([]);
  const [closingTemplates, setClosingTemplates] = useState<ClosingTemplate[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);

  // inline create-team
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // inline create-zone
  const [showCreateZone, setShowCreateZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneLocation, setNewZoneLocation] = useState('');
  const [creatingZone, setCreatingZone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [volRes, teamsRes, zonesRes, closeRes, trainRes] = await Promise.all([
        supabase.from('club_memberships').select('volunteer_id, profiles!inner(id, full_name)').eq('club_id', clubId).eq('status', 'actief'),
        supabase.from('safety_teams').select('id, name, leader_id').eq('event_id', eventId).order('created_at'),
        supabase.from('club_safety_zones').select('id, name, location_description, color').eq('club_id', clubId).order('sort_order'),
        supabase.from('closing_templates').select('id, name').eq('club_id', clubId).order('name'),
        supabase.from('academy_trainings').select('id, title').eq('club_id', clubId).eq('is_published', true).order('title'),
      ]);
      if (cancelled) return;
      const vols = (volRes.data || []).map((r: any) => r.profiles).filter(Boolean);
      setVolunteers(vols);
      setSafetyTeams((teamsRes.data || []) as SafetyTeam[]);
      setClubZones((zonesRes.data || []) as ClubZone[]);
      setClosingTemplates((closeRes.data || []) as ClosingTemplate[]);
      setTrainings((trainRes.data || []) as Training[]);

      // load existing links if edit
      if (groupId) {
        const [linkTeams, linkZones] = await Promise.all([
          supabase.from('event_group_safety_teams').select('team_id').eq('event_group_id', groupId),
          supabase.from('event_group_club_zones').select('zone_id').eq('event_group_id', groupId),
        ]);
        setForm(prev => ({
          ...prev,
          safety_team_ids: (linkTeams.data || []).map((r: any) => r.team_id),
          club_zone_ids: (linkZones.data || []).map((r: any) => r.zone_id),
        }));
      }
      setLoadingData(false);
    })();
    return () => { cancelled = true; };
  }, [clubId, eventId, groupId]);

  const update = (k: keyof EventGroupFormValues, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleId = (key: 'safety_team_ids' | 'club_zone_ids', id: string) => {
    setForm(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] };
    });
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !newTeamLeader) return;
    setCreatingTeam(true);
    const { data, error } = await supabase.from('safety_teams').insert({
      event_id: eventId, club_id: clubId, name: newTeamName.trim(), leader_id: newTeamLeader,
    }).select('id, name, leader_id').single();
    if (error) { toast.error(error.message); setCreatingTeam(false); return; }
    await supabase.from('safety_team_members').insert({ team_id: data.id, volunteer_id: newTeamLeader });
    setSafetyTeams(prev => [...prev, data as SafetyTeam]);
    update('safety_team_ids', [...form.safety_team_ids, data.id]);
    setNewTeamName(''); setNewTeamLeader(''); setShowCreateTeam(false); setCreatingTeam(false);
    toast.success(t3('Team aangemaakt', 'Équipe créée', 'Team created'));
  };

  const handleCreateZone = async () => {
    if (!newZoneName.trim()) return;
    setCreatingZone(true);
    const { data, error } = await supabase.from('club_safety_zones').insert({
      club_id: clubId, name: newZoneName.trim(),
      location_description: newZoneLocation.trim() || null,
      color: '#3b82f6', sort_order: clubZones.length,
    }).select('id, name, location_description, color').single();
    if (error) { toast.error(error.message); setCreatingZone(false); return; }
    setClubZones(prev => [...prev, data as ClubZone]);
    update('club_zone_ids', [...form.club_zone_ids, data.id]);
    setNewZoneName(''); setNewZoneLocation(''); setShowCreateZone(false); setCreatingZone(false);
    toast.success(t3('Zone aangemaakt', 'Zone créée', 'Zone created'));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error(t3('Groepsnaam is verplicht', 'Le nom est requis', 'Name is required')); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      color: form.color,
      wristband_color: form.wristband_color.trim() || null,
      wristband_label: form.wristband_label.trim() || null,
      materials_note: form.materials_note.trim() || null,
      leader_id: form.leader_id || null,
      closing_template_id: form.closing_template_id || null,
      briefing_time: form.briefing_time || null,
      briefing_location: form.briefing_location.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      required_training_id: form.required_training_id || null,
    };

    let savedGroupId = groupId || '';
    if (isEdit) {
      const { error } = await supabase.from('event_groups').update(payload).eq('id', groupId!);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { count } = await supabase.from('event_groups').select('id', { count: 'exact', head: true }).eq('event_id', eventId);
      const sortOrder = count || 0;
      const { data, error } = await supabase.from('event_groups').insert({
        event_id: eventId, ...payload, sort_order: sortOrder,
      }).select('id').single();
      if (error || !data) { toast.error(error?.message || 'Failed'); setSaving(false); return; }
      savedGroupId = data.id;
    }

    // Sync safety teams (delete-then-insert for simplicity)
    await supabase.from('event_group_safety_teams').delete().eq('event_group_id', savedGroupId);
    if (form.safety_team_ids.length) {
      await supabase.from('event_group_safety_teams').insert(
        form.safety_team_ids.map(team_id => ({ event_group_id: savedGroupId, team_id }))
      );
    }

    // Sync club zones
    await supabase.from('event_group_club_zones').delete().eq('event_group_id', savedGroupId);
    if (form.club_zone_ids.length) {
      await supabase.from('event_group_club_zones').insert(
        form.club_zone_ids.map(zone_id => ({ event_group_id: savedGroupId, zone_id }))
      );
    }

    toast.success(isEdit
      ? t3('Groep bijgewerkt', 'Groupe mis à jour', 'Group updated')
      : t3('Groep aangemaakt', 'Groupe créé', 'Group created'));
    setSaving(false);
    onSaved();
  };

  if (loadingData) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {isEdit ? t3('Groep bewerken', 'Modifier le groupe', 'Edit group') : t3('Nieuwe groep', 'Nouveau groupe', 'New group')}
        </h3>

        {/* Basis */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>{t3('Groepsnaam', 'Nom du groupe', 'Group name')} *</label>
            <input className={inputCls} value={form.name} onChange={e => update('name', e.target.value)} placeholder={t3('bv. Stewards Tribune Noord', 'ex. Stewards Tribune Nord', 'e.g. Stewards North Stand')} autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{t3('Kleur', 'Couleur', 'Color')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {GROUP_COLORS.map(c => (
                <button key={c} type="button" onClick={() => update('color', c)} className={`w-7 h-7 rounded-full border-2 transition ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Teamleider + verplichte training */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}><Crown className="w-3 h-3 inline text-amber-500 mr-1" />{t3('Teamleider', 'Chef d\'équipe', 'Team leader')}</label>
          <select className={inputCls} value={form.leader_id} onChange={e => update('leader_id', e.target.value)}>
            <option value="">{t3('— Geen —', '— Aucun —', '— None —')}</option>
            {volunteers.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}><BookOpen className="w-3 h-3 inline mr-1" />{t3('Vereiste opleiding', 'Formation requise', 'Required training')}</label>
          <select className={inputCls} value={form.required_training_id} onChange={e => update('required_training_id', e.target.value)}>
            <option value="">{t3('— Geen —', '— Aucune —', '— None —')}</option>
            {trainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
      </div>

      {/* Briefing */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}><Clock className="w-3 h-3 inline mr-1" />{t3('Briefing-tijd', 'Heure du briefing', 'Briefing time')}</label>
          <input type="time" className={inputCls} value={form.briefing_time} onChange={e => update('briefing_time', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}><MapPin className="w-3 h-3 inline mr-1" />{t3('Briefing-locatie', 'Lieu du briefing', 'Briefing location')}</label>
          <input className={inputCls} value={form.briefing_location} onChange={e => update('briefing_location', e.target.value)} placeholder={t3('bv. Vergaderzaal A', 'ex. Salle A', 'e.g. Meeting room A')} />
        </div>
      </div>

      {/* Contact */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>{t3('Contactpersoon', 'Personne de contact', 'Contact person')}</label>
          <input className={inputCls} value={form.contact_name} onChange={e => update('contact_name', e.target.value)} placeholder={t3('Naam', 'Nom', 'Name')} />
        </div>
        <div>
          <label className={labelCls}><Phone className="w-3 h-3 inline mr-1" />{t3('Telefoon', 'Téléphone', 'Phone')}</label>
          <input className={inputCls} value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} placeholder="+32..." />
        </div>
      </div>

      {/* Sluitingsprocedure */}
      <div>
        <label className={labelCls}>{t3('Sluitingsprocedure', 'Procédure de fermeture', 'Closing procedure')}</label>
        <select className={inputCls} value={form.closing_template_id} onChange={e => update('closing_template_id', e.target.value)}>
          <option value="">{t3('— Geen —', '— Aucune —', '— None —')}</option>
          {closingTemplates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Safety teams multi-select */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" /> {t3('Safety teams', 'Équipes de sécurité', 'Safety teams')}
          </label>
          <button type="button" onClick={() => setShowCreateTeam(v => !v)} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> {t3('Nieuw team', 'Nouvelle équipe', 'New team')}
          </button>
        </div>

        {safetyTeams.length === 0 && !showCreateTeam && (
          <p className="text-xs text-muted-foreground italic">{t3('Nog geen teams. Klik "Nieuw team" om er één te maken.', 'Aucune équipe. Cliquez "Nouvelle équipe".', 'No teams yet. Click "New team".')}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {safetyTeams.map(team => {
            const checked = form.safety_team_ids.includes(team.id);
            return (
              <button key={team.id} type="button" onClick={() => toggleId('safety_team_ids', team.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition flex items-center gap-1.5 ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}>
                {checked && <Check className="w-3 h-3" />} {team.name}
              </button>
            );
          })}
        </div>

        {showCreateTeam && (
          <div className="mt-2 p-3 rounded-lg border border-border bg-card space-y-2">
            <input className={inputCls} value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder={t3('Teamnaam', 'Nom de l\'équipe', 'Team name')} />
            <select className={inputCls} value={newTeamLeader} onChange={e => setNewTeamLeader(e.target.value)}>
              <option value="">{t3('Kies leider...', 'Choisir chef...', 'Choose leader...')}</option>
              {volunteers.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
            </select>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateTeam(false)} className="flex-1">{t3('Annuleren', 'Annuler', 'Cancel')}</Button>
              <Button type="button" size="sm" onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim() || !newTeamLeader} className="flex-1">
                {creatingTeam ? <Loader2 className="w-3 h-3 animate-spin" /> : t3('Toevoegen', 'Ajouter', 'Add')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Club zones multi-select */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" /> {t3('Zones / locaties', 'Zones / lieux', 'Zones / locations')}
          </label>
          <button type="button" onClick={() => setShowCreateZone(v => !v)} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> {t3('Nieuwe zone', 'Nouvelle zone', 'New zone')}
          </button>
        </div>

        {clubZones.length === 0 && !showCreateZone && (
          <p className="text-xs text-muted-foreground italic">{t3('Nog geen zones. Eenmaal aangemaakt zijn ze beschikbaar voor élk event.', 'Aucune zone. Une fois créées, disponibles pour chaque événement.', 'No zones yet. Once created, reusable across all events.')}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {clubZones.map(zone => {
            const checked = form.club_zone_ids.includes(zone.id);
            return (
              <button key={zone.id} type="button" onClick={() => toggleId('club_zone_ids', zone.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition flex items-center gap-1.5 ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}>
                {checked && <Check className="w-3 h-3" />}
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                {zone.name}
                {zone.location_description && <span className="text-[10px] opacity-70">· {zone.location_description}</span>}
              </button>
            );
          })}
        </div>

        {showCreateZone && (
          <div className="mt-2 p-3 rounded-lg border border-border bg-card space-y-2">
            <input className={inputCls} value={newZoneName} onChange={e => setNewZoneName(e.target.value)} placeholder={t3('Zonenaam (bv. Tribune Noord)', 'Nom (ex. Tribune Nord)', 'Zone name (e.g. North Stand)')} />
            <input className={inputCls} value={newZoneLocation} onChange={e => setNewZoneLocation(e.target.value)} placeholder={t3('Locatie-beschrijving (optioneel)', 'Description (optionnel)', 'Location description (optional)')} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateZone(false)} className="flex-1">{t3('Annuleren', 'Annuler', 'Cancel')}</Button>
              <Button type="button" size="sm" onClick={handleCreateZone} disabled={creatingZone || !newZoneName.trim()} className="flex-1">
                {creatingZone ? <Loader2 className="w-3 h-3 animate-spin" /> : t3('Toevoegen', 'Ajouter', 'Add')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Wristband / accessoire */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>{t3('Kleur bandje', 'Couleur bracelet', 'Wristband color')}</label>
          <input className={inputCls} value={form.wristband_color} onChange={e => update('wristband_color', e.target.value)} placeholder={t3('bv. Rood', 'ex. Rouge', 'e.g. Red')} />
        </div>
        <div>
          <label className={labelCls}>{t3('Type accessoire', 'Type d\'accessoire', 'Accessory type')}</label>
          <input className={inputCls} value={form.wristband_label} onChange={e => update('wristband_label', e.target.value)} placeholder={t3('bv. Polsbandje, Hesje', 'ex. Bracelet, Gilet', 'e.g. Wristband, Vest')} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>{t3('Extra materiaal / instructies', 'Matériel supplémentaire', 'Extra materials / instructions')}</label>
          <textarea rows={2} className={inputCls + ' resize-none'} value={form.materials_note} onChange={e => update('materials_note', e.target.value)} placeholder={t3('bv. Walkietalkie kanaal 3', 'ex. Walkie canal 3', 'e.g. Walkie channel 3')} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" /> {t3('Annuleren', 'Annuler', 'Cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={saving || !form.name.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
          {isEdit ? t3('Opslaan', 'Enregistrer', 'Save') : t3('Aanmaken', 'Créer', 'Create')}
        </Button>
      </div>
    </div>
  );
};

export default EventGroupForm;
