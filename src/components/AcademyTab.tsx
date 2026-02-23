import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Award, BookOpen, ArrowRight } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface Certificate {
  id: string;
  training_id: string;
  club_id: string;
  issue_date: string;
  score: number | null;
  type: string;
  training_title?: string;
  club_name?: string;
}

interface Training {
  id: string;
  title: string;
  description: string | null;
  club_id: string;
  club_name?: string;
}

const labels = {
  nl: { myCerts: 'Mijn certificaten', availableTrainings: 'Beschikbare trainingen', noCerts: 'Nog geen certificaten behaald.', noTrainings: 'Geen trainingen beschikbaar.', start: 'Start training', certified: 'Gecertificeerd', quiz: 'Quiz', physical: 'Fysiek' },
  fr: { myCerts: 'Mes certificats', availableTrainings: 'Formations disponibles', noCerts: 'Aucun certificat obtenu.', noTrainings: 'Aucune formation disponible.', start: 'Commencer', certified: 'Certifié', quiz: 'Quiz', physical: 'Physique' },
  en: { myCerts: 'My certificates', availableTrainings: 'Available trainings', noCerts: 'No certificates yet.', noTrainings: 'No trainings available.', start: 'Start training', certified: 'Certified', quiz: 'Quiz', physical: 'Physical' },
};

const AcademyTab = ({ language, navigate }: { language: Language; navigate: ReturnType<typeof useNavigate> }) => {
  const l = labels[language];
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [certRes, trainRes] = await Promise.all([
      supabase.from('volunteer_certificates').select('*').eq('volunteer_id', session.user.id),
      supabase.from('academy_trainings').select('*, clubs(name)').eq('is_published', true),
    ]);

    const certs = (certRes.data || []) as any[];
    const allTrainings = (trainRes.data || []) as any[];

    // Enrich certs with training/club names
    const enrichedCerts = certs.map(c => {
      const t = allTrainings.find((tr: any) => tr.id === c.training_id);
      return { ...c, training_title: t?.title, club_name: t?.clubs?.name };
    });
    setCertificates(enrichedCerts);

    // Available trainings (not yet certified)
    const certifiedIds = new Set(certs.map(c => c.training_id));
    setTrainings(allTrainings.filter((t: any) => !certifiedIds.has(t.id)).map((t: any) => ({
      id: t.id, title: t.title, description: t.description, club_id: t.club_id, club_name: t.clubs?.name,
    })));

    setLoading(false);
  };

  if (loading) return <div className="mt-6 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mt-6 space-y-6">
      {/* Certificates */}
      <div>
        <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" /> {l.myCerts}
        </h3>
        {certificates.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{l.noCerts}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {certificates.map((cert, i) => (
              <motion.div key={cert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/20 flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cert.training_title}</p>
                    <p className="text-xs text-muted-foreground">{cert.club_name} • {new Date(cert.issue_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cert.score != null && <span className="text-xs font-bold text-accent">{cert.score}</span>}
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">{l.certified}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Available trainings */}
      {trainings.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> {l.availableTrainings}
          </h3>
          <div className="space-y-2">
            {trainings.map((t, i) => (
              <motion.button key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/training/${t.id}`)}
                className="w-full text-left bg-card rounded-xl border border-border hover:border-primary/30 p-4 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.club_name}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademyTab;
