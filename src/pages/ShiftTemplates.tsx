import { useState, useEffect, useCallback, useRef } from 'react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Clock, Users, MapPin,
  X, Loader2, ArrowLeft, Layers, Timer,
  ChevronRight, AlertTriangle, Zap, Sparkles,
  ExternalLink, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
// Zod schemas (unchanged)
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
    title: 'Rooster Automatisering',
    back: 'Terug',
    newTemplate: 'Nieuw Blueprint',
    noTemplates: 'Nog geen blueprints',
    noTemplatesDesc: 'Maak een blueprint aan om te beginnen.',
    selectTemplate: 'Selecteer een blueprint',
    selectTemplateDesc: 'Klik op een blueprint links om de diensten te bekijken en te bewerken.',
    slots: 'dienst', slotsPlural: 'diensten',
    addSlot: 'Dienst Toevoegen',
    noSlots: 'Nog geen diensten in dit blueprint',
    noSlotsDesc: 'Voeg diensten toe om de timeline te vullen. Elke dienst wordt getimed ten opzichte van de aftrap.',
    editTemplate: 'Blueprint bewerken',
    deleteTemplate: 'Blueprint verwijderen',
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
    templateNameLabel: 'Naam van het blueprint',
    templateNamePlaceholder: 'Bijv. Thuiswedstrijd 1e Elftal',
    descriptionLabel: 'Beschrijving (optioneel)',
    descriptionPlaceholder: 'Bijv. Standaard bezetting voor thuiswedstrijden...',
    newSlotTitle: 'Nieuwe Dienst Toevoegen',
    editSlotTitle: 'Dienst Bewerken',
    newTemplateTitle: 'Nieuw Blueprint',
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
    // NEW
    bannerTitle: 'Stop met elke match handmatig diensten aanmaken',
    bannerDesc: 'Bouw één keer een Blueprint (bijv. "Thuiswedstrijd") met al je Bar-, Steward- en Kassadiensten getimed rond de aftrap. Selecteer dit blueprint bij het aanmaken van een evenement en alle diensten worden automatisch gegenereerd — klaar in één klik.',
    bannerStep1: '1. Maak een blueprint',
    bannerStep2: '2. Voeg diensten toe op de tijdlijn',
    bannerStep3: '3. Gebruik het bij elk evenement →',
    bannerDismiss: 'Begrepen',
    totalVolunteers: 'vrijwilligers nodig',
    useTemplate: 'Gebruik blueprint →',
    kickoff: 'Aftrap',
    timelineNote: 'Klik op een blok om te bewerken',
    volunteersTotal: 'Totaal',
  },
  fr: {
    title: 'Automatisation du Roster',
    back: 'Retour',
    newTemplate: 'Nouveau Blueprint',
    noTemplates: 'Aucun blueprint',
    noTemplatesDesc: 'Créez un blueprint pour commencer.',
    selectTemplate: 'Sélectionnez un blueprint',
    selectTemplateDesc: 'Cliquez sur un blueprint à gauche pour voir et modifier ses shifts.',
    slots: 'shift', slotsPlural: 'shifts',
    addSlot: 'Ajouter un Shift',
    noSlots: 'Aucun shift dans ce blueprint',
    noSlotsDesc: 'Ajoutez des shifts pour remplir la timeline.',
    editTemplate: 'Modifier le blueprint',
    deleteTemplate: 'Supprimer le blueprint',
    deleteConfirm: 'Supprimer aussi tous les shifts de ce blueprint ?',
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
    templateNameLabel: 'Nom du blueprint',
    templateNamePlaceholder: 'Ex. Match à domicile 1re équipe',
    descriptionLabel: 'Description (optionnel)',
    descriptionPlaceholder: 'Ex. Effectif standard pour les matchs à domicile...',
    newSlotTitle: 'Ajouter un Shift',
    editSlotTitle: 'Modifier le Shift',
    newTemplateTitle: 'Nouveau Blueprint',
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
    // NEW
    bannerTitle: 'Arrêtez de créer des shifts manuellement à chaque match',
    bannerDesc: 'Créez une fois un Blueprint (ex. "Match à domicile") avec tous vos shifts Bar, Steward et Caisse, planifiés autour du coup d\'envoi. Sélectionnez ce blueprint lors de la création d\'un événement — tous les shifts sont générés automatiquement en un clic.',
    bannerStep1: '1. Créez un blueprint',
    bannerStep2: '2. Ajoutez des shifts sur la timeline',
    bannerStep3: '3. Utilisez-le pour chaque événement →',
    bannerDismiss: 'Compris',
    totalVolunteers: 'bénévoles requis',
    useTemplate: 'Utiliser ce blueprint →',
    kickoff: 'Coup d\'envoi',
    timelineNote: 'Cliquez sur un bloc pour modifier',
    volunteersTotal: 'Total',
  },
  en: {
    title: 'Roster Automation',
    back: 'Back',
    newTemplate: 'New Blueprint',
    noTemplates: 'No blueprints yet',
    noTemplatesDesc: 'Create a blueprint to get started.',
    selectTemplate: 'Select a blueprint',
    selectTemplateDesc: 'Click a blueprint on the left to view and edit its shifts.',
    slots: 'shift', slotsPlural: 'shifts',
    addSlot: 'Add Shift',
    noSlots: 'No shifts in this blueprint',
    noSlotsDesc: 'Add shifts to fill the timeline. Each shift is timed relative to kick-off.',
    editTemplate: 'Edit blueprint',
    deleteTemplate: 'Delete blueprint',
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
    templateNameLabel: 'Blueprint name',
    templateNamePlaceholder: 'E.g. Sunday Home Match',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'E.g. Standard staffing for home matches...',
    newSlotTitle: 'Add Shift',
    editSlotTitle: 'Edit Shift',
    newTemplateTitle: 'New Blueprint',
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
    // NEW
    bannerTitle: 'Stop creating shifts manually for every match',
    bannerDesc: 'Build a Blueprint once (e.g. "Home Match") with all your Bar, Steward and Ticketing shifts timed around kick-off. Select this blueprint when creating an event — all shifts are auto-generated in one click.',
    bannerStep1: '1. Create a blueprint',
    bannerStep2: '2. Add shifts on the timeline',
    bannerStep3: '3. Use it for every event →',
    bannerDismiss: 'Got it',
    totalVolunteers: 'volunteers needed',
    useTemplate: 'Use blueprint →',
    kickoff: 'Kick-off',
    timelineNote: 'Click a block to edit',
    volunteersTotal: 'Total',
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
  const timeStr = h > 0 ? (m > 0 ? `${h}u${String(m).padStart(2, '0')}` : `${h}u`) : `${m} min`;
  return `${timeStr} ${minutes < 0 ? l.beforeKickoff : l.afterKickoff}`;
};

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
};

const formatTick = (t: number): string => {
  if (t === 0) return '0';
  const abs = Math.abs(t);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = t < 0 ? '-' : '+';
  if (h > 0 && m > 0) return `${sign}${h}h${String(m).padStart(2, '0')}`;
  if (h > 0) return `${sign}${h}h`;
  return `${sign}${m}m`;
};

// Role-based color palette
const ROLE_COLORS: Array<[RegExp, { bar: string; light: string; text: string; border: string }]> = [
  [/steward/i,                  { bar: 'bg-rose-500',    light: 'bg-rose-50 dark:bg-rose-950/30',    text: 'text-rose-800 dark:text-rose-200',    border: 'border-rose-200 dark:border-rose-800/40'    }],
  [/barman|bar(?!man)|buvette|kantine/i, { bar: 'bg-amber-500',   light: 'bg-amber-50 dark:bg-amber-950/30',   text: 'text-amber-800 dark:text-amber-200',   border: 'border-amber-200 dark:border-amber-800/40'   }],
  [/ehbo|first.?aid|secours/i,  { bar: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800/40' }],
  [/kassa|ticket/i,             { bar: 'bg-blue-500',    light: 'bg-blue-50 dark:bg-blue-950/30',    text: 'text-blue-800 dark:text-blue-200',    border: 'border-blue-200 dark:border-blue-800/40'    }],
  [/security|beveiliging/i,     { bar: 'bg-slate-600',   light: 'bg-slate-50 dark:bg-slate-800/50',  text: 'text-slate-800 dark:text-slate-200',  border: 'border-slate-200 dark:border-slate-700/40'  }],
  [/parkeren|parking/i,         { bar: 'bg-violet-500',  light: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-800 dark:text-violet-200', border: 'border-violet-200 dark:border-violet-800/40' }],
  [/materiaal|logistics/i,      { bar: 'bg-orange-500',  light: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-800 dark:text-orange-200', border: 'border-orange-200 dark:border-orange-800/40' }],
];
const FALLBACK_COLORS = [
  { bar: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-800 dark:text-indigo-200', border: 'border-indigo-200 dark:border-indigo-800/40' },
  { bar: 'bg-cyan-500',   light: 'bg-cyan-50 dark:bg-cyan-950/30',     text: 'text-cyan-800 dark:text-cyan-200',     border: 'border-cyan-200 dark:border-cyan-800/40'     },
  { bar: 'bg-pink-500',   light: 'bg-pink-50 dark:bg-pink-950/30',     text: 'text-pink-800 dark:text-pink-200',     border: 'border-pink-200 dark:border-pink-800/40'     },
  { bar: 'bg-teal-500',   light: 'bg-teal-50 dark:bg-teal-950/30',     text: 'text-teal-800 dark:text-teal-200',     border: 'border-teal-200 dark:border-teal-800/40'     },
];
const getRoleColor = (name: string, idx = 0) => {
  for (const [re, c] of ROLE_COLORS) if (re.test(name)) return c;
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
};

// Assign overlapping slots to parallel lanes (greedy)
function assignLanes(slots: TemplateSlot[]): { slot: TemplateSlot; lane: number }[] {
  const sorted = [...slots].sort((a, b) => a.start_offset_minutes - b.start_offset_minutes);
  const laneEnds: number[] = [];
  return sorted.map(slot => {
    const end = slot.start_offset_minutes + slot.duration_minutes;
    let lane = laneEnds.findIndex(t => t <= slot.start_offset_minutes);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); }
    else { laneEnds[lane] = end; }
    return { slot, lane };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Banner
// ─────────────────────────────────────────────────────────────────────────────

const BANNER_KEY = 'sht_onboarding_v1';

interface BannerProps { l: Record<string, string> }
const OnboardingBanner = ({ l }: BannerProps) => {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(BANNER_KEY); } catch { return true; }
  });

  const dismiss = () => {
    try { localStorage.setItem(BANNER_KEY, '1'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12, height: 0 }}
        className="relative mx-4 mt-4 rounded-2xl overflow-hidden border border-indigo-200/60 dark:border-indigo-800/40 shadow-sm"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-violet-50/80 to-blue-50 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-blue-950/40 pointer-events-none" />

        <div className="relative px-5 py-4">
          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 pr-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-300/50">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{l.bannerTitle}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-xl">{l.bannerDesc}</p>
            </div>
          </div>

          {/* 3 steps */}
          <div className="flex flex-wrap gap-2 mt-3 ml-12">
            {[l.bannerStep1, l.bannerStep2, l.bannerStep3].map((step, i) => (
              <span key={i} className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border',
                i === 0 ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60' :
                i === 1 ? 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/60' :
                          'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60'
              )}>
                {step}
              </span>
            ))}
          </div>

          <button
            onClick={dismiss}
            className="mt-3 ml-12 h-8 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
          >
            {l.bannerDismiss}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Gantt view
// ─────────────────────────────────────────────────────────────────────────────

const PX_PER_MIN = 2.4;
const AXIS_W = 44; // px

interface TimelineViewProps {
  slots: TemplateSlot[];
  loading: boolean;
  l: Record<string, string>;
  onEditSlot: (slot: TemplateSlot) => void;
  onAddSlot: () => void;
  confirmDeleteSlot: string | null;
  setConfirmDeleteSlot: (id: string | null) => void;
  deleting: boolean;
  handleDeleteSlot: (id: string) => void;
}

const TimelineView = ({
  slots, loading, l, onEditSlot, onAddSlot,
  confirmDeleteSlot, setConfirmDeleteSlot, deleting, handleDeleteSlot,
}: TimelineViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to kickoff area on load
  useEffect(() => {
    if (!scrollRef.current || slots.length === 0) return;
    const allStarts = slots.map(s => s.start_offset_minutes);
    const minT = Math.min(-90, ...allStarts) - 40;
    const kickoffY = (0 - minT) * PX_PER_MIN;
    const offset = Math.max(0, kickoffY - scrollRef.current.clientHeight * 0.4);
    scrollRef.current.scrollTop = offset;
  }, [slots]);

  if (loading) return (
    <div className="flex justify-center items-center h-40">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );

  if (slots.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 flex items-center justify-center mx-auto mb-3 border border-blue-100 dark:border-blue-900/30">
        <Clock className="w-7 h-7 text-blue-300 dark:text-blue-700" />
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{l.noSlots}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">{l.noSlotsDesc}</p>
      <button onClick={onAddSlot}
        className="mt-4 flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm shadow-blue-200/50">
        <Plus className="w-3.5 h-3.5" />
        {l.addSlot}
      </button>
    </div>
  );

  // Compute time bounds
  const allStarts = slots.map(s => s.start_offset_minutes);
  const allEnds   = slots.map(s => s.start_offset_minutes + s.duration_minutes);
  const PAD = 45;
  const minT = Math.min(-90, ...allStarts) - PAD;
  const maxT = Math.max(90, ...allEnds) + PAD;
  const totalMins = maxT - minT;
  const containerH = totalMins * PX_PER_MIN;
  const kickoffY = (0 - minT) * PX_PER_MIN;

  // Tick marks every 30 min
  const firstTick = Math.ceil(minT / 30) * 30;
  const ticks: number[] = [];
  for (let t = firstTick; t <= maxT; t += 30) ticks.push(t);

  // Assign lanes
  const withLanes = assignLanes(slots);
  const laneCount = withLanes.reduce((m, x) => Math.max(m, x.lane + 1), 1);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Hint */}
      <p className="text-[10px] text-gray-400 px-4 pb-1 flex items-center gap-1">
        <Timer className="w-3 h-3" />{l.timelineNote}
      </p>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-auto px-3 pb-4">
        <div className="flex" style={{ height: containerH, minHeight: containerH }}>

          {/* ── Time axis ── */}
          <div className="relative shrink-0" style={{ width: AXIS_W }}>
            {ticks.map(t => {
              const isHour = t % 60 === 0;
              const isKick = t === 0;
              return (
                <div key={t} className="absolute left-0 right-0 flex items-center"
                  style={{ top: (t - minT) * PX_PER_MIN }}>
                  <span className={cn(
                    'text-right w-full pr-2 -translate-y-1/2 tabular-nums leading-none',
                    isKick ? 'text-[10px] font-bold text-rose-500' :
                    isHour ? 'text-[9px] font-semibold text-gray-500 dark:text-gray-500' :
                             'text-[9px] text-gray-300 dark:text-gray-700'
                  )}>
                    {formatTick(t)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Grid + lanes area ── */}
          <div className="relative flex-1 flex gap-1.5" style={{ minWidth: laneCount * 90 }}>

            {/* Horizontal grid lines */}
            {ticks.map(t => {
              const isHour = t % 60 === 0;
              const isKick = t === 0;
              return (
                <div key={t} className={cn(
                  'absolute left-0 right-0 pointer-events-none',
                  isKick ? 'h-0' : isHour ? 'border-t border-gray-200/80 dark:border-gray-700/50' : 'border-t border-gray-100/60 dark:border-gray-800/30'
                )} style={{ top: (t - minT) * PX_PER_MIN }} />
              );
            })}

            {/* ── Kickoff line ── */}
            <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
              style={{ top: kickoffY }}>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-rose-500 to-rose-400/60 rounded-full shadow-sm shadow-rose-200/50" />
              <span className="absolute right-0 flex items-center gap-1 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-l-full shadow-sm">
                <Zap className="w-2.5 h-2.5" />{l.kickoff}
              </span>
            </div>

            {/* ── Lanes ── */}
            {Array.from({ length: laneCount }).map((_, laneIdx) => (
              <div key={laneIdx} className="relative flex-1" style={{ minWidth: 88 }}>
                {withLanes
                  .filter(x => x.lane === laneIdx)
                  .map(({ slot }, i) => {
                    const top = (slot.start_offset_minutes - minT) * PX_PER_MIN;
                    const h   = Math.max(34, slot.duration_minutes * PX_PER_MIN);
                    const col = getRoleColor(slot.role_name, laneIdx + i);
                    const isDelConfirm = confirmDeleteSlot === slot.id;

                    return (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          'absolute inset-x-0 rounded-xl border overflow-visible group z-10 cursor-pointer',
                          col.border, isDelConfirm ? 'ring-2 ring-red-400 z-30' : ''
                        )}
                        style={{ top, height: h }}
                        onClick={() => onEditSlot(slot)}
                      >
                        {/* Color bar on top */}
                        <div className={cn('h-1.5 w-full rounded-t-xl', col.bar)} />
                        {/* Body */}
                        <div className={cn('px-2 pt-1 pb-1.5 rounded-b-xl h-full', col.light)}>
                          <p className={cn('text-[11px] font-bold leading-tight truncate', col.text)}>
                            {slot.role_name}
                          </p>
                          {h > 52 && (
                            <div className="mt-0.5 space-y-0.5">
                              {slot.location && (
                                <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />{slot.location}
                                </p>
                              )}
                              <p className="text-[9px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Users className="w-2.5 h-2.5 shrink-0" />{slot.required_volunteers}
                                <span className="text-gray-300 dark:text-gray-600">·</span>
                                <Clock className="w-2.5 h-2.5 shrink-0" />{formatDuration(slot.duration_minutes)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Hover action buttons */}
                        <div
                          className="absolute -top-1.5 -right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-40"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onEditSlot(slot)}
                            className="w-5 h-5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-blue-600 shadow-sm transition-colors"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSlot(isDelConfirm ? null : slot.id)}
                            className="w-5 h-5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-red-600 shadow-sm transition-colors"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Inline delete confirm — floats below the block */}
                        <AnimatePresence>
                          {isDelConfirm && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800/50 rounded-xl shadow-lg p-2.5 z-50"
                              onClick={e => e.stopPropagation()}
                            >
                              <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mb-2">{l.deleteSlotConfirm}</p>
                              <div className="flex gap-1.5">
                                <button onClick={() => handleDeleteSlot(slot.id)} disabled={deleting}
                                  className="flex-1 h-6 text-[10px] font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                                  {deleting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                                  {l.yes}
                                </button>
                                <button onClick={() => setConfirmDeleteSlot(null)}
                                  className="flex-1 h-6 text-[10px] rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  {l.cancel}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add slot bar */}
      <div className="shrink-0 px-3 pb-3">
        <button onClick={onAddSlot}
          className="w-full h-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 dark:hover:border-blue-600 dark:hover:text-blue-400 dark:hover:bg-blue-950/20 transition-all text-sm font-medium flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          {l.addSlot}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Slot Sheet (add / edit) — replaces Dialog so timeline stays visible
// ─────────────────────────────────────────────────────────────────────────────

interface SlotSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  templateId: string;
  editing?: TemplateSlot | null;
  l: Record<string, string>;
}

const SlotSheet = ({ open, onClose, onSaved, templateId, editing, l }: SlotSheetProps) => {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<SlotFormData>({
    resolver: zodResolver(slotSchema),
    defaultValues: { role_name: '', location: '', required_volunteers: 1, start_offset_minutes: -60, duration_minutes: 120 },
  });

  const offsetVal   = watch('start_offset_minutes');
  const durationVal = watch('duration_minutes');
  const parsedOffset   = Number(offsetVal);
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
    const payload = { template_id: templateId, role_name: data.role_name, location: data.location || '', required_volunteers: data.required_volunteers, start_offset_minutes: data.start_offset_minutes, duration_minutes: data.duration_minutes };
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
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
            {editing ? l.editSlotTitle : l.newSlotTitle}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{l.roleName} *</Label>
            <Input {...register('role_name')} placeholder={l.roleNamePlaceholder} className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
            {errors.role_name && <p className="text-xs text-red-600">{errors.role_name.message}</p>}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-gray-400 self-center">{l.quickRoles}</span>
              {QUICK_ROLES.map(r => (
                <button key={r} type="button" onClick={() => setValue('role_name', r)}
                  className="px-2 py-0.5 text-[11px] rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-700 hover:border-blue-200 transition-colors">
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{l.locationLabel}</Label>
            <Input {...register('location')} placeholder={l.locationPlaceholder} className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
          </div>

          {/* Volunteers + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{l.volunteersRequired} *</Label>
              <Input {...register('required_volunteers')} type="number" min={1} max={500} className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
              {errors.required_volunteers && <p className="text-xs text-red-600">{errors.required_volunteers.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{l.durationLabel} *</Label>
              <Input {...register('duration_minutes')} type="number" min={5} step={15} className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
              {errors.duration_minutes && <p className="text-xs text-red-600">{errors.duration_minutes.message}</p>}
              {!isNaN(parsedDuration) && parsedDuration >= 5 && <p className="text-[10px] text-gray-400">{formatDuration(parsedDuration)}</p>}
            </div>
          </div>

          {/* Offset */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{l.offsetLabel} *</Label>
            <div className="flex items-center gap-3">
              <Input {...register('start_offset_minutes')} type="number" min={-720} max={720} step={15}
                className="h-10 w-28 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono" />
              {!isNaN(parsedOffset) && (
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                  parsedOffset < 0 ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40' :
                  parsedOffset === 0 ? 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/40' :
                                      'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40'
                )}>
                  <Timer className="w-3 h-3" />{formatOffset(parsedOffset, l)}
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
      </SheetContent>
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Template Form Dialog (create / edit) — unchanged logic
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
    if (open) reset(editing ? { name: editing.name, description: editing.description || '' } : { name: '', description: '' });
  }, [open, editing, reset]);

  const onSubmit = async (data: TemplateFormData) => {
    if (editing) {
      const { error } = await (supabase as any).from('shift_templates').update({ name: data.name, description: data.description || null }).eq('id', editing.id);
      if (error) { toast.error(l.errorSave); return; }
      toast.success(l.savedOk);
      onSaved(editing.id);
    } else {
      const { data: row, error } = await (supabase as any).from('shift_templates').insert({ club_id: clubId, name: data.name, description: data.description || null }).select('id').single();
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
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{l.templateNameLabel} *</Label>
            <Input {...register('name')} placeholder={l.templateNamePlaceholder} className="h-10 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" autoFocus />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{l.descriptionLabel}</Label>
            <textarea {...register('description')} placeholder={l.descriptionPlaceholder} rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
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

  const [templates, setTemplates]           = useState<ShiftTemplate[]>([]);
  const [slots, setSlots]                   = useState<TemplateSlot[]>([]);
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [mobileView, setMobileView]         = useState<'list' | 'builder'>('list');

  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; editing: ShiftTemplate | null }>({ open: false, editing: null });
  const [slotSheet, setSlotSheet]           = useState<{ open: boolean; editing: TemplateSlot | null }>({ open: false, editing: null });

  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<string | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot]         = useState<string | null>(null);
  const [deleting, setDeleting]             = useState(false);

  const selectedTemplate = templates.find(t => t.id === selectedId) ?? null;
  const totalVolunteers  = slots.reduce((s, slot) => s + slot.required_volunteers, 0);

  // ── Data fetching ───────────────────────────────────────────────────────────

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
      id: t.id, name: t.name, description: t.description,
      slot_count: t.shift_template_slots?.[0]?.count ?? 0,
    })));
    setLoadingTemplates(false);
  }, [clubId, l.errorSave]);

  const loadSlots = useCallback(async (templateId: string) => {
    setLoadingSlots(true);
    const { data, error } = await (supabase as any)
      .from('shift_template_slots').select('*').eq('template_id', templateId).order('start_offset_minutes');
    if (!error) setSlots(data || []);
    setLoadingSlots(false);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { if (selectedId) loadSlots(selectedId); else setSlots([]); }, [selectedId, loadSlots]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const selectTemplate = (id: string) => {
    setSelectedId(id);
    setConfirmDeleteTemplate(null);
    setConfirmDeleteSlot(null);
    setMobileView('builder');
  };

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
    loadTemplates();
  };

  const onTemplateSaved = (id: string) => { loadTemplates(); setSelectedId(id); setMobileView('builder'); };
  const onSlotSaved     = () => { if (selectedId) loadSlots(selectedId); loadTemplates(); };

  // ── Left panel: template list ───────────────────────────────────────────────

  const renderTemplateList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Blueprints</p>
          {templates.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{templates.length} {templates.length === 1 ? l.slots : l.slotsPlural === 'shifts' ? 'blueprints' : 'blueprints'}</p>
          )}
        </div>
        <button onClick={() => setTemplateDialog({ open: true, editing: null })}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm shadow-blue-200/50">
          <Plus className="w-3.5 h-3.5" />{l.newTemplate}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loadingTemplates ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 flex items-center justify-center mx-auto mb-3 border border-indigo-100/60 dark:border-indigo-800/40">
              <Layers className="w-6 h-6 text-indigo-300 dark:text-indigo-700" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{l.noTemplates}</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{l.noTemplatesDesc}</p>
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id}>
              <button onClick={() => selectTemplate(t.id)}
                className={cn('relative w-full text-left px-3 py-2.5 rounded-xl transition-all group',
                  selectedId === t.id ? 'bg-blue-50 dark:bg-blue-950/50' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                )}>
                {selectedId === t.id && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-600 dark:bg-blue-400 rounded-r-full" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[13px] font-semibold truncate',
                      selectedId === t.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200')}>
                      {t.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-gray-400">
                        {t.slot_count} {t.slot_count === 1 ? l.slots : l.slotsPlural}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={cn('w-3.5 h-3.5 shrink-0 transition-colors',
                    selectedId === t.id ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-500'
                  )} />
                </div>
              </button>

              <AnimatePresence>
                {confirmDeleteTemplate === t.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mx-2 mb-1 overflow-hidden">
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-red-700 dark:text-red-400 mb-2 font-medium">{l.deleteConfirm}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteTemplate(t.id)} disabled={deleting}
                          className="flex-1 h-7 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}{l.yes}
                        </button>
                        <button onClick={() => setConfirmDeleteTemplate(null)}
                          className="flex-1 h-7 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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

  // ── Right panel: timeline builder ───────────────────────────────────────────

  const renderBuilder = () => {
    if (!selectedTemplate) return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 flex items-center justify-center mb-4 border border-indigo-100/60 dark:border-indigo-800/40">
          <Sparkles className="w-8 h-8 text-indigo-300 dark:text-indigo-700" />
        </div>
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{l.selectTemplate}</p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 max-w-xs leading-relaxed">{l.selectTemplateDesc}</p>
      </div>
    );

    return (
      <div className="flex flex-col h-full overflow-hidden">

        {/* Builder header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
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
              <button onClick={() => setTemplateDialog({ open: true, editing: selectedTemplate })}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-gray-200 transition-colors" title={l.editTemplate}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setConfirmDeleteTemplate(confirmDeleteTemplate === selectedTemplate.id ? null : selectedTemplate.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title={l.deleteTemplate}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stats strip */}
          {slots.length > 0 && (
            <div className="flex items-center gap-3 mt-2.5">
              {/* Total volunteers badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{totalVolunteers}</span>
                <span className="text-[10px] text-blue-500/70">{l.totalVolunteers}</span>
              </div>
              {/* Slot count badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/40">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{slots.length}</span>
                <span className="text-[10px] text-gray-400">{slots.length === 1 ? l.slots : l.slotsPlural}</span>
              </div>
              {/* Use template CTA */}
              <button onClick={() => navigate('/events-manager')}
                className="ml-auto flex items-center gap-1.5 h-7 px-3 text-[11px] font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white transition-all shadow-sm shadow-indigo-200/50 whitespace-nowrap">
                <ExternalLink className="w-3 h-3" />
                {l.useTemplate}
              </button>
            </div>
          )}

          {/* Delete confirm */}
          <AnimatePresence>
            {confirmDeleteTemplate === selectedTemplate.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-xs text-red-700 dark:text-red-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />{l.deleteConfirm}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleDeleteTemplate(selectedTemplate.id)} disabled={deleting}
                      className="h-7 px-3 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50">{l.yes}
                    </button>
                    <button onClick={() => setConfirmDeleteTemplate(null)}
                      className="h-7 px-3 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{l.cancel}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timeline */}
        <TimelineView
          slots={slots}
          loading={loadingSlots}
          l={l}
          onEditSlot={slot => setSlotSheet({ open: true, editing: slot })}
          onAddSlot={() => setSlotSheet({ open: true, editing: null })}
          confirmDeleteSlot={confirmDeleteSlot}
          setConfirmDeleteSlot={setConfirmDeleteSlot}
          deleting={deleting}
          handleDeleteSlot={handleDeleteSlot}
        />
      </div>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <ClubPageLayout>
    <div className="flex flex-col h-full">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border px-4 sm:px-6 flex items-center gap-3 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">
              {l.title}
              {mobileView === 'builder' && selectedTemplate && (
                <span className="text-muted-foreground font-normal ml-2 text-sm">— {selectedTemplate.name}</span>
              )}
            </h1>
          </div>
        </div>
      </header>

      {/* Onboarding banner (above the panels) */}
      <OnboardingBanner l={l} />

      {/* Two-panel content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Desktop */}
        <div className="hidden md:grid md:grid-cols-[280px_1fr] w-full overflow-hidden">
          <div className="border-r border-border overflow-hidden flex flex-col bg-card">
            {renderTemplateList()}
          </div>
          <div className="overflow-hidden flex flex-col bg-background">
            {renderBuilder()}
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden w-full bg-white dark:bg-gray-950 overflow-hidden">
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

      {/* Dialogs / Sheets */}
      <TemplateDialog
        open={templateDialog.open}
        onClose={() => setTemplateDialog({ open: false, editing: null })}
        onSaved={onTemplateSaved}
        clubId={clubId || ''}
        editing={templateDialog.editing}
        l={l}
      />

      {selectedId && (
        <SlotSheet
          open={slotSheet.open}
          onClose={() => setSlotSheet({ open: false, editing: null })}
          onSaved={onSlotSaved}
          templateId={selectedId}
          editing={slotSheet.editing}
          l={l}
        />
      )}
    </div>
    </ClubPageLayout>
  );
};

export default ShiftTemplates;
