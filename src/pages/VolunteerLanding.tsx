import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, Award, MessageCircle, UserPlus, Search, CheckCircle, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const VolunteerLanding = () => {
  const { t } = useLanguage();

  const features = [
    { icon: Users, title: t.volunteer.feature1Title, desc: t.volunteer.feature1Desc },
    { icon: Calendar, title: t.volunteer.feature2Title, desc: t.volunteer.feature2Desc },
    { icon: Award, title: t.volunteer.feature3Title, desc: t.volunteer.feature3Desc },
    { icon: MessageCircle, title: t.volunteer.feature4Title, desc: t.volunteer.feature4Desc },
  ];

  const steps = [
    { icon: UserPlus, title: t.volunteer.step1Title, desc: t.volunteer.step1Desc },
    { icon: Search, title: t.volunteer.step2Title, desc: t.volunteer.step2Desc },
    { icon: CheckCircle, title: t.volunteer.step3Title, desc: t.volunteer.step3Desc },
    { icon: Heart, title: t.volunteer.step4Title, desc: t.volunteer.step4Desc },
  ];

  const stats = [
    { value: '2.500+', label: t.volunteer.statsVolunteers },
    { value: '180+', label: t.volunteer.statsClubs },
    { value: '12.000+', label: t.volunteer.statsTasks },
    { value: '98%', label: t.volunteer.statsRating },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto relative">
          <motion.div 
            className="max-w-2xl mx-auto text-center"
            initial="hidden"
            animate="visible"
          >
            <motion.h1 
              variants={fadeUp} custom={0}
              className="text-4xl md:text-6xl font-heading font-bold text-foreground leading-tight"
            >
              {t.volunteer.heroTitle.split(' ').map((word, i, arr) => 
                i >= arr.length - 2 ? <span key={i} className="text-gradient-primary"> {word}</span> : ` ${word}`
              )}
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto">
              {t.volunteer.heroSubtitle}
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup" className="px-6 py-3 rounded-xl bg-hero-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-warm">
                {t.volunteer.heroCta}
              </Link>
              <a href="#how" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
                {t.volunteer.heroCtaSecondary}
              </a>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial="hidden" animate="visible"
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div key={i} variants={fadeUp} custom={i + 3} className="text-center p-4 rounded-xl bg-card shadow-card">
                <div className="text-2xl font-heading font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{t.volunteer.featuresTitle}</h2>
            <p className="mt-3 text-muted-foreground">{t.volunteer.featuresSubtitle}</p>
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
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
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
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-hero-primary mx-auto flex items-center justify-center mb-4 shadow-warm">
                  <s.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="text-xs font-medium text-primary mb-2">0{i + 1}</div>
                <h3 className="font-heading font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
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
    </div>
  );
};

export default VolunteerLanding;
