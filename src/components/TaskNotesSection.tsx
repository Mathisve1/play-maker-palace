import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Camera, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Language } from '@/i18n/translations';

interface TaskNote {
  id: string;
  content: string | null;
  photo_url: string | null;
  created_at: string;
  volunteer_id: string;
}

interface TaskNotesSectionProps {
  taskId: string;
  userId: string;
  language: Language;
  isAssigned: boolean;
}

const labels = {
  nl: { title: 'Notities & foto\'s', placeholder: 'Voeg een notitie toe...', send: 'Verstuur', addPhoto: 'Foto toevoegen', noNotes: 'Nog geen notities.', delete: 'Verwijderen' },
  fr: { title: 'Notes & photos', placeholder: 'Ajoutez une note...', send: 'Envoyer', addPhoto: 'Ajouter une photo', noNotes: 'Pas encore de notes.', delete: 'Supprimer' },
  en: { title: 'Notes & photos', placeholder: 'Add a note...', send: 'Send', addPhoto: 'Add photo', noNotes: 'No notes yet.', delete: 'Delete' },
};

const TaskNotesSection = ({ taskId, userId, language, isAssigned }: TaskNotesSectionProps) => {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const l = labels[language];

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('task_notes')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (data) setNotes(data);
    };
    load();
  }, [taskId]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Max 10MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!content.trim() && !photoFile) return;
    setSending(true);

    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split('.').pop() || 'jpg';
      const path = `${userId}/${taskId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('task-notes-photos').upload(path, photoFile);
      if (upErr) { toast.error(upErr.message); setSending(false); return; }
      const { data: pub } = supabase.storage.from('task-notes-photos').getPublicUrl(path);
      photoUrl = pub.publicUrl;
    }

    const { data, error } = await supabase.from('task_notes').insert({
      task_id: taskId,
      volunteer_id: userId,
      content: content.trim() || null,
      photo_url: photoUrl,
    }).select('*').single();

    if (error) {
      toast.error(error.message);
    } else {
      setNotes(prev => [data, ...prev]);
      setContent('');
      setPhotoFile(null);
      setPhotoPreview(null);
    }
    setSending(false);
  };

  const handleDelete = async (noteId: string) => {
    const { error } = await supabase.from('task_notes').delete().eq('id', noteId);
    if (!error) setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  if (!isAssigned && notes.length === 0) return null;

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <h3 className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-primary" />
        {l.title}
      </h3>

      {/* Input area - only for assigned volunteers */}
      {isAssigned && (
        <div className="bg-card rounded-2xl border border-border p-3 space-y-3">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={l.placeholder}
            className="min-h-[60px] border-0 bg-transparent resize-none focus-visible:ring-0 p-0"
          />
          {photoPreview && (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden">
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Camera className="w-4 h-4" />
              {l.addPhoto}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
            </label>
            <Button size="sm" onClick={handleSubmit} disabled={sending || (!content.trim() && !photoFile)}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {l.send}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <AnimatePresence>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{l.noNotes}</p>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-muted/30 rounded-xl p-3 space-y-2"
              >
                {note.content && <p className="text-sm text-foreground">{note.content}</p>}
                {note.photo_url && (
                  <img src={note.photo_url} alt="" className="rounded-lg max-h-48 object-cover" />
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(note.created_at).toLocaleString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB')}</span>
                  {note.volunteer_id === userId && (
                    <button onClick={() => handleDelete(note.id)} className="text-destructive hover:underline flex items-center gap-0.5">
                      <Trash2 className="w-3 h-3" /> {l.delete}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

export default TaskNotesSection;
