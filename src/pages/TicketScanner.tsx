import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/Logo';

const labels = {
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
  groupName?: string | null;
  wristbandColor?: string | null;
  wristbandLabel?: string | null;
  materialsNote?: string | null;
};

// ── Audio helpers (Web Audio API, no files needed) ──────────────────
// Reuse a single AudioContext so mobile browsers don't block playback
let _audioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext => {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (mobile Safari / Chrome policy)
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
};
// Warm up AudioContext on first user tap anywhere on the page
if (typeof window !== 'undefined') {
  const warmUp = () => { getAudioCtx(); document.removeEventListener('touchstart', warmUp); document.removeEventListener('click', warmUp); };
  document.addEventListener('touchstart', warmUp, { once: true });
  document.addEventListener('click', warmUp, { once: true });
}

const playBeep = (frequency = 880, duration = 150, type: OscillatorType = 'sine') => {
  try {
    const ctx = getAudioCtx();
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
  } catch {
    // audio not available
  }
};
const playSuccessChime = () => { playBeep(660, 100); setTimeout(() => playBeep(880, 100), 120); setTimeout(() => playBeep(1100, 150), 250); };
const playErrorBuzz = () => { playBeep(200, 300, 'square'); };
const playWarningTone = () => { playBeep(440, 200, 'triangle'); setTimeout(() => playBeep(440, 200, 'triangle'), 250); };

const initials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ── Component ───────────────────────────────────────────────────────
const TicketScanner = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = labels[language as keyof typeof labels] || labels.nl;

  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Scanner phases: 'scanning' | 'processing' | 'result'
  const [phase, setPhase] = useState<'scanning' | 'processing' | 'result'>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);

  // Ref to prevent double-scans while processing
  const busyRef = useRef(false);
  // Keep clubId accessible in callbacks without stale closures
  const clubIdRef = useRef<string | null>(null);
  useEffect(() => { clubIdRef.current = clubId; }, [clubId]);

  // ── Auth check ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }

      const { data: clubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id).limit(1);
      let cid = clubs?.[0]?.id;
      if (!cid) {
        const { data: members } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1);
        cid = members?.[0]?.club_id;
      }
      if (!cid) { setNoAccess(true); setLoading(false); return; }
      setClubId(cid);
      setLoading(false);
    })();
  }, [navigate]);

  // ── Process a scanned barcode (standalone async, no useEffect deps issues) ──
  const processBarcode = async (barcode: string) => {
    const cid = clubIdRef.current;
    let scanResult: ScanResult;

    try {
      console.log('[Scan] Processing barcode:', barcode, 'club:', cid);
      const { data, error } = await supabase.functions.invoke('ticketing-scan', {
        body: { barcode, club_id: cid },
      });

      console.log('[Scan] Response:', JSON.stringify({ data, error }));

      if (error) {
        scanResult = { type: 'error', error: typeof error === 'string' ? error : (error as any)?.message || t.invalidTicket };
      } else if (data?.success === true) {
        scanResult = { type: 'success', volunteerName: data.volunteer_name, avatarUrl: data.avatar_url, taskTitle: data.task_title, eventTitle: data.event_title, checkedInAt: data.checked_in_at, groupName: data.group_name, wristbandColor: data.wristband_color, wristbandLabel: data.wristband_label, materialsNote: data.materials_note };
      } else if (data?.status === 'already_checked_in') {
        scanResult = { type: 'already_checked_in', volunteerName: data.volunteer_name, avatarUrl: data.avatar_url, taskTitle: data.task_title, checkedInAt: data.checked_in_at, groupName: data.group_name, wristbandColor: data.wristband_color, wristbandLabel: data.wristband_label, materialsNote: data.materials_note };
      } else {
        scanResult = { type: 'error', error: data?.error || t.invalidTicket };
      }
    } catch (e: any) {
      console.error('[Scan] Exception:', e);
      scanResult = { type: 'error', error: e?.message || t.invalidTicket };
    }

    // Play audio
    try {
      if (scanResult.type === 'success') playSuccessChime();
      else if (scanResult.type === 'already_checked_in') playWarningTone();
      else playErrorBuzz();
    } catch { /* ignore audio errors */ }

    // ALWAYS show result — user MUST press OK
    console.log('[Scan] Showing result:', scanResult.type);
    setResult(scanResult);
    setPhase('result');
  };

  // ── Camera lifecycle ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'scanning' || loading || !clubId) return;

    let html5QrCode: any = null;
    let stopped = false;
    let isRunning = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        await new Promise(r => setTimeout(r, 200));
        if (stopped) return;

        const el = document.getElementById('qr-reader');
        if (!el) { console.error('[Camera] #qr-reader not found'); return; }

        html5QrCode = new Html5Qrcode('qr-reader');

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1, disableFlip: false },
          (decodedText: string) => {
            if (busyRef.current || stopped) return;
            busyRef.current = true;
            stopped = true;
            isRunning = false;

            console.log('[Camera] Barcode detected:', decodedText);

            setTimeout(() => {
              setPhase('processing');
              processBarcode(decodedText);
            }, 0);
          },
          () => {}
        );
        isRunning = true;
      } catch (err) {
        console.error('[Camera] Error:', err);
        if (!stopped) setCameraError(true);
      }
    };

    start();

    return () => {
      stopped = true;
      if (html5QrCode && isRunning) {
        try {
          const state = html5QrCode.getState?.();
          // Only stop if actually running (state 2) or paused (state 3)
          if (state === undefined || state === 2 || state === 3) {
            html5QrCode.stop().catch(() => {});
          }
        } catch {
          // scanner not in a stoppable state, ignore
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, loading, clubId]);

  // ── OK button handler — resets everything for next scan ─────────
  const handleOk = () => {
    busyRef.current = false;
    setResult(null);
    setPhase('scanning');
  };

  // ── Render ──────────────────────────────────────────────────────
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
            <p className="text-foreground font-medium">{t.noAccess}</p>
            <Button onClick={() => navigate('/')} className="mt-4" variant="outline">{t.back}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border pt-safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 min-h-12 flex items-center gap-3">
          <button onClick={() => navigate('/ticketing')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Logo />
          <h1 className="text-lg font-bold text-foreground ml-2">{t.title}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* QR reader — always in DOM, hidden when not scanning */}
        <div style={{ display: phase === 'scanning' && !cameraError ? 'block' : 'none' }}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="w-5 h-5 animate-pulse" />
              <span className="text-sm">{t.scanning}</span>
            </div>
            <div
              id="qr-reader"
              className="w-full rounded-xl overflow-hidden border-2 border-primary/30 bg-muted"
              style={{ minHeight: 320 }}
            />
          </div>
        </div>

        {/* Camera error */}
        {cameraError && (
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <p className="text-foreground">{t.cameraError}</p>
              <Button onClick={() => { setCameraError(false); setPhase('scanning'); }} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                {t.retry}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Processing spinner */}
        {phase === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t.processing}</p>
          </div>
        )}

        {/* ── RESULT SCREEN — always requires manual OK ── */}
        {phase === 'result' && result && (
          <div>
            {/* SUCCESS */}
            {result.type === 'success' && (
              <div className="flex flex-col items-center gap-5 py-6">
                <div className="w-28 h-28 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500" strokeWidth={2.5} style={{ width: 72, height: 72 }} />
                </div>
                <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{t.success}</h2>
                <Avatar className="w-32 h-32 shadow-lg" style={{
                  border: result.wristbandColor ? `6px solid ${result.wristbandColor}` : '4px solid hsl(var(--border))',
                  boxShadow: result.wristbandColor ? `0 0 0 3px ${result.wristbandColor}40` : undefined,
                }}>
                  <AvatarImage src={result.avatarUrl || undefined} alt={result.volunteerName} className="object-cover" />
                  <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                    {initials(result.volunteerName)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-3xl font-bold text-foreground">{result.volunteerName}</p>

                {/* Wristband / material info */}
                {result.wristbandColor && (
                  <div className="w-full rounded-xl border-2 p-4 text-center space-y-2" style={{ borderColor: result.wristbandColor, backgroundColor: `${result.wristbandColor}15` }}>
                    <p className="text-lg font-black uppercase tracking-wider" style={{ color: result.wristbandColor }}>
                      {result.wristbandColor} {result.wristbandLabel || 'BANDJE'}
                    </p>
                    {result.groupName && (
                      <p className="text-sm font-medium text-foreground">{result.groupName}</p>
                    )}
                    {result.materialsNote && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">📋 {result.materialsNote}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1 text-center text-sm text-muted-foreground">
                  {result.taskTitle && <p>{t.task}: <span className="font-medium text-foreground">{result.taskTitle}</span></p>}
                  {result.eventTitle && <p>{t.event}: <span className="font-medium text-foreground">{result.eventTitle}</span></p>}
                  {result.checkedInAt && <p>{t.checkedInAt}: <span className="font-medium text-foreground">{new Date(result.checkedInAt).toLocaleTimeString()}</span></p>}
                </div>
                <Button onClick={handleOk} className="w-full gap-2 text-lg py-6" size="lg">
                  <CheckCircle2 className="w-6 h-6" />
                  {t.scanNext}
                </Button>
              </div>
            )}

            {/* ALREADY CHECKED IN */}
            {result.type === 'already_checked_in' && (
              <Card className="border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6 text-center space-y-4">
                  <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
                  <h2 className="text-xl font-bold text-foreground">{t.alreadyCheckedIn}</h2>
                  <Avatar className="w-16 h-16 mx-auto" style={{
                    border: result.wristbandColor ? `4px solid ${result.wristbandColor}` : '2px solid hsl(var(--border))',
                  }}>
                    <AvatarImage src={result.avatarUrl || undefined} alt={result.volunteerName} />
                    <AvatarFallback className="text-lg font-bold bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {initials(result.volunteerName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xl font-bold text-foreground">{result.volunteerName}</p>

                  {/* Wristband info on already checked in */}
                  {result.wristbandColor && (
                    <div className="rounded-lg border p-3 text-center" style={{ borderColor: result.wristbandColor, backgroundColor: `${result.wristbandColor}10` }}>
                      <p className="text-sm font-black uppercase tracking-wider" style={{ color: result.wristbandColor }}>
                        {result.wristbandColor} {result.wristbandLabel || 'BANDJE'}
                      </p>
                      {result.materialsNote && <p className="text-xs text-muted-foreground mt-1">📋 {result.materialsNote}</p>}
                    </div>
                  )}

                  <div className="space-y-1 text-sm text-muted-foreground">
                    {result.taskTitle && <p>{t.task}: <span className="font-medium text-foreground">{result.taskTitle}</span></p>}
                    {result.checkedInAt && <p>{t.checkedInAt}: <span className="font-medium text-foreground">{new Date(result.checkedInAt).toLocaleTimeString()}</span></p>}
                  </div>
                  <Button onClick={handleOk} className="mt-2 gap-2 w-full text-lg py-6" size="lg">{t.scanNext}</Button>
                </CardContent>
              </Card>
            )}

            {/* ERROR */}
            {result.type === 'error' && (
              <Card className="border-2 border-destructive bg-destructive/5">
                <CardContent className="pt-6 text-center space-y-3">
                  <XCircle className="w-16 h-16 text-destructive mx-auto" />
                  <h2 className="text-xl font-bold text-foreground">{t.invalidTicket}</h2>
                  {result.error && <p className="text-sm text-destructive">{result.error}</p>}
                  <Button onClick={handleOk} className="mt-2 gap-2 w-full text-lg py-6" size="lg">{t.scanNext}</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TicketScanner;
