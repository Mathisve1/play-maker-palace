import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileSignature, Loader2 } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface Template {
  id: number;
  name: string;
}

interface SendSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  volunteerEmail: string;
  volunteerName?: string;
  language: Language;
}

const labels = {
  nl: {
    title: 'Contract versturen voor ondertekening',
    description: 'Kies een template en verstuur het contract naar de vrijwilliger via DocuSeal.',
    selectTemplate: 'Selecteer een template',
    send: 'Contract versturen',
    sending: 'Versturen...',
    success: 'Contract verstuurd!',
    error: 'Er ging iets mis',
    noTemplates: 'Geen templates beschikbaar. Maak eerst een template aan in DocuSeal.',
    loadingTemplates: 'Templates laden...',
  },
  fr: {
    title: 'Envoyer le contrat pour signature',
    description: 'Choisissez un modèle et envoyez le contrat au bénévole via DocuSeal.',
    selectTemplate: 'Sélectionner un modèle',
    send: 'Envoyer le contrat',
    sending: 'Envoi...',
    success: 'Contrat envoyé!',
    error: 'Une erreur est survenue',
    noTemplates: 'Aucun modèle disponible. Créez d\'abord un modèle dans DocuSeal.',
    loadingTemplates: 'Chargement des modèles...',
  },
  en: {
    title: 'Send contract for signing',
    description: 'Choose a template and send the contract to the volunteer via DocuSeal.',
    selectTemplate: 'Select a template',
    send: 'Send contract',
    sending: 'Sending...',
    success: 'Contract sent!',
    error: 'Something went wrong',
    noTemplates: 'No templates available. Create a template in DocuSeal first.',
    loadingTemplates: 'Loading templates...',
  },
};

const SendSignatureDialog = ({ open, onOpenChange, taskId, volunteerEmail, volunteerName, language }: SendSignatureDialogProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const l = labels[language];

  useEffect(() => {
    if (!open) return;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=templates`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        const data = await response.json();
        const templates = Array.isArray(data) ? data : data?.data || [];
        if (response.ok && templates.length > 0) {
          setTemplates(templates.map((t: any) => ({ id: t.id, name: t.name })));
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
      setLoadingTemplates(false);
    };
    fetchTemplates();
  }, [open]);

  const handleSend = async () => {
    if (!selectedTemplate) return;
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=create-submission`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: selectedTemplate,
          task_id: taskId,
          volunteer_email: volunteerEmail,
          volunteer_name: volunteerName,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(l.success);
        onOpenChange(false);
      } else {
        toast.error(data.error || l.error);
      }
    } catch (err) {
      toast.error(l.error);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            {l.title}
          </DialogTitle>
          <DialogDescription>{l.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{l.selectTemplate}</label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                {l.loadingTemplates}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">{l.noTemplates}</p>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border hover:border-foreground/20 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{language === 'nl' ? 'Naar:' : language === 'fr' ? 'À :' : 'To:'} <span className="text-foreground font-medium">{volunteerName || volunteerEmail}</span></p>
            <p className="text-xs text-muted-foreground">{volunteerEmail}</p>
          </div>

          <Button
            onClick={handleSend}
            disabled={!selectedTemplate || loading}
            className="w-full"
          >
            {loading ? (
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

export default SendSignatureDialog;
