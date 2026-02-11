import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileSignature, Loader2, User, Mail, Phone, Building2, MapPin, Calendar, Clock, Euro } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface VolunteerInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  bank_iban?: string | null;
  bank_holder_name?: string | null;
}

interface TaskInfo {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
  start_time?: string | null;
  end_time?: string | null;
  expense_amount?: number | null;
  expense_reimbursement?: boolean;
  contract_template_id?: string | null;
}

interface SendContractConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: VolunteerInfo;
  task: TaskInfo;
  clubName?: string;
  language: Language;
  onSent: () => void;
}

const labels = {
  nl: {
    title: 'Contract versturen',
    description: 'Controleer de gegevens en verstuur het contract naar de vrijwilliger.',
    volunteerDetails: 'Vrijwilliger',
    taskDetails: 'Taakgegevens',
    send: 'Contract versturen',
    sending: 'Versturen...',
    success: 'Contract verstuurd naar de vrijwilliger!',
    error: 'Er ging iets mis bij het versturen.',
    noTemplate: 'Geen contractsjabloon gekoppeld aan deze taak.',
    templateNotFound: 'Contractsjabloon niet gevonden.',
    to: 'tot',
    expense: 'Vergoeding',
    noName: 'Naam niet ingevuld',
    noEmail: 'E-mail niet ingevuld',
    noPhone: 'Niet ingevuld',
    noIban: 'Niet ingevuld',
    skip: 'Later versturen',
  },
  fr: {
    title: 'Envoyer le contrat',
    description: 'Vérifiez les données et envoyez le contrat au bénévole.',
    volunteerDetails: 'Bénévole',
    taskDetails: 'Détails de la tâche',
    send: 'Envoyer le contrat',
    sending: 'Envoi...',
    success: 'Contrat envoyé au bénévole!',
    error: "Une erreur est survenue lors de l'envoi.",
    noTemplate: 'Aucun modèle de contrat lié à cette tâche.',
    templateNotFound: 'Modèle de contrat introuvable.',
    to: 'à',
    expense: 'Indemnité',
    noName: 'Nom non renseigné',
    noEmail: 'E-mail non renseigné',
    noPhone: 'Non renseigné',
    noIban: 'Non renseigné',
    skip: 'Envoyer plus tard',
  },
  en: {
    title: 'Send contract',
    description: 'Review the details and send the contract to the volunteer.',
    volunteerDetails: 'Volunteer',
    taskDetails: 'Task details',
    send: 'Send contract',
    sending: 'Sending...',
    success: 'Contract sent to the volunteer!',
    error: 'Something went wrong while sending.',
    noTemplate: 'No contract template linked to this task.',
    templateNotFound: 'Contract template not found.',
    to: 'to',
    expense: 'Reimbursement',
    noName: 'Name not provided',
    noEmail: 'Email not provided',
    noPhone: 'Not provided',
    noIban: 'Not provided',
    skip: 'Send later',
  },
};

const formatDate = (dateStr: string | null, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr: string | null, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const SendContractConfirmDialog = ({ open, onOpenChange, volunteer, task, clubName, language, onSent }: SendContractConfirmDialogProps) => {
  const [sending, setSending] = useState(false);
  const l = labels[language];

  const handleSend = async () => {
    if (!task.contract_template_id) {
      toast.error(l.noTemplate);
      return;
    }

    setSending(true);
    try {
      const { data: tmpl } = await supabase
        .from('contract_templates')
        .select('docuseal_template_id')
        .eq('id', task.contract_template_id)
        .maybeSingle();

      if (!tmpl) {
        toast.error(l.templateNotFound);
        setSending(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSending(false); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=create-submission`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template_id: tmpl.docuseal_template_id,
            task_id: task.id,
            volunteer_id: volunteer.id,
            volunteer_email: volunteer.email,
            volunteer_name: volunteer.full_name,
          }),
        }
      );

      const result = await resp.json();
      if (resp.ok && result.success) {
        toast.success(l.success);
        onSent();
        onOpenChange(false);
      } else {
        toast.error(result.error || l.error);
      }
    } catch (err: any) {
      toast.error(err.message || l.error);
    }
    setSending(false);
  };

  const InfoRow = ({ icon: Icon, label, value, muted }: { icon: any; label: string; value: string; muted?: boolean }) => (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={muted ? 'text-muted-foreground/60 italic' : 'text-foreground font-medium'}>{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            {l.title}
          </DialogTitle>
          <DialogDescription>{l.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Volunteer details */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{l.volunteerDetails}</p>
            <InfoRow icon={User} label="Naam" value={volunteer.full_name || l.noName} muted={!volunteer.full_name} />
            <InfoRow icon={Mail} label="E-mail" value={volunteer.email || l.noEmail} muted={!volunteer.email} />
            <InfoRow icon={Phone} label="Telefoon" value={volunteer.phone || l.noPhone} muted={!volunteer.phone} />
            {volunteer.bank_iban && (
              <InfoRow icon={Building2} label="IBAN" value={volunteer.bank_iban} />
            )}
          </div>

          {/* Task details */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{l.taskDetails}</p>
            <InfoRow icon={FileSignature} label="Taak" value={task.title} />
            {clubName && <InfoRow icon={Building2} label="Club" value={clubName} />}
            {task.task_date && <InfoRow icon={Calendar} label="Datum" value={formatDate(task.task_date, language)!} />}
            {task.location && <InfoRow icon={MapPin} label="Locatie" value={task.location} />}
            {task.start_time && (
              <InfoRow
                icon={Clock}
                label="Tijd"
                value={`${formatTime(task.start_time, language)}${task.end_time ? ` ${l.to} ${formatTime(task.end_time, language)}` : ''}`}
              />
            )}
            {task.expense_reimbursement && task.expense_amount && (
              <InfoRow icon={Euro} label={l.expense} value={`€${task.expense_amount.toFixed(2)}`} />
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {l.skip}
          </Button>
          <Button
            className="flex-1"
            onClick={handleSend}
            disabled={sending || !volunteer.email}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {l.sending}
              </>
            ) : (
              <>
                <FileSignature className="w-4 h-4" />
                {l.send}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendContractConfirmDialog;
