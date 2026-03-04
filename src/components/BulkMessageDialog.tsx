import { useState, useRef } from 'react';
import { X, Send, Users, Eye, ChevronDown, ChevronUp, Loader2, Info, Paperclip, FileText, Music, Image, Mic, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

interface Volunteer {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  taskId: string;
  taskTitle: string;
  clubOwnerId: string;
  volunteers: Volunteer[];
  onClose: () => void;
}

const templateVarsI18n: Record<string, { key: string; label: string; description: string }[]> = {
  nl: [
    { key: '{{naam}}', label: 'Naam', description: 'Volledige naam van de vrijwilliger' },
    { key: '{{email}}', label: 'E-mail', description: 'E-mailadres van de vrijwilliger' },
    { key: '{{taak}}', label: 'Taak', description: 'Titel van de taak' },
  ],
  fr: [
    { key: '{{naam}}', label: 'Nom', description: 'Nom complet du bénévole' },
    { key: '{{email}}', label: 'E-mail', description: 'Adresse e-mail du bénévole' },
    { key: '{{taak}}', label: 'Tâche', description: 'Titre de la tâche' },
  ],
  en: [
    { key: '{{naam}}', label: 'Name', description: 'Full name of the volunteer' },
    { key: '{{email}}', label: 'Email', description: 'Email address of the volunteer' },
    { key: '{{taak}}', label: 'Task', description: 'Title of the task' },
  ],
};

const BulkMessageDialog = ({ taskId, taskTitle, clubOwnerId, volunteers, onClose }: Props) => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const templateVars = templateVarsI18n[language] || templateVarsI18n.nl;
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<Set<string>>(
    new Set(volunteers.map(v => v.id))
  );
  const [showVars, setShowVars] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleVolunteer = (id: string) => {
    setSelectedVolunteers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedVolunteers.size === volunteers.length) {
      setSelectedVolunteers(new Set());
    } else {
      setSelectedVolunteers(new Set(volunteers.map(v => v.id)));
    }
  };

  const resolveTemplate = (template: string, volunteer: Volunteer): string => {
    return template
      .replace(/\{\{naam\}\}/gi, volunteer.full_name || 'Vrijwilliger')
      .replace(/\{\{email\}\}/gi, volunteer.email || '')
      .replace(/\{\{taak\}\}/gi, taskTitle);
  };

  const insertVariable = (varKey: string) => {
    setMessage(prev => prev + varKey);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error(t3('Bestand mag max 20MB zijn', 'Le fichier ne peut pas dépasser 20 Mo', 'File must be max 20MB')); return; }
    setAttachmentFile(file);
    if (file.type.startsWith('image/')) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const ext = mediaRecorder.mimeType.includes('webm') ? 'webm' : 'm4a';
        const file = new File([blob], `audiobericht.${ext}`, { type: mediaRecorder.mimeType });
        setAttachmentFile(file);
        setAttachmentPreview(null);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { toast.error(t3('Microfoon niet beschikbaar', 'Microphone non disponible', 'Microphone not available')); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getAttachmentCategory = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const uploadAttachment = async (file: File, userId: string): Promise<{ url: string; type: string; name: string } | null> => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-attachments').upload(path, file);
    if (error) { toast.error(t3('Upload mislukt', 'Échec du téléchargement', 'Upload failed')); return null; }
    const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path);
    return { url: publicUrl, type: getAttachmentCategory(file.type), name: file.name };
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachmentFile) || selectedVolunteers.size === 0) return;
    setSending(true);
    setSentCount(0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    let sent = 0;
    const selected = volunteers.filter(v => selectedVolunteers.has(v.id));

    // Upload attachment once, reuse URL for all
    let attachment: { url: string; type: string; name: string } | null = null;
    if (attachmentFile) {
      attachment = await uploadAttachment(attachmentFile, session.user.id);
      if (!attachment && !message.trim()) { setSending(false); return; }
    }

    for (const volunteer of selected) {
      try {
        // Find or create conversation
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .eq('volunteer_id', volunteer.id)
          .eq('club_owner_id', clubOwnerId)
          .maybeSingle();

        let conversationId = existing?.id;

        if (!conversationId) {
          const { data: created, error: createError } = await supabase
            .from('conversations')
            .insert({
              task_id: taskId,
              volunteer_id: volunteer.id,
              club_owner_id: clubOwnerId,
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Failed to create conversation for', volunteer.email, createError);
            continue;
          }
          conversationId = created.id;
        }

        // Send personalized message
        const personalizedMessage = resolveTemplate(message, volunteer);
        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: session.user.id,
          content: personalizedMessage || (attachment ? `📎 ${attachment.name}` : ''),
          ...(attachment && {
            attachment_url: attachment.url,
            attachment_type: attachment.type,
            attachment_name: attachment.name,
          }),
        });

        if (msgError) {
          console.error('Failed to send message to', volunteer.email, msgError);
          continue;
        }

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        sent++;
        setSentCount(sent);
      } catch (err) {
        console.error('Error sending to', volunteer.email, err);
      }
    }

    if (sent === selected.length) {
      toast.success(t3(`Bericht verstuurd naar ${sent} vrijwilliger${sent > 1 ? 's' : ''}!`, `Message envoyé à ${sent} bénévole${sent > 1 ? 's' : ''}!`, `Message sent to ${sent} volunteer${sent > 1 ? 's' : ''}!`));
    } else if (sent > 0) {
      toast.warning(t3(`${sent} van ${selected.length} berichten verstuurd.`, `${sent} sur ${selected.length} messages envoyés.`, `${sent} of ${selected.length} messages sent.`));
    } else {
      toast.error(t3('Geen berichten konden worden verstuurd.', 'Aucun message n\'a pu être envoyé.', 'No messages could be sent.'));
    }

    setSending(false);
    if (sent > 0) onClose();
  };

  const previewVolunteer = volunteers.find(v => selectedVolunteers.has(v.id)) || volunteers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-elevated p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            {t3('Bericht versturen', 'Envoyer un message', 'Send message')}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t3('Stuur een bericht naar vrijwilligers voor', 'Envoyer un message aux bénévoles pour', 'Send a message to volunteers for')} <span className="font-medium text-foreground">{taskTitle}</span>
        </p>

        {/* Volunteer selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {t3('Ontvangers', 'Destinataires', 'Recipients')} ({selectedVolunteers.size}/{volunteers.length})
            </h3>
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {selectedVolunteers.size === volunteers.length ? t3('Deselecteer alles', 'Tout désélectionner', 'Deselect all') : t3('Selecteer alles', 'Tout sélectionner', 'Select all')}
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {volunteers.map(v => (
              <label
                key={v.id}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedVolunteers.has(v.id)}
                  onChange={() => toggleVolunteer(v.id)}
                  className="rounded border-input text-primary focus:ring-ring w-4 h-4"
                />
                <span className="text-sm text-foreground truncate">{v.full_name || v.email || t3('Onbekend', 'Inconnu', 'Unknown')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Template variables info */}
        <div className="mb-3">
          <button
            onClick={() => setShowVars(!showVars)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            {t3('Dynamische variabelen', 'Variables dynamiques', 'Dynamic variables')}
            {showVars ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showVars && (
            <div className="mt-2 p-3 rounded-xl bg-muted/30 border border-border space-y-1.5">
              <p className="text-xs text-muted-foreground mb-2">
                {t3('Klik om in te voegen. Variabelen worden automatisch vervangen per vrijwilliger.', 'Cliquez pour insérer. Les variables seront remplacées automatiquement par bénévole.', 'Click to insert. Variables are automatically replaced per volunteer.')}
              </p>
              {templateVars.map(v => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{v.key}</code>
                  <span className="text-xs text-muted-foreground">{v.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="mb-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t3('Typ je bericht... Gebruik {{naam}} om automatisch de naam van elke vrijwilliger in te voegen.', 'Tapez votre message... Utilisez {{naam}} pour insérer automatiquement le nom de chaque bénévole.', 'Type your message... Use {{naam}} to automatically insert each volunteer\'s name.')}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={4}
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{message.length}/2000</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={t3('Bijlage toevoegen', 'Ajouter une pièce jointe', 'Add attachment')}
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              {recording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors"
                  title={t3('Stop opname', 'Arrêter l\'enregistrement', 'Stop recording')}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium animate-pulse">{formatRecordingTime(recordingTime)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={t3('Audio opnemen', 'Enregistrer un audio', 'Record audio')}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {attachmentFile && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-muted/50">
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="Preview" className="w-10 h-10 rounded object-cover" />
              ) : attachmentFile.type.startsWith('audio/') ? (
                <Music className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs text-foreground truncate flex-1">{attachmentFile.name}</span>
              <button onClick={clearAttachment} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Preview toggle */}
        {message.trim() && (
          <div className="mb-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Eye className="w-3.5 h-3.5" />
              {showPreview ? t3('Verberg voorbeeld', 'Masquer l\'aperçu', 'Hide preview') : t3('Voorbeeld bekijken', 'Voir l\'aperçu', 'Preview')}
            </button>
            {showPreview && previewVolunteer && (
              <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {t3('Voorbeeld voor:', 'Aperçu pour:', 'Preview for:')} {previewVolunteer.full_name || previewVolunteer.email}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {resolveTemplate(message, previewVolunteer)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Send button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {sending && `${sentCount}/${selectedVolunteers.size} verstuurd...`}
          </span>
          <button
            onClick={handleSend}
            disabled={sending || (!message.trim() && !attachmentFile) || selectedVolunteers.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Versturen...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Verstuur naar {selectedVolunteers.size} vrijwilliger{selectedVolunteers.size !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkMessageDialog;
