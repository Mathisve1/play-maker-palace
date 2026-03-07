import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, Zap, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import { AppStoreButtons, InstallInstructionsDialog } from '@/components/PWAInstallButtons';

const fadeUpClass = 'animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both';

const ClubsLanding = () => {
  const { t } = useLanguage();
  const [installPlatform, setInstallPlatform] = useState<'ios' | 'android' | null>(null);

  const features = [
    { icon: ClipboardList, title: t.clubs.feature1Title, desc: t.clubs.feature1Desc },
    { icon: Users, title: t.clubs.feature2Title, desc: t.clubs.feature2Desc },
    { icon: Zap, title: t.clubs.feature3Title, desc: t.clubs.feature3Desc },
    { icon: Heart, title: t.clubs.feature4Title, desc: t.clubs.feature4Desc },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-20 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/5" />
        <div className="container mx-auto relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className={`${fadeUpClass} flex justify-center mb-6`}>
              <Logo size="lg" showText={false} linkTo="" />
            </div>
            <h1 className={`${fadeUpClass} delay-100 text-4xl md:text-6xl font-heading font-bold text-foreground leading-tight`}>
              {t.clubs.heroTitle.split(' ').map((word, i, arr) => 
                i >= arr.length - 2 ? <span key={i} className="text-gradient-secondary"> {word}</span> : ` ${word}`
              )}
            </h1>
            <p className={`${fadeUpClass} delay-200 mt-6 text-lg text-muted-foreground max-w-lg mx-auto`}>
              {t.clubs.heroSubtitle}
            </p>
            <div className={`${fadeUpClass} delay-300 mt-8 flex flex-col sm:flex-row gap-3 justify-center`}>
              <Link to="/club-signup" className="px-6 py-3 rounded-xl bg-hero-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity">
                {t.clubs.heroCta}
              </Link>
              <Link to="/partner-login" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-2 justify-center">
                <span>{t.clubs.heroCtaSecondary}</span>
              </Link>
            </div>
            <div className={`${fadeUpClass} delay-500 mt-6 flex justify-center`}>
              <AppStoreButtons
                variant="secondary"
                onClickIOS={() => setInstallPlatform('ios')}
                onClickAndroid={() => setInstallPlatform('android')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{t.clubs.featuresTitle}</h2>
            <p className="mt-3 text-muted-foreground">{t.clubs.featuresSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto text-center bg-hero-secondary rounded-3xl p-12">
            <h2 className="text-3xl font-heading font-bold text-secondary-foreground">{t.clubs.ctaTitle}</h2>
            <p className="mt-3 text-secondary-foreground/80">{t.clubs.ctaSubtitle}</p>
            <Link to="/club-signup" className="mt-6 inline-block px-8 py-3 rounded-xl bg-background text-foreground font-medium hover:opacity-90 transition-opacity">
              {t.clubs.ctaButton}
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <InstallInstructionsDialog
        open={installPlatform !== null}
        onClose={() => setInstallPlatform(null)}
        platform={installPlatform || 'ios'}
      />
    </div>
  );
};

export default ClubsLanding;
