import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList, Users, Zap, Heart } from 'lucide-react';
import PublicPageLayout from '@/components/PublicPageLayout';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import { AppStoreButtons, InstallInstructionsDialog } from '@/components/PWAInstallButtons';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

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
    <PublicPageLayout>

      {/* Hero */}
      <section className="pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/5" />
        <div className="container mx-auto relative">
          <motion.div className="max-w-2xl mx-auto text-center" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="flex justify-center mb-6">
              <Logo size="lg" showText={false} linkTo="" />
            </motion.div>
            <motion.h1 variants={fadeUp} custom={0} className="text-4xl md:text-6xl font-heading font-bold text-foreground leading-tight">
              {t.clubs.heroTitle.split(' ').map((word, i, arr) => 
                i >= arr.length - 2 ? <span key={i} className="text-gradient-secondary"> {word}</span> : ` ${word}`
              )}
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto">
              {t.clubs.heroSubtitle}
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/club-login" className="px-6 py-3 rounded-xl bg-hero-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity">
                {t.clubs.heroCta}
              </Link>
              <Link to="/partner-login" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-2 justify-center">
                <span>Partner Login</span>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} custom={3} className="mt-6 flex justify-center">
              <AppStoreButtons
                variant="secondary"
                onClickIOS={() => setInstallPlatform('ios')}
                onClickAndroid={() => setInstallPlatform('android')}
              />
            </motion.div>
          </motion.div>
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
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
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
            <Link to="/club-login" className="mt-6 inline-block px-8 py-3 rounded-xl bg-background text-foreground font-medium hover:opacity-90 transition-opacity">
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
    </PublicPageLayout>
  );
};

export default ClubsLanding;
