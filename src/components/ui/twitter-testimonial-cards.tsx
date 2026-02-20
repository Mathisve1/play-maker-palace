import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  club: string;
  clubColor: string;
  quote: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Jonas V.',
    role: 'Steward',
    club: 'Club Brugge',
    clubColor: '#0055a4',
    quote: 'Elke matchday is een beleving. Je staat er middenin, voelt de sfeer en helpt mee om er een topavond van te maken. Het team is fantastisch en je krijgt er echte vriendschappen voor terug.',
    avatar: 'JV',
  },
  {
    name: 'Sarah D.',
    role: 'Hostess VIP',
    club: 'KAA Gent',
    clubColor: '#1a5276',
    quote: 'Als vrijwilliger bij de Buffalo\'s leer je zoveel bij. De organisatie is top, je wordt goed begeleid en het gevoel om duizenden fans te verwelkomen is onbeschrijflijk. Ik zou het iedereen aanraden!',
    avatar: 'SD',
  },
  {
    name: 'Matteo B.',
    role: 'Parking & Logistiek',
    club: 'KV Kortrijk',
    clubColor: '#c0392b',
    quote: 'Bij KVK voel je je meteen welkom. Het is hard werken, maar de sfeer en de waardering maken alles goed. Plus, je ziet de match gratis – wat wil je nog meer?',
    avatar: 'MB',
  },
];

export function Component() {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {testimonials.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12 }}
          className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow flex flex-col gap-4 relative"
        >
          <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />

          <p className="text-sm text-muted-foreground leading-relaxed italic">
            "{t.quote}"
          </p>

          <div className="flex items-center gap-3 mt-auto pt-3 border-t border-border">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: t.clubColor }}
            >
              {t.avatar}
            </div>
            <div className="min-w-0">
              <p className="font-heading font-semibold text-foreground text-sm truncate">{t.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t.role} · {t.club}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
