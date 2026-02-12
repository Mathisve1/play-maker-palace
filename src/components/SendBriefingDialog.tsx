import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Loader2, Users } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface Volunteer {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface SendBriefingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteers: Volunteer[];
  onSend: (selectedVolunteerIds: string[], personalMessage: string) => Promise<void>;
  language: Language;
  sending: boolean;
}

const labels = {
  nl: {
    title: 'Briefing versturen',
    subtitle: 'Kies de vrijwilligers en voeg eventueel een persoonlijk bericht toe.',
    selectAll: 'Selecteer alles',
    personalMessage: 'Persoonlijk bericht (optioneel)',
    personalMessagePlaceholder: 'Bv. "Hallo! Hier is je briefing voor komende zaterdag. Lees alles goed door!"',
    send: 'Versturen',
    sending: 'Versturen...',
    noVolunteers: 'Geen aangemelde vrijwilligers voor deze taak.',
    selectedCount: 'geselecteerd',
  },
  fr: {
    title: 'Envoyer le briefing',
    subtitle: 'Choisissez les bénévoles et ajoutez éventuellement un message personnel.',
    selectAll: 'Tout sélectionner',
    personalMessage: 'Message personnel (optionnel)',
    personalMessagePlaceholder: 'Ex. "Bonjour ! Voici votre briefing pour samedi. Lisez tout attentivement !"',
    send: 'Envoyer',
    sending: 'Envoi...',
    noVolunteers: 'Aucun bénévole inscrit pour cette tâche.',
    selectedCount: 'sélectionné(s)',
  },
  en: {
    title: 'Send briefing',
    subtitle: 'Choose the volunteers and optionally add a personal message.',
    selectAll: 'Select all',
    personalMessage: 'Personal message (optional)',
    personalMessagePlaceholder: 'E.g. "Hi! Here is your briefing for this Saturday. Please read everything carefully!"',
    send: 'Send',
    sending: 'Sending...',
    noVolunteers: 'No signed up volunteers for this task.',
    selectedCount: 'selected',
  },
};

const SendBriefingDialog = ({ open, onOpenChange, volunteers, onSend, language, sending }: SendBriefingDialogProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(volunteers.map(v => v.id)));
  const [personalMessage, setPersonalMessage] = useState('');
  const l = labels[language];

  const toggleAll = () => {
    if (selected.size === volunteers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(volunteers.map(v => v.id)));
    }
  };

  const toggleVolunteer = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    await onSend(Array.from(selected), personalMessage);
    setPersonalMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {l.title}
          </DialogTitle>
          <DialogDescription>{l.subtitle}</DialogDescription>
        </DialogHeader>

        {volunteers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{l.noVolunteers}</p>
        ) : (
          <div className="space-y-4">
            {/* Select all */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={selected.size === volunteers.length}
                  onCheckedChange={toggleAll}
                />
                <span className="font-medium">{l.selectAll}</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {selected.size}/{volunteers.length} {l.selectedCount}
              </span>
            </div>

            {/* Volunteer list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {volunteers.map(v => (
                <label
                  key={v.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(v.id)}
                    onCheckedChange={() => toggleVolunteer(v.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {v.full_name || v.email || 'Vrijwilliger'}
                    </p>
                    {v.full_name && v.email && (
                      <p className="text-xs text-muted-foreground truncate">{v.email}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Personal message */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{l.personalMessage}</label>
              <Textarea
                value={personalMessage}
                onChange={e => setPersonalMessage(e.target.value)}
                placeholder={l.personalMessagePlaceholder}
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="w-full"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {sending ? l.sending : `${l.send} (${selected.size})`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendBriefingDialog;
