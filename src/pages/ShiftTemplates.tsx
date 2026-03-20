import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Clock, Users, MapPin,
  X, Loader2, ArrowLeft, Layers, Timer,
  ChevronRight, AlertTriangle, Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ShiftTemplate {
  id: string;
  name: string;
  description: string | null;
  slot_count: number;
}

interface TemplateSlot {
  id: string;
  template_id: string;
  role_name: string;
  location: string;
  required_volunteers: number;
  start_offset_minutes: number;
  duration_minutes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

const templateSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht').max(100),
  description: z.string().max(500).optional().default(''),
});

const slotSchema = z.object({
  role_name: z.string().min(1, 'Rol is verplicht').max(60),
  location: z.string().max(80).optional().default(''),
  required_volunteers: z.coerce.number().int().min(1, 'Min. 1 persoon').max(500),
  start_offset_minutes: z.coerce.number().int().min(-720).max(720),
  duration_minutes: z.coerce.number().int().min(5, 'Min. 5 minuten').max(1440),
});

type TemplateFormData = z.infer<typeof templateSchema>;
type SlotFormData = z.infer<typeof slotSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const L: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Rooster Sjablonen',
    back: 'Terug',
    newTemplate: 'Nieuw Sjabloon',
    noTemplates: 'Nog geen sjablonen',
    noTemplatesDesc: 'Maak een sjabloon aan met vaste diensten zodat je een volledig wedstrijdrooster in één klik kunt genereren.',
    selectTemplate: 'Selecteer een sjabloon',
    selectTemplateDesc: 'Klik op een sjabloon links om de diensten te bekijken en te bewerken.',
    slots: 'dienst', slotsPlural: 'diensten',
    addSlot: 'Voeg Dienst Toe',
    noSlots: 'Nog geen diensten in dit sjabloon',
    noSlotsDesc: 'Voeg diensten toe om het sjabloon te vullen. Elke dienst wordt getimed ten opzichte van de aftrap.',
    editTemplate: 'Sjabloon bewerken',
    deleteTemplate: 'Verwijder sjabloon',
    deleteConfirm: 'Weet je zeker? Dit verwijdert ook alle diensten.',
    deleteSlotConfirm: 'Dienst verwijderen?',
    yes: 'Ja, verwijder',
    cancel: 'Annuleren',
    saving: 'Opslaan...',
    save: 'Opslaan',
    creating: 'Aanmaken...',
    create: 'Aanmaken',
    roleName: 'Rol / Functie',
    roleNamePlaceholder: 'Bijv. Steward, Barman, EHBO...',
    locationLabel: 'Locatie (optioneel)',
    locationPlaceholder: 'Bijv. Tribune Noord, Kantine...',
    volunteersRequired: 'Aantal vrijwilligers',
    offsetLabel: 'Starttijd t.o.v. aftrap (minuten)',
    offsetHint: 'Negatief = vóór aftrap  ·  0 = bij aftrap  ·  Positief = na aftrap',
    durationLabel: 'Duur (minuten)',
    templateNameLabel: 'Naam van het sjabloon',
    templateNamePlaceholder: 'Bijv. Thuiswedstrijd 1e Elftal',
    descriptionLabel: 'Beschrijving (optioneel)',
    descriptionPlaceholder: 'Bijv. Standaard bezetting voor thuiswedstrijden...',
    newSlotTitle: 'Nieuwe Dienst Toevoegen',
    editSlotTitle: 'Dienst Bewerken',
    newTemplateTitle: 'Nieuw Sjabloon',
    beforeKickoff: 'voor aftrap',
    afterKickoff: 'na aftrap',
    atKickoff: 'Bij aftrap',
    duration: 'duur',
    persons: 'personen', person: 'persoon',
    savedOk: 'Opgeslagen!',
    deletedOk: 'Verwijderd.',
    errorSave: 'Opslaan mislukt. Probeer opnieuw.',
    errorDelete: 'Verwijderen mislukt.',
    quickRoles: 'Snelle keuze:',
  },
  fr: {
    title: 'Modèles de Rôster',
    back: 'Retour',
    newTemplate: 'Nouveau Modèle',
    noTemplates: 'Aucun modèle',
    noTemplatesDesc: 'Créez un modèle avec des shifts prédéfinis pour générer un planning complet en un clic.',
    selectTemplate: 'Sélectionnez un modèle',
    selectTemplateDesc: 'Cliquez sur un modèle à gauche pour voir et modifier ses shifts.',
    slots: 'shift', slotsPlural: 'shifts',
    addSlot: 'Ajouter un Shift',
    noSlots: 'Aucun shift dans ce modèle',
    noSlotsDesc: 'Ajoutez des shifts pour remplir ce modèle. Chaque shift est planifié par rapport au coup d\'envoi.',
    editTemplate: 'Modifier le modèle',
    deleteTemplate: 'Supprimer le modèle',
    deleteConfirm: 'Supprimer aussi tous les shifts de ce modèle ?',
    deleteSlotConfirm: 'Supprimer ce shift ?',
    yes: 'Oui, supprimer',
    cancel: 'Annuler',
    saving: 'Enregistrement...',
    save: 'Enregistrer',
    creating: 'Création...',
    create: 'Créer',
    roleName: 'Rôle / Fonction',
    roleNamePlaceholder: 'Ex. Steward, Barman, Secours...',
    locationLabel: 'Emplacement (optionnel)',
    locationPlaceholder: 'Ex. Tribune Nord, Buvette...',
    volunteersRequired: 'Bénévoles requis',
    offsetLabel: 'Heure de départ par rapport au coup d\'envoi (minutes)',
    offsetHint: 'Négatif = avant  ·  0 = au coup d\'envoi  ·  Positif = après',
    durationLabel: 'Durée (minutes)',
    templateNameLabel: 'Nom du modèle',
    templateNamePlaceholder: 'Ex. Match à domicile 1re équipe',
    descriptionLabel: 'Description (optionnel)',
    descriptionPlaceholder: 'Ex. Effectif standard pour les matchs à domicile...',
    newSlotTitle: 'Ajouter un Shift',
    editSlotTitle: 'Modifier le Shift',
    newTemplateTitle: 'Nouveau Modèle',
    beforeKickoff: 'avant le coup d\'envoi',
    afterKickoff: 'après le coup d\'envoi',
    atKickoff: 'Au coup d\'envoi',
    duration: 'durée',
    persons: 'personnes', person: 'personne',
    savedOk: 'Enregistré !',
    deletedOk: 'Supprimé.',
    errorSave: 'Échec de l\'enregistrement.',
    errorDelete: 'Échec de la suppression.',
    quickRoles: 'Sélection rapide :',
  },
  en: {
    title: 'Shift Templates',
    back: 'Back',
    newTemplate: 'New Template',
    noTemplates: 'No templates yet',
    noTemplatesDesc: 'Create a template with pre-set shifts so you can generate a full match roster in one click.',
    selectTemplate: 'Select a template',
    selectTemplateDesc: 'Click a template on the left to view and edit its shifts.',
    slots: 'shift', slotsPlural: 'shifts',
    addSlot: 'Add Shift',
    noSlots: 'No shifts in this template',
    noSlotsDesc: 'Add shifts to fill this template. Each shift is timed relative to kick-off.',
    editTemplate: 'Edit template',
    deleteTemplate: 'Delete template',
    deleteConfirm: 'This will also delete all shifts. Are you sure?',
    deleteSlotConfirm: 'Delete this shift?',
    yes: 'Yes, delete',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save',
    creating: 'Creating...',
    create: 'Create',
    roleName: 'Role / Function',
    roleNamePlaceholder: 'E.g. Steward, Bartender, First Aid...',
    locationLabel: 'Location (optional)',
    locationPlaceholder: 'E.g. North Stand, Canteen...',
    volunteersRequired: 'Volunteers required',
    offsetLabel: 'Start time relative to kick-off (minutes)',
    offsetHint: 'Negative = before kick-off  ·  0 = at kick-off  ·  Positive = after kick-off',
    durationLabel: 'Duration (minutes)',
    templateNameLabel: 'Template name',
    templateNamePlaceholder: 'E.g. Sunday Home Match',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'E.g. Standard staffing for home matches...',
    newSlotTitle: 'Add Shift',
    editSlotTitle: 'Edit Shift',
    newTemplateTitle: 'New Template',
    beforeKickoff: 'before kick-off',
    afterKickoff: 'after kick-off',
    atKickoff: 'At kick-off',
    duration: 'duration',
    persons: 'persons', person: 'person',
    savedOk: 'Saved!',
    deletedOk: 'Deleted.',
    errorSave: 'Save failed. Try again.',
    errorDelete: 'Delete failed.',
    quickRoles: 'Quick select:',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ROLES = ['Steward', 'Barman', 'EHBO', 'Parkeren', 'Kassa', 'Security', 'Materiaal'];

const formatOffset = (minutes: number, l: Record<string, string>): string => {
  if (minutes === 0) return l.atKickoff;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const timeStr = h > 0
    ? (m > 0 ? `${h}u${String(m).padStart(2, '0')}` : `${h}u`)
    : `${m} min`;
  return `${timeStr} ${minutes < 0 ? l.beforeKickoff : l.afterKickoff}`;
};

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}u`;
  return `${h}u${String(m).padStart(2, '0')}`;
};

const offsetColor = (minutes: number) => {
  if (minutes < 0) return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-100 dark:border-blue-900/40';
  if (minutes === 0) return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-100 dark:border-violet-900/40';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-100 dark:border-amber-900/40';
};

// ─────────────────────────────────────────────────────────────────────────────
// Slot Dialog (add / edit)
// ─────────────────────────────────────────────────────────────────────────────

interface SlotDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  templateId: string;
  editing?: TemplateSlot | null;
  l: Record<string, string>;
}

const SlotDialog = ({ open, onClose, onSaved, templateId, editing, l }: SlotDialogProps) => {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<SlotFormData>({
    resolver: zodResolver(slotSchema),
    defaultValues: { role_name: '', location: '', required_volunteers: 1, start_offset_minutes: -60, duration_minutes: 120 },
  });

  const offsetVal = watch('start_offset_minutes');
  const durationVal = watch('duration_minutes');
  const parsedOffset = Number(offsetVal);
  const parsedDuration = Number(durationVal);

  useEffect(() => {
    if (open) {
      reset(editing
        ? { role_name: editing.role_name, location: editing.location, required_volunteers: editing.required_volunteers, start_offset_minutes: editing.start_offset_minutes, duration_minutes: editing.duration_minutes }
        : { role_name: '', location: '', required_volunteers: 1, start_offset_minutes: -60, duration_minutes: 120 }
      );
    }
  }, [open, editing, reset]);

  const onSubmit = async (data: SlotFormData) => {
    const payload = {
      template_id: templateId,
      role_name: data.role_name,
      location: data.location || '',
      required_volunteers: data.required_volunteers,
      start_offset_minutes: data.start_offset_minutes,
      duration_minutes: data.duration_minutes,
    };

    let error;
    if (editing) {
      ({ error } = await (supabase as any).from('shift_template_slots').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await (supabase as any).from('shift_template_slots').insert(payload));
    }

    if (error) { toast.error(l.errorSave); return; }
    toast.success(l.savedOk);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
            {editing ? l.editSlotTitle : l.newSlotTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

          {/* Role name + quick-select chips */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {l.roleName} *
            </Label>
            <Input
              {...register('role_name')}
              placeholder={l.roleNamePlaceholder}
              className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
            {errors.role_name && <p className="text-xs text-red-600">{errors.role_name.message}</p>}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-gray-400 self-center">{l.quickRoles}</span>
              {QUICK_ROLES.map(r => (
                <button key={r} type="button"
                  onClick={() => setValue('role_name', r)}
                  className="px-2 py-0.5 text-[11px] rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-700 hover:border-blue-200 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {l.locationLabel}
            </Label>
            <Input
              {...register('location')}
              placeholder={l.locationPlaceholder}
              className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </div>

          {/* Volunteers + Duration on same row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {l.volunteersRequired} *
              </Label>
              <Input
                {...register('required_volunteers')}
                type="number" min={1} max={500}
                className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
              {errors.required_volunteers && <p className="text-xs text-red-600">{errors.required_volunteers.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {l.durationLabel} *
              </Label>
              <Input
                {...register('duration_minutes')}
                type="number" min={5} step={15}
                className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
              {errors.duration_minutes && <p className="text-xs text-red-600">{errors.duration_minutes.message}</p>}
              {!isNaN(parsedDuration) && parsedDuration >= 5 && (
                <p className="text-[10px] text-gray-400">{formatDuration(parsedDuration)}</p>
              )}
            </div>
          </div>

          {/* Start offset — the secret sauce */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {l.offsetLabel} *
            </Label>
            <div className="flex items-center gap-3">
              <Input
                {...register('start_offset_minutes')}
                type="number" min={-720} max={720} step={15}
                className="h-10 w-28 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono"
              />
              {!isNaN(parsedOffset) && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                  offsetColor(parsedOffset)
                )}>
                  <Timer className="w-3 h-3" />
                  {formatOffset(parsedOffset, l)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400">{l.offsetHint}</p>
            {errors.start_offset_minutes && <p className="text-xs text-red-600">{errors.start_offset_minutes.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {l.cancel}
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? (editing ? l.saving : l.creating) : (editing ? l.save : l.create)}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Template Form Dialog (create / edit)
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  clubId: string;
  editing?: ShiftTemplate | null;
  l: Record<string, string>;
}

const TemplateDialog = ({ open, onClose, onSaved, clubId, editing, l }: TemplateDialogProps) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset(editing
        ? { name: editing.name, description: editing.description || '' }
        : { name: '', description: '' }
      );
    }
  }, [open, editing, reset]);

  const onSubmit = async (data: TemplateFormData) => {
    if (editing) {
      const { error } = await (supabase as any)
        .from('shift_templates').update({ name: data.name, description: data.description || null }).eq('id', editing.id);
      if (error) { toast.error(l.errorSave); return; }
      toast.success(l.savedOk);
      onSaved(editing.id);
    } else {
      const { data: row, error } = await (supabase as any)
        .from('shift_templates').insert({ club_id: clubId, name: data.name, description: data.description || null }).select('id').single();
      if (error || !row) { toast.error(l.errorSave); return; }
      toast.success(l.savedOk);
      onSaved(row.id);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
            {editing ? l.editTemplate : l.newTemplateTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {l.templateNameLabel} *
            </Label>
            <Input
              {...register('name')}
              placeholder={l.templateNamePlaceholder}
              className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {l.descriptionLabel}
            </Label>
            <textarea
              {...register('description')}
              placeholder={l.descriptionPlaceholder}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {l.cancel}
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? (editing ? l.saving : l.creating) : (editing ? l.save : l.create)}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const ShiftTemplates = () => {
  const navigate = useNavigate();
  const { clubId } = useClubContext();
  const { language } = useLanguage();
  const l = L[language as Language] ?? L.nl;

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [slots, setSlots] = useState<TemplateSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'builder'>('list');

  // Dialogs
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; editing: ShiftTemplate | null }>({ open: false, editing: null });
  const [slotDialog, setSlotDialog] = useState<{ open: boolean; editing: TemplateSlot | null }>({ open: false, editing: null });

  // Inline delete confirmations
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<string | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedTemplate = templates.find(t => t.id === selectedId) ?? null;

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    if (!clubId) return;
    setLoadingTemplates(true);
    const { data, error } = await (supabase as any)
      .from('shift_templates')
      .select('id, name, description, shift_template_slots(count)')
      .eq('club_id', clubId)
      .order('name');

    if (error) { toast.error(l.errorSave); setLoadingTemplates(false); return; }

    setTemplates((data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      slot_count: t.shift_template_slots?.[0]?.count ?? 0,
    })));
    setLoadingTemplates(false);
  }, [clubId, l.errorSave]);

  const loadSlots = useCallback(async (templateId: string) => {
    setLoadingSlots(true);
    const { data, error } = await (supabase as any)
      .from('shift_template_slots')
      .select('*')
      .eq('template_id', templateId)
      .order('start_offset_minutes');

    if (!error) setSlots(data || []);
    setLoadingSlots(false);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { if (selectedId) loadSlots(selectedId); else setSlots([]); }, [selectedId, loadSlots]);

  // ── Selection ──────────────────────────────────────────────────────────────

  const selectTemplate = (id: string) => {
    setSelectedId(id);
    setConfirmDeleteTemplate(null);
    setConfirmDeleteSlot(null);
    setMobileView('builder');
  };

  // ── Delete handlers ────────────────────────────────────────────────────────

  const handleDeleteTemplate = async (id: string) => {
    setDeleting(true);
    const { error } = await (supabase as any).from('shift_templates').delete().eq('id', id);
    setDeleting(false);
    if (error) { toast.error(l.errorDelete); return; }
    toast.success(l.deletedOk);
    setConfirmDeleteTemplate(null);
    if (selectedId === id) { setSelectedId(null); setMobileView('list'); }
    loadTemplates();
  };

  const handleDeleteSlot = async (id: string) => {
    setDeleting(true);
    const { error } = await (supabase as any).from('shift_template_slots').delete().eq('id', id);
    setDeleting(false);
    if (error) { toast.error(l.errorDelete); return; }
    toast.success(l.deletedOk);
    setConfirmDeleteSlot(null);
    if (selectedId) loadSlots(selectedId);
    loadTemplates(); // refresh slot counts
  };

  // ── After saves ────────────────────────────────────────────────────────────

  const onTemplateSaved = (id: string) => {
    loadTemplates();
    setSelectedId(id);
    setMobileView('builder');
  };

  const onSlotSaved = () => {
    if (selectedId) loadSlots(selectedId);
    loadTemplates();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Template list (left panel)
  // ─────────────────────────────────────────────────────────────────────────

  const renderTemplateList = () => (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
            {l.title}
          </p>
          {templates.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{templates.length} sjablonen</p>
          )}
        </div>
        <button
          onClick={() => setTemplateDialog({ open: true, editing: null })}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {l.newTemplate}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loadingTemplates ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{l.noTemplates}</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{l.noTemplatesDesc}</p>
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id}>
              <button
                onClick={() => selectTemplate(t.id)}
                className={cn(
                  'relative w-full text-left px-3 py-2.5 rounded-lg transition-all group',
                  selectedId === t.id
                    ? 'bg-blue-50 dark:bg-blue-950/50'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                )}
              >
                {selectedId === t.id && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-600 dark:bg-blue-400 rounded-r-full" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-[13px] font-semibold truncate',
                      selectedId === t.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'
                    )}>
                      {t.name}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {t.slot_count} {t.slot_count === 1 ? l.slots : l.slotsPlural}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-colors',
                    selectedId === t.id ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-500'
                  )} />
                </div>
              </button>

              {/* Inline delete confirm */}
              <AnimatePresence>
                {confirmDeleteTemplate === t.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-2 mb-1 overflow-hidden"
                  >
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-red-700 dark:text-red-400 mb-2 font-medium">{l.deleteConfirm}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteTemplate(t.id)} disabled={deleting}
                          className="flex-1 h-7 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          {l.yes}
                        </button>
                        <button onClick={() => setConfirmDeleteTemplate(null)}
                          className="flex-1 h-7 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          {l.cancel}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Slot builder (right panel)
  // ─────────────────────────────────────────────────────────────────────────

  const renderBuilder = () => {
    if (!selectedTemplate) return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-gray-200 dark:text-gray-700" />
        </div>
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{l.selectTemplate}</p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 max-w-xs leading-relaxed">{l.selectTemplateDesc}</p>
      </div>
    );

    return (
      <div className="flex flex-col h-full">
        {/* Builder header */}
        <div className="shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                {selectedTemplate.name}
              </h2>
              {selectedTemplate.description && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedTemplate.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setTemplateDialog({ open: true, editing: selectedTemplate })}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-gray-200 transition-colors"
                title={l.editTemplate}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setConfirmDeleteTemplate(confirmDeleteTemplate === selectedTemplate.id ? null : selectedTemplate.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                title={l.deleteTemplate}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Delete confirm for selected template (shown in builder header) */}
          <AnimatePresence>
            {confirmDeleteTemplate === selectedTemplate.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-xs text-red-700 dark:text-red-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {l.deleteConfirm}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleDeleteTemplate(selectedTemplate.id)} disabled={deleting}
                      className="h-7 px-3 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50">
                      {l.yes}
                    </button>
                    <button onClick={() => setConfirmDeleteTemplate(null)}
                      className="h-7 px-3 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      {l.cancel}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Slots list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loadingSlots ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{l.noSlots}</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">{l.noSlotsDesc}</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {slots.map((slot, i) => (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Left: role + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                            {slot.role_name}
                          </span>
                          {slot.location && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                              <MapPin className="w-3 h-3" />
                              {slot.location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {/* Offset badge — the key information */}
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                            offsetColor(slot.start_offset_minutes)
                          )}>
                            <Timer className="w-2.5 h-2.5" />
                            {formatOffset(slot.start_offset_minutes, l)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatDuration(slot.duration_minutes)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                            <Users className="w-3 h-3" />
                            {slot.required_volunteers} {slot.required_volunteers === 1 ? l.person : l.persons}
                          </span>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setSlotDialog({ open: true, editing: slot })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-gray-300 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSlot(confirmDeleteSlot === slot.id ? null : slot.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline slot delete confirm */}
                    <AnimatePresence>
                      {confirmDeleteSlot === slot.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-3 flex items-center gap-2">
                            <span className="text-xs text-red-600 dark:text-red-400 flex-1">{l.deleteSlotConfirm}</span>
                            <button onClick={() => handleDeleteSlot(slot.id)} disabled={deleting}
                              className="h-7 px-3 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50">
                              {l.yes}
                            </button>
                            <button onClick={() => setConfirmDeleteSlot(null)}
                              className="h-7 px-3 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 transition-colors">
                              {l.cancel}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Add slot button */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setSlotDialog({ open: true, editing: null })}
            className="w-full h-10 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:border-blue-700 dark:hover:text-blue-400 dark:hover:bg-blue-950/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {l.addSlot}
          </button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 flex items-center gap-3 h-14">
        {/* Mobile: back to list when in builder view */}
        <button
          onClick={() => { if (mobileView === 'builder') { setMobileView('list'); } else { navigate(-1); } }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{l.back}</span>
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-400" />
          <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {l.title}
            {/* Mobile: show selected template name in header */}
            {mobileView === 'builder' && selectedTemplate && (
              <span className="text-gray-400 font-normal ml-2">— {selectedTemplate.name}</span>
            )}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="h-[calc(100vh-56px)] flex">

        {/* Desktop: two-panel layout */}
        <div className="hidden md:grid md:grid-cols-[300px_1fr] w-full">
          {/* Left panel */}
          <div className="border-r border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col bg-white dark:bg-gray-950">
            {renderTemplateList()}
          </div>
          {/* Right panel */}
          <div className="overflow-hidden flex flex-col bg-white dark:bg-gray-950 border-t-0">
            {renderBuilder()}
          </div>
        </div>

        {/* Mobile: single-column, toggle between views */}
        <div className="md:hidden w-full bg-white dark:bg-gray-950">
          <AnimatePresence mode="wait" initial={false}>
            {mobileView === 'list' ? (
              <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                {renderTemplateList()}
              </motion.div>
            ) : (
              <motion.div key="builder" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex flex-col">
                {renderBuilder()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Dialogs */}
      <TemplateDialog
        open={templateDialog.open}
        onClose={() => setTemplateDialog({ open: false, editing: null })}
        onSaved={onTemplateSaved}
        clubId={clubId || ''}
        editing={templateDialog.editing}
        l={l}
      />

      {selectedId && (
        <SlotDialog
          open={slotDialog.open}
          onClose={() => setSlotDialog({ open: false, editing: null })}
          onSaved={onSlotSaved}
          templateId={selectedId}
          editing={slotDialog.editing}
          l={l}
        />
      )}
    </div>
  );
};

export default ShiftTemplates;
