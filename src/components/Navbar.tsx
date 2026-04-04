import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { Menu, X, Globe, ArrowLeft, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';

const langLabels: Record<Language, string> = { nl: 'NL', fr: 'FR', en: 'EN' };

const Navbar = () => {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const isClubsPage = location.pathname === '/clubs';
  const isVolunteerPage = location.pathname === '/';
  const isCommunityPage = location.pathname.startsWith('/community');
  const isPublic = ['/', '/clubs', '/community'].includes(location.pathname) || location.pathname.startsWith('/community');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const dashboardLabel = language === 'nl' ? 'Terug naar dashboard' : language === 'fr' ? 'Retour au tableau de bord' : 'Back to dashboard';
  const pricingLabel = language === 'nl' ? 'Prijzen' : language === 'fr' ? 'Tarifs' : 'Pricing';
  const forVolunteersLabel = language === 'nl' ? 'Voor vrijwilligers' : language === 'fr' ? 'Pour bénévoles' : 'For volunteers';
  const forClubsLabel = language === 'nl' ? 'Voor clubs' : language === 'fr' ? 'Pour clubs' : 'For clubs';
  const communityLabel = language === 'nl' ? 'Community' : language === 'fr' ? 'Communauté' : 'Community';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container mx-auto px-4 min-h-14 flex items-center justify-between">
        <Logo size="sm" linkTo="/" />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors ${isVolunteerPage ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {forVolunteersLabel}
          </Link>
          <Link
            to="/clubs"
            className={`text-sm font-medium transition-colors ${isClubsPage ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {forClubsLabel}
          </Link>
          <Link
            to="/community"
            className={`text-sm font-medium transition-colors ${isCommunityPage ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {communityLabel}
          </Link>
          {isPublic && (
            <Link
              to="/clubs#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {pricingLabel}
            </Link>
          )}

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="w-4 h-4" />
              {langLabels[language]}
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-2 bg-card rounded-lg shadow-elevated border border-border p-1 min-w-[80px]">
                {(['nl', 'fr', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); setLangOpen(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                      language === lang ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {langLabels[lang]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {userId ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {dashboardLabel}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.nav.login}
              </Link>
              <Link
                to="/signup"
                className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {t.nav.signup}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-border overflow-hidden">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2">{forVolunteersLabel}</Link>
            <Link to="/clubs" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2">{forClubsLabel}</Link>
            <Link to="/community" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2">{communityLabel}</Link>
            <Link to="/clubs#pricing" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2">{pricingLabel}</Link>
            <div className="flex gap-2 py-2">
              {(['nl', 'fr', 'en'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); }}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    language === lang ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  {langLabels[lang]}
                </button>
              ))}
            </div>
            <hr className="border-border" />
            {userId ? (
              <>
                <button onClick={() => { navigate('/dashboard'); setMobileOpen(false); }} className="flex items-center gap-2 text-sm font-medium py-2 text-primary">
                  <ArrowLeft className="w-4 h-4" /> {dashboardLabel}
                </button>
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="flex items-center gap-2 text-sm font-medium py-2 text-muted-foreground">
                  <LogOut className="w-4 h-4" /> {language === 'nl' ? 'Uitloggen' : language === 'fr' ? 'Déconnexion' : 'Log out'}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2">{t.nav.login}</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 text-center rounded-lg bg-primary text-primary-foreground">{t.nav.signup}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
