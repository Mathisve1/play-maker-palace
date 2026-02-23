import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { Menu, X, Globe } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

const langLabels: Record<Language, string> = { nl: 'NL', fr: 'FR', en: 'EN' };

const Navbar = () => {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const isClubsPage = location.pathname === '/clubs';
  const isVolunteerPage = location.pathname === '/';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Logo size="sm" linkTo="/" />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors ${isVolunteerPage ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.nav.volunteers}
          </Link>
          <Link 
            to="/clubs" 
            className={`text-sm font-medium transition-colors ${isClubsPage ? 'text-secondary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.nav.clubs}
          </Link>

          {/* Language switcher */}
          <div className="relative">
            <button 
              onClick={() => setLangOpen(!langOpen)} 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="w-4 h-4" />
              {langLabels[language]}
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full right-0 mt-2 bg-card rounded-lg shadow-elevated border border-border p-1 min-w-[80px]"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2">{t.nav.volunteers}</Link>
              <Link to="/clubs" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2">{t.nav.clubs}</Link>
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
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2">{t.nav.login}</Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 text-center rounded-lg bg-primary text-primary-foreground">{t.nav.signup}</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
