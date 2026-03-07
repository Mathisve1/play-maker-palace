import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, ClipboardList, BarChart3 } from 'lucide-react';
import Logo from '@/components/Logo';

const AdminDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const cards = [
    { icon: BarChart3, label: t.admin.overview, value: '—', color: 'bg-primary/10 text-primary' },
    { icon: Users, label: t.admin.users, value: '—', color: 'bg-accent/10 text-accent' },
    { icon: Building2, label: t.admin.clubs, value: '—', color: 'bg-secondary/10 text-secondary' },
    { icon: ClipboardList, label: t.admin.tasks, value: '—', color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Logo size="sm" showText={false} linkTo="/admin" />
            <span className="font-heading font-bold text-lg text-foreground">{t.admin.title}</span>
          <button 
            onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-6">{t.admin.overview}</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 shadow-card">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="text-2xl font-heading font-bold text-foreground mt-1">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-card rounded-2xl p-8 shadow-card text-center">
          <p className="text-muted-foreground">Dashboard wordt verder uitgebouwd naarmate het platform groeit.</p>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
