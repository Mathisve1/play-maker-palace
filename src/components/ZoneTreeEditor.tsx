import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronRight, ChevronDown, Eye, EyeOff, Users, GripVertical, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Zone {
  id: string;
  task_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  max_capacity: number | null;
  is_visible: boolean;
  created_at: string;
}

interface ZoneTreeEditorProps {
  taskId: string;
  language: string;
  zoneSignupMode: string;
  zoneVisibleDepth: number | null;
  onSignupModeChange: (mode: string) => void;
  onVisibleDepthChange: (depth: number | null) => void;
}

const ZoneTreeEditor = ({ taskId, language, zoneSignupMode, zoneVisibleDepth, onSignupModeChange, onVisibleDepthChange }: ZoneTreeEditorProps) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null); // parent_id or 'root'
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [saving, setSaving] = useState(false);

  const t3 = (nlT: string, frT: string, enT: string) => language === 'fr' ? frT : language === 'en' ? enT : nlT;

  const fetchZones = useCallback(async () => {
    const { data, error } = await supabase.from('task_zones').select('*').eq('task_id', taskId).order('sort_order');
    if (!error && data) setZones(data);
    setLoading(false);
  }, [taskId]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const parentId = addingTo === 'root' ? null : addingTo;
    const siblings = zones.filter(z => z.parent_id === parentId);
    const { data, error } = await supabase.from('task_zones').insert({
      task_id: taskId,
      parent_id: parentId,
      name: newName.trim(),
      sort_order: siblings.length,
      max_capacity: newCapacity ? parseInt(newCapacity) : null,
      is_visible: true,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      setZones(prev => [...prev, data]);
      if (parentId) setExpanded(prev => new Set([...prev, parentId]));
      toast.success(t3('Zone toegevoegd!', 'Zone ajoutée !', 'Zone added!'));
    }
    setNewName('');
    setNewCapacity('');
    setAddingTo(null);
    setSaving(false);
  };

  const handleDelete = async (zoneId: string) => {
    const { error } = await supabase.from('task_zones').delete().eq('id', zoneId);
    if (error) toast.error(error.message);
    else {
      const removeIds = getDescendantIds(zoneId);
      removeIds.add(zoneId);
      setZones(prev => prev.filter(z => !removeIds.has(z.id)));
      toast.success(t3('Zone verwijderd!', 'Zone supprimée !', 'Zone deleted!'));
    }
  };

  const handleToggleVisibility = async (zone: Zone) => {
    const { error } = await (supabase as any).from('task_zones').update({ is_visible: !zone.is_visible }).eq('id', zone.id);
    if (!error) setZones(prev => prev.map(z => z.id === zone.id ? { ...z, is_visible: !z.is_visible } : z));
  };

  const getDescendantIds = (parentId: string): Set<string> => {
    const ids = new Set<string>();
    const children = zones.filter(z => z.parent_id === parentId);
    for (const c of children) {
      ids.add(c.id);
      const sub = getDescendantIds(c.id);
      sub.forEach(id => ids.add(id));
    }
    return ids;
  };

  const getChildren = (parentId: string | null) => zones.filter(z => z.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
  const getDepth = (zoneId: string | null): number => {
    if (!zoneId) return 0;
    const zone = zones.find(z => z.id === zoneId);
    return zone ? 1 + getDepth(zone.parent_id) : 0;
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderZone = (zone: Zone, depth: number) => {
    const children = getChildren(zone.id);
    const isExpanded = expanded.has(zone.id);
    const hasChildren = children.length > 0;

    return (
      <div key={zone.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <button onClick={() => hasChildren && toggleExpand(zone.id)} className={`w-5 h-5 flex items-center justify-center shrink-0 ${hasChildren ? 'text-muted-foreground hover:text-foreground' : 'text-transparent'}`}>
            {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
          </button>

          <span className="text-sm font-medium text-foreground flex-1 truncate">{zone.name}</span>

          {zone.max_capacity && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5">
              <Users className="w-3 h-3" /> {zone.max_capacity}
            </span>
          )}

          <button onClick={() => handleToggleVisibility(zone)} className={`p-1 rounded-lg transition-colors ${zone.is_visible ? 'text-accent hover:bg-accent/10' : 'text-muted-foreground hover:bg-muted'}`} title={zone.is_visible ? t3('Zichtbaar', 'Visible', 'Visible') : t3('Verborgen', 'Masqué', 'Hidden')}>
            {zone.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button onClick={() => { setAddingTo(zone.id); setNewName(''); setNewCapacity(''); }} className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100" title={t3('Sub-zone toevoegen', 'Ajouter une sous-zone', 'Add sub-zone')}>
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button onClick={() => handleDelete(zone.id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100" title={t3('Verwijderen', 'Supprimer', 'Delete')}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {addingTo === zone.id && (
          <div className="flex items-center gap-2 py-2" style={{ paddingLeft: `${(depth + 1) * 24 + 12}px` }}>
            <input type="text" placeholder={t3('Zone naam...', 'Nom de zone...', 'Zone name...')} value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            <input type="number" placeholder="Max" min={1} value={newCapacity} onChange={e => setNewCapacity(e.target.value)} className="w-16 px-2 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={handleAdd} disabled={saving || !newName.trim()} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t3('Toevoegen', 'Ajouter', 'Add')}
            </button>
            <button onClick={() => setAddingTo(null)} className="px-2 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground">✕</button>
          </div>
        )}

        {isExpanded && children.map(child => renderZone(child, depth + 1))}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const rootZones = getChildren(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t3('Inschrijfmodus', 'Mode d\'inscription', 'Signup mode')}
          </label>
          <select
            value={zoneSignupMode}
            onChange={e => onSignupModeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="club_only">{t3('Alleen club wijst toe', 'Le club attribue uniquement', 'Club assigns only')}</option>
            <option value="volunteer_choice">{t3('Vrijwilliger kiest zelf', 'Le bénévole choisit', 'Volunteer chooses')}</option>
            <option value="both">{t3('Beide (voorkeur + club bevestigt)', 'Les deux (préférence + club confirme)', 'Both (preference + club confirms)')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t3('Zichtbare diepte (leeg = alles)', 'Profondeur visible (vide = tout)', 'Visible depth (empty = all)')}
          </label>
          <input
            type="number"
            min={1}
            value={zoneVisibleDepth ?? ''}
            onChange={e => onVisibleDepthChange(e.target.value ? parseInt(e.target.value) : null)}
            placeholder={t3('Onbeperkt', 'Illimité', 'Unlimited')}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="border border-border rounded-2xl bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">{t3('Zone structuur', 'Structure des zones', 'Zone structure')}</h4>
          <button onClick={() => { setAddingTo('root'); setNewName(''); setNewCapacity(''); }} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> {t3('Zone toevoegen', 'Ajouter une zone', 'Add zone')}
          </button>
        </div>

        <div className="p-2 min-h-[80px]">
          {rootZones.length === 0 && addingTo !== 'root' ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t3('Nog geen zones. Voeg je eerste zone toe.', 'Pas encore de zones. Ajoutez votre première zone.', 'No zones yet. Add your first zone.')}</p>
          ) : (
            <>
              {rootZones.map(z => renderZone(z, 0))}
            </>
          )}

          {addingTo === 'root' && (
            <div className="flex items-center gap-2 py-2 px-3">
              <input type="text" placeholder={t3('Zone naam...', 'Nom de zone...', 'Zone name...')} value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              <input type="number" placeholder="Max" min={1} value={newCapacity} onChange={e => setNewCapacity(e.target.value)} className="w-16 px-2 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={handleAdd} disabled={saving || !newName.trim()} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t3('Toevoegen', 'Ajouter', 'Add')}
              </button>
              <button onClick={() => setAddingTo(null)} className="px-2 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground">✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoneTreeEditor;
