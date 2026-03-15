import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Users, Eye, ChevronDown, ChevronUp, Loader2, Info, Paperclip, FileText, Music, Mic, Square, Bell, MessageCircle, CheckCircle, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { sendPush } from '@/lib/sendPush';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

interface Volunteer {
  id: string;
  full_name: string | null;
  email: string | null;
}

type AudienceMode = 'all' | 'event' | 'partner' | 'role' | 'manual';
type Channel = 'push' | 'inapp' | 'both';

interface Props {
  clubId: string;
  clubOwnerId: string;
  onClose: () => void;
  preselectedEventId?: string | null;
  preselectedTaskId?: string | null;
  preselectedTaskTitle?: string | null;
  preselectedVolunteers?: Volunteer[];
}

const templateVars = [
  { key: '{{naam}}', nl: 'Naam vrijwilliger', fr: 'Nom du bénévole', en: 'Volunteer name' },
  { key: '{{taak}}', nl: 'Taak', fr: 'Tâche', en: 'Task' },
  { key: '{{datum}}', nl: 'Datum', fr: 'Date', en: 'Date' },
  { key: '{{locatie}}', nl: 'Locatie', fr: 'Lieu', en: 'Location' },
];

const BulkMessageDialog = ({
  clubId, clubOwnerId, onClose,
  preselectedEventId, preselectedTaskId, preselectedTaskTitle, preselectedVolunteers,
}: Props) => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  // Step management
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Audience
  const [audienceMode, setAudienceMode] = useState<AudienceMode>(preselectedVolunteers ? 'manual' : preselectedEventId ? 'event' : 'all');
  const [volunteers, setVolunteers] = useState<Volunteer[]>(preselectedVolunteers || []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preselectedVolunteers?.map(v => v.id) || []));
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Event/task selection
  const [events, setEvents] = useState<{ id: string; title: string; event_date: string | null }[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(preselectedEventId ? new Set([preselectedEventId]) : new Set());
  const [tasks, setTasks] = useState<{ id: string; title: string; task_date: string | null }[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(preselectedTaskId ? new Set([preselectedTaskId]) : new Set());

  // Partner selection
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());

  // Role selection
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  // Step 2: Message
  const [message, setMessage] = useState('');
  const [showVars, setShowVars] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Step 3: Channel
  const [channel, setChannel] = useState<Channel>('both');

  // Step 4: Send
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // Load events, partners, tasks on mount
  useEffect(() => {
    if (!clubId) return;
    Promise.all([
      supabase.from('events').select('id, title, event_date').eq('club_id', clubId).order('event_date', { ascending: false }).limit(50),
      supabase.from('external_partners').select('id, name').eq('club_id', clubId),
      supabase.from('tasks').select('id, title, task_date').eq('club_id', clubId).eq('status', 'open').order('task_date', { ascending: false }).limit(100),
    ]).then(([evRes, partRes, taskRes]) => {
      setEvents(evRes.data || []);
      setPartners(partRes.data || []);
      setTasks(taskRes.data || []);
      // Extract unique roles from club_memberships
      supabase.from('club_memberships').select('club_role').eq('club_id', clubId).then(({ data }) => {
        const uniqueRoles = [...new Set((data || []).map(d => d.club_role).filter(Boolean))];
        setRoles(uniqueRoles);
      });
    });
  }, [clubId]);

  // Load volunteers based on audience selection
  const loadVolunteers = useCallback(async () => {
    if (preselectedVolunteers && audienceMode === 'manual') return;
    setLoadingVolunteers(true);
    let volIds: string[] = [];

    if (audienceMode === 'all') {
      const { data } = await supabase.from('club_memberships').select('volunteer_id').eq('club_id', clubId).eq('status', 'actief');
      volIds = (data || []).map(d => d.volunteer_id);
    } else if (audienceMode === 'event') {
      // Get tasks for selected events, then get signups
      const evIds = [...selectedEventIds];
      if (evIds.length > 0) {
        const { data: eventTasks } = await supabase.from('tasks').select('id').eq('club_id', clubId).in('event_id', evIds);
        const taskIds = [...selectedTaskIds, ...(eventTasks || []).map(t => t.id)];
        if (taskIds.length > 0) {
          const { data: signups } = await supabase.from('task_signups').select('volunteer_id').in('task_id', taskIds);
          volIds = [...new Set((signups || []).map(s => s.volunteer_id))];
        }
      } else if (selectedTaskIds.size > 0) {
        const { data: signups } = await supabase.from('task_signups').select('volunteer_id').in('task_id', [...selectedTaskIds]);
        volIds = [...new Set((signups || []).map(s => s.volunteer_id))];
      }
    } else if (audienceMode === 'partner') {
      const pIds = [...selectedPartnerIds];
      if (pIds.length > 0) {
        // Get partner members via partner_event_access or club_memberships with partner link
        const { data } = await supabase.from('club_memberships').select('volunteer_id').eq('club_id', clubId).eq('status', 'actief');
        volIds = (data || []).map(d => d.volunteer_id);
        // Filter by partner assignment - get tasks assigned to partners
        const { data: pAccess } = await supabase.from('partner_event_access').select('event_id').in('partner_id', pIds);
        if (pAccess && pAccess.length > 0) {
          const evIds = pAccess.map(p => p.event_id);
          const { data: eTasks } = await supabase.from('tasks').select('id').in('event_id', evIds);
          if (eTasks && eTasks.length > 0) {
            const { data: signups } = await supabase.from('task_signups').select('volunteer_id').in('task_id', eTasks.map(t => t.id));
            volIds = [...new Set((signups || []).map(s => s.volunteer_id))];
          }
        }
      }
    } else if (audienceMode === 'role') {
      const r = [...selectedRoles];
      if (r.length > 0) {
        const { data } = await supabase.from('club_memberships').select('volunteer_id').eq('club_id', clubId).eq('status', 'actief').in('club_role', r);
        volIds = (data || []).map(d => d.volunteer_id);
      }
    }

    if (volIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', volIds);
      setVolunteers(profiles || []);
      setSelectedIds(new Set((profiles || []).map(p => p.id)));
    } else if (audienceMode !== 'manual') {
      setVolunteers([]);
      setSelectedIds(new Set());
    }
    setLoadingVolunteers(false);
  }, [clubId, audienceMode, selectedEventIds, selectedTaskIds, selectedPartnerIds, selectedRoles, preselectedVolunteers]);

  useEffect(() => { loadVolunteers(); }, [loadVolunteers]);

  const toggleVolunteer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resolveTemplate = (template: string, vol: Volunteer, taskTitle?: string): string => {
    return template
      .replace(/\{\{naam\}\}/gi, vol.full_name || 'Vrijwilliger')
      .replace(/\{\{taak\}\}/gi, taskTitle || preselectedTaskTitle || '')
      .replace(/\{\{datum\}\}/gi, new Date().toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB'))
      .replace(/\{\{locatie\}\}/gi, '');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Max 20MB'); return; }
    setAttachmentFile(file);
    setAttachmentPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      audioChunksRef.current = [];
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        const ext = mr.mimeType.includes('webm') ? 'webm' : 'm4a';
        setAttachmentFile(new File([blob], `audio.${ext}`, { type: mr.mimeType }));
        setAttachmentPreview(null);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { toast.error(t3('Microfoon niet beschikbaar', 'Micro non disponible', 'Mic unavailable')); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const uploadAttachment = async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    const ext = file.name.split('.').pop();
    const path = `${clubOwnerId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-attachments').upload(path, file);
    if (error) { toast.error('Upload failed'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path);
    const cat = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'document';
    return { url: publicUrl, type: cat, name: file.name };
  };

  const handleSend = async () => {
    if (!message.trim() && !attachmentFile) return;
    const selected = volunteers.filter(v => selectedIds.has(v.id));
    if (selected.length === 0) return;
    setSending(true);
    setSentCount(0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    let attachment: { url: string; type: string; name: string } | null = null;
    if (attachmentFile) {
      attachment = await uploadAttachment(attachmentFile);
    }

    let sent = 0;
    const taskId = preselectedTaskId || (selectedTaskIds.size === 1 ? [...selectedTaskIds][0] : null);

    for (const vol of selected) {
      try {
        const personalizedMsg = resolveTemplate(message, vol);

        // In-app notification
        if (channel === 'inapp' || channel === 'both') {
          await supabase.from('notifications').insert({
            user_id: vol.id,
            title: t3('Bericht van club', 'Message du club', 'Message from club'),
            message: personalizedMsg,
            type: 'message',
            metadata: { task_id: taskId, action: 'bulk_message' },
          });
        }

        // Push notification
        if (channel === 'push' || channel === 'both') {
          await sendPush({
            userId: vol.id,
            title: t3('Nieuw bericht', 'Nouveau message', 'New message'),
            message: personalizedMsg.slice(0, 200),
            url: taskId ? `/task/${taskId}` : '/dashboard',
            type: 'bulk_message',
          });
        }

        // Also send as chat message if we have a taskId
        if (taskId) {
          const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .eq('task_id', taskId)
            .eq('volunteer_id', vol.id)
            .eq('club_owner_id', clubOwnerId)
            .maybeSingle();

          let convId = existing?.id;
          if (!convId) {
            const { data: created } = await supabase
              .from('conversations')
              .insert({ task_id: taskId, volunteer_id: vol.id, club_owner_id: clubOwnerId })
              .select('id')
              .single();
            convId = created?.id;
          }

          if (convId) {
            await supabase.from('messages').insert({
              conversation_id: convId,
              sender_id: session.user.id,
              content: personalizedMsg || (attachment ? `📎 ${attachment.name}` : ''),
              ...(attachment && { attachment_url: attachment.url, attachment_type: attachment.type, attachment_name: attachment.name }),
            });
            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
          }
        }

        sent++;
        setSentCount(sent);
      } catch (err) {
        console.error('Send error', vol.id, err);
      }
    }

    toast.success(t3(`Bericht verstuurd naar ${sent} vrijwilliger${sent > 1 ? 's' : ''}`, `Message envoyé à ${sent} bénévole${sent > 1 ? 's' : ''}`, `Message sent to ${sent} volunteer${sent > 1 ? 's' : ''}`));
    setSending(false);
    if (sent > 0) onClose();
  };

  const filteredVolunteers = searchQuery
    ? volunteers.filter(v => (v.full_name || v.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : volunteers;

  const previewVol = volunteers.find(v => selectedIds.has(v.id)) || volunteers[0];
  const canGoNext = () => {
    if (step === 1) return selectedIds.size > 0;
    if (step === 2) return message.trim().length > 0 || !!attachmentFile;
    if (step === 3) return true;
    return true;
  };

  const audienceModes: { mode: AudienceMode; icon: typeof Users; nl: string; fr: string; en: string }[] = [
    { mode: 'all', icon: Users, nl: 'Alle vrijwilligers', fr: 'Tous les bénévoles', en: 'All volunteers' },
    { mode: 'event', icon: FileText, nl: 'Per evenement/taak', fr: 'Par événement/tâche', en: 'By event/task' },
    { mode: 'partner', icon: Users, nl: 'Per partner', fr: 'Par partenaire', en: 'By partner' },
    { mode: 'role', icon: Users, nl: 'Per rol', fr: 'Par rôle', en: 'By role' },
    { mode: 'manual', icon: CheckCircle, nl: 'Handmatige selectie', fr: 'Sélection manuelle', en: 'Manual selection' },
  ];

  const channelOptions: { ch: Channel; icon: typeof Bell; nl: string; fr: string; en: string }[] = [
    { ch: 'push', icon: Bell, nl: 'Push notificatie', fr: 'Notification push', en: 'Push notification' },
    { ch: 'inapp', icon: MessageCircle, nl: 'In-app bericht', fr: 'Message in-app', en: 'In-app message' },
    { ch: 'both', icon: Send, nl: 'Push + In-app', fr: 'Push + In-app', en: 'Push + In-app' },
  ];

  const stepLabels = [
    t3('Doelgroep', 'Audience', 'Audience'),
    t3('Bericht', 'Message', 'Message'),
    t3('Kanaal', 'Canal', 'Channel'),
    t3('Verstuur', 'Envoyer', 'Send'),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl shadow-elevated w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {t3('Communicatiecentrum', 'Centre de communication', 'Communication Center')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{stepLabels[step - 1]} · {t3('Stap', 'Étape', 'Step')} {step}/{totalSteps}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3 shrink-0">
          <Progress value={(step / totalSteps) * 100} className="h-1.5" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* STEP 1: Audience */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Audience mode buttons */}
              <div className="grid grid-cols-2 gap-2">
                {audienceModes.map(am => (
                  <button
                    key={am.mode}
                    onClick={() => setAudienceMode(am.mode)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      audienceMode === am.mode
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <am.icon className={`w-4 h-4 mb-1 ${audienceMode === am.mode ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-medium text-foreground">{am[language]}</p>
                  </button>
                ))}
              </div>

              {/* Event/task multiselect */}
              {audienceMode === 'event' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t3('Evenementen', 'Événements', 'Events')}</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                      {events.map(ev => (
                        <label key={ev.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 cursor-pointer">
                          <Checkbox
                            checked={selectedEventIds.has(ev.id)}
                            onCheckedChange={() => {
                              setSelectedEventIds(prev => {
                                const n = new Set(prev);
                                n.has(ev.id) ? n.delete(ev.id) : n.add(ev.id);
                                return n;
                              });
                            }}
                          />
                          <span className="text-sm text-foreground truncate">{ev.title}</span>
                          {ev.event_date && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{new Date(ev.event_date).toLocaleDateString()}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t3('Taken', 'Tâches', 'Tasks')}</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                      {tasks.map(tk => (
                        <label key={tk.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 cursor-pointer">
                          <Checkbox
                            checked={selectedTaskIds.has(tk.id)}
                            onCheckedChange={() => {
                              setSelectedTaskIds(prev => {
                                const n = new Set(prev);
                                n.has(tk.id) ? n.delete(tk.id) : n.add(tk.id);
                                return n;
                              });
                            }}
                          />
                          <span className="text-sm text-foreground truncate">{tk.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Partner select */}
              {audienceMode === 'partner' && partners.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                  {partners.map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 cursor-pointer">
                      <Checkbox
                        checked={selectedPartnerIds.has(p.id)}
                        onCheckedChange={() => {
                          setSelectedPartnerIds(prev => {
                            const n = new Set(prev);
                            n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                            return n;
                          });
                        }}
                      />
                      <span className="text-sm text-foreground">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Role select */}
              {audienceMode === 'role' && roles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {roles.map(r => (
                    <button
                      key={r}
                      onClick={() => {
                        setSelectedRoles(prev => {
                          const n = new Set(prev);
                          n.has(r) ? n.delete(r) : n.add(r);
                          return n;
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedRoles.has(r) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}

              {/* Volunteer list with search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    {selectedIds.size} {t3('vrijwilligers geselecteerd', 'bénévoles sélectionnés', 'volunteers selected')}
                  </p>
                  {volunteers.length > 0 && (
                    <button
                      onClick={() => setSelectedIds(selectedIds.size === volunteers.length ? new Set() : new Set(volunteers.map(v => v.id)))}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedIds.size === volunteers.length ? t3('Deselecteer', 'Désélectionner', 'Deselect') : t3('Selecteer alles', 'Tout', 'Select all')}
                    </button>
                  )}
                </div>

                {loadingVolunteers ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    {volunteers.length > 10 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder={t3('Zoek...', 'Rechercher...', 'Search...')}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    )}
                    <div className="max-h-40 overflow-y-auto space-y-0.5 border border-border rounded-xl p-2">
                      {filteredVolunteers.map(v => (
                        <label key={v.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 cursor-pointer min-h-[44px]">
                          <Checkbox checked={selectedIds.has(v.id)} onCheckedChange={() => toggleVolunteer(v.id)} />
                          <span className="text-sm text-foreground truncate">{v.full_name || v.email || '?'}</span>
                        </label>
                      ))}
                      {filteredVolunteers.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">{t3('Geen vrijwilligers', 'Aucun bénévole', 'No volunteers')}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Message */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Variables */}
              <button onClick={() => setShowVars(!showVars)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Info className="w-3.5 h-3.5" />
                {t3('Variabelen', 'Variables', 'Variables')}
                {showVars ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showVars && (
                <div className="flex flex-wrap gap-1.5">
                  {templateVars.map(v => (
                    <button
                      key={v.key}
                      onClick={() => setMessage(prev => prev + v.key)}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t3('Typ je bericht... Gebruik {{naam}} voor personalisatie.', 'Tapez votre message...', 'Type your message...')}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[120px]"
                rows={5}
                maxLength={2000}
              />

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">{message.length}/2000</span>
                <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="text-muted-foreground hover:text-foreground"><Paperclip className="w-4 h-4" /></button>
                {recording ? (
                  <button onClick={stopRecording} className="flex items-center gap-1 text-destructive">
                    <Square className="w-4 h-4" />
                    <span className="text-xs animate-pulse">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                  </button>
                ) : (
                  <button onClick={startRecording} className="text-muted-foreground hover:text-foreground"><Mic className="w-4 h-4" /></button>
                )}
              </div>

              {attachmentFile && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  {attachmentPreview ? <img src={attachmentPreview} alt="" className="w-10 h-10 rounded object-cover" /> :
                   attachmentFile.type.startsWith('audio/') ? <Music className="w-4 h-4 text-muted-foreground" /> :
                   <FileText className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-xs text-foreground truncate flex-1">{attachmentFile.name}</span>
                  <button onClick={() => { setAttachmentFile(null); setAttachmentPreview(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Channel */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t3('Kies hoe je het bericht verstuurt:', 'Choisissez le canal:', 'Choose how to send:')}</p>
              {channelOptions.map(co => (
                <button
                  key={co.ch}
                  onClick={() => setChannel(co.ch)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    channel === co.ch ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <co.icon className={`w-5 h-5 ${channel === co.ch ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium text-foreground">{co[language]}</span>
                </button>
              ))}
            </div>
          )}

          {/* STEP 4: Preview & Send */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{t3('Ontvangers', 'Destinataires', 'Recipients')}</p>
                  <p className="text-lg font-heading font-bold text-foreground">{selectedIds.size}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{t3('Kanaal', 'Canal', 'Channel')}</p>
                  <p className="text-sm font-semibold text-foreground">{channelOptions.find(c => c.ch === channel)?.[language]}</p>
                </div>
              </div>

              {previewVol && message.trim() && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    {t3('Voorbeeld voor:', 'Aperçu pour:', 'Preview for:')} {previewVol.full_name || previewVol.email}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {resolveTemplate(message, previewVol)}
                  </p>
                </div>
              )}

              {sending && (
                <div className="space-y-2">
                  <Progress value={(sentCount / selectedIds.size) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">{sentCount}/{selectedIds.size} {t3('verstuurd...', 'envoyé...', 'sent...')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="p-4 border-t border-border flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="rounded-xl"
          >
            {step > 1 ? <><ChevronLeft className="w-4 h-4 mr-1" />{t3('Vorige', 'Précédent', 'Previous')}</> : t3('Annuleren', 'Annuler', 'Cancel')}
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="rounded-xl"
            >
              {t3('Volgende', 'Suivant', 'Next')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0 || (!message.trim() && !attachmentFile)}
              className="rounded-xl"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" />{t3('Versturen...', 'Envoi...', 'Sending...')}</>
              ) : (
                <><Send className="w-4 h-4 mr-1" />{t3(`Verstuur naar ${selectedIds.size}`, `Envoyer à ${selectedIds.size}`, `Send to ${selectedIds.size}`)}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkMessageDialog;
