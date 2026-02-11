import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Trash2, FileText, Loader2, Eye, Plus } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface ContractTemplate {
  id: string;
  name: string;
  docuseal_template_id: number;
  created_at: string;
  file_path: string | null;
}

interface Props {
  clubId: string;
  language: Language;
  onClose: () => void;
}

const t = {
  nl: {
    title: 'Contractsjablonen',
    subtitle: 'Beheer de contractsjablonen voor je club',
    noTemplates: 'Nog geen sjablonen. Upload je eerste PDF.',
    uploadTitle: 'Nieuw sjabloon',
    name: 'Naam sjabloon',
    namePlaceholder: 'bijv. Vrijwilligerscontract 2026',
    selectFile: 'PDF selecteren',
    upload: 'Uploaden',
    uploading: 'Bezig met uploaden...',
    delete: 'Verwijderen',
    deleting: 'Verwijderen...',
    uploadSuccess: 'Sjabloon succesvol aangemaakt!',
    deleteSuccess: 'Sjabloon verwijderd.',
    errorName: 'Geef een naam op.',
    errorFile: 'Selecteer een PDF-bestand.',
    close: 'Sluiten',
    created: 'Aangemaakt op',
    preview: 'Bekijken',
  },
  fr: {
    title: 'Modèles de contrat',
    subtitle: 'Gérez les modèles de contrat de votre club',
    noTemplates: "Aucun modèle. Téléchargez votre premier PDF.",
    uploadTitle: 'Nouveau modèle',
    name: 'Nom du modèle',
    namePlaceholder: 'ex. Contrat bénévole 2026',
    selectFile: 'Sélectionner un PDF',
    upload: 'Télécharger',
    uploading: 'Téléchargement en cours...',
    delete: 'Supprimer',
    deleting: 'Suppression...',
    uploadSuccess: 'Modèle créé avec succès!',
    deleteSuccess: 'Modèle supprimé.',
    errorName: 'Veuillez indiquer un nom.',
    errorFile: 'Veuillez sélectionner un fichier PDF.',
    close: 'Fermer',
    created: 'Créé le',
    preview: 'Aperçu',
  },
  en: {
    title: 'Contract Templates',
    subtitle: 'Manage contract templates for your club',
    noTemplates: 'No templates yet. Upload your first PDF.',
    uploadTitle: 'New template',
    name: 'Template name',
    namePlaceholder: 'e.g. Volunteer Contract 2026',
    selectFile: 'Select PDF',
    upload: 'Upload',
    uploading: 'Uploading...',
    delete: 'Delete',
    deleting: 'Deleting...',
    uploadSuccess: 'Template created successfully!',
    deleteSuccess: 'Template deleted.',
    errorName: 'Please enter a name.',
    errorFile: 'Please select a PDF file.',
    close: 'Close',
    created: 'Created on',
    preview: 'Preview',
  },
};

const ContractTemplatesDialog = ({ clubId, language, onClose }: Props) => {
  const l = t[language];
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('contract_templates')
      .select('id, name, docuseal_template_id, created_at, file_path')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (!error) setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [clubId]);

  const invokeDocuseal = async (action: string, body: Record<string, unknown>) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=${action}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleDeleteWithAction = async (templateId: string) => {
    setDeletingId(templateId);
    try {
      await invokeDocuseal('delete-template', { template_id: templateId });
      toast.success(l.deleteSuccess);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
    setDeletingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">{l.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{l.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* New template button → opens Contract Builder */}
          <button
            onClick={() => {
              onClose();
              navigate(`/contract-builder?club_id=${clubId}`);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {l.uploadTitle}
          </button>

          {/* Templates list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{l.noTemplates}</p>
          ) : (
            <div className="space-y-2">
              {templates.map(tmpl => (
                <div
                  key={tmpl.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tmpl.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {l.created} {new Date(tmpl.created_at).toLocaleDateString(
                          language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {tmpl.file_path && (
                      <button
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('contract-templates')
                            .createSignedUrl(tmpl.file_path!, 600);
                          if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title={l.preview}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteWithAction(tmpl.id)}
                      disabled={deletingId === tmpl.id}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title={l.delete}
                    >
                      {deletingId === tmpl.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractTemplatesDialog;
