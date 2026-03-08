import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, FileSignature, Users, Loader2, AlertCircle } from 'lucide-react';

interface Volunteer {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Template {
  id: string;
  name: string;
  category: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  clubId: string;
  seasonId: string;
  language: string;
  volunteers: Volunteer[];
  preSelectedIds?: string[];
  onSent: () => void;
}

const SendSeasonContractDialog = ({ open, onClose, clubId, seasonId, language, volunteers, preSelectedIds, onSent }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedVolunteers, setSelectedVolunteers] = useState<Set<string>>(new Set(preSelectedIds || []));
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !clubId) return;
    // Load templates
    supabase
      .from('season_contract_templates')
      .select('id, name, category')
      .or(`club_id.eq.${clubId},is_system.eq.true`)
      .then(({ data }) => {
        setTemplates(data || []);
        if (data?.length === 1) setSelectedTemplate(data[0].id);
      });
  }, [open, clubId]);

  useEffect(() => {
    if (preSelectedIds) setSelectedVolunteers(new Set(preSelectedIds));
  }, [preSelectedIds]);

  const toggleVolunteer = (id: string) => {
    setSelectedVolunteers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedVolunteers(new Set(volunteers.map(v => v.id)));
  const deselectAll = () => setSelectedVolunteers(new Set());

  const handleSend = async () => {
    if (!selectedTemplate || selectedVolunteers.size === 0) return;
    setSending(true);
    setSentCount(0);
    setErrors([]);

    const volunteerList = volunteers.filter(v => selectedVolunteers.has(v.id));
    let sent = 0;
    const newErrors: string[] = [];

    for (const vol of volunteerList) {
      try {
        // Check for existing pending contract
        const { data: existing } = await supabase
          .from('season_contracts')
          .select('id')
          .eq('volunteer_id', vol.id)
          .eq('season_id', seasonId)
          .eq('template_id', selectedTemplate)
          .in('status', ['pending', 'sent'])
          .limit(1);

        if (existing && existing.length > 0) {
          newErrors.push(`${vol.full_name}: ${t('heeft al een lopend contract', 'a déjà un contrat en cours', 'already has a pending contract')}`);
          continue;
        }

        // Call edge function to create DocuSeal submission
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=create-season-submission`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              template_id: selectedTemplate,
              season_id: seasonId,
              club_id: clubId,
              volunteer_id: vol.id,
              volunteer_email: vol.email,
              volunteer_name: vol.full_name,
            }),
          }
        );
        const fnData = await response.json();

        if (fnError) throw new Error(fnError.message);
        if (fnData?.error) throw new Error(fnData.error);

        sent++;
        setSentCount(sent);
      } catch (err: any) {
        newErrors.push(`${vol.full_name}: ${err.message}`);
      }
    }

    setErrors(newErrors);
    setSending(false);

    if (sent > 0) {
      toast.success(t(
        `${sent} contract(en) verstuurd`,
        `${sent} contrat(s) envoyé(s)`,
        `${sent} contract(s) sent`
      ));
      onSent();
    }
    if (newErrors.length === 0) onClose();
  };

  const categoryLabels: Record<string, string> = {
    steward: 'Steward',
    bar_catering: t('Bar & Catering', 'Bar & Traiteur', 'Bar & Catering'),
    terrain_material: t('Terrein', 'Terrain', 'Terrain'),
    admin_ticketing: 'Admin / Ticketing',
    event_support: 'Event Support',
    custom: 'Custom',
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && !sending && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            {t('Seizoenscontract versturen', 'Envoyer contrat saisonnier', 'Send season contract')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selection */}
          <div>
            <Label>{t('Sjabloon', 'Modèle', 'Template')}</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder={t('Kies een sjabloon...', 'Choisir un modèle...', 'Choose a template...')} />
              </SelectTrigger>
              <SelectContent>
                {templates.map(tmpl => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    <span className="flex items-center gap-2">
                      {tmpl.name}
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[tmpl.category] || tmpl.category}</Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Volunteer selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{t('Vrijwilligers', 'Bénévoles', 'Volunteers')} ({selectedVolunteers.size})</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                  {t('Alles', 'Tout', 'All')}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={deselectAll}>
                  {t('Geen', 'Aucun', 'None')}
                </Button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
              {volunteers.map(vol => (
                <button
                  key={vol.id}
                  onClick={() => toggleVolunteer(vol.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    selectedVolunteers.has(vol.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    selectedVolunteers.has(vol.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                  }`}>
                    {selectedVolunteers.has(vol.id) && <span className="text-primary-foreground text-[10px]">✓</span>}
                  </div>
                  <Avatar className="h-7 w-7 shrink-0">
                    {vol.avatar_url && <AvatarImage src={vol.avatar_url} />}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {vol.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{vol.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{vol.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 rounded-xl p-3 space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{err}
                </p>
              ))}
            </div>
          )}

          {/* Progress */}
          {sending && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('Versturen', 'Envoi', 'Sending')}... {sentCount}/{selectedVolunteers.size}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            {t('Annuleren', 'Annuler', 'Cancel')}
          </Button>
          <Button onClick={handleSend} disabled={sending || !selectedTemplate || selectedVolunteers.size === 0}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {selectedVolunteers.size > 1
              ? t(`Verstuur naar ${selectedVolunteers.size}`, `Envoyer à ${selectedVolunteers.size}`, `Send to ${selectedVolunteers.size}`)
              : t('Versturen', 'Envoyer', 'Send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendSeasonContractDialog;
