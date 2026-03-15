import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit3, Loader2, ShieldCheck, Plus, Eye } from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { seasonTemplateNames } from '@/data/seasonContractTemplates';

interface Template {
  id: string;
  name: string;
  category: string;
  is_system: boolean;
  created_at: string;
}

const ContractTemplates = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [clubId, setClubId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryLabels: Record<string, string> = {
    steward: 'Steward',
    bar_catering: t('Bar & Catering', 'Bar & Traiteur', 'Bar & Catering'),
    terrain_material: t('Terrein', 'Terrain', 'Terrain'),
    admin_ticketing: 'Admin / Ticketing',
    event_support: 'Event Support',
    custom: 'Custom',
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: club } = await supabase.from('clubs').select('id').eq('owner_id', user.id).limit(1).single();
      if (!club) { setLoading(false); return; }
      setClubId(club.id);

      const { data } = await supabase
        .from('season_contract_templates')
        .select('id, name, category, is_system, created_at')
        .or(`club_id.eq.${club.id},is_system.eq.true`)
        .order('category');

      setTemplates(data || []);
      setLoading(false);
    };
    init();
  }, []);

  const systemTemplates = templates.filter(t => t.is_system);
  const customTemplates = templates.filter(t => !t.is_system);

  if (loading) {
    return (
      <ClubPageLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </ClubPageLayout>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {t('Contractsjablonen', 'Modèles de contrat', 'Contract Templates')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('Bekijk en bewerk de 5 standaardsjablonen of maak eigen sjablonen.', 'Consultez et modifiez les 5 modèles standards.', 'View and edit the 5 default templates or create custom ones.')}
            </p>
          </div>
          <Button onClick={() => navigate('/contract-builder')}>
            <Plus className="w-4 h-4 mr-1" />
            {t('Nieuw sjabloon', 'Nouveau modèle', 'New template')}
          </Button>
        </div>

        {/* System templates */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {t('Standaardsjablonen (seizoen)', 'Modèles standards (saison)', 'Default templates (season)')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(seasonTemplateNames).map(([cat, name]) => {
              const tmpl = systemTemplates.find(t => t.category === cat);
              return (
                <Card key={cat} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="text-[10px] mb-2">{categoryLabels[cat] || cat}</Badge>
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('Wettelijk conform seizoenscontract', 'Contrat saisonnier conforme', 'Legally compliant season contract')}
                        </p>
                      </div>
                      <FileText className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/contract-builder?season_type=${cat}`)}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        {t('Bewerken', 'Modifier', 'Edit')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Custom templates */}
        {customTemplates.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('Eigen sjablonen', 'Modèles personnalisés', 'Custom templates')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {customTemplates.map(tmpl => (
                <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <Badge variant="secondary" className="text-[10px] mb-2">{categoryLabels[tmpl.category] || tmpl.category}</Badge>
                    <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(tmpl.created_at).toLocaleDateString()}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => navigate(`/contract-builder?template=${tmpl.id}`)}
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      {t('Bewerken', 'Modifier', 'Edit')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </ClubPageLayout>
  );
};

export default ContractTemplates;
