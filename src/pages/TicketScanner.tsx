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

// Generate a short beep using Web Audio API (no file needed)
const playBeep = (frequency = 880, duration = 150, type: OscillatorType = 'sine') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0.4;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000 + 0.05);
  } catch (e) {
    console.warn('Audio not available:', e);
  }
};

const playSuccessChime = () => {
  playBeep(660, 100, 'sine');
  setTimeout(() => playBeep(880, 100, 'sine'), 120);
  setTimeout(() => playBeep(1100, 150, 'sine'), 250);
};

const playErrorBuzz = () => {
  playBeep(200, 300, 'square');
};

const playWarningTone = () => {
  playBeep(440, 200, 'triangle');
  setTimeout(() => playBeep(440, 200, 'triangle'), 250);
};

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

  // Pending barcode — triggers processing in a separate effect
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);

  const clubIdRef = useRef<string | null>(null);
  useEffect(() => { clubIdRef.current = clubId; }, [clubId]);

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

  // EFFECT 1: Scanner lifecycle — ONLY manages camera start/stop
  useEffect(() => {
    if (scannerState !== 'scanning' || loading) return;

    let html5QrCode: any = null;
    let stopped = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        await new Promise(r => setTimeout(r, 150));
        if (stopped) return;

        const el = document.getElementById('qr-reader');
        if (!el) {
          console.error('qr-reader element not found');
          return;
        }

        html5QrCode = new Html5Qrcode('qr-reader');

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1, disableFlip: false },
          (decodedText: string) => {
            if (stopped) return;
            stopped = true; // prevent double scans

            // Stop scanner first
            html5QrCode.stop().catch(() => {});

            // Set pending barcode — this triggers EFFECT 2
            console.log('[Scanner] Barcode detected:', decodedText);
            setScannerState('processing');
            setPendingBarcode(decodedText);
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
  }, [scannerState, loading]);

  // EFFECT 2: Process barcode — completely separate from scanner lifecycle
  useEffect(() => {
    if (!pendingBarcode) return;

    const cid = clubIdRef.current;
    if (!cid) {
      console.error('[Process] No club ID');
      setPendingBarcode(null);
      setScannerState('scanning');
      return;
    }

    let cancelled = false;
    const barcode = pendingBarcode;

    const process = async () => {
      console.log('[Process] Calling ticketing-scan with barcode:', barcode);

      let scanResult: ScanResult;

      try {
        const response = await supabase.functions.invoke('ticketing-scan', {
          body: { barcode, club_id: cid },
        });

        console.log('[Process] Raw response:', JSON.stringify(response));

        // supabase.functions.invoke returns { data, error }
        // data is the parsed JSON body, error is set for non-2xx or network errors
        const data = response.data;
        const error = response.error;

        if (error) {
          console.error('[Process] Invoke error:', error);
          scanResult = {
            type: 'error',
            error: typeof error === 'string' ? error : (error as any)?.message || labels.invalidTicket,
          };
        } else if (data?.success === true) {
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
        console.error('[Process] Exception:', e);
        scanResult = {
          type: 'error',
          error: e.message || labels.invalidTicket,
        };
      }

      if (cancelled) return;

      console.log('[Process] Setting result:', scanResult.type, scanResult);

      // Play sound based on result
      if (scanResult.type === 'success') {
        playSuccessChime();
      } else if (scanResult.type === 'already_checked_in') {
        playWarningTone();
      } else {
        playErrorBuzz();
      }

      setResult(scanResult);
      setScannerState('showing_result');
      setPendingBarcode(null);
    };

    process();

    return () => { cancelled = true; };
  }, [pendingBarcode, labels.invalidTicket]);

  const handleOk = () => {
    setResult(null);
    setPendingBarcode(null);
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
        {/* Scanner view */}
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

        {/* Camera error */}
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

        {/* Processing spinner */}
        {scannerState === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{labels.processing}</p>
          </div>
        )}

        {/* Result screen */}
        <AnimatePresence mode="wait">
          {scannerState === 'showing_result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* SUCCESS */}
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

              {/* ALREADY CHECKED IN */}
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

              {/* ERROR */}
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
