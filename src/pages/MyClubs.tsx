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
import { Loader2, Star, Search, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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

const labels = {
  nl: {
    title: 'Mijn Clubs',
    subtitle: 'Beheer je club-lidmaatschappen',
    activeClub: 'Actieve club',
    setActive: 'Maak actief',
    joined: 'Lid sinds',
    role: 'Rol',
    noClubs: 'Je bent nog geen lid van een club',
    findClubs: 'Clubs zoeken',
    status: { actief: 'Actief', 'in behandeling': 'In behandeling', inactief: 'Inactief' },
  },
  fr: {
    title: 'Mes Clubs',
    subtitle: 'Gérez vos adhésions aux clubs',
    activeClub: 'Club actif',
    setActive: 'Activer',
    joined: 'Membre depuis',
    role: 'Rôle',
    noClubs: "Vous n'êtes encore membre d'aucun club",
    findClubs: 'Chercher des clubs',
    status: { actief: 'Actif', 'in behandeling': 'En cours', inactief: 'Inactif' },
  },
  en: {
    title: 'My Clubs',
    subtitle: 'Manage your club memberships',
    activeClub: 'Active club',
    setActive: 'Set active',
    joined: 'Member since',
    role: 'Role',
    noClubs: "You're not a member of any club yet",
    findClubs: 'Find clubs',
    status: { actief: 'Active', 'in behandeling': 'Pending', inactief: 'Inactive' },
  },
};

const MyClubs = () => {
  const { userId, clubId, profile, refresh, updateProfile } = useClubContext();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const l = labels[language];

  const [activeTab, setActiveTab] = useState<VolunteerTab>('dashboard');
  const [profileOpen, setProfileOpen] = useState(false);
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('club_memberships')
        .select('id, club_id, club_role, status, joined_at, club:clubs(id, name, logo_url, sport, location)')
        .eq('volunteer_id', userId)
        .order('joined_at', { ascending: true });

      if (!error && data) {
        setMemberships(data as unknown as ClubMembership[]);
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
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅', description: l.activeClub });
      await refresh();
    }
    setSwitching(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
            <CardContent className="py-12 text-center space-y-4">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">{l.noClubs}</p>
              <Button onClick={() => navigate('/community')} variant="outline">
                <Search className="w-4 h-4 mr-2" />
                {l.findClubs}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {memberships.map((m) => {
              const isActive = m.club_id === clubId;
              const club = m.club;
              return (
                <Card key={m.id} className={`transition-colors ${isActive ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <Avatar className="h-12 w-12 shrink-0">
                      {club.logo_url && <AvatarImage src={club.logo_url} alt={club.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {club.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{club.name}</h3>
                        {isActive && (
                          <Badge variant="default" className="shrink-0 text-[10px]">
                            <Star className="w-3 h-3 mr-1" />
                            {l.activeClub}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {club.sport && <span>{club.sport}</span>}
                        {club.location && <span>📍 {club.location}</span>}
                        <span>{l.role}: {m.club_role}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={m.status === 'actief' ? 'secondary' : 'outline'} className="text-[10px]">
                          {(l.status as any)[m.status] || m.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {l.joined} {new Date(m.joined_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB')}
                        </span>
                      </div>
                    </div>

                    {!isActive && m.status === 'actief' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(m.club_id)}
                        disabled={switching === m.club_id}
                      >
                        {switching === m.club_id ? <Loader2 className="w-4 h-4 animate-spin" /> : l.setActive}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate('/community')} className="w-full">
            <Search className="w-4 h-4 mr-2" />
            {l.findClubs}
          </Button>
        </div>
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
