import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';

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
    scanNext: 'OK — Volgende scannen',
    cameraError: 'Kon camera niet openen. Geef toestemming voor cameragebruik.',
    noAccess: 'Je hebt geen toegang tot deze pagina',
    retry: 'Opnieuw proberen',
    processing: 'Verwerken...',
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
    scanNext: 'OK — Scanner suivant',
    cameraError: "Impossible d'ouvrir la caméra.",
    noAccess: "Vous n'avez pas accès à cette page",
    retry: 'Réessayer',
    processing: 'Traitement...',
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
    scanNext: 'OK — Scan next',
    cameraError: 'Could not open camera. Please allow camera access.',
    noAccess: 'You do not have access to this page',
    retry: 'Retry',
    processing: 'Processing...',
  },
};

type ScanResult = {
  type: 'success' | 'already_checked_in' | 'error';
  volunteerName?: string;
  avatarUrl?: string | null;
  taskTitle?: string;
  eventTitle?: string;
  checkedInAt?: string;
  error?: string;
};

type ScannerState = 'idle' | 'scanning' | 'processing' | 'showing_result';

const TicketScanner = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const labels = t[language as keyof typeof t] || t.nl;

  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [noAccess, setNoAccess] = useState(false);

  // Component-level mounted ref — survives state changes
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const clubIdRef = useRef<string | null>(null);
  useEffect(() => { clubIdRef.current = clubId; }, [clubId]);

  const processingRef = useRef(false);

  // Process barcode — completely outside the scanner useEffect
  const processBarcode = useCallback(async (barcode: string) => {
    const cid = clubIdRef.current;
    if (!cid) {
      processingRef.current = false;
      setScannerState('scanning');
      return;
    }

    let scanResult: ScanResult;

    try {
      const { data, error } = await supabase.functions.invoke('ticketing-scan', {
        body: { barcode, club_id: cid },
      });

      console.log('Scan response:', { data, error });

      if (error) throw error;

      if (data?.success) {
        scanResult = {
          type: 'success',
          volunteerName: data.volunteer_name,
          avatarUrl: data.avatar_url,
          taskTitle: data.task_title,
          eventTitle: data.event_title,
          checkedInAt: data.checked_in_at,
        };
      } else if (data?.status === 'already_checked_in') {
        scanResult = {
          type: 'already_checked_in',
          volunteerName: data.volunteer_name,
          avatarUrl: data.avatar_url,
          taskTitle: data.task_title,
          checkedInAt: data.checked_in_at,
        };
      } else {
        scanResult = {
          type: 'error',
          error: data?.error || labels.invalidTicket,
        };
      }
    } catch (e: any) {
      console.error('Scan error:', e);
      scanResult = {
        type: 'error',
        error: e.message || labels.invalidTicket,
      };
    }

    // Use component-level ref, not useEffect-scoped variable
    if (isMounted.current) {
      console.log('Setting result:', scanResult);
      setResult(scanResult);
      setScannerState('showing_result');
      processingRef.current = false;
    }
  }, [labels.invalidTicket]);

  // Check auth & club membership
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }

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
      setScannerState('scanning');
    };
    init();
  }, [navigate]);

  // Scanner lifecycle — ONLY manages camera start/stop
  useEffect(() => {
    if (scannerState !== 'scanning' || loading) return;

    let html5QrCode: any = null;
    let stopped = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        await new Promise(r => setTimeout(r, 100));
        if (stopped) return;

        html5QrCode = new Html5Qrcode('qr-reader');

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1, disableFlip: false },
          async (decodedText: string) => {
            if (processingRef.current) return;
            processingRef.current = true;

            // Stop scanner
            try { await html5QrCode.stop(); } catch {}

            // Update UI to processing
            setScannerState('processing');

            // Fire-and-forget: processBarcode handles the rest
            processBarcode(decodedText);
          },
          () => {} // ignore scan failures
        );
      } catch (err) {
        console.error('Camera error:', err);
        if (!stopped) setCameraError(true);
      }
    };

    startScanner();

    return () => {
      stopped = true;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [scannerState, loading, processBarcode]);

  const handleOk = () => {
    setResult(null);
    processingRef.current = false;
    setScannerState('scanning');
  };

  const initials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
        {scannerState === 'scanning' && !cameraError && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="w-5 h-5 animate-pulse" />
              <span className="text-sm">{labels.scanning}</span>
            </div>
            <div
              id="qr-reader"
              className="w-full rounded-xl overflow-hidden border-2 border-primary/30 bg-muted"
              style={{ minHeight: 320 }}
            />
          </div>
        )}

        {cameraError && (
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <p className="text-foreground">{labels.cameraError}</p>
              <Button onClick={() => { setCameraError(false); setScannerState('scanning'); }} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                {labels.retry}
              </Button>
            </CardContent>
          </Card>
        )}

        {scannerState === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{labels.processing}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {scannerState === 'showing_result' && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {result.type === 'success' && (
                <div className="flex flex-col items-center gap-5 py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <div className="w-28 h-28 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="text-emerald-500" strokeWidth={2.5} style={{ width: 72, height: 72 }} />
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{labels.success}</h2>
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="w-24 h-24 border-4 border-emerald-500/30 shadow-lg">
                      <AvatarImage src={result.avatarUrl || undefined} alt={result.volunteerName} />
                      <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                        {initials(result.volunteerName)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-3xl font-bold text-foreground">{result.volunteerName}</p>
                  </div>
                  <div className="space-y-1 text-center text-sm text-muted-foreground">
                    {result.taskTitle && <p>{labels.task}: <span className="font-medium text-foreground">{result.taskTitle}</span></p>}
                    {result.eventTitle && <p>{labels.event}: <span className="font-medium text-foreground">{result.eventTitle}</span></p>}
                    {result.checkedInAt && <p>{labels.checkedInAt}: <span className="font-medium text-foreground">{new Date(result.checkedInAt).toLocaleTimeString()}</span></p>}
                  </div>
                  <Button onClick={handleOk} className="w-full gap-2 text-lg py-6" size="lg">
                    <CheckCircle2 className="w-6 h-6" />
                    {labels.scanNext}
                  </Button>
                </div>
              )}

              {result.type === 'already_checked_in' && (
                <Card className="border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="pt-6 text-center space-y-4">
                    <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
                    <h2 className="text-xl font-bold text-foreground">{labels.alreadyCheckedIn}</h2>
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="w-16 h-16 border-2 border-amber-400/30">
                        <AvatarImage src={result.avatarUrl || undefined} alt={result.volunteerName} />
                        <AvatarFallback className="text-lg font-bold bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          {initials(result.volunteerName)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xl font-bold text-foreground">{result.volunteerName}</p>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {result.taskTitle && <p>{labels.task}: <span className="font-medium text-foreground">{result.taskTitle}</span></p>}
                      {result.checkedInAt && <p>{labels.checkedInAt}: <span className="font-medium text-foreground">{new Date(result.checkedInAt).toLocaleTimeString()}</span></p>}
                    </div>
                    <Button onClick={handleOk} className="mt-2 gap-2 w-full text-lg py-6" size="lg">{labels.scanNext}</Button>
                  </CardContent>
                </Card>
              )}

              {result.type === 'error' && (
                <Card className="border-2 border-destructive bg-destructive/5">
                  <CardContent className="pt-6 text-center space-y-3">
                    <XCircle className="w-16 h-16 text-destructive mx-auto" />
                    <h2 className="text-xl font-bold text-foreground">{labels.invalidTicket}</h2>
                    {result.error && <p className="text-sm text-destructive">{result.error}</p>}
                    <Button onClick={handleOk} className="mt-2 gap-2 w-full text-lg py-6" size="lg">{labels.scanNext}</Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default TicketScanner;
