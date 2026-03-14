import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X, Loader2 } from 'lucide-react';
import ZoneTreeEditor from '@/components/ZoneTreeEditor';

interface TaskZoneDialogProps {
  taskId: string;
  taskTitle: string;
  language: string;
  open: boolean;
  onClose: () => void;
}

const TaskZoneDialog = ({ taskId, taskTitle, language, open, onClose }: TaskZoneDialogProps) => {
  const nl = language === 'nl';
  const [zoneSignupMode, setZoneSignupMode] = useState('club_only');
  const [zoneVisibleDepth, setZoneVisibleDepth] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase.from('tasks').select('zone_signup_mode, zone_visible_depth').eq('id', taskId).maybeSingle();
      if (data) {
        setZoneSignupMode((data as any).zone_signup_mode || 'club_only');
        setZoneVisibleDepth((data as any).zone_visible_depth);
      }
      setLoaded(true);
    };
    load();
  }, [open, taskId]);

  const handleSignupModeChange = async (mode: string) => {
    setZoneSignupMode(mode);
    await supabase.from('tasks').update({ zone_signup_mode: mode }).eq('id', taskId);
  };

  const handleVisibleDepthChange = async (depth: number | null) => {
    setZoneVisibleDepth(depth);
    await supabase.from('tasks').update({ zone_visible_depth: depth }).eq('id', taskId);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> {nl ? 'Zone structuur' : 'Zone structure'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{taskTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {!loaded ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <ZoneTreeEditor
              taskId={taskId}
              language={language}
              zoneSignupMode={zoneSignupMode}
              zoneVisibleDepth={zoneVisibleDepth}
              onSignupModeChange={handleSignupModeChange}
              onVisibleDepthChange={handleVisibleDepthChange}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TaskZoneDialog;
