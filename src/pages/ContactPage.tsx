import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, Send, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const ContactPage = () => {
  const { language } = useLanguage();
  const nl = language === 'nl';
  const fr = language === 'fr';
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const t = nl ? {
    title: 'Contact',
    subtitle: 'Heb je een vraag of suggestie? Neem contact met ons op.',
    name: 'Naam',
    email: 'E-mailadres',
    subject: 'Onderwerp',
    message: 'Bericht',
    send: 'Verstuur bericht',
    success: 'Bericht verstuurd! We nemen zo snel mogelijk contact met je op.',
    error: 'Er ging iets mis. Probeer het opnieuw.',
    emailLabel: 'E-mail',
    addressLabel: 'Adres',
    required: 'Vul alle velden in.',
    invalidEmail: 'Ongeldig e-mailadres.',
  } : fr ? {
    title: 'Contact',
    subtitle: 'Vous avez une question ou une suggestion ? Contactez-nous.',
    name: 'Nom',
    email: 'Adresse e-mail',
    subject: 'Sujet',
    message: 'Message',
    send: 'Envoyer le message',
    success: 'Message envoyé ! Nous vous répondrons dès que possible.',
    error: 'Une erreur s\'est produite. Veuillez réessayer.',
    emailLabel: 'E-mail',
    addressLabel: 'Adresse',
    required: 'Veuillez remplir tous les champs.',
    invalidEmail: 'Adresse e-mail invalide.',
  } : {
    title: 'Contact',
    subtitle: 'Have a question or suggestion? Get in touch with us.',
    name: 'Name',
    email: 'Email address',
    subject: 'Subject',
    message: 'Message',
    send: 'Send message',
    success: 'Message sent! We\'ll get back to you as soon as possible.',
    error: 'Something went wrong. Please try again.',
    emailLabel: 'Email',
    addressLabel: 'Address',
    required: 'Please fill in all fields.',
    invalidEmail: 'Invalid email address.',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, subject, message } = form;

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error(t.required);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t.invalidEmail);
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: name.trim().slice(0, 100),
          email: email.trim().slice(0, 255),
          subject: subject.trim().slice(0, 200),
          message: message.trim().slice(0, 2000),
        },
      });
      if (error) throw error;
      toast.success(t.success);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast.error(t.error);
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-heading font-bold text-foreground mb-3">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-5 gap-10">
          {/* Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.emailLabel}</p>
                <a href="mailto:info@de12eman.be" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  info@de12eman.be
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.addressLabel}</p>
                <p className="text-sm text-muted-foreground">Gent, België</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4 bg-card border border-border rounded-2xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.name} *</Label>
                <Input id="name" maxLength={100} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.email} *</Label>
                <Input id="email" type="email" maxLength={255} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">{t.subject} *</Label>
              <Input id="subject" maxLength={200} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">{t.message} *</Label>
              <Textarea id="message" rows={5} maxLength={2000} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required className="resize-none" />
            </div>
            <Button type="submit" disabled={sending} className="w-full">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {t.send}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
