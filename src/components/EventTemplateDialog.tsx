import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Trash2, Loader2, Plus, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';

interface TemplateGroup {
  name: string;
  color: string;
  wristband_color?: string | null;
  wristband_label?: string | null;
  materials_note?: string | null;
  tasks: { title: string; spots_available: number }[];
}

interface EventTemplate {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  groups: TemplateGroup[];
  created_at: string;
}

interface EventTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  language: Language;
  onCreateFromTemplate: (template: EventTemplate) => void;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

const EventTemplateDialog = ({ open, onClose, clubId, language, onCreateFromTemplate }: EventTemplateDialogProps) => {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from('event_templates')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => {
        setTemplates((data || []).map((t: any) => ({
          ...t,
          groups: Array.isArray(t.groups) ? t.groups : [],
        })));
        setLoading(false);
      });
  }, [open, clubId]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await (supabase as any).from('event_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success(t3(language, 'Sjabloon verwijderd', 'Modèle supprimé', 'Template deleted'));
    setDeleting(null);
  };

  const totalTasks = (groups: TemplateGroup[]) =>
    groups.reduce((sum, g) => sum + (g.tasks?.length || 0), 0);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-lg max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {t3(language, 'Event sjablonen', 'Modèles d\'événement', 'Event templates')}
              </h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t3(language, 'Nog geen sjablonen. Sla een evenement op als sjabloon via het ⋯ menu.', 'Pas encore de modèles. Sauvegardez un événement comme modèle via le menu ⋯.', 'No templates yet. Save an event as template via the ⋯ menu.')}</p>
                </div>
              ) : templates.map(tmpl => (
                <div key={tmpl.id} className="rounded-xl border border-border p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{tmpl.name}</p>
                      {tmpl.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tmpl.description}</p>}
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{tmpl.groups.length} {t3(language, 'groepen', 'groupes', 'groups')}</span>
                        <span>{totalTasks(tmpl.groups)} {t3(language, 'taken', 'tâches', 'tasks')}</span>
                        {tmpl.location && <span className="truncate max-w-[120px]">{tmpl.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { onCreateFromTemplate(tmpl); onClose(); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t3(language, 'Gebruiken', 'Utiliser', 'Use')}
                      </button>
                      <button
                        onClick={() => handleDelete(tmpl.id)}
                        disabled={deleting === tmpl.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        {deleting === tmpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EventTemplateDialog;
