import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Shield, CheckCircle2, GripVertical, MapPin } from 'lucide-react';
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

interface Zone { id: string; name: string; status: string; color: string; sort_order: number; }
interface IncidentType { id: string; label: string; icon: string; color: string; default_priority: string; sort_order: number; emoji: string | null; }
interface ChecklistItem { id: string; description: string; zone_id: string | null; sort_order: number; }
interface LocationLevel { id: string; club_id: string; name: string; sort_order: number; is_required: boolean; }
interface LocationOption { id: string; level_id: string; label: string; sort_order: number; }

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Laag', color: '#22c55e' },
  { value: 'medium', label: 'Gemiddeld', color: '#f59e0b' },
  { value: 'high', label: 'Hoog', color: '#ef4444' },
];

const POPULAR_EMOJIS = [
  '🚑', '🔥', '⚠️', '🚨', '🩹', '💊', '🚓', '🛡️', '👊', '🍺',
  '🚪', '🔑', '📢', '🎯', '⛑️', '🧯', '💧', '⚡', '🚷', '🚫',
  '🤕', '🦺', '📍', '🅿️', '🚻', '🎪', '🏟️', '🚧', '🔒', '👀',
];

const SafetyConfigDialog = ({ open, onClose, eventId, clubId }: SafetyConfigDialogProps) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [locationLevels, setLocationLevels] = useState<LocationLevel[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [newZoneName, setNewZoneName] = useState('');
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

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const [zRes, itRes, clRes, llRes, loRes] = await Promise.all([
        (supabase as any).from('safety_zones').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_incident_types').select('*').eq('club_id', clubId).order('sort_order'),
        (supabase as any).from('safety_checklist_items').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_location_levels').select('*').eq('club_id', clubId).order('sort_order'),
        (supabase as any).from('safety_location_options').select('*').order('sort_order'),
      ]);
      setZones(zRes.data || []);
      setIncidentTypes(itRes.data || []);
      setChecklistItems(clRes.data || []);
      const levels = llRes.data || [];
      setLocationLevels(levels);
      // Filter options to only those belonging to club levels
      const levelIds = new Set(levels.map((l: LocationLevel) => l.id));
      setLocationOptions((loRes.data || []).filter((o: LocationOption) => levelIds.has(o.level_id)));
      if (levels.length > 0 && !selectedLevelId) setSelectedLevelId(levels[0].id);
      setLoading(false);
    };
    load();
  }, [open, eventId, clubId]);

  // ── Zones ──
  const addZone = async () => {
    if (!newZoneName.trim()) return;
    const { data, error } = await (supabase as any).from('safety_zones').insert({
      event_id: eventId, club_id: clubId, name: newZoneName.trim(), sort_order: zones.length,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { setZones(prev => [...prev, data]); setNewZoneName(''); toast.success('Zone toegevoegd'); }
  };

  const deleteZone = async (id: string) => {
    await (supabase as any).from('safety_zones').delete().eq('id', id);
    setZones(prev => prev.filter(z => z.id !== id));
    toast.success('Zone verwijderd');
  };

  // ── Incident Types (club-wide) ──
  const addIncidentType = async () => {
    if (!newTypeName.trim()) return;
    const { data, error } = await (supabase as any).from('safety_incident_types').insert({
      club_id: clubId, label: newTypeName.trim(), color: newTypeColor,
      default_priority: newTypePriority, sort_order: incidentTypes.length,
      emoji: newTypeEmoji || null,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { setIncidentTypes(prev => [...prev, data]); setNewTypeName(''); setNewTypeEmoji(''); toast.success('Incident type toegevoegd'); }
  };

  const deleteIncidentType = async (id: string) => {
    await (supabase as any).from('safety_incident_types').delete().eq('id', id);
    setIncidentTypes(prev => prev.filter(t => t.id !== id));
    toast.success('Incident type verwijderd');
  };

  // ── Checklist Items ──
  const addChecklistItem = async () => {
    if (!newChecklistDesc.trim()) return;
    const { data, error } = await (supabase as any).from('safety_checklist_items').insert({
      event_id: eventId, club_id: clubId, description: newChecklistDesc.trim(),
      zone_id: newChecklistZone || null, sort_order: checklistItems.length,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { setChecklistItems(prev => [...prev, data]); setNewChecklistDesc(''); setNewChecklistZone(''); toast.success('Checklist item toegevoegd'); }
  };

  const deleteChecklistItem = async (id: string) => {
    await (supabase as any).from('safety_checklist_items').delete().eq('id', id);
    setChecklistItems(prev => prev.filter(i => i.id !== id));
    toast.success('Item verwijderd');
  };

  // ── Location Levels ──
  const addLocationLevel = async () => {
    if (!newLevelName.trim()) return;
    const { data, error } = await (supabase as any).from('safety_location_levels').insert({
      club_id: clubId, name: newLevelName.trim(), sort_order: locationLevels.length,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      setLocationLevels(prev => [...prev, data]);
      setNewLevelName('');
      if (!selectedLevelId) setSelectedLevelId(data.id);
      toast.success('Locatie niveau toegevoegd');
    }
  };

  const deleteLocationLevel = async (id: string) => {
    await (supabase as any).from('safety_location_levels').delete().eq('id', id);
    setLocationLevels(prev => prev.filter(l => l.id !== id));
    setLocationOptions(prev => prev.filter(o => o.level_id !== id));
    if (selectedLevelId === id) setSelectedLevelId(locationLevels.find(l => l.id !== id)?.id || null);
    toast.success('Niveau verwijderd');
  };

  const toggleLevelRequired = async (id: string, current: boolean) => {
    await (supabase as any).from('safety_location_levels').update({ is_required: !current }).eq('id', id);
    setLocationLevels(prev => prev.map(l => l.id === id ? { ...l, is_required: !current } : l));
  };

  // ── Location Options ──
  const addLocationOption = async () => {
    if (!newOptionLabel.trim() || !selectedLevelId) return;
    const { data, error } = await (supabase as any).from('safety_location_options').insert({
      level_id: selectedLevelId, label: newOptionLabel.trim(),
      sort_order: locationOptions.filter(o => o.level_id === selectedLevelId).length,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { setLocationOptions(prev => [...prev, data]); setNewOptionLabel(''); toast.success('Optie toegevoegd'); }
  };

  const deleteLocationOption = async (id: string) => {
    await (supabase as any).from('safety_location_options').delete().eq('id', id);
    setLocationOptions(prev => prev.filter(o => o.id !== id));
    toast.success('Optie verwijderd');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Safety & Security Configuratie
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <Tabs defaultValue="zones" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="zones" className="flex-1 text-xs">Zones ({zones.length})</TabsTrigger>
              <TabsTrigger value="types" className="flex-1 text-xs">Meldingen ({incidentTypes.length})</TabsTrigger>
              <TabsTrigger value="locatie" className="flex-1 text-xs">Locatie ({locationLevels.length})</TabsTrigger>
              <TabsTrigger value="checklist" className="flex-1 text-xs">Checklist ({checklistItems.length})</TabsTrigger>
            </TabsList>

            {/* ZONES */}
            <TabsContent value="zones" className="space-y-3 mt-4">
              <div className="flex gap-2">
                <input type="text" placeholder="Zone naam" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} className={inputClass} onKeyDown={e => e.key === 'Enter' && addZone()} />
                <Button onClick={addZone} size="sm"><Plus className="w-4 h-4" /></Button>
              </div>
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: zone.color }} />
                    <span className="text-sm font-medium text-foreground">{zone.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteZone(zone.id)} className="text-destructive h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {zones.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Voeg zones toe die het evenementterrein indelen.</p>}
            </TabsContent>

            {/* INCIDENT TYPES (sneltoetsen) */}
            <TabsContent value="types" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">Stel hier de sneltoetsen in die stewards zien om incidenten te melden. Kies zelf wat relevant is voor jullie club.</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-10 h-10 rounded-xl border border-input bg-background flex items-center justify-center text-lg hover:bg-muted/50 transition-colors"
                      title="Emoji kiezen (optioneel)"
                    >
                      {newTypeEmoji || '😀'}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-12 left-0 z-50 bg-card border border-border rounded-xl shadow-lg p-3 w-[280px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Kies een emoji (optioneel)</span>
                          {newTypeEmoji && (
                            <button onClick={() => { setNewTypeEmoji(''); setShowEmojiPicker(false); }} className="text-xs text-destructive hover:underline">Verwijder</button>
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
                  <input type="text" placeholder="Type naam (bijv. Medisch)" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className={inputClass + ' flex-1'} />
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
                    {type.emoji ? (
                      <span className="text-lg">{type.emoji}</span>
                    ) : (
                      <div className="w-4 h-4 rounded" style={{ background: type.color }} />
                    )}
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
              {incidentTypes.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Voeg sneltoetsen toe die stewards gebruiken om snel te melden.</p>}
            </TabsContent>

            {/* LOCATION LEVELS */}
            <TabsContent value="locatie" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">
                Maak locatie-niveaus aan die stewards invullen bij een melding. Bijv. "Tribune" → "Vak" → "Rij". Per niveau kan je opties aanmaken en instellen of het verplicht is.
              </p>

              {/* Add level */}
              <div className="flex gap-2">
                <input type="text" placeholder="Niveau naam (bijv. Tribune)" value={newLevelName} onChange={e => setNewLevelName(e.target.value)} className={inputClass} onKeyDown={e => e.key === 'Enter' && addLocationLevel()} />
                <Button onClick={addLocationLevel} size="sm"><Plus className="w-4 h-4" /></Button>
              </div>

              {/* Levels list */}
              {locationLevels.map((level, idx) => (
                <div key={level.id} className={`rounded-xl border bg-card overflow-hidden ${selectedLevelId === level.id ? 'border-primary' : 'border-border'}`}>
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedLevelId(selectedLevelId === level.id ? null : level.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-5">{idx + 1}.</span>
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{level.name}</span>
                      <Badge variant={level.is_required ? 'default' : 'outline'} className="text-[10px]">
                        {level.is_required ? 'Verplicht' : 'Optioneel'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] text-muted-foreground">Verplicht</span>
                        <Switch checked={level.is_required} onCheckedChange={() => toggleLevelRequired(level.id, level.is_required)} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteLocationLevel(level.id); }} className="text-destructive h-7 w-7">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Options panel */}
                  {selectedLevelId === level.id && (
                    <div className="border-t border-border p-3 bg-muted/10 space-y-2">
                      <div className="flex gap-2">
                        <input type="text" placeholder={`Optie voor "${level.name}" (bijv. Hoofdtribune)`} value={newOptionLabel} onChange={e => setNewOptionLabel(e.target.value)} className={inputClass + ' text-xs'} onKeyDown={e => e.key === 'Enter' && addLocationOption()} />
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
                        <p className="text-[10px] text-muted-foreground text-center py-2">Voeg opties toe voor dit niveau.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {locationLevels.length === 0 && (
                <div className="text-center py-6">
                  <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">Geen locatie-niveaus ingesteld.</p>
                  <p className="text-muted-foreground text-xs">Stewards melden dan alleen met GPS en zone.</p>
                </div>
              )}
            </TabsContent>

            {/* CHECKLIST */}
            <TabsContent value="checklist" className="space-y-3 mt-4">
              <div className="space-y-2">
                <input type="text" placeholder="Checklist item beschrijving" value={newChecklistDesc} onChange={e => setNewChecklistDesc(e.target.value)} className={inputClass} />
                <div className="flex gap-2">
                  <select value={newChecklistZone} onChange={e => setNewChecklistZone(e.target.value)} className={inputClass + ' flex-1'}>
                    <option value="">Geen zone</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                  <Button onClick={addChecklistItem} size="sm"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              {checklistItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate">{item.description}</span>
                    {item.zone_id && <Badge variant="outline" className="text-[10px] shrink-0">{zones.find(z => z.id === item.zone_id)?.name}</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteChecklistItem(item.id)} className="text-destructive h-8 w-8 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {checklistItems.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Voeg checklist items toe die stewards moeten afvinken.</p>}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SafetyConfigDialog;
