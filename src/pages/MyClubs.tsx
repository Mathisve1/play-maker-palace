import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import DashboardLayout from '@/components/DashboardLayout';
import VolunteerSidebar, { VolunteerTab } from '@/components/VolunteerSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Star, Search, Building2, CalendarDays, FileSignature, LogOut, ChevronRight, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import EditProfileDialog from '@/components/EditProfileDialog';

interface ClubMembership {
  id: string;
  club_id: string;
  club_role: string;
  status: string;
  joined_at: string;
  club: {
    id: string;
    name: string;
    logo_url: string | null;
    sport: string | null;
    location: string | null;
  };
}

interface SeasonInfo {
  id: string;
  name: string;
  is_active: boolean;
}

interface ContractInfo {
  status: string; // 'signed' | 'sent' | 'none'
}

interface UpcomingTask {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
  start_time: string | null;
}

const labels = {
  nl: {
    title: 'Mijn Clubs',
    subtitle: 'Beheer je club-lidmaatschappen en bekijk je status per club',
    activeClub: 'Actieve club',
    setActive: 'Maak actief',
    joined: 'Lid sinds',
    role: 'Rol',
    noClubs: 'Je bent nog geen lid van een club',
    noClubsDesc: 'Ontdek clubs in je buurt en meld je aan als vrijwilliger.',
    findClubs: 'Ontdek clubs',
    viewClub: 'Bekijk club',
    leaveClub: 'Verlaat club',
    leaveTitle: 'Club verlaten?',
    leaveDesc: 'Weet je zeker dat je deze club wilt verlaten? Je zult opnieuw moeten inschrijven.',
    leaveConfirm: 'Verlaten',
    cancel: 'Annuleren',
    left: 'Club verlaten',
    activeSeason: 'Actief seizoen',
    noSeason: 'Geen actief seizoen',
    signed: 'Ondertekend',
    pending: 'Contract in afwachting',
    noContract: 'Geen contract',
    upcomingTasks: 'Komende taken',
    noUpcoming: 'Geen taken de komende 14 dagen',
  },
  fr: {
    title: 'Mes Clubs',
    subtitle: 'Gérez vos adhésions et consultez votre statut par club',
    activeClub: 'Club actif',
    setActive: 'Activer',
    joined: 'Membre depuis',
    role: 'Rôle',
    noClubs: "Vous n'êtes membre d'aucun club",
    noClubsDesc: 'Découvrez les clubs près de chez vous et inscrivez-vous comme bénévole.',
    findClubs: 'Découvrir des clubs',
    viewClub: 'Voir le club',
    leaveClub: 'Quitter le club',
    leaveTitle: 'Quitter le club ?',
    leaveDesc: 'Êtes-vous sûr de vouloir quitter ce club ? Vous devrez vous réinscrire.',
    leaveConfirm: 'Quitter',
    cancel: 'Annuler',
    left: 'Club quitté',
    activeSeason: 'Saison active',
    noSeason: 'Pas de saison active',
    signed: 'Signé',
    pending: 'Contrat en attente',
    noContract: 'Pas de contrat',
    upcomingTasks: 'Tâches à venir',
    noUpcoming: 'Aucune tâche dans les 14 prochains jours',
  },
  en: {
    title: 'My Clubs',
    subtitle: 'Manage your memberships and view your status per club',
    activeClub: 'Active club',
    setActive: 'Set active',
    joined: 'Member since',
    role: 'Role',
    noClubs: "You're not a member of any club yet",
    noClubsDesc: 'Discover clubs near you and sign up as a volunteer.',
    findClubs: 'Discover clubs',
    viewClub: 'View club',
    leaveClub: 'Leave club',
    leaveTitle: 'Leave club?',
    leaveDesc: 'Are you sure you want to leave this club? You will need to re-enroll.',
    leaveConfirm: 'Leave',
    cancel: 'Cancel',
    left: 'Left club',
    activeSeason: 'Active season',
    noSeason: 'No active season',
    signed: 'Signed',
    pending: 'Contract pending',
    noContract: 'No contract',
    upcomingTasks: 'Upcoming tasks',
    noUpcoming: 'No tasks in the next 14 days',
  },
};

const MyClubs = () => {
  const { userId, clubId, profile, refresh, updateProfile } = useClubContext();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const l = labels[language];
  const locale = language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE';

  const [activeTab, setActiveTab] = useState<VolunteerTab>('dashboard');
  const [profileOpen, setProfileOpen] = useState(false);
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [leavingClub, setLeavingClub] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Map<string, SeasonInfo>>(new Map());
  const [contracts, setContracts] = useState<Map<string, ContractInfo>>(new Map());
  const [upcomingTasks, setUpcomingTasks] = useState<Map<string, UpcomingTask[]>>(new Map());

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);

      // 1. Load memberships
      const { data: membershipData } = await supabase
        .from('club_memberships')
        .select('id, club_id, club_role, status, joined_at, club:clubs(id, name, logo_url, sport, location)')
        .eq('volunteer_id', userId)
        .order('joined_at', { ascending: true });

      const ms = (membershipData || []) as unknown as ClubMembership[];
      setMemberships(ms);

      if (ms.length === 0) { setLoading(false); return; }

      const clubIds = ms.map(m => m.club_id);

      // 2. Load active seasons per club
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('id, name, club_id, is_active')
        .in('club_id', clubIds)
        .eq('is_active', true);

      const seasonMap = new Map<string, SeasonInfo>();
      (seasonsData || []).forEach((s: any) => {
        seasonMap.set(s.club_id, { id: s.id, name: s.name, is_active: s.is_active });
      });
      setSeasons(seasonMap);

      // 3. Load season contracts for this volunteer
      const { data: contractsData } = await supabase
        .from('season_contracts')
        .select('club_id, signature_status')
        .eq('volunteer_id', userId)
        .in('club_id', clubIds);

      const contractMap = new Map<string, ContractInfo>();
      (contractsData || []).forEach((c: any) => {
        // Take the best status per club (signed > sent > none)
        const existing = contractMap.get(c.club_id);
        if (!existing || (c.signature_status === 'signed' && existing.status !== 'signed')) {
          contractMap.set(c.club_id, { status: c.signature_status === 'signed' ? 'signed' : 'sent' });
        }
      });
      setContracts(contractMap);

      // 4. Upcoming tasks (next 14 days) per club
      const today = new Date().toISOString().split('T')[0];
      const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

      // Get task signups for this volunteer
      const { data: signups } = await supabase
        .from('task_signups')
        .select('task_id')
        .eq('volunteer_id', userId)
        .in('status', ['pending', 'assigned']);

      if (signups && signups.length > 0) {
        const taskIds = signups.map((s: any) => s.task_id);
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, task_date, location, start_time, club_id')
          .in('id', taskIds)
          .in('club_id', clubIds)
          .gte('task_date', today)
          .lte('task_date', in14)
          .order('task_date')
          .limit(50);

        const taskMap = new Map<string, UpcomingTask[]>();
        (tasksData || []).forEach((t: any) => {
          const list = taskMap.get(t.club_id) || [];
          if (list.length < 3) {
            list.push({ id: t.id, title: t.title, task_date: t.task_date, location: t.location, start_time: t.start_time });
          }
          taskMap.set(t.club_id, list);
        });
        setUpcomingTasks(taskMap);
      }

      setLoading(false);
    };
    load();
  }, [userId]);

  const handleSetActive = async (membershipClubId: string) => {
    if (!userId) return;
    setSwitching(membershipClubId);
    const { error } = await supabase
      .from('profiles')
      .update({ primary_club_id: membershipClubId })
      .eq('id', userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`✅ ${l.activeClub}`);
      await refresh();
    }
    setSwitching(null);
  };

  const handleLeaveClub = async (membershipId: string, membershipClubId: string) => {
    setLeavingClub(membershipClubId);
    const { error } = await supabase
      .from('club_memberships')
      .delete()
      .eq('id', membershipId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(l.left);
      setMemberships(prev => prev.filter(m => m.id !== membershipId));
      if (membershipClubId === clubId) {
        await refresh();
      }
    }
    setLeavingClub(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const sidebar = (
    <VolunteerSidebar
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      profile={profile}
      language={language}
      onLogout={handleLogout}
      onOpenProfile={() => setProfileOpen(true)}
    />
  );

  const contractBadge = (cId: string) => {
    const c = contracts.get(cId);
    if (c?.status === 'signed') return (
      <Badge className="bg-green-600 text-[10px] gap-1">
        <FileSignature className="w-2.5 h-2.5" /> {l.signed} ✅
      </Badge>
    );
    if (c?.status === 'sent') return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <FileSignature className="w-2.5 h-2.5" /> {l.pending} ⏳
      </Badge>
    );
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
        <FileSignature className="w-2.5 h-2.5" /> {l.noContract} ❌
      </Badge>
    );
  };

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{l.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{l.subtitle}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : memberships.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <Building2 className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-lg font-semibold text-foreground">{l.noClubs}</p>
                <p className="text-sm text-muted-foreground mt-1">{l.noClubsDesc}</p>
              </div>
              <Button onClick={() => navigate('/community')} size="lg">
                <Search className="w-4 h-4 mr-2" />
                {l.findClubs}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {memberships.map((m) => {
              const isActive = m.club_id === clubId;
              const club = m.club;
              const season = seasons.get(m.club_id);
              const clubTasks = upcomingTasks.get(m.club_id) || [];

              return (
                <Card key={m.id} className={`transition-all ${isActive ? 'border-primary ring-1 ring-primary/20' : 'hover:border-border/80'}`}>
                  <CardContent className="p-5 space-y-4">
                    {/* Header: Logo, name, active badge, set active */}
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 shrink-0 rounded-xl">
                        {club.logo_url && <AvatarImage src={club.logo_url} alt={club.name} className="rounded-xl" />}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg rounded-xl">
                          {club.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-lg truncate">{club.name}</h3>
                          {isActive && (
                            <Badge variant="default" className="shrink-0 text-[10px]">
                              <Star className="w-3 h-3 mr-0.5" /> {l.activeClub}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {club.sport && <span>{club.sport}</span>}
                          {club.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{club.location}</span>}
                          <span>{l.role}: {m.club_role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive && m.status === 'actief' && (
                          <Button size="sm" variant="outline" onClick={() => handleSetActive(m.club_id)} disabled={switching === m.club_id}>
                            {switching === m.club_id ? <Loader2 className="w-4 h-4 animate-spin" /> : l.setActive}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Season & contract status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <CalendarDays className="w-2.5 h-2.5" />
                        {season ? `${l.activeSeason}: ${season.name}` : l.noSeason}
                      </Badge>
                      {contractBadge(m.club_id)}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {l.joined} {new Date(m.joined_at).toLocaleDateString(locale)}
                      </span>
                    </div>

                    {/* Upcoming tasks */}
                    {clubTasks.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">{l.upcomingTasks}</p>
                        <div className="space-y-1">
                          {clubTasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                              <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="font-medium truncate flex-1">{t.title}</span>
                              {t.task_date && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {new Date(t.task_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              {t.start_time && (
                                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{t.start_time}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">{l.noUpcoming}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/community/club/${m.club_id}`)}>
                        {l.viewClub} <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <LogOut className="w-3.5 h-3.5" /> {l.leaveClub}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{l.leaveTitle}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {l.leaveDesc}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{l.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleLeaveClub(m.id, m.club_id)}
                            >
                              {leavingClub === m.club_id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                              {l.leaveConfirm}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {memberships.length > 0 && (
          <div className="pt-2">
            <Button variant="outline" onClick={() => navigate('/community')} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              {l.findClubs}
            </Button>
          </div>
        )}
      </div>

      {profileOpen && userId && (
        <EditProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          onProfileUpdated={(p) => updateProfile(p)}
          userId={userId}
          language={language}
        />
      )}
    </DashboardLayout>
  );
};

export default MyClubs;
