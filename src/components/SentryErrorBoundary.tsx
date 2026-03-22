import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Mail } from "lucide-react";

const FallbackUI = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Er ging iets mis
          </h1>
          <p className="text-muted-foreground text-sm">
            Er is een onverwachte fout opgetreden. Ons team is op de hoogte gebracht.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Herlaad pagina
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <a href="/contact">
              <Mail className="w-4 h-4" />
              Contacteer support
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
