import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

interface LandingFAQProps {
  sectionLabel: string;
  sectionTitle: string;
  items: FAQItem[];
  ctaText?: string;
  ctaLink?: string;
}

export const LandingFAQ = ({
  sectionLabel,
  sectionTitle,
  items,
  ctaText,
  ctaLink,
}: LandingFAQProps) => {
  return (
    <section className="py-28 px-4 bg-background">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">
            {sectionLabel}
          </p>
          <h2 className="font-heading font-bold text-foreground text-4xl md:text-5xl">
            {sectionTitle}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {items.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-card border border-border/60 rounded-2xl px-6 overflow-hidden shadow-[0_2px_12px_-2px_hsla(220,25%,12%,0.06)] data-[state=open]:shadow-[0_4px_24px_-4px_hsla(24,85%,55%,0.15)] data-[state=open]:border-primary/20 transition-all duration-300"
              >
                <AccordionTrigger className="py-5 text-left hover:no-underline group">
                  <span className="font-heading font-semibold text-foreground text-lg leading-snug group-hover:text-primary transition-colors pr-4">
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="text-base text-muted-foreground leading-relaxed">
                    {item.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {ctaText && ctaLink && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center mt-10"
            >
              <Link
                to={ctaLink}
                className="inline-flex items-center gap-2 text-primary font-semibold text-base hover:gap-3 transition-all"
              >
                {ctaText}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};
