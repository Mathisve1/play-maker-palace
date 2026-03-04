import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          {t3('Oeps! Pagina niet gevonden', 'Oups ! Page non trouvée', 'Oops! Page not found')}
        </p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t3('Terug naar home', 'Retour à l\'accueil', 'Return to Home')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
