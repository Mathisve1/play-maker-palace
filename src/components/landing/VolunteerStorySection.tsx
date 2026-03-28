import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types (kept for API compatibility) ───────────────────────────────────────
export interface StoryChapter {
  num: string;
  title: string;
  subtitle: string;
  desc: string;
}

interface VolunteerStorySectionProps {
  sectionLabel: string;
  sectionTitle: string;
  chapters: StoryChapter[];
}

const VIDEO_SRC = '/story/finalvideo_web.mp4';
const FADE_SECS = 0.6; // caption fade in/out duration

// ─── Main Component ───────────────────────────────────────────────────────────
export const VolunteerStorySection = ({
  sectionLabel,
  sectionTitle,
  chapters,
}: VolunteerStorySectionProps) => {
  const isMobile = useIsMobile();
  const videoRef    = useRef<HTMLVideoElement>(null);
  const sectionRef  = useRef<HTMLDivElement>(null);
  const hideTimer   = useRef<ReturnType<typeof setTimeout>>();

  const [currentTime,   setCurrentTime]   = useState(0);
  const [duration,      setDuration]      = useState(53);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [isMuted,       setIsMuted]       = useState(true);
  const [hasStarted,    setHasStarted]    = useState(false);
  const [showControls,  setShowControls]  = useState(false);

  const totalProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const controlsVisible = showControls || !isPlaying || !hasStarted;

  // ── Active chapter + caption fade alpha ─────────────────────────────────────
  const chapterDuration = chapters.length > 0 ? duration / chapters.length : duration;
  const activeIndex = Math.min(
    Math.floor(currentTime / chapterDuration),
    chapters.length - 1,
  );
  const chapterStart = activeIndex * chapterDuration;
  const chapterEnd   = chapterStart + chapterDuration;
  const captionAlpha = hasStarted
    ? Math.min(
        currentTime - chapterStart < FADE_SECS ? (currentTime - chapterStart) / FADE_SECS : 1,
        chapterEnd - currentTime   < FADE_SECS ? (chapterEnd - currentTime)   / FADE_SECS : 1,
      )
    : 0;

  // ── Video events ────────────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime    = () => setCurrentTime(v.currentTime);
    const onMeta    = () => setDuration(v.duration || 53);
    const onPlay    = () => { setIsPlaying(true); setHasStarted(true); };
    const onPause   = () => setIsPlaying(false);
    const onEnded   = () => { v.currentTime = 0; v.play().catch(() => {}); };

    v.addEventListener('timeupdate',    onTime);
    v.addEventListener('loadedmetadata',onMeta);
    v.addEventListener('play',          onPlay);
    v.addEventListener('pause',         onPause);
    v.addEventListener('ended',         onEnded);
    return () => {
      v.removeEventListener('timeupdate',    onTime);
      v.removeEventListener('loadedmetadata',onMeta);
      v.removeEventListener('play',          onPlay);
      v.removeEventListener('pause',         onPause);
      v.removeEventListener('ended',         onEnded);
    };
  }, []);

  // ── Autoplay on viewport enter, pause on leave ──────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const v       = videoRef.current;
    if (!section || !v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) v.play().catch(() => {});
        else if (!entry.isIntersecting) v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [hasStarted]);

  // ── Controls auto-hide after 3s of inactivity ──────────────────────────────
  const revealControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // ── Playback controls ───────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const onSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }, [duration]);

  // ── Shared video element ────────────────────────────────────────────────────
  const videoEl = (
    <video
      ref={videoRef}
      src={VIDEO_SRC}
      muted={isMuted}
      playsInline
      preload="auto"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );

  // ── Minimal controls overlay ────────────────────────────────────────────────
  const controlsEl = (
    <>
      {/* Caption overlay — language comes from chapters prop (already translated) */}
      {chapters.length > 0 && hasStarted && (
        <div
          style={{
            position: 'absolute',
            bottom: isMobile ? 52 : 58,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 16px',
            zIndex: 15,
            opacity: captionAlpha,
            transition: 'opacity 0.15s linear',
          }}
        >
          <div
            style={{
              background: 'rgba(249,115,22,0.88)',
              backdropFilter: 'blur(4px)',
              borderRadius: 10,
              padding: isMobile ? '8px 14px' : '10px 20px',
              maxWidth: isMobile ? '92%' : '70%',
              textAlign: 'center',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={activeIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'block',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  lineHeight: 1.45,
                  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              >
                {chapters[activeIndex]?.subtitle}
                {chapters[activeIndex]?.title && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: isMobile ? '0.75rem' : '0.82rem',
                      fontWeight: 500,
                      opacity: 0.82,
                      marginTop: 2,
                    }}
                  >
                    {chapters[activeIndex].title}
                  </span>
                )}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Thin progress line — absolute bottom edge, clickable to seek */}
      <div
        onClick={onSeek}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.15)',
          cursor: 'pointer',
          zIndex: 20,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${totalProgress}%`,
            background: 'hsl(24,85%,55%)',
            transition: 'width 0.3s linear',
          }}
        />
      </div>

      {/* Play + Mute pill — bottom-right, fades in on hover/pause */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: 14,
              right: 14,
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Mute */}
            <button
              onClick={toggleMute}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
              aria-label={isMuted ? 'Geluid aan' : 'Geluid uit'}
            >
              {isMuted
                ? <VolumeX style={{ width: 15, height: 15, color: '#fff' }} />
                : <Volume2 style={{ width: 15, height: 15, color: '#fff' }} />}
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'hsl(24,85%,55%)',
                boxShadow: '0 2px 12px rgba(249,115,22,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
              aria-label={isPlaying ? 'Pauzeer' : 'Afspelen'}
            >
              {isPlaying
                ? <Pause style={{ width: 18, height: 18, color: '#fff' }} />
                : <Play  style={{ width: 18, height: 18, color: '#fff', marginLeft: 2 }} />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big play overlay — only before first play */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.25)',
              zIndex: 10,
              cursor: 'pointer',
            }}
            onClick={togglePlay}
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            >
              <div
                style={{
                  width: isMobile ? 68 : 88,
                  height: isMobile ? 68 : 88,
                  borderRadius: '50%',
                  background: 'hsl(24,85%,55%)',
                  boxShadow: '0 8px 40px rgba(249,115,22,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play style={{
                  width: isMobile ? 26 : 34,
                  height: isMobile ? 26 : 34,
                  color: '#fff',
                  marginLeft: 4,
                }} />
              </div>
              <span style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: isMobile ? '0.95rem' : '1.05rem',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}>
                Bekijk hoe het werkt
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-14"
        >
          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">
            {sectionLabel}
          </p>
          <h2 className="font-heading font-bold text-foreground text-4xl md:text-5xl leading-tight max-w-2xl mx-auto">
            {sectionTitle}
          </h2>
        </motion.div>

        {/* Video container */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl shadow-2xl"
          style={{
            aspectRatio: '16/9',
            maxHeight: '80vh',
            background: '#000',
          }}
          onMouseMove={revealControls}
          onMouseEnter={revealControls}
          onTouchStart={revealControls}
        >
          {videoEl}
          {controlsEl}
        </motion.div>
      </div>
    </section>
  );
};
