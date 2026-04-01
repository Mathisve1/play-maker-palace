import { TrendingUp, BookOpen } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { useNavigate } from 'react-router-dom';
import VolunteerLoyaltyTab from '@/components/volunteer/VolunteerLoyaltyTab';
import AcademyTab from '@/components/AcademyTab';

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string | null;
  reward_description: string;
  required_tasks: number;
  required_points: number | null;
  points_based: boolean;
  club_id: string;
  club_name?: string;
}

interface LoyaltyEnrollment {
  id: string;
  tasks_completed: number;
  points_earned: number;
  reward_claimed: boolean;
}

interface Props {
  language: Language;
  userId: string;
  loyaltyPrograms: LoyaltyProgram[];
  loyaltyEnrollments: Record<string, LoyaltyEnrollment>;
  enrollingProgram: string | null;
  onEnroll: (programId: string) => void;
  followedClubIds: Set<string> | null;
}

const VolunteerGrowTab = ({ language, userId, loyaltyPrograms, loyaltyEnrollments, enrollingProgram, onEnroll, followedClubIds }: Props) => {
  const navigate = useNavigate();
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          {t('Groeien', 'Progresser', 'Grow')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            'Verdien badges, volg trainingen en groei als vrijwilliger.',
            'Gagnez des badges, suivez des formations et progressez en tant que bénévole.',
            'Earn badges, complete trainings and grow as a volunteer.'
          )}
        </p>
      </div>

      {/* Loyalty section */}
      <section>
        <VolunteerLoyaltyTab
          programs={loyaltyPrograms}
          enrollments={loyaltyEnrollments}
          language={language}
          enrollingProgram={enrollingProgram}
          onEnroll={onEnroll}
          userId={userId}
        />
      </section>

      {/* Academy section */}
      <section>
        <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-primary" />
          {t('Trainingen & Academy', 'Formations & Académie', 'Trainings & Academy')}
        </h2>
        <AcademyTab language={language} navigate={navigate} />
      </section>
    </div>
  );
};

export default VolunteerGrowTab;
