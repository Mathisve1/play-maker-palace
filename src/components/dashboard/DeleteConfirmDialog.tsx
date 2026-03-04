import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  deleteLabel: string;
}

export const DeleteConfirmDialog = ({ open, onClose, onConfirm, loading, title, message, cancelLabel, deleteLabel }: DeleteConfirmDialogProps) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <h2 className="text-lg font-heading font-semibold text-foreground">{title}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">{cancelLabel}</button>
            <button onClick={onConfirm} disabled={loading} className="px-5 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : deleteLabel}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
