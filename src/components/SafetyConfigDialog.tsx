import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Shield, AlertTriangle, CheckCircle2, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface SafetyConfigDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  clubId: string;
}

interface Zone { id: string; name: string; status: string; color: string; sort_order: number; }
interface IncidentType { id: string; label: string; icon: string; color: string; default_priority: string; sort_order: number; }
interface ChecklistItem { id: string; description: string; zone_id: string | null; sort_order: number; }

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Laag', color: '#22c55e' },
  { value: 'medium', label: 'Gemiddeld', color: '#f59e0b' },
  { value: 'high', label: 'Hoog', color: '#ef4444' },
];

const SafetyConfigDialog = ({ open, onClose, eventId, clubId }: SafetyConfigDialogProps) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [newZoneName, setNewZoneName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#ef4444');
  const [newTypePriority, setNewTypePriority] = useState('medium');
  const [newChecklistDesc, setNewChecklistDesc] = useState('');
  const [newChecklistZone, setNewChecklistZone] = useState('');

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const [zRes, itRes, clRes] = await Promise.all([
        (supabase as any).from('safety_zones').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_incident_types').select('*').eq('club_id', clubId).order('sort_order'),
        (supabase as any).from('safety_checklist_items').select('*').eq('event_id', eventId).order('sort_order'),
      ]);
      setZones(zRes.data || []);
      setIncidentTypes(itRes.data || []);
      setChecklistItems(clRes.data || []);
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
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { setIncidentTypes(prev => [...prev, data]); setNewTypeName(''); toast.success('Incident type toegevoegd'); }
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
              <TabsTrigger value="zones" className="flex-1">Zones ({zones.length})</TabsTrigger>
              <TabsTrigger value="types" className="flex-1">Incident Types ({incidentTypes.length})</TabsTrigger>
              <TabsTrigger value="checklist" className="flex-1">Checklist ({checklistItems.length})</TabsTrigger>
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

            {/* INCIDENT TYPES */}
            <TabsContent value="types" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">Incident types gelden voor de hele club en verschijnen op het steward-scherm.</p>
              <div className="space-y-2">
                <input type="text" placeholder="Type naam (bijv. Medisch)" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className={inputClass} />
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
                    <div className="w-4 h-4 rounded" style={{ background: type.color }} />
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
