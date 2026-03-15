import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClubContext } from '@/contexts/ClubContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Calendar, Star, CheckCircle, Users, Award, Pencil, ArrowLeft, Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import VolunteerBadges from '@/components/VolunteerBadges';
import EditProfileDialog from '@/components/EditProfileDialog';
import { Language } from '@/i18n/translations';

const iconMap: Record<string, any> = {
  star: Star, award: Award,
};

const labels = {
  nl: {
    back: 'Terug',
    memberSince: 'Lid sinds',
    stats: 'Statistieken',
    completedTasks: 'Voltooide taken',
    avgRating: 'Gemiddelde beoordeling',
    clubs: 'Clubs',
    skills: 'Vaardigheden',
    noSkills: 'Nog geen vaardigheden toegevoegd',
    activity: 'Activiteiten',
    noActivity: 'Nog geen voltooide taken',
    reviews: 'Recente beoordelingen',
    noReviews: 'Nog geen beoordelingen ontvangen',
    editProfile: 'Profiel bewerken',
    notFound: 'Vrijwilliger niet gevonden',
    from: 'van',
    phone: 'Telefoon',
    email: 'E-mail',
  },
  fr: {
    back: 'Retour',
    memberSince: 'Membre depuis',
    stats: 'Statistiques',
    completedTasks: 'Tâches terminées',
    avgRating: 'Note moyenne',
    clubs: 'Clubs',
    skills: 'Compétences',
    noSkills: 'Pas encore de compétences ajoutées',
    activity: 'Activités',
    noActivity: 'Pas encore de tâches terminées',
    reviews: 'Évaluations récentes',
    noReviews: 'Aucune évaluation reçue',
    editProfile: 'Modifier le profil',
    notFound: 'Bénévole non trouvé',
    from: 'de',
    phone: 'Téléphone',
    email: 'E-mail',
  },
  en: {
    back: 'Back',
    memberSince: 'Member since',
    stats: 'Statistics',
    completedTasks: 'Completed tasks',
    avgRating: 'Average rating',
    clubs: 'Clubs',
    skills: 'Skills',
    noSkills: 'No skills added yet',
    activity: 'Activity',
    noActivity: 'No completed tasks yet',
    reviews: 'Recent reviews',
    noReviews: 'No reviews received yet',
    editProfile: 'Edit profile',
    notFound: 'Volunteer not found',
    from: 'from',
    phone: 'Phone',
    email: 'Email',
  },
};

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  created_at: string;
}

interface CompletedTask {
  id: string;
  title: string;
  task_date: string | null;
  club_name: string;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
  task_title: string;
}

const VolunteerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { userId: currentUserId } = useClubContext();
  const l = labels[language];

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [clubCount, setClubCount] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const isOwnProfile = currentUserId === id;
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, bio, phone, created_at')
        .eq('id', id)
        .single();

      if (!profileData) { setLoading(false); return; }
      setProfile(profileData);

      // Parallel: completed signups, skills, club memberships, reviews
      const [signupsRes, skillsRes, membershipsRes, reviewsRes] = await Promise.all([
        supabase
          .from('task_signups')
          .select('id, task_id')
          .eq('volunteer_id', id)
          .eq('status', 'completed'),
        supabase
          .from('volunteer_skills')
          .select('skill_name')
          .eq('user_id', id),
        supabase
          .from('club_memberships')
          .select('id')
          .eq('volunteer_id', id)
          .eq('status', 'actief'),
        (supabase as any)
          .from('task_reviews')
          .select('id, rating, comment, created_at, reviewer_id, task_signup_id')
          .eq('reviewee_id', id)
          .eq('reviewer_role', 'club')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setSkills((skillsRes.data || []).map((s: any) => s.skill_name));
      setClubCount((membershipsRes.data || []).length);

      // Process reviews
      const reviewData = (reviewsRes.data || []) as any[];
      if (reviewData.length > 0) {
        // Get all reviews for avg (not just 5)
        const { data: allReviews } = await (supabase as any)
          .from('task_reviews')
          .select('rating')
          .eq('reviewee_id', id)
          .eq('reviewer_role', 'club');
        const allRatings = (allReviews || []) as { rating: number }[];
        if (allRatings.length > 0) {
          const sum = allRatings.reduce((s, r) => s + r.rating, 0);
          setAvgRating(sum / allRatings.length);
          setReviewCount(allRatings.length);
        }

        // Enrich reviews with reviewer name and task title
        const reviewerIds = [...new Set(reviewData.map((r: any) => r.reviewer_id))];
        const signupIds = [...new Set(reviewData.map((r: any) => r.task_signup_id))];

        const [reviewersRes, signupsForReviews] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', reviewerIds),
          supabase.from('task_signups').select('id, task_id').in('id', signupIds),
        ]);

        const reviewerMap = new Map((reviewersRes.data || []).map((p: any) => [p.id, p.full_name]));
        const signupTaskMap = new Map((signupsForReviews.data || []).map((s: any) => [s.id, s.task_id]));

        const taskIds = [...new Set([...(signupsForReviews.data || []).map((s: any) => s.task_id)])];
        const { data: taskData } = taskIds.length > 0
          ? await supabase.from('tasks').select('id, title').in('id', taskIds)
          : { data: [] };
        const taskMap = new Map((taskData || []).map((t: any) => [t.id, t.title]));

        setReviews(reviewData.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          reviewer_name: reviewerMap.get(r.reviewer_id) || null,
          task_title: taskMap.get(signupTaskMap.get(r.task_signup_id)) || '',
        })));
      }

      // Enrich completed tasks
      const signups = signupsRes.data || [];
      if (signups.length > 0) {
        const taskIds = [...new Set(signups.map((s: any) => s.task_id))];
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, title, task_date, club_id, clubs(name)')
          .in('id', taskIds)
          .order('task_date', { ascending: false })
          .limit(20);

        setCompletedTasks((taskData || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          task_date: t.task_date,
          club_name: t.clubs?.name || '',
        })));
      }

      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{l.notFound}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />{l.back}
        </Button>
      </div>
    );
  }

  const initials = (profile.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />{l.back}
          </Button>
          {isOwnProfile && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowEditProfile(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" />{l.editProfile}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Avatar className="w-24 h-24 shrink-0">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />}
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-heading font-bold text-foreground">{profile.full_name || l.notFound}</h1>
              {profile.bio && <p className="text-sm text-muted-foreground mt-1 italic">"{profile.bio}"</p>}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {l.memberSince} {new Date(profile.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                </span>
              </div>
              {/* Contact info */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-2 text-xs text-muted-foreground">
                {profile.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{profile.email}</span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{profile.phone}</span>
                )}
              </div>
              {/* Rating */}
              {avgRating !== null && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                  ))}
                  <span className="text-sm font-medium text-foreground ml-1">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviewCount})</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Badges */}
        <VolunteerBadges userId={id!} language={language} compact />

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm text-center">
            <CheckCircle className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold text-foreground">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">{l.completedTasks}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm text-center">
            <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold text-foreground">{avgRating !== null ? avgRating.toFixed(1) : '—'}</p>
            <p className="text-xs text-muted-foreground">{l.avgRating}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm text-center col-span-2 md:col-span-1">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold text-foreground">{clubCount}</p>
            <p className="text-xs text-muted-foreground">{l.clubs}</p>
          </motion.div>
        </div>

        {/* Skills */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{l.skills}</h2>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <Badge key={skill} variant="secondary" className="text-sm px-3 py-1">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{l.noSkills}</p>
          )}
        </motion.div>

        {/* Activity */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{l.activity}</h2>
          {completedTasks.length > 0 ? (
            <div className="space-y-3">
              {completedTasks.map((task, i) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{task.club_name}</span>
                      {task.task_date && (
                        <>
                          <span>·</span>
                          <span>{new Date(task.task_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{l.noActivity}</p>
          )}
        </motion.div>

        {/* Reviews */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{l.reviews}</h2>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="p-4 rounded-xl bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                  <p className="text-xs text-muted-foreground">
                    {review.task_title}
                    {review.reviewer_name && <> · {l.from} {review.reviewer_name}</>}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{l.noReviews}</p>
          )}
        </motion.div>
      </div>

      {/* Edit Profile Dialog */}
      {isOwnProfile && (
        <EditProfileDialog
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          userId={id!}
          language={language}
          isFirstLogin={false}
          onProfileUpdated={(updated) => {
            setProfile(prev => prev ? {
              ...prev,
              full_name: updated.full_name || prev.full_name,
              avatar_url: updated.avatar_url ?? prev.avatar_url,
            } : prev);
          }}
        />
      )}
    </div>
  );
};

export default VolunteerProfile;
