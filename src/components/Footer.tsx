import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-background/70 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-hero-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-sm">12</span>
            </div>
            <span className="font-heading font-bold text-lg text-background">De12eMan</span>
          </div>
          <p className="text-sm">{t.footer.tagline}</p>
          <div className="flex gap-6 text-sm">
            <Link to="#" className="hover:text-background transition-colors">{t.footer.privacy}</Link>
            <Link to="#" className="hover:text-background transition-colors">{t.footer.terms}</Link>
            <Link to="#" className="hover:text-background transition-colors">{t.footer.contact}</Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-background/10 text-center text-xs text-background/40">
          © {new Date().getFullYear()} De12eMan. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
