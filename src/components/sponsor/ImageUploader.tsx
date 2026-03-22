import React, { useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  /** Storage sub-folder. Use 'pending' for anon users, 'uploads' for authenticated. */
  folder?: string;
  label?: string;
  /** Compact square thumbnail variant (e.g. for logo). Defaults to full-width banner mode. */
  compact?: boolean;
  /** Dark glassmorphism styling for the public wizard; light for the admin hub. */
  variant?: 'dark' | 'light';
  accept?: string;
}

const BUCKET = 'sponsor_media';

const ImageUploader = ({
  value,
  onChange,
  folder = 'pending',
  label,
  compact = false,
  variant = 'light',
  accept = 'image/jpeg,image/png,image/webp,image/gif',
}: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]   = useState(false);
  const [dragOver,  setDragOver]    = useState(false);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Alleen afbeeldingen zijn toegestaan.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Afbeelding mag maximaal 5 MB zijn.');
      return;
    }

    setUploading(true);
    const ext      = file.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
      toast.error(`Upload mislukt: ${error.message}`);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    onChange(publicUrl);
    setUploading(false);
  }, [folder, onChange]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (files?.[0]) upload(files[0]);
  }, [upload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const isDark = variant === 'dark';

  // ── Preview mode (image already uploaded) ────────────────────────────────
  if (value) {
    return (
      <div className="space-y-1.5">
        {label && <p className={cn('text-sm font-medium', isDark ? 'text-white/70' : 'text-foreground')}>{label}</p>}
        <div className={cn('relative overflow-hidden rounded-xl border', isDark ? 'border-white/10' : 'border-border/60', compact ? 'w-16 h-16' : 'w-full h-32')}>
          <img
            src={value}
            alt="upload preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className={cn(
              'absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-colors',
              isDark ? 'bg-black/60 hover:bg-black/80 text-white' : 'bg-white/90 hover:bg-white shadow text-gray-700',
            )}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Drop zone ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-1.5">
      {label && <p className={cn('text-sm font-medium', isDark ? 'text-white/70' : 'text-foreground')}>{label}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      <AnimatePresence>
        <motion.button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          animate={{ scale: dragOver ? 1.01 : 1 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'w-full rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2',
            compact ? 'h-16 w-16' : 'h-28',
            uploading && 'cursor-not-allowed opacity-70',
            isDark
              ? [
                  'border-white/15 bg-white/[0.04] hover:bg-white/[0.07] hover:border-indigo-400/50',
                  dragOver && 'border-indigo-400/70 bg-indigo-400/10',
                ].join(' ')
              : [
                  'border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-indigo-300',
                  dragOver && 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
                ].join(' '),
          )}
        >
          {uploading ? (
            <Loader2 className={cn('w-5 h-5 animate-spin', isDark ? 'text-white/50' : 'text-muted-foreground')} />
          ) : (
            <>
              {compact
                ? <Image className={cn('w-5 h-5', isDark ? 'text-white/30' : 'text-muted-foreground/60')} />
                : (
                  <>
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', isDark ? 'bg-white/[0.06]' : 'bg-muted')}>
                      <Upload className={cn('w-4 h-4', isDark ? 'text-white/40' : 'text-muted-foreground')} />
                    </div>
                    <div className="text-center">
                      <p className={cn('text-xs font-medium', isDark ? 'text-white/60' : 'text-foreground/80')}>
                        Sleep of klik om te uploaden
                      </p>
                      <p className={cn('text-[11px] mt-0.5', isDark ? 'text-white/25' : 'text-muted-foreground/60')}>
                        JPG, PNG, WebP — max 5 MB
                      </p>
                    </div>
                  </>
                )}
            </>
          )}
        </motion.button>
      </AnimatePresence>
    </div>
  );
};

export default ImageUploader;
