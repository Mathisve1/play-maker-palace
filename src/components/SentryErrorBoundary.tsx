import * as Sentry from "@sentry/react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Mail } from "lucide-react";

const t3 = (language: string, nl: string, fr: string, en: string) =>
  language === "nl" ? nl : language === "fr" ? fr : en;

const FallbackUI = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {t3(language, "Er ging iets mis", "Quelque chose s'est mal passé", "Something went wrong")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t3(
              language,
              "Er is een onverwachte fout opgetreden. Ons team is op de hoogte gebracht.",
              "Une erreur inattendue s'est produite. Notre équipe a été informée.",
              "An unexpected error occurred. Our team has been notified."
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {t3(language, "Herlaad pagina", "Recharger la page", "Reload page")}
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <a href="/contact">
              <Mail className="w-4 h-4" />
              {t3(language, "Contacteer support", "Contacter le support", "Contact support")}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

const SentryErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <Sentry.ErrorBoundary fallback={<FallbackUI />} showDialog={false}>
    {children}
  </Sentry.ErrorBoundary>
);

export default SentryErrorBoundary;
