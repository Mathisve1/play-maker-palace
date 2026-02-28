import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Users, Mail, User, Building2, Briefcase, Calendar, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface PartnerDetail {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  club_id: string;
  club_name?: string;
  club_logo?: string | null;
}

interface PartnerTask {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
  status: string;
}

const CommunityPartnerDetail = () => {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [tasks, setTasks] = useState<PartnerTask[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) return;
    const load = async () => {
      // Partner data
      const { data: p } = await supabase.from('external_partners').select('id, name, category, logo_url, contact_name, contact_email, club_id').eq('id', partnerId).maybeSingle();
      if (!p) { navigate('/community'); return; }
      
      // Club name
      const { data: club } = await supabase.from('clubs').select('name, logo_url').eq('id', p.club_id).maybeSingle();
      setPartner({ ...p, club_name: club?.name || '', club_logo: club?.logo_url });

      // Partner tasks
      const { data: tasksData } = await supabase.from('tasks').select('id, title, task_date, location, status').eq('assigned_partner_id', partnerId).eq('partner_only', true).order('task_date', { ascending: true });
      setTasks(tasksData || []);

      // Member count
      const { count } = await supabase.from('partner_members').select('id', { count: 'exact', head: true }).eq('partner_id', partnerId);
      setMemberCount(count || 0);

      setLoading(false);
    };
    load();
  }, [partnerId, navigate]);

  if (loading || !partner) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 container mx-auto px-4">
          <div className="h-40 rounded-2xl bg-muted animate-pulse mb-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-16">
        <div className="h-40 md:h-48 bg-gradient-to-br from-accent/20 via-secondary/15 to-primary/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,hsl(var(--accent)/0.15),transparent_70%)]" />
        </div>
        <div className="container mx-auto px-4 -mt-14 relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-5">
            <Avatar className="w-24 h-24 border-4 border-card shadow-elevated">
              {partner.logo_url ? <AvatarImage src={partner.logo_url} alt={partner.name} /> : null}
              <AvatarFallback className="text-2xl font-bold bg-accent text-accent-foreground">
                {partner.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-2">
              <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-muted-foreground gap-1" onClick={() => navigate(`/community/club/${partner.club_id}`)}>
                <ArrowLeft className="w-4 h-4" /> Terug naar {partner.club_name}
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold font-heading">{partner.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Briefcase className="w-3 h-3" /> {partner.category}
                </Badge>
                <span
                  className="text-sm text-primary flex items-center gap-1 cursor-pointer hover:underline"
                  onClick={() => navigate(`/community/club/${partner.club_id}`)}
                >
                  <Building2 className="w-3.5 h-3.5" /> {partner.club_name}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border/50 p-4 text-center shadow-card">
              <Users className="w-5 h-5 mx-auto mb-1.5 text-secondary" />
              <p className="text-2xl font-bold font-heading">{memberCount}</p>
              <p className="text-xs text-muted-foreground">Medewerkers</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border/50 p-4 text-center shadow-card">
              <Calendar className="w-5 h-5 mx-auto mb-1.5 text-primary" />
              <p className="text-2xl font-bold font-heading">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Toegewezen taken</p>
            </motion.div>
            {partner.contact_name && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border/50 p-4 text-center shadow-card col-span-2 md:col-span-1">
                <User className="w-5 h-5 mx-auto mb-1.5 text-accent" />
                <p className="text-sm font-semibold">{partner.contact_name}</p>
                <p className="text-xs text-muted-foreground">Contactpersoon</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Tasks */}
      <section className="container mx-auto px-4 py-8 pb-24">
        <h2 className="text-lg font-bold font-heading mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Toegewezen taken
        </h2>
        {tasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Geen taken toegewezen</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl border border-border/50 p-4"
              >
                <h3 className="font-semibold">{task.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {task.task_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.task_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {task.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {task.location}
                    </span>
                  )}
                  <Badge variant={task.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">{task.status}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default CommunityPartnerDetail;
