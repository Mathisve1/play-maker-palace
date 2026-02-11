import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, ExternalLink, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface SignatureRequest {
  id: string;
  status: string;
  signing_url: string | null;
  document_url: string | null;
  created_at: string;
}

interface SignatureStatusProps {
  taskId: string;
  language: Language;
}

const labels = {
  nl: {
    title: 'E-handtekening',
    pending: 'Wacht op ondertekening',
    completed: 'Ondertekend',
    expired: 'Verlopen',
    sign: 'Contract ondertekenen',
    noRequest: 'Geen contractverzoek ontvangen',
    viewDocument: 'Document bekijken',
  },
  fr: {
    title: 'Signature électronique',
    pending: 'En attente de signature',
    completed: 'Signé',
    expired: 'Expiré',
    sign: 'Signer le contrat',
    noRequest: 'Aucune demande de contrat reçue',
    viewDocument: 'Voir le document',
  },
  en: {
    title: 'E-signature',
    pending: 'Awaiting signature',
    completed: 'Signed',
    expired: 'Expired',
    sign: 'Sign contract',
    noRequest: 'No contract request received',
    viewDocument: 'View document',
  },
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'pending' as const },
  completed: { icon: CheckCircle2, color: 'text-green-600 bg-green-50', label: 'completed' as const },
  expired: { icon: AlertTriangle, color: 'text-destructive bg-destructive/10', label: 'expired' as const },
};

const SignatureStatus = ({ taskId, language }: SignatureStatusProps) => {
  const [request, setRequest] = useState<SignatureRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const l = labels[language];

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('task_id', taskId)
        .eq('volunteer_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setRequest(data as SignatureRequest | null);
      setLoading(false);
    };
    load();
  }, [taskId]);

  if (loading) return null;
  if (!request) return null;

  const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-transparent">
      <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
        <FileSignature className="w-5 h-5 text-primary" />
        {l.title}
      </h2>

      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
          <StatusIcon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-foreground">{l[config.label]}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(request.created_at).toLocaleDateString(
              language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
              { day: 'numeric', month: 'short', year: 'numeric' }
            )}
          </p>
        </div>
      </div>

      {request.status === 'pending' && request.signing_url && (
        <a
          href={request.signing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <FileSignature className="w-4 h-4" />
          {l.sign}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}

      {request.status === 'completed' && request.document_url && (
        <a
          href={request.document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {l.viewDocument}
        </a>
      )}
    </div>
  );
};

export default SignatureStatus;
