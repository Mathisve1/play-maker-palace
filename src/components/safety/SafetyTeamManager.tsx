import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { Users, Plus, Trash2, Crown, UserPlus, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SafetyTeam {
  id: string;
  event_id: string;
  club_id: string;
  name: string;
  leader_id: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  volunteer_id: string;
}

interface Volunteer {
  id: string;
  full_name: string;
}

interface Props {
  clubId: string;
  eventId: string;
  volunteers: Volunteer[];
}

const SafetyTeamManager = ({ clubId, eventId, volunteers }: Props) => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [teams, setTeams] = useState<SafetyTeam[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const [teamsRes, membersRes] = await Promise.all([
        supabase.from('safety_teams').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('safety_team_members').select('*'),
      ]);
      const loadedTeams = (teamsRes.data || []) as SafetyTeam[];
      setTeams(loadedTeams);
      
      if (loadedTeams.length > 0) {
        const teamIds = loadedTeams.map(t => t.id);
        const { data: mems } = await supabase.from('safety_team_members').select('*').in('team_id', teamIds);
        setMembers((mems || []) as TeamMember[]);
      }
    };
    load();
  }, [eventId]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !newTeamLeader) return;
    setCreating(true);

    const { data, error } = await supabase.from('safety_teams').insert({
      event_id: eventId,
      club_id: clubId,
      name: newTeamName.trim(),
      leader_id: newTeamLeader,
    }).select('*').single();

    if (error) { toast.error(error.message); setCreating(false); return; }
    
    // Also add leader as team member
    await supabase.from('safety_team_members').insert({
      team_id: data.id,
      volunteer_id: newTeamLeader,
    });

    setTeams(prev => [...prev, data as SafetyTeam]);
    setMembers(prev => [...prev, { id: crypto.randomUUID(), team_id: data.id, volunteer_id: newTeamLeader }]);
    setNewTeamName('');
    setNewTeamLeader('');
    setShowCreateForm(false);
    setCreating(false);
    setExpandedTeams(prev => new Set([...prev, data.id]));
    toast.success(t3('Team aangemaakt!', 'Équipe créée!', 'Team created!'));
  };

  const handleAddMember = async (teamId: string, volunteerId: string) => {
    if (members.some(m => m.team_id === teamId && m.volunteer_id === volunteerId)) return;
    
    const { data, error } = await supabase.from('safety_team_members').insert({
      team_id: teamId,
      volunteer_id: volunteerId,
    }).select('*').single();
    
    if (error) { toast.error(error.message); return; }
    setMembers(prev => [...prev, data as TeamMember]);
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from('safety_team_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleDeleteTeam = async (teamId: string) => {
    await supabase.from('safety_team_members').delete().eq('team_id', teamId);
    await supabase.from('safety_teams').delete().eq('id', teamId);
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setMembers(prev => prev.filter(m => m.team_id !== teamId));
    toast.success(t3('Team verwijderd', 'Équipe supprimée', 'Team deleted'));
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  const getVolName = (id: string) => volunteers.find(v => v.id === id)?.full_name || t3('Onbekend', 'Inconnu', 'Unknown');

  const getAvailableVolunteers = (teamId: string) => {
    const teamMemIds = new Set(members.filter(m => m.team_id === teamId).map(m => m.volunteer_id));
    return volunteers.filter(v => !teamMemIds.has(v.id));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-left">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> {t3('Veiligheidsteams', 'Équipes de sécurité', 'Safety Teams')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {teams.length > 0 && (
              <Badge variant="secondary" className="text-xs">{teams.length} {t3('teams', 'équipes', 'teams')}</Badge>
            )}
            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3">
          {/* Existing teams */}
          {teams.map(team => {
            const teamMembers = members.filter(m => m.team_id === team.id);
            const isExpanded = expandedTeams.has(team.id);
            const leader = volunteers.find(v => v.id === team.leader_id);

            return (
              <div key={team.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleTeam(team.id)}
                  className="w-full flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{team.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-500" />
                      {leader?.full_name || t3('Onbekend', 'Inconnu', 'Unknown')}
                      <span className="mx-1">·</span>
                      {teamMembers.length} {t3('leden', 'membres', 'members')}
                    </p>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="p-3 space-y-2 border-t border-border">
                    {/* Members list */}
                    {teamMembers.map(m => {
                      const vol = volunteers.find(v => v.id === m.volunteer_id);
                      const isLeader = m.volunteer_id === team.leader_id;
                      return (
                        <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {(vol?.full_name || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1">{vol?.full_name || t3('Onbekend', 'Inconnu', 'Unknown')}</span>
                          {isLeader && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Crown className="w-3 h-3 text-amber-500" /> {t3('Leider', 'Chef', 'Leader')}
                            </Badge>
                          )}
                          {!isLeader && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => handleRemoveMember(m.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}

                    {/* Add member */}
                    {getAvailableVolunteers(team.id).length > 0 && (
                      <Select onValueChange={v => handleAddMember(team.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={t3('+ Lid toevoegen...', '+ Ajouter un membre...', '+ Add member...')} />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableVolunteers(team.id).map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Delete team */}
                    <Button variant="ghost" size="sm" className="text-destructive/60 hover:text-destructive text-xs w-full" onClick={() => handleDeleteTeam(team.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> {t3('Team verwijderen', 'Supprimer l\'équipe', 'Delete team')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Create new team form */}
          {showCreateForm ? (
            <div className="border border-primary/30 rounded-xl p-3 space-y-3 bg-primary/5">
              <Input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder={t3('Teamnaam', 'Nom de l\'équipe', 'Team name')}
                className="text-sm"
              />
              <Select value={newTeamLeader} onValueChange={setNewTeamLeader}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={t3('Kies teamleider...', 'Choisir le chef...', 'Choose team leader...')} />
                </SelectTrigger>
                <SelectContent>
                  {volunteers.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-1.5">
                        <Crown className="w-3 h-3 text-amber-500" /> {v.full_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)} className="flex-1">{t3('Annuleren', 'Annuler', 'Cancel')}</Button>
                <Button size="sm" onClick={handleCreateTeam} disabled={creating || !newTeamName.trim() || !newTeamLeader} className="flex-1 gap-1">
                  <Plus className="w-3 h-3" /> {t3('Aanmaken', 'Créer', 'Create')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowCreateForm(true)} className="w-full gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> {t3('Nieuw team aanmaken', 'Créer une nouvelle équipe', 'Create new team')}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default SafetyTeamManager;
