import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';
import { sendPush } from '@/lib/sendPush';

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  contract_template_id?: string | null;
  compensation_type?: string;
  hourly_rate?: number | null;
  estimated_hours?: number | null;
}

interface EditTaskDialogProps {
  task: Task | null;
  onClose: () => void;
  onSaved: (updated: Partial<Task>) => void;
  contractTemplates: { id: string; name: string }[];
  language: Language;
}

const labels = {
  nl: { editTask: 'Taak bewerken', title: 'Titel', description: 'Beschrijving', date: 'Datum', location: 'Locatie', spots: 'Aantal plaatsen', briefingTime: 'Briefing tijd', briefingLocation: 'Briefing locatie', startTime: 'Starttijd', endTime: 'Eindtijd', notes: 'Notities', expense: 'Onkostenvergoeding', amount: 'Bedrag (€)', template: 'Contractsjabloon', selectTemplate: 'Selecteer een sjabloon...', cancel: 'Annuleren', save: 'Opslaan', saving: 'Opslaan...', waitlist: 'Wachtlijst activeren' },
  fr: { editTask: 'Modifier la tâche', title: 'Titre', description: 'Description', date: 'Date', location: 'Lieu', spots: 'Nombre de places', briefingTime: 'Heure de briefing', briefingLocation: 'Lieu de briefing', startTime: 'Heure de début', endTime: 'Heure de fin', notes: 'Notes', expense: 'Remboursement des frais', amount: 'Montant (€)', template: 'Modèle de contrat', selectTemplate: 'Sélectionnez un modèle...', cancel: 'Annuler', save: 'Enregistrer', saving: 'Enregistrement...', waitlist: 'Activer la liste d\'attente' },
  en: { editTask: 'Edit task', title: 'Title', description: 'Description', date: 'Date', location: 'Location', spots: 'Available spots', briefingTime: 'Briefing time', briefingLocation: 'Briefing location', startTime: 'Start time', endTime: 'End time', notes: 'Notes', expense: 'Expense reimbursement', amount: 'Amount (€)', template: 'Contract template', selectTemplate: 'Select a template...', cancel: 'Cancel', save: 'Save', saving: 'Saving...', waitlist: 'Enable waitlist' },
};

export const EditTaskDialog = ({ task, onClose, onSaved, contractTemplates, language }: EditTaskDialogProps) => {
  const l = labels[language];
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', task_date: '', location: '', spots_available: 1,
    briefing_time: '', briefing_location: '', start_time: '', end_time: '',
    notes: '', expense_reimbursement: false, expense_amount: '', contract_template_id: '',
    compensation_type: 'fixed', hourly_rate: '', estimated_hours: '',
    waitlist_enabled: false,
  });

  useEffect(() => {
    if (!task) return;
    supabase.from('tasks').select('*').eq('id', task.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          title: data.title, description: data.description || '',
          task_date: data.task_date ? new Date(data.task_date).toISOString().slice(0, 16) : '',
          location: data.location || '', spots_available: data.spots_available || 1,
          briefing_time: data.briefing_time ? new Date(data.briefing_time).toISOString().slice(0, 16) : '',
          briefing_location: data.briefing_location || '',
          start_time: data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : '',
          end_time: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : '',
          notes: data.notes || '', expense_reimbursement: data.expense_reimbursement || false,
          expense_amount: data.expense_amount ? String(data.expense_amount) : '',
          contract_template_id: data.contract_template_id || '',
          compensation_type: (data as any).compensation_type || 'fixed',
          hourly_rate: (data as any).hourly_rate ? String((data as any).hourly_rate) : '',
          estimated_hours: (data as any).estimated_hours ? String((data as any).estimated_hours) : '',
          waitlist_enabled: (data as any).waitlist_enabled || false,
        });
      }
    });
  }, [task]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    const updateData: Record<string, unknown> = {
      title: form.title.trim(), description: form.description.trim() || null,
      task_date: form.task_date || null, location: form.location.trim() || null,
      spots_available: form.spots_available,
      briefing_time: form.briefing_time || null, briefing_location: form.briefing_location.trim() || null,
      start_time: form.start_time || null, end_time: form.end_time || null,
      notes: form.notes.trim() || null,
      expense_reimbursement: form.compensation_type === 'fixed' ? form.expense_reimbursement : false,
      expense_amount: form.compensation_type === 'fixed' && form.expense_reimbursement && form.expense_amount ? parseFloat(form.expense_amount) : null,
      contract_template_id: form.contract_template_id || null,
      compensation_type: form.compensation_type,
      hourly_rate: form.compensation_type === 'hourly' && form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      estimated_hours: form.compensation_type === 'hourly' && form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      waitlist_enabled: form.waitlist_enabled,
    };
    const { error } = await supabase.from('tasks').update(updateData as any).eq('id', task.id);
    if (error) { toast.error(error.message); } else {
      toast.success(language === 'nl' ? 'Taak bijgewerkt!' : 'Task updated!');

      // Notify partner admins if this is a partner task
      try {
        const { data: fullTask } = await supabase.from('tasks').select('partner_only, assigned_partner_id, club_id, title').eq('id', task.id).maybeSingle();
        if (fullTask?.partner_only && fullTask?.assigned_partner_id) {
          const { data: club } = await supabase.from('clubs').select('name').eq('id', fullTask.club_id).maybeSingle();
          const { data: admins } = await supabase.from('partner_admins').select('user_id').eq('partner_id', fullTask.assigned_partner_id);
          for (const a of admins || []) {
            sendPush({
              userId: a.user_id,
              title: `📋 Taakupdate van ${club?.name || 'club'}`,
              message: `${fullTask.title} is gewijzigd. Bekijk de details.`,
              url: '/partner-dashboard',
              type: 'task_update',
              clubId: fullTask.club_id,
            });
          }
        }
      } catch { /* silent */ }

      onSaved({ title: form.title.trim(), description: form.description.trim() || null, task_date: form.task_date || null, location: form.location.trim() || null, spots_available: form.spots_available, contract_template_id: form.contract_template_id || null });
      onClose();
    }
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <AnimatePresence>
      {task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">{l.editTask}</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>{l.template}</label>
                <select value={form.contract_template_id} onChange={e => setForm(p => ({ ...p, contract_template_id: e.target.value }))} className={inputClass}>
                  <option value="">{l.selectTemplate}</option>
                  {contractTemplates.map(tmpl => <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{l.title} *</label>
                <input type="text" required maxLength={200} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{l.description}</label>
                <textarea rows={3} maxLength={2000} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>{l.date}</label><input type="datetime-local" value={form.task_date} onChange={e => setForm(p => ({ ...p, task_date: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{l.location}</label><input type="text" maxLength={300} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{l.spots}</label><input type="number" min={1} max={999} value={form.spots_available} onChange={e => setForm(p => ({ ...p, spots_available: parseInt(e.target.value) || 1 }))} className={inputClass} /></div>
                <div><label className={labelClass}>{l.briefingLocation}</label><input type="text" maxLength={300} value={form.briefing_location} onChange={e => setForm(p => ({ ...p, briefing_location: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{l.briefingTime}</label><input type="datetime-local" value={form.briefing_time} onChange={e => setForm(p => ({ ...p, briefing_time: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{l.startTime}</label><input type="datetime-local" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{l.endTime}</label><input type="datetime-local" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{l.notes}</label><input type="text" maxLength={500} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} /></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.expense_reimbursement} onChange={e => setForm(p => ({ ...p, expense_reimbursement: e.target.checked }))} className="w-4 h-4 rounded border-input accent-primary" />
                  <span className="text-sm text-foreground">{l.expense}</span>
                </label>
                {form.expense_reimbursement && (
                  <input type="number" min={0} step={0.01} placeholder={l.amount} value={form.expense_amount} onChange={e => setForm(p => ({ ...p, expense_amount: e.target.value }))} className={inputClass + ' max-w-[150px]'} />
                )}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.waitlist_enabled} onChange={e => setForm(p => ({ ...p, waitlist_enabled: e.target.checked }))} className="w-4 h-4 rounded border-input accent-primary" />
                  <span className="text-sm text-foreground">{l.waitlist}</span>
                </label>
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
