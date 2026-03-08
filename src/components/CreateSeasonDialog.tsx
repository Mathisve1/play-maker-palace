import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarDays } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  clubId: string;
  language: string;
  onCreated: () => void;
}

const CreateSeasonDialog = ({ open, onClose, clubId, language, onCreated }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  // Default: current sport season (July-June)
  const now = new Date();
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;

  const [name, setName] = useState(`Seizoen ${startYear}-${endYear}`);
  const [startDate, setStartDate] = useState(`${startYear}-07-01`);
  const [endDate, setEndDate] = useState(`${endYear}-06-30`);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);

    // Deactivate other seasons
    await supabase
      .from('seasons')
      .update({ is_active: false })
      .eq('club_id', clubId);

    const { error } = await supabase.from('seasons').insert({
      club_id: clubId,
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    });

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('Seizoen aangemaakt', 'Saison créée', 'Season created'));
      onCreated();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            {t('Nieuw seizoen', 'Nouvelle saison', 'New season')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('Naam', 'Nom', 'Name')}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('Startdatum', 'Date de début', 'Start date')}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('Einddatum', 'Date de fin', 'End date')}</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              'Het sportseizoen loopt standaard van juli tot juni.',
              'La saison sportive va de juillet à juin par défaut.',
              'The sport season runs from July to June by default.'
            )}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Annuleren', 'Annuler', 'Cancel')}</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? '...' : t('Aanmaken', 'Créer', 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSeasonDialog;
