import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
}

interface EditEventDialogProps {
  event: EventData | null;
  onClose: () => void;
  onSaved: (updated: EventData) => void;
  language: Language;
}

const labels = {
  nl: { editEvent: 'Evenement bewerken', title: 'Evenementtitel', description: 'Beschrijving', date: 'Datum evenement', location: 'Locatie', cancel: 'Annuleren', save: 'Opslaan', saving: 'Opslaan...', updated: 'Evenement bijgewerkt!' },
  fr: { editEvent: "Modifier l'événement", title: "Titre de l'événement", description: 'Description', date: "Date de l'événement", location: 'Lieu', cancel: 'Annuler', save: 'Enregistrer', saving: 'Enregistrement...', updated: 'Événement mis à jour!' },
  en: { editEvent: 'Edit event', title: 'Event title', description: 'Description', date: 'Event date', location: 'Location', cancel: 'Cancel', save: 'Save', saving: 'Saving...', updated: 'Event updated!' },
};

export const EditEventDialog = ({ event, onClose, onSaved, language }: EditEventDialogProps) => {
  const l = labels[language];
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', location: '' });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title, description: event.description || '',
        event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
        location: event.location || '',
      });
    }
  }, [event]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setSaving(true);
    const { error } = await supabase.from('events').update({
      title: form.title.trim(), description: form.description.trim() || null,
      event_date: form.event_date || null, location: form.location.trim() || null,
    }).eq('id', event.id);
    if (error) { toast.error(error.message); } else {
      toast.success(l.updated);
      onSaved({ ...event, title: form.title.trim(), description: form.description.trim() || null, event_date: form.event_date || null, location: form.location.trim() || null });
      onClose();
    }
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <AnimatePresence>
      {event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">{l.editEvent}</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className={labelClass}>{l.title} *</label><input type="text" required maxLength={200} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>{l.description}</label><textarea rows={2} maxLength={2000} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>{l.date}</label><input type="datetime-local" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{l.location}</label><input type="text" maxLength={300} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className={inputClass} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">{l.cancel}</button>
                <button type="submit" disabled={saving || !form.title.trim()} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? l.saving : l.save}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
