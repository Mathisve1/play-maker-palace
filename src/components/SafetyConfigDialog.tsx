import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Shield, CheckCircle2, MapPin, Users, Pencil, Copy, X, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface SafetyConfigDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  clubId: string;
}

interface ClubZone { id: string; club_id: string; name: string; location_description: string | null; color: string; sort_order: number; }
interface IncidentType { id: string; label: string; icon: string; color: string; default_priority: string; sort_order: number; emoji: string | null; }
interface ChecklistItem { id: string; description: string; zone_id: string | null; sort_order: number; }
interface LocationLevel { id: string; club_id: string; name: string; sort_order: number; is_required: boolean; }
interface LocationOption { id: string; level_id: string; label: string; sort_order: number; }
interface SafetyRole {
  id: string; club_id: string; name: string; color: string; sort_order: number; level: number;
  can_complete_checklist: boolean; can_report_incidents: boolean; can_resolve_incidents: boolean;
  can_complete_closing: boolean; can_view_team: boolean;
}
interface RoleZoneLink { id: string; role_id: string; zone_id: string; }

const POPULAR_EMOJIS = [
  '🚑', '🔥', '⚠️', '🚨', '🩹', '💊', '🚓', '🛡️', '👊', '🍺',
  '🚪', '🔑', '📢', '🎯', '⛑️', '🧯', '💧', '⚡', '🚷', '🚫',
  '🤕', '🦺', '📍', '🅿️', '🚻', '🎪', '🏟️', '🚧', '🔒', '👀',
];

const SafetyConfigDialog = ({ open, onClose, eventId, clubId }: SafetyConfigDialogProps) => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const PRIORITY_OPTIONS = [
    { value: 'low', label: t3('Laag', 'Bas', 'Low'), color: '#22c55e' },
    { value: 'medium', label: t3('Gemiddeld', 'Moyen', 'Medium'), color: '#f59e0b' },
    { value: 'high', label: t3('Hoog', 'Élevé', 'High'), color: '#ef4444' },
  ];

  const [clubZones, setClubZones] = useState<ClubZone[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [locationLevels, setLocationLevels] = useState<LocationLevel[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [safetyRoles, setSafetyRoles] = useState<SafetyRole[]>([]);
  const [roleZoneLinks, setRoleZoneLinks] = useState<RoleZoneLink[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Add inputs ──
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneLocation, setNewZoneLocation] = useState('');
  const [newZoneColor, setNewZoneColor] = useState('#3b82f6');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#ef4444');
  const [newTypePriority, setNewTypePriority] = useState('medium');
  const [newTypeEmoji, setNewTypeEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newChecklistDesc, setNewChecklistDesc] = useState('');
  const [newChecklistZone, setNewChecklistZone] = useState('');
  const [newLevelName, setNewLevelName] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3b82f6');
  const [newRoleLevel, setNewRoleLevel] = useState(1);

  // ── Edit state ──
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editZoneDraft, setEditZoneDraft] = useState<{ name: string; location_description: string; color: string }>({ name: '', location_description: '', color: '#3b82f6' });
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleDraft, setEditRoleDraft] = useState<{ name: string; color: string; level: number }>({ name: '', color: '#3b82f6', level: 1 });
  const [expandedRoleZones, setExpandedRoleZones] = useState<Set<string>>(new Set());

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const [czRes, itRes, clRes, llRes, srRes] = await Promise.all([
        supabase.from('club_safety_zones').select('*').eq('club_id', clubId).order('sort_order'),
        supabase.from('safety_incident_types').select('*').eq('club_id', clubId).order('sort_order'),
        eventId ? supabase.from('safety_checklist_items').select('*').eq('event_id', eventId).order('sort_order') : Promise.resolve({ data: [] } as any),
        supabase.from('safety_location_levels').select('*').eq('club_id', clubId).order('sort_order'),
        supabase.from('safety_roles').select('*').eq('club_id', clubId).order('sort_order'),
      ]);
      const levels = llRes.data || [];
      const levelIds = levels.map((l: LocationLevel) => l.id);
      const roles = srRes.data || [];
      const roleIds = roles.map((r: SafetyRole) => r.id);

      const [{ data: loData }, { data: rzlData }] = await Promise.all([
        levelIds.length > 0
          ? supabase.from('safety_location_options').select('*').in('level_id', levelIds).order('sort_order')
          : Promise.resolve({ data: [] as any[] }),
        roleIds.length > 0
          ? supabase.from('safety_role_club_zones').select('*').in('role_id', roleIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      setClubZones(czRes.data || []);
      setIncidentTypes(itRes.data || []);
      setChecklistItems(clRes.data || []);
      setLocationLevels(levels);
      setLocationOptions(loData || []);
      if (levels.length > 0 && !selectedLevelId) setSelectedLevelId(levels[0].id);
      setSafetyRoles(roles);
      setRoleZoneLinks(rzlData || []);
      setLoading(false);
    };
    load();
  }, [open, eventId, clubId]);

  // ───────────── CLUB ZONES (reusable) ─────────────
  const addClubZone = async () => {
    if (!newZoneName.trim()) return;
    const { data, error } = await supabase.from('club_safety_zones').insert({
      club_id: clubId,
      name: newZoneName.trim(),
      location_description: newZoneLocation.trim() || null,
      color: newZoneColor,
      sort_order: clubZones.length,
    }).select('*').maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) {
      setClubZones(prev => [...prev, data]);
      setNewZoneName(''); setNewZoneLocation(''); setNewZoneColor('#3b82f6');
      toast.success(t3('Zone toegevoegd', 'Zone ajoutée', 'Zone added'));
    }
  };

  const startEditZone = (z: ClubZone) => {
    setEditingZoneId(z.id);
    setEditZoneDraft({ name: z.name, location_description: z.location_description || '', color: z.color });
  };

  const saveEditZone = async () => {
    if (!editingZoneId || !editZoneDraft.name.trim()) return;
    const { error } = await supabase.from('club_safety_zones').update({
      name: editZoneDraft.name.trim(),
      location_description: editZoneDraft.location_description.trim() || null,
      color: editZoneDraft.color,
    }).eq('id', editingZoneId);
    if (error) { toast.error(error.message); return; }
    setClubZones(prev => prev.map(z => z.id === editingZoneId ? {
      ...z,
      name: editZoneDraft.name.trim(),
      location_description: editZoneDraft.location_description.trim() || null,
      color: editZoneDraft.color,
    } : z));
    setEditingZoneId(null);
    toast.success(t3('Zone bijgewerkt', 'Zone mise à jour', 'Zone updated'));
  };

  const duplicateClubZone = async (z: ClubZone) => {
    const { data, error } = await supabase.from('club_safety_zones').insert({
      club_id: clubId,
      name: `${z.name} (${t3('kopie', 'copie', 'copy')})`,
      location_description: z.location_description,
      color: z.color,
      sort_order: clubZones.length,
    }).select('*').maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) {
      setClubZones(prev => [...prev, data]);
      toast.success(t3('Zone gedupliceerd', 'Zone dupliquée', 'Zone duplicated'));
    }
  };

  const deleteClubZone = async (id: string) => {
    // Check usage
    const [linksRes, teamLinksRes, groupLinksRes] = await Promise.all([
      supabase.from('safety_role_club_zones').select('id', { count: 'exact', head: true }).eq('zone_id', id),
      supabase.from('safety_team_club_zones').select('id', { count: 'exact', head: true }).eq('zone_id', id),
      supabase.from('event_group_club_zones').select('id', { count: 'exact', head: true }).eq('zone_id', id),
    ]);
    const usage = (linksRes.count || 0) + (teamLinksRes.count || 0) + (groupLinksRes.count || 0);
    if (usage > 0) {
      const ok = window.confirm(t3(
        `Deze zone is in gebruik (${usage} koppeling(en)). Toch verwijderen? Alle koppelingen worden verwijderd.`,
        `Cette zone est utilisée (${usage} liaison(s)). Supprimer quand même ? Toutes les liaisons seront supprimées.`,
        `This zone is in use (${usage} link(s)). Delete anyway? All links will be removed.`
      ));
      if (!ok) return;
    }
    const { error } = await supabase.from('club_safety_zones').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setClubZones(prev => prev.filter(z => z.id !== id));
    setRoleZoneLinks(prev => prev.filter(l => l.zone_id !== id));
    toast.success(t3('Zone verwijderd', 'Zone supprimée', 'Zone deleted'));
  };

  // ───────────── INCIDENT TYPES ─────────────
  const addIncidentType = async () => {
    if (!newTypeName.trim()) return;
    const { data, error } = await supabase.from('safety_incident_types').insert({
      club_id: clubId, label: newTypeName.trim(), color: newTypeColor,
      default_priority: newTypePriority, sort_order: incidentTypes.length,
      emoji: newTypeEmoji || null,
    } as any).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { setIncidentTypes(prev => [...prev, data]); setNewTypeName(''); setNewTypeEmoji(''); toast.success(t3('Incident type toegevoegd', 'Type d\'incident ajouté', 'Incident type added')); }
  };

  const deleteIncidentType = async (id: string) => {
    await supabase.from('safety_incident_types').delete().eq('id', id);
    setIncidentTypes(prev => prev.filter(t => t.id !== id));
    toast.success(t3('Incident type verwijderd', 'Type d\'incident supprimé', 'Incident type deleted'));
  };

  // ───────────── CHECKLIST ─────────────
  const addChecklistItem = async () => {
    if (!newChecklistDesc.trim()) return;
    const { data, error } = await supabase.from('safety_checklist_items').insert({
      event_id: eventId, club_id: clubId, description: newChecklistDesc.trim(),
      zone_id: newChecklistZone || null, sort_order: checklistItems.length,
    } as any).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { setChecklistItems(prev => [...prev, data]); setNewChecklistDesc(''); setNewChecklistZone(''); toast.success(t3('Checklist item toegevoegd', 'Élément ajouté', 'Checklist item added')); }
  };

  const deleteChecklistItem = async (id: string) => {
    await supabase.from('safety_checklist_items').delete().eq('id', id);
    setChecklistItems(prev => prev.filter(i => i.id !== id));
    toast.success(t3('Item verwijderd', 'Élément supprimé', 'Item deleted'));
  };

  // ───────────── LOCATION LEVELS ─────────────
  const addLocationLevel = async () => {
    if (!newLevelName.trim()) return;
    const { data, error } = await supabase.from('safety_location_levels').insert({
      club_id: clubId, name: newLevelName.trim(), sort_order: locationLevels.length,
    } as any).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      setLocationLevels(prev => [...prev, data]);
      setNewLevelName('');
      if (!selectedLevelId) setSelectedLevelId(data.id);
      toast.success(t3('Locatie niveau toegevoegd', 'Niveau de localisation ajouté', 'Location level added'));
    }
  };

  const deleteLocationLevel = async (id: string) => {
    await supabase.from('safety_location_levels').delete().eq('id', id);
    setLocationLevels(prev => prev.filter(l => l.id !== id));
    setLocationOptions(prev => prev.filter(o => o.level_id !== id));
    if (selectedLevelId === id) setSelectedLevelId(locationLevels.find(l => l.id !== id)?.id || null);
    toast.success(t3('Niveau verwijderd', 'Niveau supprimé', 'Level deleted'));
  };

  const toggleLevelRequired = async (id: string, current: boolean) => {
    await supabase.from('safety_location_levels').update({ is_required: !current }).eq('id', id);
    setLocationLevels(prev => prev.map(l => l.id === id ? { ...l, is_required: !current } : l));
  };

  const addLocationOption = async () => {
    if (!newOptionLabel.trim() || !selectedLevelId) return;
    const { data, error } = await supabase.from('safety_location_options').insert({
      level_id: selectedLevelId, label: newOptionLabel.trim(),
      sort_order: locationOptions.filter(o => o.level_id === selectedLevelId).length,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { setLocationOptions(prev => [...prev, data]); setNewOptionLabel(''); toast.success(t3('Optie toegevoegd', 'Option ajoutée', 'Option added')); }
  };

  const deleteLocationOption = async (id: string) => {
    await supabase.from('safety_location_options').delete().eq('id', id);
    setLocationOptions(prev => prev.filter(o => o.id !== id));
    toast.success(t3('Optie verwijderd', 'Option supprimée', 'Option deleted'));
  };

  // ───────────── SAFETY ROLES ─────────────
  const addSafetyRole = async () => {
    if (!newRoleName.trim()) return;
    const { data, error } = await supabase.from('safety_roles').insert({
      club_id: clubId, name: newRoleName.trim(), color: newRoleColor,
      level: newRoleLevel, sort_order: safetyRoles.length,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      setSafetyRoles(prev => [...prev, data]);
      setNewRoleName(''); setNewRoleColor('#3b82f6'); setNewRoleLevel(1);
      toast.success(t3('Rol toegevoegd', 'Rôle ajouté', 'Role added'));
    }
  };

  const startEditRole = (r: SafetyRole) => {
    setEditingRoleId(r.id);
    setEditRoleDraft({ name: r.name, color: r.color, level: r.level });
  };

  const saveEditRole = async () => {
    if (!editingRoleId || !editRoleDraft.name.trim()) return;
    const { error } = await supabase.from('safety_roles').update({
      name: editRoleDraft.name.trim(),
      color: editRoleDraft.color,
      level: editRoleDraft.level,
    }).eq('id', editingRoleId);
    if (error) { toast.error(error.message); return; }
    setSafetyRoles(prev => prev.map(r => r.id === editingRoleId ? {
      ...r, name: editRoleDraft.name.trim(), color: editRoleDraft.color, level: editRoleDraft.level,
    } : r));
    setEditingRoleId(null);
    toast.success(t3('Rol bijgewerkt', 'Rôle mis à jour', 'Role updated'));
  };

  const duplicateSafetyRole = async (r: SafetyRole) => {
    const { data, error } = await supabase.from('safety_roles').insert({
      club_id: clubId,
      name: `${r.name} (${t3('kopie', 'copie', 'copy')})`,
      color: r.color,
      level: r.level,
      sort_order: safetyRoles.length,
      can_complete_checklist: r.can_complete_checklist,
      can_report_incidents: r.can_report_incidents,
      can_resolve_incidents: r.can_resolve_incidents,
      can_complete_closing: r.can_complete_closing,
      can_view_team: r.can_view_team,
    }).select('*').maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) {
      setSafetyRoles(prev => [...prev, data]);
      // Duplicate zone links
      const zoneIds = roleZoneLinks.filter(l => l.role_id === r.id).map(l => l.zone_id);
      if (zoneIds.length > 0) {
        const { data: newLinks } = await supabase.from('safety_role_club_zones')
          .insert(zoneIds.map(zid => ({ role_id: data.id, zone_id: zid })))
          .select('*');
        if (newLinks) setRoleZoneLinks(prev => [...prev, ...newLinks]);
      }
      toast.success(t3('Rol gedupliceerd', 'Rôle dupliqué', 'Role duplicated'));
    }
  };

  const deleteSafetyRole = async (id: string) => {
    const ok = window.confirm(t3(
      'Weet je zeker dat je deze rol wil verwijderen? Alle koppelingen aan vrijwilligers en zones gaan verloren.',
      'Êtes-vous sûr de vouloir supprimer ce rôle ? Toutes les liaisons seront perdues.',
      'Are you sure you want to delete this role? All links will be lost.'
    ));
    if (!ok) return;
    await supabase.from('safety_roles').delete().eq('id', id);
    setSafetyRoles(prev => prev.filter(r => r.id !== id));
    setRoleZoneLinks(prev => prev.filter(l => l.role_id !== id));
    toast.success(t3('Rol verwijderd', 'Rôle supprimé', 'Role deleted'));
  };

  const toggleRolePermission = async (roleId: string, field: keyof SafetyRole, current: boolean) => {
    await supabase.from('safety_roles').update({ [field]: !current } as Record<string, unknown>).eq('id', roleId);
    setSafetyRoles(prev => prev.map(r => r.id === roleId ? { ...r, [field]: !current } : r));
  };

  const toggleRoleZone = async (roleId: string, zoneId: string) => {
    const existing = roleZoneLinks.find(l => l.role_id === roleId && l.zone_id === zoneId);
    if (existing) {
      const { error } = await supabase.from('safety_role_club_zones').delete().eq('id', existing.id);
      if (error) { toast.error(error.message); return; }
      setRoleZoneLinks(prev => prev.filter(l => l.id !== existing.id));
    } else {
      const { data, error } = await supabase.from('safety_role_club_zones')
        .insert({ role_id: roleId, zone_id: zoneId }).select('*').maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (data) setRoleZoneLinks(prev => [...prev, data]);
    }
  };

  const toggleExpandRoleZones = (roleId: string) => {
    setExpandedRoleZones(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId); else next.add(roleId);
      return next;
    });
  };

  const permLabels: { key: keyof SafetyRole; nl: string; fr: string; en: string }[] = [
    { key: 'can_complete_checklist', nl: 'Checklist afstrepen', fr: 'Compléter checklist', en: 'Complete checklist' },
    { key: 'can_report_incidents', nl: 'Incidenten melden', fr: 'Signaler incidents', en: 'Report incidents' },
    { key: 'can_resolve_incidents', nl: 'Incidenten afhandelen', fr: 'Résoudre incidents', en: 'Resolve incidents' },
    { key: 'can_complete_closing', nl: 'Sluitingstaken uitvoeren', fr: 'Exécuter tâches de clôture', en: 'Complete closing tasks' },
    { key: 'can_view_team', nl: 'Teamoverzicht zien', fr: 'Voir l\'équipe', en: 'View team overview' },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> {t3('Safety & Security Configuratie', 'Configuration Safety & Security', 'Safety & Security Configuration')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <Tabs defaultValue="zones" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="zones" className="flex-1 text-xs">Zones ({clubZones.length})</TabsTrigger>
              <TabsTrigger value="types" className="flex-1 text-xs">{t3('Meldingen', 'Signalements', 'Reports')} ({incidentTypes.length})</TabsTrigger>
              <TabsTrigger value="rollen" className="flex-1 text-xs">{t3('Rollen', 'Rôles', 'Roles')} ({safetyRoles.length})</TabsTrigger>
              <TabsTrigger value="locatie" className="flex-1 text-xs">{t3('Locatie', 'Localisation', 'Location')} ({locationLevels.length})</TabsTrigger>
              {!!eventId && <TabsTrigger value="checklist" className="flex-1 text-xs">Checklist ({checklistItems.length})</TabsTrigger>}
            </TabsList>

            {/* ZONES — herbruikbaar per club */}
            <TabsContent value="zones" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">
                {t3(
                  'Zones zijn herbruikbaar voor alle wedstrijden van deze club. Maak ze 1 keer aan, koppel ze daarna aan rollen, teams en groepen.',
                  'Les zones sont réutilisables pour tous les matchs. Créez-les une fois, puis liez-les aux rôles, équipes et groupes.',
                  'Zones are reusable across all matches. Create once, then link to roles, teams and groups.'
                )}
              </p>
              <div className="space-y-2 rounded-xl border border-dashed border-border p-3 bg-muted/20">
                <div className="flex gap-2">
                  <input type="color" value={newZoneColor} onChange={e => setNewZoneColor(e.target.value)} className="w-10 h-10 rounded-lg border border-input cursor-pointer shrink-0" />
                  <input type="text" placeholder={t3('Zone naam (bijv. Tribune A)', 'Nom de zone (ex. Tribune A)', 'Zone name (e.g. Stand A)')} value={newZoneName} onChange={e => setNewZoneName(e.target.value)} className={inputClass + ' flex-1'} onKeyDown={e => e.key === 'Enter' && addClubZone()} />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder={t3('Locatie/omschrijving (optioneel)', 'Lieu/description (optionnel)', 'Location/description (optional)')} value={newZoneLocation} onChange={e => setNewZoneLocation(e.target.value)} className={inputClass + ' flex-1'} />
                  <Button onClick={addClubZone} size="sm"><Plus className="w-4 h-4 mr-1" /> {t3('Toevoegen', 'Ajouter', 'Add')}</Button>
                </div>
              </div>

              {clubZones.map(zone => (
                <div key={zone.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  {editingZoneId === zone.id ? (
                    <div className="p-3 space-y-2">
                      <div className="flex gap-2">
                        <input type="color" value={editZoneDraft.color} onChange={e => setEditZoneDraft(d => ({ ...d, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-input cursor-pointer shrink-0" />
                        <input type="text" value={editZoneDraft.name} onChange={e => setEditZoneDraft(d => ({ ...d, name: e.target.value }))} className={inputClass + ' flex-1'} placeholder={t3('Zone naam', 'Nom', 'Name')} />
                      </div>
                      <input type="text" value={editZoneDraft.location_description} onChange={e => setEditZoneDraft(d => ({ ...d, location_description: e.target.value }))} className={inputClass} placeholder={t3('Locatie/omschrijving', 'Lieu', 'Location')} />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingZoneId(null)}><X className="w-4 h-4 mr-1" />{t3('Annuleer', 'Annuler', 'Cancel')}</Button>
                        <Button size="sm" onClick={saveEditZone}><Save className="w-4 h-4 mr-1" />{t3('Opslaan', 'Enregistrer', 'Save')}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: zone.color }} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{zone.name}</div>
                          {zone.location_description && (
                            <div className="text-xs text-muted-foreground truncate">{zone.location_description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => startEditZone(zone)} className="h-8 w-8" title={t3('Bewerken', 'Modifier', 'Edit')}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => duplicateClubZone(zone)} className="h-8 w-8" title={t3('Dupliceren', 'Dupliquer', 'Duplicate')}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteClubZone(zone.id)} className="text-destructive h-8 w-8" title={t3('Verwijderen', 'Supprimer', 'Delete')}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {clubZones.length === 0 && (
                <div className="text-center py-6">
                  <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">{t3('Geen zones aangemaakt.', 'Aucune zone créée.', 'No zones created.')}</p>
                  <p className="text-muted-foreground text-xs">{t3('Voeg zones toe die je terrein indelen.', 'Ajoutez des zones pour diviser le site.', 'Add zones to divide the grounds.')}</p>
                </div>
              )}
            </TabsContent>

            {/* INCIDENT TYPES */}
            <TabsContent value="types" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">{t3('Stel hier de sneltoetsen in die stewards zien om incidenten te melden.', 'Configurez les raccourcis que les stewards utilisent.', 'Configure the shortcuts stewards use.')}</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-10 h-10 rounded-xl border border-input bg-background flex items-center justify-center text-lg hover:bg-muted/50 transition-colors"
                      title={t3('Emoji kiezen (optioneel)', 'Choisir emoji', 'Choose emoji')}
                    >
                      {newTypeEmoji || '😀'}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-12 left-0 z-50 bg-card border border-border rounded-xl shadow-lg p-3 w-[280px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">{t3('Kies een emoji', 'Choisissez', 'Choose')}</span>
                          {newTypeEmoji && (
                            <button onClick={() => { setNewTypeEmoji(''); setShowEmojiPicker(false); }} className="text-xs text-destructive hover:underline">{t3('Verwijder', 'Supprimer', 'Remove')}</button>
                          )}
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                          {POPULAR_EMOJIS.map(e => (
                            <button key={e} onClick={() => { setNewTypeEmoji(e); setShowEmojiPicker(false); }}
                              className={`w-7 h-7 flex items-center justify-center rounded hover:bg-muted/50 text-base ${newTypeEmoji === e ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                            >{e}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="text" placeholder={t3('Type naam (bijv. Medisch)', 'Nom (ex. Médical)', 'Name (e.g. Medical)')} value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className={inputClass + ' flex-1'} />
                </div>
                <div className="flex gap-2">
                  <input type="color" value={newTypeColor} onChange={e => setNewTypeColor(e.target.value)} className="w-10 h-10 rounded-lg border border-input cursor-pointer" />
                  <select value={newTypePriority} onChange={e => setNewTypePriority(e.target.value)} className={inputClass + ' flex-1'}>
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <Button onClick={addIncidentType} size="sm"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              {incidentTypes.map(type => (
                <div key={type.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2">
                    {type.emoji ? <span className="text-lg">{type.emoji}</span> : <div className="w-4 h-4 rounded" style={{ background: type.color }} />}
                    <span className="text-sm font-medium text-foreground">{type.label}</span>
                    <Badge variant="outline" className="text-[10px]" style={{ color: PRIORITY_OPTIONS.find(p => p.value === type.default_priority)?.color }}>
                      {PRIORITY_OPTIONS.find(p => p.value === type.default_priority)?.label}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteIncidentType(type.id)} className="text-destructive h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {incidentTypes.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">{t3('Voeg sneltoetsen toe.', 'Ajoutez des raccourcis.', 'Add shortcuts.')}</p>}
            </TabsContent>

            {/* SAFETY ROLES */}
            <TabsContent value="rollen" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">
                {t3(
                  'Maak safety-rollen aan en koppel ze aan zones. Niveau 1 = hoogste rang.',
                  'Créez des rôles et liez-les à des zones. Niveau 1 = rang le plus élevé.',
                  'Create safety roles and link them to zones. Level 1 = highest rank.'
                )}
              </p>
              <div className="space-y-2 rounded-xl border border-dashed border-border p-3 bg-muted/20">
                <div className="flex gap-2">
                  <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} className="w-10 h-10 rounded-lg border border-input cursor-pointer shrink-0" />
                  <input type="text" placeholder={t3('Rol naam (bijv. Korpssteward)', 'Nom (ex. Steward)', 'Name (e.g. Corps Steward)')} value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className={inputClass + ' flex-1'} onKeyDown={e => e.key === 'Enter' && addSafetyRole()} />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t3('Niveau:', 'Niveau:', 'Level:')}</span>
                  <select value={newRoleLevel} onChange={e => setNewRoleLevel(Number(e.target.value))} className={inputClass + ' w-20'}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <Button onClick={addSafetyRole} size="sm" className="ml-auto"><Plus className="w-4 h-4 mr-1" /> {t3('Toevoegen', 'Ajouter', 'Add')}</Button>
                </div>
              </div>

              {safetyRoles.sort((a,b) => a.level - b.level || a.sort_order - b.sort_order).map(role => {
                const linkedZoneIds = roleZoneLinks.filter(l => l.role_id === role.id).map(l => l.zone_id);
                const zonesExpanded = expandedRoleZones.has(role.id);
                return (
                  <div key={role.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    {editingRoleId === role.id ? (
                      <div className="p-3 space-y-2 bg-muted/20">
                        <div className="flex gap-2">
                          <input type="color" value={editRoleDraft.color} onChange={e => setEditRoleDraft(d => ({ ...d, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-input cursor-pointer shrink-0" />
                          <input type="text" value={editRoleDraft.name} onChange={e => setEditRoleDraft(d => ({ ...d, name: e.target.value }))} className={inputClass + ' flex-1'} />
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{t3('Niveau:', 'Niveau:', 'Level:')}</span>
                          <select value={editRoleDraft.level} onChange={e => setEditRoleDraft(d => ({ ...d, level: Number(e.target.value) }))} className={inputClass + ' w-20'}>
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                          <div className="ml-auto flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingRoleId(null)}><X className="w-4 h-4 mr-1" />{t3('Annuleer', 'Annuler', 'Cancel')}</Button>
                            <Button size="sm" onClick={saveEditRole}><Save className="w-4 h-4 mr-1" />{t3('Opslaan', 'Enregistrer', 'Save')}</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                          <span className="text-sm font-medium text-foreground truncate">{role.name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{t3('Niv.', 'Niv.', 'Lvl.')} {role.level}</Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => startEditRole(role)} className="h-8 w-8" title={t3('Bewerken', 'Modifier', 'Edit')}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => duplicateSafetyRole(role)} className="h-8 w-8" title={t3('Dupliceren', 'Dupliquer', 'Duplicate')}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteSafetyRole(role.id)} className="text-destructive h-8 w-8" title={t3('Verwijderen', 'Supprimer', 'Delete')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Permissies */}
                    <div className="border-t border-border px-3 py-2 space-y-1.5 bg-muted/10">
                      {permLabels.map(perm => (
                        <div key={perm.key} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{t3(perm.nl, perm.fr, perm.en)}</span>
                          <Switch
                            checked={role[perm.key] as boolean}
                            onCheckedChange={() => toggleRolePermission(role.id, perm.key, role[perm.key] as boolean)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Gekoppelde zones */}
                    <div className="border-t border-border px-3 py-2 bg-muted/5">
                      <button onClick={() => toggleExpandRoleZones(role.id)} className="flex items-center justify-between w-full text-left">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium text-foreground">{t3('Gekoppelde zones', 'Zones liées', 'Linked zones')}</span>
                          <Badge variant="outline" className="text-[10px]">{linkedZoneIds.length}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {zonesExpanded ? t3('Verberg', 'Masquer', 'Hide') : t3('Beheer', 'Gérer', 'Manage')}
                        </span>
                      </button>
                      {!zonesExpanded && linkedZoneIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {linkedZoneIds.map(zid => {
                            const z = clubZones.find(cz => cz.id === zid);
                            if (!z) return null;
                            return (
                              <span key={zid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-background border border-border">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: z.color }} />
                                {z.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {zonesExpanded && (
                        <div className="mt-2 space-y-1">
                          {clubZones.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground text-center py-2">{t3('Geen zones beschikbaar. Maak eerst zones aan.', 'Aucune zone disponible.', 'No zones available.')}</p>
                          ) : (
                            clubZones.map(z => {
                              const linked = linkedZoneIds.includes(z.id);
                              return (
                                <button
                                  key={z.id}
                                  onClick={() => toggleRoleZone(role.id, z.id)}
                                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs transition-colors ${linked ? 'bg-primary/10 border border-primary/30' : 'bg-background border border-border hover:bg-muted/50'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: z.color }} />
                                    <span className="text-foreground">{z.name}</span>
                                    {z.location_description && <span className="text-muted-foreground">· {z.location_description}</span>}
                                  </div>
                                  {linked && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {safetyRoles.length === 0 && (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">{t3('Geen rollen ingesteld.', 'Aucun rôle configuré.', 'No roles configured.')}</p>
                </div>
              )}
            </TabsContent>

            {/* LOCATION LEVELS */}
            <TabsContent value="locatie" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">
                {t3(
                  'Maak locatie-niveaus aan voor incidentmeldingen. Bijv. "Tribune" → "Vak" → "Rij".',
                  'Créez des niveaux de localisation. Ex. "Tribune" → "Bloc" → "Rang".',
                  'Create location levels. E.g. "Stand" → "Section" → "Row".'
                )}
              </p>

              <div className="flex gap-2">
                <input type="text" placeholder={t3('Niveau naam (bijv. Tribune)', 'Niveau (ex. Tribune)', 'Level name (e.g. Stand)')} value={newLevelName} onChange={e => setNewLevelName(e.target.value)} className={inputClass} onKeyDown={e => e.key === 'Enter' && addLocationLevel()} />
                <Button onClick={addLocationLevel} size="sm"><Plus className="w-4 h-4" /></Button>
              </div>

              {locationLevels.map((level, idx) => (
                <div key={level.id} className={`rounded-xl border bg-card overflow-hidden ${selectedLevelId === level.id ? 'border-primary' : 'border-border'}`}>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedLevelId(selectedLevelId === level.id ? null : level.id)}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-5">{idx + 1}.</span>
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{level.name}</span>
                      <Badge variant={level.is_required ? 'default' : 'outline'} className="text-[10px]">
                        {level.is_required ? t3('Verplicht', 'Obligatoire', 'Required') : t3('Optioneel', 'Optionnel', 'Optional')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] text-muted-foreground">{t3('Verplicht', 'Obligatoire', 'Required')}</span>
                        <Switch checked={level.is_required} onCheckedChange={() => toggleLevelRequired(level.id, level.is_required)} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteLocationLevel(level.id); }} className="text-destructive h-7 w-7">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {selectedLevelId === level.id && (
                    <div className="border-t border-border p-3 bg-muted/10 space-y-2">
                      <div className="flex gap-2">
                        <input type="text" placeholder={t3(`Optie voor "${level.name}"`, `Option pour "${level.name}"`, `Option for "${level.name}"`)} value={newOptionLabel} onChange={e => setNewOptionLabel(e.target.value)} className={inputClass + ' text-xs'} onKeyDown={e => e.key === 'Enter' && addLocationOption()} />
                        <Button onClick={addLocationOption} size="sm" variant="outline"><Plus className="w-3.5 h-3.5" /></Button>
                      </div>
                      {locationOptions.filter(o => o.level_id === level.id).map(opt => (
                        <div key={opt.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-background border border-border">
                          <span className="text-xs text-foreground">{opt.label}</span>
                          <Button variant="ghost" size="icon" onClick={() => deleteLocationOption(opt.id)} className="text-destructive h-6 w-6">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      {locationOptions.filter(o => o.level_id === level.id).length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-2">{t3('Voeg opties toe.', 'Ajoutez des options.', 'Add options.')}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {locationLevels.length === 0 && (
                <div className="text-center py-6">
                  <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">{t3('Geen locatie-niveaus ingesteld.', 'Aucun niveau.', 'No location levels.')}</p>
                </div>
              )}
            </TabsContent>

            {/* CHECKLIST */}
            <TabsContent value="checklist" className="space-y-3 mt-4">
              <div className="space-y-2">
                <input type="text" placeholder={t3('Checklist item beschrijving', 'Description', 'Description')} value={newChecklistDesc} onChange={e => setNewChecklistDesc(e.target.value)} className={inputClass} />
                <div className="flex gap-2">
                  <select value={newChecklistZone} onChange={e => setNewChecklistZone(e.target.value)} className={inputClass + ' flex-1'}>
                    <option value="">{t3('Geen zone', 'Pas de zone', 'No zone')}</option>
                    {clubZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                  <Button onClick={addChecklistItem} size="sm"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              {checklistItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate">{item.description}</span>
                    {item.zone_id && <Badge variant="outline" className="text-[10px] shrink-0">{clubZones.find(z => z.id === item.zone_id)?.name}</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteChecklistItem(item.id)} className="text-destructive h-8 w-8 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {checklistItems.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">{t3('Voeg checklist items toe.', 'Ajoutez des éléments.', 'Add checklist items.')}</p>}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SafetyConfigDialog;
