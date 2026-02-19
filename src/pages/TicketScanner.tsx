import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/Logo';

const t = {
  nl: {
    title: 'QR Scanner',
    back: 'Terug',
    scanning: 'Richt de camera op een QR-code...',
    success: 'Ingecheckt!',
    alreadyCheckedIn: 'Al ingecheckt',
    invalidTicket: 'Ongeldig ticket',
    task: 'Taak',
    event: 'Event',
    checkedInAt: 'Ingecheckt om',
    scanNext: 'Volgende scannen',
    cameraError: 'Kon camera niet openen. Geef toestemming voor cameragebruik.',
    loading: 'Camera laden...',
    noAccess: 'Je hebt geen toegang tot deze pagina',
  },
  fr: {
    title: 'Scanner QR',
    back: 'Retour',
    scanning: 'Dirigez la caméra vers un code QR...',
    success: 'Enregistré !',
    alreadyCheckedIn: 'Déjà enregistré',
    invalidTicket: 'Ticket invalide',
    task: 'Tâche',
    event: 'Événement',
    checkedInAt: 'Enregistré à',
    scanNext: 'Scanner suivant',
    cameraError: "Impossible d'ouvrir la caméra. Autorisez l'accès à la caméra.",
    loading: 'Chargement de la caméra...',
    noAccess: "Vous n'avez pas accès à cette page",
  },
  en: {
    title: 'QR Scanner',
    back: 'Back',
    scanning: 'Point the camera at a QR code...',
    success: 'Checked in!',
    alreadyCheckedIn: 'Already checked in',
    invalidTicket: 'Invalid ticket',
    task: 'Task',
    event: 'Event',
    checkedInAt: 'Checked in at',
    scanNext: 'Scan next',
    cameraError: 'Could not open camera. Please allow camera access.',
    loading: 'Loading camera...',
    noAccess: 'You do not have access to this page',
  },
};

type ScanResult = {
  type: 'success' | 'already_checked_in' | 'error';
  volunteerName?: string;
  taskTitle?: string;
  eventTitle?: string;
  checkedInAt?: string;
  error?: string;
};

const TicketScanner = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const labels = t[language as keyof typeof t] || t.nl;
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [noAccess, setNoAccess] = useState(false);

  // Check auth & club membership
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }

      // Check if user is a club member
      const { data: clubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id).limit(1);
      let cid = clubs?.[0]?.id;
      if (!cid) {
        const { data: members } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1);
        cid = members?.[0]?.club_id;
      }
      if (!cid) {
        setNoAccess(true);
        setLoading(false);
        return;
      }
      setClubId(cid);
      setLoading(false);
    };
    init();
  }, [navigate]);

  // Initialize scanner
  useEffect(() => {
    if (loading || !clubId || !scanning) return;

    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText: string) => {
            handleScan(decodedText);
          },
          () => {} // ignore errors during scanning
        );
      } catch (err) {
        console.error('Camera error:', err);
        setCameraError(true);
      }
    };

    startScanner();

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [loading, clubId, scanning]);

  const handleScan = useCallback(async (barcode: string) => {
    if (processing || !clubId) return;
    setProcessing(true);
    setScanning(false);

    // Stop scanner
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }

    try {
      const { data, error } = await supabase.functions.invoke('ticketing-scan', {
        body: { barcode, club_id: clubId },
      });

      if (error) throw error;

      if (data?.success) {
        setResult({
          type: 'success',
          volunteerName: data.volunteer_name,
          taskTitle: data.task_title,
          eventTitle: data.event_title,
          checkedInAt: data.checked_in_at,
        });
      } else if (data?.status === 'already_checked_in') {
        setResult({
          type: 'already_checked_in',
          volunteerName: data.volunteer_name,
          taskTitle: data.task_title,
          checkedInAt: data.checked_in_at,
        });
      } else {
        setResult({
          type: 'error',
          error: data?.error || labels.invalidTicket,
        });
      }
    } catch (e: any) {
      setResult({
        type: 'error',
        error: e.message || labels.invalidTicket,
      });
    }

    setProcessing(false);
  }, [clubId, processing, labels.invalidTicket]);

  const handleScanNext = () => {
    setResult(null);
    setScanning(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (noAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-medium">{labels.noAccess}</p>
            <Button onClick={() => navigate('/')} className="mt-4" variant="outline">{labels.back}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/ticketing')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Logo />
          <h1 className="text-lg font-bold text-foreground ml-2">{labels.title}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Scanner view */}
        {scanning && !cameraError && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="w-5 h-5" />
              <span className="text-sm">{labels.scanning}</span>
            </div>
            <div
              ref={containerRef}
              id="qr-reader"
              className="w-full rounded-xl overflow-hidden border-2 border-border bg-muted"
              style={{ minHeight: 300 }}
            />
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <p className="text-foreground">{labels.cameraError}</p>
              <Button onClick={() => { setCameraError(false); setScanning(true); }} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                {language === 'nl' ? 'Opnieuw proberen' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Processing */}
        {processing && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Verwerken...</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className={
            result.type === 'success'
              ? 'border-2 border-accent bg-accent/5'
              : result.type === 'already_checked_in'
                ? 'border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                : 'border-2 border-destructive bg-destructive/5'
          }>
            <CardContent className="pt-6 text-center space-y-3">
              {result.type === 'success' && (
                <>
                  <CheckCircle2 className="w-16 h-16 text-accent mx-auto" />
                  <h2 className="text-xl font-bold text-foreground">{labels.success}</h2>
                </>
              )}
              {result.type === 'already_checked_in' && (
                <>
                  <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
                  <h2 className="text-xl font-bold text-foreground">{labels.alreadyCheckedIn}</h2>
                </>
              )}
              {result.type === 'error' && (
                <>
                  <XCircle className="w-16 h-16 text-destructive mx-auto" />
                  <h2 className="text-xl font-bold text-foreground">{labels.invalidTicket}</h2>
                  {result.error && <p className="text-sm text-destructive">{result.error}</p>}
                </>
              )}

              {result.volunteerName && (
                <p className="text-2xl font-bold text-foreground">{result.volunteerName}</p>
              )}

              <div className="space-y-1 text-sm text-muted-foreground">
                {result.taskTitle && (
                  <p>{labels.task}: <span className="font-medium text-foreground">{result.taskTitle}</span></p>
                )}
                {result.eventTitle && (
                  <p>{labels.event}: <span className="font-medium text-foreground">{result.eventTitle}</span></p>
                )}
                {result.checkedInAt && (
                  <p>{labels.checkedInAt}: <span className="font-medium text-foreground">{new Date(result.checkedInAt).toLocaleTimeString()}</span></p>
                )}
              </div>

              <Button onClick={handleScanNext} className="mt-4 gap-2 w-full" size="lg">
                <Camera className="w-5 h-5" />
                {labels.scanNext}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TicketScanner;
