import { useState, lazy, Suspense } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Handshake, Smile, Trophy, Users, UserPlus, Search, CheckCircle, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import { AppStoreButtons, InstallInstructionsDialog } from '@/components/PWAInstallButtons';

// Lazy-load heavy below-fold components
const TestimonialCards = lazy(() => import('@/components/ui/twitter-testimonial-cards').then(m => ({ default: m.Component })));

const fadeUpClass = 'animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both';

const VolunteerLanding = () => {
  const { t } = useLanguage();
  const [installPlatform, setInstallPlatform] = useState<'ios' | 'android' | null>(null);

  const benefits = [
    { icon: Handshake, title: t.volunteer.benefit1Title, desc: t.volunteer.benefit1Desc },
    { icon: Users, title: t.volunteer.benefit2Title, desc: t.volunteer.benefit2Desc },
    { icon: Smile, title: t.volunteer.benefit3Title, desc: t.volunteer.benefit3Desc },
    { icon: Trophy, title: t.volunteer.benefit4Title, desc: t.volunteer.benefit4Desc },
  ];

  const steps = [
    { icon: UserPlus, title: t.volunteer.step1Title, desc: t.volunteer.step1Desc },
    { icon: Search, title: t.volunteer.step2Title, desc: t.volunteer.step2Desc },
    { icon: CheckCircle, title: t.volunteer.step3Title, desc: t.volunteer.step3Desc },
    { icon: Heart, title: t.volunteer.step4Title, desc: t.volunteer.step4Desc },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-20 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className={`${fadeUpClass} flex justify-center mb-6`}>
              <Logo size="lg" showText={false} linkTo="" />
            </div>
            <h1 className={`${fadeUpClass} delay-100 text-4xl md:text-6xl font-heading font-bold text-foreground leading-tight`}>
              {t.volunteer.heroTitle.split(' ').map((word, i, arr) =>
                i >= arr.length - 2 ? <span key={i} className="text-gradient-primary"> {word}</span> : ` ${word}`
              )}
            </h1>
            <p className={`${fadeUpClass} delay-200 mt-6 text-lg text-muted-foreground max-w-lg mx-auto`}>
              {t.volunteer.heroSubtitle}
            </p>
            <div className={`${fadeUpClass} delay-300 mt-8 flex flex-col sm:flex-row gap-3 justify-center`}>
              <Link to="/signup" className="px-6 py-3 rounded-xl bg-hero-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-warm">
                {t.volunteer.heroCta}
              </Link>
              <a href="#why" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
                {t.volunteer.heroCtaSecondary}
              </a>
            </div>
            <div className={`${fadeUpClass} delay-500 mt-6 flex justify-center`}>
              <AppStoreButtons
                variant="primary"
                onClickIOS={() => setInstallPlatform('ios')}
                onClickAndroid={() => setInstallPlatform('android')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why volunteer at a sports club */}
      <section id="why" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{t.volunteer.benefitsTitle}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{t.volunteer.benefitsSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow flex gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - lazy loaded */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{t.volunteer.testimonialsTitle}</h2>
          </div>
          <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground">Laden...</div>}>
            <TestimonialCards />
          </Suspense>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{t.volunteer.howTitle}</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-hero-primary mx-auto flex items-center justify-center mb-4 shadow-warm">
                  <s.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="text-xs font-medium text-primary mb-2">0{i + 1}</div>
                <h3 className="font-heading font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto text-center bg-hero-primary rounded-3xl p-12 shadow-warm">
            <h2 className="text-3xl font-heading font-bold text-primary-foreground">{t.volunteer.ctaTitle}</h2>
            <p className="mt-3 text-primary-foreground/80">{t.volunteer.ctaSubtitle}</p>
            <Link to="/signup" className="mt-6 inline-block px-8 py-3 rounded-xl bg-background text-foreground font-medium hover:opacity-90 transition-opacity">
              {t.volunteer.ctaButton}
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

export default VolunteerLanding;
