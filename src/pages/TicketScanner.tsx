import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle, Loader2, RotateCcw, LogOut } from 'lucide-react';
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
    checkedOut: 'Uitgecheckt!',
    alreadyCheckedIn: 'Al ingecheckt',
    invalidTicket: 'Ongeldig ticket',
    task: 'Taak',
    event: 'Event',
    checkedInAt: 'Ingecheckt om',
    checkedOutAt: 'Uitgecheckt om',
    hoursWorked: 'Uren gewerkt',
    scanNext: 'OK — Volgende scannen',
    cameraError: 'Kon camera niet openen. Geef toestemming voor cameragebruik.',
    noAccess: 'Je hebt geen toegang tot deze pagina',
    retry: 'Opnieuw proberen',
    processing: 'Verwerken...',
    modeCheckin: 'Check-in',
    modeCheckout: 'Check-out',
    proefperiode: 'Proefperiode',
    actief: 'Actief/Betalend',
  },
  fr: {
    title: 'Scanner QR',
    back: 'Retour',
    scanning: 'Dirigez la caméra vers un code QR...',
    success: 'Enregistré !',
    checkedOut: 'Désinscrit !',
    alreadyCheckedIn: 'Déjà enregistré',
    invalidTicket: 'Ticket invalide',
    task: 'Tâche',
    event: 'Événement',
    checkedInAt: 'Enregistré à',
    checkedOutAt: 'Désinscrit à',
    hoursWorked: 'Heures travaillées',
    scanNext: 'OK — Scanner suivant',
    cameraError: "Impossible d'ouvrir la caméra.",
    noAccess: "Vous n'avez pas accès à cette page",
    retry: 'Réessayer',
    processing: 'Traitement...',
    modeCheckin: 'Check-in',
    modeCheckout: 'Check-out',
    proefperiode: 'Période d\'essai',
    actief: 'Actif/Payant',
  },
  en: {
    title: 'QR Scanner',
    back: 'Back',
    scanning: 'Point the camera at a QR code...',
    success: 'Checked in!',
    checkedOut: 'Checked out!',
    alreadyCheckedIn: 'Already checked in',
    invalidTicket: 'Invalid ticket',
    task: 'Task',
    event: 'Event',
    checkedInAt: 'Checked in at',
    checkedOutAt: 'Checked out at',
    hoursWorked: 'Hours worked',
    scanNext: 'OK — Scan next',
    cameraError: 'Could not open camera. Please allow camera access.',
    noAccess: 'You do not have access to this page',
    retry: 'Retry',
    processing: 'Processing...',
    modeCheckin: 'Check-in',
    modeCheckout: 'Check-out',
    proefperiode: 'Trial period',
    actief: 'Active/Paying',
  },
};

type ScanResult = {
  type: 'success' | 'already_checked_in' | 'error' | 'checked_out';
  volunteerName?: string;
  avatarUrl?: string | null;
  taskTitle?: string;
  eventTitle?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  hoursWorked?: number;
  error?: string;
  groupName?: string | null;
  wristbandColor?: string | null;
  wristbandLabel?: string | null;
  materialsNote?: string | null;
  checkinCount?: number;
  volunteerStatus?: string;
};

// ── Audio helpers ──────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext => {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
};
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
    osc.type = type; osc.frequency.value = frequency; gain.gain.value = 0.4;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000 + 0.05);
  } catch { /* audio not available */ }
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
  const [scanMode, setScanMode] = useState<'checkin' | 'checkout'>('checkin');

  const [phase, setPhase] = useState<'scanning' | 'processing' | 'result'>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);

  const busyRef = useRef(false);
  const clubIdRef = useRef<string | null>(null);
  const scanModeRef = useRef<'checkin' | 'checkout'>('checkin');
  useEffect(() => { clubIdRef.current = clubId; }, [clubId]);
  useEffect(() => { scanModeRef.current = scanMode; }, [scanMode]);

  // ── Auth check ──
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

  // ── Process barcode ──
  const processBarcode = async (barcode: string) => {
    const cid = clubIdRef.current;
    const mode = scanModeRef.current;
    let scanResult: ScanResult;

    try {
      const { data, error } = await supabase.functions.invoke('ticketing-scan', {
        body: { barcode, club_id: cid, ...(mode === 'checkout' ? { action: 'checkout' } : {}) },
      });

      if (error) {
        scanResult = { type: 'error', error: typeof error === 'string' ? error : (error as any)?.message || t.invalidTicket };
      } else if (data?.status === 'checked_out') {
        scanResult = { type: 'checked_out', volunteerName: data.volunteer_name, avatarUrl: data.avatar_url, taskTitle: data.task_title, eventTitle: data.event_title, checkedOutAt: data.checked_out_at, hoursWorked: data.hours_worked, checkinCount: data.checkin_count, volunteerStatus: data.volunteer_status };
      } else if (data?.success === true) {
        scanResult = { type: 'success', volunteerName: data.volunteer_name, avatarUrl: data.avatar_url, taskTitle: data.task_title, eventTitle: data.event_title, checkedInAt: data.checked_in_at, groupName: data.group_name, wristbandColor: data.wristband_color, wristbandLabel: data.wristband_label, materialsNote: data.materials_note, checkinCount: data.checkin_count, volunteerStatus: data.volunteer_status };
      } else if (data?.status === 'already_checked_in') {
        scanResult = { type: 'already_checked_in', volunteerName: data.volunteer_name, avatarUrl: data.avatar_url, taskTitle: data.task_title, checkedInAt: data.checked_in_at, groupName: data.group_name, wristbandColor: data.wristband_color, wristbandLabel: data.wristband_label, materialsNote: data.materials_note, checkinCount: data.checkin_count, volunteerStatus: data.volunteer_status };
      } else {
        scanResult = { type: 'error', error: data?.error || t.invalidTicket };
      }
    } catch (e: any) {
      scanResult = { type: 'error', error: e?.message || t.invalidTicket };
    }

    try {
      if (scanResult.type === 'success' || scanResult.type === 'checked_out') playSuccessChime();
      else if (scanResult.type === 'already_checked_in') playWarningTone();
      else playErrorBuzz();
    } catch { /* ignore */ }

    setResult(scanResult);
    setPhase('result');
  };

  // ── Camera lifecycle ──
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
        if (!el) return;

        html5QrCode = new Html5Qrcode('qr-reader');
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1, disableFlip: false },
          (decodedText: string) => {
            if (busyRef.current || stopped) return;
            busyRef.current = true;
            stopped = true;
            isRunning = false;
            setTimeout(() => { setPhase('processing'); processBarcode(decodedText); }, 0);
          },
          () => {}
        );
        isRunning = true;
      } catch (err) {
        if (!stopped) setCameraError(true);
      }
    };

    start();

    return () => {
      stopped = true;
      if (html5QrCode && isRunning) {
        try {
          const state = html5QrCode.getState?.();
          if (state === undefined || state === 2 || state === 3) html5QrCode.stop().catch(() => {});
        } catch { /* ignore */ }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, loading, clubId]);

  const handleOk = () => {
    busyRef.current = false;
    setResult(null);
    setPhase('scanning');
  };

  // ── Render ──
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (noAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full"><CardContent className="pt-6 text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-foreground font-medium">{t.noAccess}</p>
          <Button onClick={() => navigate('/')} className="mt-4" variant="outline">{t.back}</Button>
        </CardContent></Card>
      </div>
    );
  }

  // ── FULLSCREEN GREEN SUCCESS OVERLAY ──
  if (phase === 'result' && result && (result.type === 'success' || result.type === 'checked_out')) {
    const isCheckout = result.type === 'checked_out';
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-emerald-500 text-white p-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6">
          {isCheckout ? <LogOut className="w-14 h-14 text-white" strokeWidth={2.5} /> : <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />}
        </div>
        <h1 className="text-3xl font-black mb-2">{isCheckout ? t.checkedOut : t.success}</h1>

        <Avatar className="w-28 h-28 my-4 shadow-2xl border-4 border-white/40">
          <AvatarImage src={result.avatarUrl || undefined} alt={result.volunteerName} className="object-cover" />
          <AvatarFallback className="text-3xl font-bold bg-white/20 text-white">{initials(result.volunteerName)}</AvatarFallback>
        </Avatar>

        <p className="text-2xl font-bold mb-1">{result.volunteerName}</p>

        {/* Season status badge */}
        {result.volunteerStatus && (
          <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-bold ${result.volunteerStatus === 'actief' ? 'bg-white/30 text-white' : 'bg-yellow-400/90 text-yellow-900'}`}>
            {result.volunteerStatus === 'actief' ? t.actief : `${t.proefperiode} (${result.checkinCount || 0}/4)`}
          </div>
        )}

        {/* Wristband / material info */}
        {result.wristbandColor && (
          <div className="mt-4 rounded-xl border-2 border-white/30 bg-white/10 p-3 text-center w-full max-w-sm">
            <p className="text-lg font-black uppercase tracking-wider">{result.wristbandLabel || result.wristbandColor} BANDJE</p>
            {result.groupName && <p className="text-sm opacity-80">{result.groupName}</p>}
            {result.materialsNote && <p className="text-sm opacity-80 mt-1">📋 {result.materialsNote}</p>}
          </div>
        )}

        {/* Non-wristband materials note (season) */}
        {!result.wristbandColor && result.materialsNote && (
          <div className="mt-4 rounded-xl border-2 border-white/30 bg-white/10 p-3 text-center w-full max-w-sm">
            <p className="text-sm font-medium">{result.materialsNote}</p>
          </div>
        )}

        <div className="mt-4 space-y-1 text-center text-sm opacity-80">
          {result.taskTitle && <p>{t.task}: <span className="font-semibold">{result.taskTitle}</span></p>}
          {result.eventTitle && <p>{t.event}: <span className="font-semibold">{result.eventTitle}</span></p>}
          {result.checkedInAt && <p>{t.checkedInAt}: <span className="font-semibold">{new Date(result.checkedInAt).toLocaleTimeString()}</span></p>}
          {isCheckout && result.checkedOutAt && <p>{t.checkedOutAt}: <span className="font-semibold">{new Date(result.checkedOutAt).toLocaleTimeString()}</span></p>}
          {isCheckout && result.hoursWorked != null && <p>{t.hoursWorked}: <span className="font-semibold">{result.hoursWorked}h</span></p>}
        </div>

        <Button onClick={handleOk} size="lg" className="mt-8 w-full max-w-sm text-lg py-6 bg-white text-emerald-700 hover:bg-white/90 font-bold gap-2">
          <CheckCircle2 className="w-6 h-6" />
          {t.scanNext}
        </Button>
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
          <div className="ml-auto flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setScanMode('checkin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${scanMode === 'checkin' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.modeCheckin}
            </button>
            <button
              onClick={() => setScanMode('checkout')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${scanMode === 'checkout' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.modeCheckout}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* QR reader */}
        <div style={{ display: phase === 'scanning' && !cameraError ? 'block' : 'none' }}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="w-5 h-5 animate-pulse" />
              <span className="text-sm">{t.scanning}</span>
              {scanMode === 'checkout' && (
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">
                  <LogOut className="w-3 h-3 inline mr-1" />{t.modeCheckout}
                </span>
              )}
            </div>
            <div id="qr-reader" className="w-full rounded-xl overflow-hidden border-2 border-primary/30 bg-muted" style={{ minHeight: 320 }} />
          </div>
        </div>

        {/* Camera error */}
        {cameraError && (
          <Card><CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <p className="text-foreground">{t.cameraError}</p>
            <Button onClick={() => { setCameraError(false); setPhase('scanning'); }} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />{t.retry}
            </Button>
          </CardContent></Card>
        )}

        {/* Processing */}
        {phase === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t.processing}</p>
          </div>
        )}

        {/* ── RESULT (non-success cases) ── */}
        {phase === 'result' && result && result.type !== 'success' && result.type !== 'checked_out' && (
          <div>
            {/* ALREADY CHECKED IN */}
            {result.type === 'already_checked_in' && (
              <Card className="border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6 text-center space-y-4">
                  <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
                  <h2 className="text-xl font-bold text-foreground">{t.alreadyCheckedIn}</h2>
                  <Avatar className="w-16 h-16 mx-auto" style={{ border: result.wristbandColor ? `4px solid ${result.wristbandColor}` : '2px solid hsl(var(--border))' }}>
                    <AvatarImage src={result.avatarUrl || undefined} alt={result.volunteerName} />
                    <AvatarFallback className="text-lg font-bold bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">{initials(result.volunteerName)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xl font-bold text-foreground">{result.volunteerName}</p>

                  {result.volunteerStatus && (
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${result.volunteerStatus === 'actief' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                      {result.volunteerStatus === 'actief' ? t.actief : `${t.proefperiode} (${result.checkinCount || 0}/4)`}
                    </div>
                  )}

                  {result.wristbandColor && (
                    <div className="rounded-lg border p-3 text-center" style={{ borderColor: result.wristbandColor, backgroundColor: `${result.wristbandColor}10` }}>
                      <p className="text-sm font-black uppercase tracking-wider" style={{ color: result.wristbandColor }}>{result.wristbandColor} {result.wristbandLabel || 'BANDJE'}</p>
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
