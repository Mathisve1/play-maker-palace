import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClubContext } from '@/contexts/ClubContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, UserCheck, Send, Star, Clock, Award, CheckCircle, AlertCircle, FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskForMatch {
  id: string;
  title: string;
  task_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  club_id: string;
}

interface MatchedVolunteer {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  matchScore: number;
  availabilityMatch: boolean;
  skillMatch: string[];
  pastTasks: number;
  contractStatus: 'signed' | 'pending' | 'none';
}

const labels = {
  nl: {
    title: 'Vrijwilligers Zoeken',
    subtitle: 'Beste matches voor deze taak',
    invite: 'Uitnodigen',
    invited: 'Uitgenodigd',
    inviting: 'Bezig...',
    noMatches: 'Geen beschikbare vrijwilligers gevonden',
    availability: 'Beschikbaar',
    skills: 'Vaardigheden',
    experience: 'ervaring',
    tasks: 'taken',
    matchScore: 'Match',
    sending: 'E-mail wordt verstuurd...',
    contractOk: 'Contract OK',
    contractPending: 'Contract in behandeling',
    noContract: 'Geen contract',
    noContractTooltip: 'Vrijwilliger heeft nog geen seizoenscontract',
  },
  fr: {
    title: 'Chercher des Bénévoles',
    subtitle: 'Meilleurs correspondances pour cette tâche',
    invite: 'Inviter',
    invited: 'Invité',
    inviting: 'En cours...',
    noMatches: 'Aucun bénévole disponible trouvé',
    availability: 'Disponible',
    skills: 'Compétences',
    experience: 'expérience',
    tasks: 'tâches',
    matchScore: 'Match',
    sending: "L'email est envoyé...",
    contractOk: 'Contrat OK',
    contractPending: 'Contrat en cours',
    noContract: 'Pas de contrat',
    noContractTooltip: 'Le bénévole n\'a pas encore de contrat saisonnier',
  },
  en: {
    title: 'Find Volunteers',
    subtitle: 'Best matches for this task',
    invite: 'Invite',
    invited: 'Invited',
    inviting: 'Sending...',
    noMatches: 'No available volunteers found',
    availability: 'Available',
    skills: 'Skills',
    experience: 'experience',
    tasks: 'tasks',
    matchScore: 'Match',
    sending: 'Sending email...',
    contractOk: 'Contract OK',
    contractPending: 'Contract pending',
    noContract: 'No contract',
    noContractTooltip: 'Volunteer does not have a season contract yet',
  },
};

interface VolunteerMatcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskForMatch;
}

const VolunteerMatcher = ({ open, onOpenChange, task }: VolunteerMatcherProps) => {
  const { language } = useLanguage();
  const { clubId, clubInfo } = useClubContext();
  const navigate = useNavigate();
  const l = labels[language];

  const [matches, setMatches] = useState<MatchedVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !task) return;
    setLoading(true);
    setMatches([]);
    setInvitedIds(new Set());

    const findMatches = async () => {
      // 1. Get all club memberships for this club
      const { data: memberships } = await supabase
        .from('club_memberships')
        .select('volunteer_id')
        .eq('club_id', task.club_id)
        .eq('status', 'actief');

      const volunteerIds = (memberships || []).map((m: any) => m.volunteer_id);
      if (volunteerIds.length === 0) { setLoading(false); return; }

      // 2. Parallel: profiles, availability, skills, past signups, existing signups, season contracts
      const [profilesRes, availRes, skillsRes, signupsRes, existingSignups, contractsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', volunteerIds),
        supabase.from('volunteer_availability').select('*').in('volunteer_id', volunteerIds),
        supabase.from('volunteer_skills').select('user_id, skill_name').in('user_id', volunteerIds),
        supabase.from('task_signups').select('volunteer_id, task_id').in('volunteer_id', volunteerIds).eq('status', 'assigned'),
        supabase.from('task_signups').select('volunteer_id, status').eq('task_id', task.id),
        supabase.from('season_contracts').select('volunteer_id, status').eq('club_id', task.club_id),
      ]);

      const profiles = profilesRes.data || [];
      const availability = (availRes.data || []) as any[];
      const skills = (skillsRes.data || []) as any[];
      const pastSignups = (signupsRes.data || []) as any[];
      const alreadySignedUp = new Set((existingSignups.data || []).map((s: any) => s.volunteer_id));
      const seasonContracts = (contractsRes.data || []) as any[];

      // Build contract status map per volunteer
      const contractStatusMap = new Map<string, 'signed' | 'pending' | 'none'>();
      volunteerIds.forEach(vid => contractStatusMap.set(vid, 'none'));
      seasonContracts.forEach((sc: any) => {
        const current = contractStatusMap.get(sc.volunteer_id);
        if (sc.status === 'signed') contractStatusMap.set(sc.volunteer_id, 'signed');
        else if (current !== 'signed' && (sc.status === 'sent' || sc.status === 'pending')) contractStatusMap.set(sc.volunteer_id, 'pending');
      });

      // Already invited
      const alreadyInvited = new Set(
        (existingSignups.data || [])
          .filter((s: any) => s.status === 'uitgenodigd')
          .map((s: any) => s.volunteer_id)
      );
      setInvitedIds(alreadyInvited);

      // Parse task date/time for availability matching
      const taskDate = task.task_date ? new Date(task.task_date) : null;
      const taskDow = taskDate ? taskDate.getDay() : null; // 0=Sunday

      // Score each volunteer
      const scored: MatchedVolunteer[] = profiles
        .filter(p => !alreadySignedUp.has(p.id) || alreadyInvited.has(p.id))
        .map(p => {
          let score = 0;

          // Availability match
          const volAvail = availability.filter((a: any) => a.volunteer_id === p.id);
          let availMatch = false;
          if (taskDow !== null && volAvail.length > 0) {
            availMatch = volAvail.some((a: any) => a.day_of_week === taskDow);
            if (availMatch) score += 40;
          } else if (volAvail.length > 0) {
            score += 20; // Has availability set, but no date to match
          }

          // Skill match (check task title/description words)
          const volSkills = skills.filter((s: any) => s.user_id === p.id).map((s: any) => s.skill_name);
          const matchingSkills = volSkills.filter((sk: string) =>
            task.title.toLowerCase().includes(sk.toLowerCase())
          );
          score += matchingSkills.length * 15;
          score += Math.min(volSkills.length * 5, 20); // General skill bonus

          // Experience
          const pastCount = pastSignups.filter((s: any) => s.volunteer_id === p.id).length;
          score += Math.min(pastCount * 5, 25);

          // Profile completeness
          if (p.full_name) score += 5;
          if (p.avatar_url) score += 5;

          return {
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            avatar_url: p.avatar_url,
            matchScore: Math.min(score, 100),
            availabilityMatch: availMatch,
            skillMatch: matchingSkills,
            pastTasks: pastCount,
            contractStatus: contractStatusMap.get(p.id) || 'none',
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      setMatches(scored);
      setLoading(false);
    };

    findMatches();
  }, [open, task]);

  const handleInvite = async (volunteer: MatchedVolunteer) => {
    setInviting(volunteer.id);

    // 1. Create task_signup with status 'uitgenodigd'
    const { error } = await supabase.from('task_signups').insert({
      task_id: task.id,
      volunteer_id: volunteer.id,
      status: 'uitgenodigd',
    });

    if (error) {
      toast.error(error.message);
      setInviting(null);
      return;
    }

    // 2. Send invite email via edge function
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke('send-task-invite-email', {
          body: {
            volunteer_email: volunteer.email,
            volunteer_name: volunteer.full_name,
            task_title: task.title,
            task_date: task.task_date,
            task_location: task.location,
            club_name: clubInfo?.name || 'Club',
          },
        });
      }
    } catch (e) {
      console.warn('Invite email failed, signup was still created', e);
    }

    setInvitedIds(prev => new Set(prev).add(volunteer.id));
    toast.success(
      language === 'nl' ? `${volunteer.full_name || 'Vrijwilliger'} is uitgenodigd!` :
      language === 'fr' ? `${volunteer.full_name || 'Bénévole'} a été invité !` :
      `${volunteer.full_name || 'Volunteer'} has been invited!`
    );
    setInviting(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            {l.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{l.subtitle}: <span className="font-medium text-foreground">{task.title}</span></p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{l.noMatches}</p>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            <AnimatePresence>
              {matches.map((vol, i) => {
                const isInvited = invitedIds.has(vol.id);
                return (
                  <motion.div
                    key={vol.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      isInvited ? 'bg-primary/5 border-primary/20' : 'bg-card border-border hover:bg-muted/30'
                    }`}
                  >
                    <Avatar className="h-10 w-10 shrink-0 cursor-pointer" onClick={() => { onOpenChange(false); navigate(`/volunteer/${vol.id}`); }}>
                      {vol.avatar_url && <AvatarImage src={vol.avatar_url} alt={vol.full_name || ''} />}
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {(vol.full_name || vol.email || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline"
                          onClick={() => { onOpenChange(false); navigate(`/volunteer/${vol.id}`); }}
                        >
                          {vol.full_name || vol.email}
                        </p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          <Star className="w-3 h-3 mr-0.5 text-amber-500" />
                          {vol.matchScore}%
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {/* Contract status badge */}
                        {vol.contractStatus === 'signed' ? (
                          <Badge className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-0">
                            <CheckCircle className="w-3 h-3 mr-0.5" />
                            {l.contractOk}
                          </Badge>
                        ) : vol.contractStatus === 'pending' ? (
                          <Badge className="text-[10px] bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-0">
                            <Clock className="w-3 h-3 mr-0.5" />
                            {l.contractPending}
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-destructive/10 text-destructive border-0">
                            <AlertCircle className="w-3 h-3 mr-0.5" />
                            {l.noContract}
                          </Badge>
                        )}
                        {vol.availabilityMatch && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Clock className="w-3 h-3 mr-0.5" />
                            {l.availability}
                          </Badge>
                        )}
                        {vol.pastTasks > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            <Award className="w-3 h-3 mr-0.5" />
                            {vol.pastTasks} {l.tasks}
                          </Badge>
                        )}
                        {vol.skillMatch.length > 0 && vol.skillMatch.map(sk => (
                          <Badge key={sk} className="text-[10px] bg-accent/20 text-accent-foreground border-0">
                            {sk}
                          </Badge>
                        ))}
                      </div>

                      {/* Mini progress bar */}
                      <div className="mt-1.5">
                        <Progress value={vol.matchScore} className="h-1" />
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isInvited ? (
                        <Badge className="bg-primary/10 text-primary border-0">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          {l.invited}
                        </Badge>
                      ) : vol.contractStatus === 'none' ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="sm" disabled>
                                  <AlertCircle className="w-3.5 h-3.5 mr-1" />{l.invite}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{l.noContractTooltip}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleInvite(vol)}
                          disabled={inviting === vol.id}
                          variant={vol.contractStatus === 'pending' ? 'outline' : 'default'}
                        >
                          {inviting === vol.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><Send className="w-3.5 h-3.5 mr-1" />{l.invite}</>
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VolunteerMatcher;
