import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Send, MessageCircle, Check, CheckCheck, Paperclip, X, FileText, Music, Loader2, Mic, Square, Users } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { sendPush } from '@/lib/sendPush';
import DashboardLayout from '@/components/DashboardLayout';
import { ChatSkeleton } from '@/components/dashboard/DashboardSkeleton';
import ClubOwnerSidebar from '@/components/ClubOwnerSidebar';
import VolunteerSidebar from '@/components/VolunteerSidebar';
import EventGroupChat from '@/components/EventGroupChat';

interface Conversation {
  id: string;
  task_id: string;
  volunteer_id: string;
  club_owner_id: string;
  updated_at: string;
  tasks?: { title: string; clubs?: { name: string } | null } | null;
  unread_count?: number;
}

interface GroupChatEntry {
  id: string; // event id
  title: string;
  club_name: string;
  event_date: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

const chatLabels = {
  nl: {
    title: 'Berichten',
    noConversations: 'Je hebt nog geen gesprekken.',
    startFromTask: 'Start een gesprek vanuit een taakpagina.',
    typeMessage: 'Typ een bericht...',
    send: 'Versturen',
    back: 'Terug',
    you: 'Jij',
    newConversation: 'Nieuw gesprek',
    loading: 'Laden...',
  },
  fr: {
    title: 'Messages',
    noConversations: 'Vous n\'avez pas encore de conversations.',
    startFromTask: 'Démarrez une conversation depuis une page de tâche.',
    typeMessage: 'Tapez un message...',
    send: 'Envoyer',
    back: 'Retour',
    you: 'Vous',
    newConversation: 'Nouvelle conversation',
    loading: 'Chargement...',
  },
  en: {
    title: 'Messages',
    noConversations: 'You don\'t have any conversations yet.',
    startFromTask: 'Start a conversation from a task page.',
    typeMessage: 'Type a message...',
    send: 'Send',
    back: 'Back',
    you: 'You',
    newConversation: 'New conversation',
    loading: 'Loading...',
  },
};

const Chat = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = chatLabels[language];

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChatEntry[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(conversationId || null);
  const [activeGroupChat, setActiveGroupChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherName, setOtherName] = useState('');
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUserScrolledRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { userId: contextUserId, isOwner } = useClubContext();

  useEffect(() => {
    const init = async () => {
      if (!contextUserId) return;
      setUserId(contextUserId);

      const taskId = searchParams.get('taskId');
      const clubOwnerId = searchParams.get('clubOwnerId');
      const volunteerId = searchParams.get('volunteerId');

      // Club member initiating chat with a specific volunteer
      if (taskId && volunteerId) {
        const targetVolunteerId = volunteerId;
        const targetClubOwnerId = clubOwnerId || contextUserId;

        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .eq('volunteer_id', targetVolunteerId)
          .maybeSingle();

        if (existing) {
          setActiveConversation(existing.id);
        } else {
          const { data: created, error } = await supabase
            .from('conversations')
            .insert({
              task_id: taskId,
              volunteer_id: targetVolunteerId,
              club_owner_id: targetClubOwnerId,
            })
            .select('id')
            .single();
          if (error) toast.error(error.message);
          else if (created) setActiveConversation(created.id);
        }
      } else if (taskId && clubOwnerId) {
        // Volunteer initiating chat
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .eq('volunteer_id', contextUserId)
          .maybeSingle();

        if (existing) {
          setActiveConversation(existing.id);
        } else {
          const { data: created, error } = await supabase
            .from('conversations')
            .insert({
              task_id: taskId,
              volunteer_id: contextUserId,
              club_owner_id: clubOwnerId,
            })
            .select('id')
            .single();
          if (error) toast.error(error.message);
          else if (created) setActiveConversation(created.id);
        }
      }

      // Load all conversations
      const { data: convos } = await supabase
        .from('conversations')
        .select('*, tasks(title, clubs(name))')
        .order('updated_at', { ascending: false });

      const convoList = (convos as unknown as Conversation[]) || [];

      // Fetch unread counts and participant names
      if (convoList.length > 0) {
        const convoIds = convoList.map(c => c.id);
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convoIds)
          .eq('read', false)
          .neq('sender_id', contextUserId);

        const unreadCounts: Record<string, number> = {};
        unreadMessages?.forEach(m => {
          unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1;
        });

        convoList.forEach(c => {
          c.unread_count = unreadCounts[c.id] || 0;
        });

        // Fetch participant names
        const participantIds = new Set<string>();
        convoList.forEach(c => {
          participantIds.add(c.volunteer_id);
          participantIds.add(c.club_owner_id);
        });
        participantIds.delete(contextUserId);

        if (participantIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', Array.from(participantIds));
          
          const nameMap: Record<string, string> = {};
          profiles?.forEach(p => {
            nameMap[p.id] = p.full_name || p.email || 'Onbekend';
          });
          setParticipantNames(nameMap);
        }
      }

      setConversations(convoList);

      // Fetch event group chats the user participates in
      // 1. Events where user has task signups
      const { data: userSignups } = await supabase
        .from('task_signups' as any)
        .select('tasks!inner(event_id)')
        .eq('volunteer_id', contextUserId);
      
      // 2. Events from clubs user owns/is member of
      const { data: userClubMembers } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', contextUserId);
      
      const clubIds = (userClubMembers || []).map((m: any) => m.club_id);
      
      // Collect event IDs from signups
      const signupEventIds = new Set<string>();
      (userSignups || []).forEach((s: any) => {
        if (s.tasks?.event_id) signupEventIds.add(s.tasks.event_id);
      });
      
      // Fetch events from user's clubs + signup events
      let eventGroupChats: GroupChatEntry[] = [];
      
      if (clubIds.length > 0 || signupEventIds.size > 0) {
        let query = supabase
          .from('events')
          .select('id, title, event_date, club_id, clubs(name)')
          .order('event_date', { ascending: false })
          .limit(20);
        
        if (clubIds.length > 0 && signupEventIds.size > 0) {
          query = query.or(`club_id.in.(${clubIds.join(',')}),id.in.(${Array.from(signupEventIds).join(',')})`);
        } else if (clubIds.length > 0) {
          query = query.in('club_id', clubIds);
        } else {
          query = query.in('id', Array.from(signupEventIds));
        }
        
        const { data: events } = await query;
        
        if (events) {
          // Get latest message timestamp for each event
          const eventIds = events.map((e: any) => e.id);
          const { data: latestMsgs } = await supabase
            .from('event_chats')
            .select('event_id, created_at')
            .in('event_id', eventIds)
            .order('created_at', { ascending: false });
          
          const latestMap: Record<string, string> = {};
          (latestMsgs || []).forEach((m: any) => {
            if (!latestMap[m.event_id]) latestMap[m.event_id] = m.created_at;
          });
          
          eventGroupChats = events.map((e: any) => ({
            id: e.id,
            title: e.title,
            club_name: e.clubs?.name || '',
            event_date: e.event_date,
            last_message_at: latestMap[e.id] || null,
          }));
        }
      }
      
      setGroupChats(eventGroupChats);
      setLoading(false);
    };
    init();
  }, [contextUserId, searchParams]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation || !userId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversation)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) || []);

      // Get other participant name
      const convo = conversations.find(c => c.id === activeConversation);
      if (convo) {
        const otherId = convo.volunteer_id === userId ? convo.club_owner_id : convo.volunteer_id;
        const name = participantNames[otherId];
        if (name) {
          setOtherName(name);
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', otherId)
            .maybeSingle();
          setOtherName(profile?.full_name || profile?.email || '');
        }
      }

      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', activeConversation)
        .neq('sender_id', userId);

      // Update unread count locally
      setConversations(prev => prev.map(c =>
        c.id === activeConversation ? { ...c, unread_count: 0 } : c
      ));
    };
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversation}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as Message;
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id !== userId) {
            supabase.from('messages').update({ read: true }).eq('id', msg.id);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, userId, conversations, participantNames]);

  // Auto-scroll only when user is at the bottom
  useEffect(() => {
    if (!isUserScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserScrolledRef.current = distanceFromBottom > 100;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error(language === 'nl' ? 'Bestand mag max 20MB zijn' : language === 'fr' ? 'Le fichier ne peut pas dépasser 20 Mo' : 'File must be max 20MB'); return; }
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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

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
    } catch {
      toast.error(language === 'nl' ? 'Microfoon niet beschikbaar' : language === 'fr' ? 'Microphone non disponible' : 'Microphone not available');
    }
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

  const uploadAttachment = async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    if (!userId) return null;
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-attachments').upload(path, file);
    if (error) { toast.error(language === 'nl' ? 'Upload mislukt' : language === 'fr' ? 'Échec du téléchargement' : 'Upload failed'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path);
    return { url: publicUrl, type: getAttachmentCategory(file.type), name: file.name };
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachmentFile) || !activeConversation || !userId) return;
    isUserScrolledRef.current = false;
    setSending(true);

    let attachment: { url: string; type: string; name: string } | null = null;
    if (attachmentFile) {
      setUploading(true);
      attachment = await uploadAttachment(attachmentFile);
      setUploading(false);
      if (!attachment && !newMessage.trim()) { setSending(false); return; }
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: userId,
      content: newMessage.trim() || (attachment ? `📎 ${attachment.name}` : ''),
      ...(attachment && {
        attachment_url: attachment.url,
        attachment_type: attachment.type,
        attachment_name: attachment.name,
      }),
    });
    if (error) toast.error(error.message);
    else {
      setNewMessage('');
      clearAttachment();
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
      // Push notification to recipient
      const convo = conversations.find(c => c.id === activeConversation);
      if (convo) {
        const recipientId = convo.volunteer_id === userId ? convo.club_owner_id : convo.volunteer_id;
        const senderName = participantNames[userId] || 'Iemand';
        sendPush({ userId: recipientId, title: '💬 Nieuw bericht', message: `${senderName}: ${(newMessage.trim() || attachment?.name || '').slice(0, 80)}`, url: `/chat?taskId=${convo.task_id}`, type: 'chat_message' });
      }
    }
    setSending(false);
  };

  const getConversationDisplayName = (convo: Conversation): string => {
    const otherId = convo.volunteer_id === userId ? convo.club_owner_id : convo.volunteer_id;
    return participantNames[otherId] || 'Onbekend';
  };

  const { profile: contextProfile } = useClubContext();
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  // Determine sidebar based on role
  const sidebarEl = isOwner ? (
    <ClubOwnerSidebar
      profile={contextProfile ? { full_name: contextProfile.full_name, email: contextProfile.email, avatar_url: contextProfile.avatar_url } : null}
      onLogout={handleLogout}
    />
  ) : (
    <VolunteerSidebar
      activeTab="dashboard"
      setActiveTab={() => navigate('/dashboard')}
      profile={contextProfile ? { full_name: contextProfile.full_name, email: contextProfile.email, avatar_url: contextProfile.avatar_url } : null}
      language={language}
      onLogout={handleLogout}
      onOpenProfile={() => {}}
      counts={{}}
    />
  );

  if (loading) {
    return (
      <DashboardLayout sidebar={sidebarEl}>
        <ChatSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={sidebarEl}>
      <div className="flex flex-col md:flex-row overflow-hidden -m-4 md:-m-6 lg:-m-8 h-[calc(100vh-3.5rem)]">
        {/* Conversation list */}
        <div className={`${(activeConversation || activeGroupChat) ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border bg-card overflow-y-auto`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-semibold text-foreground">{l.title}</h2>
          </div>

          {/* Group Chats Section */}
          {groupChats.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {language === 'nl' ? 'Groepschats' : language === 'fr' ? 'Chats de groupe' : 'Group Chats'}
                </p>
              </div>
              {groupChats.map(gc => (
                <button
                  key={`gc-${gc.id}`}
                  onClick={() => { setActiveGroupChat(gc.id); setActiveConversation(null); }}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-muted/50 ${
                    activeGroupChat === gc.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm truncate">{gc.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{gc.club_name}</p>
                    </div>
                  </div>
                  {gc.last_message_at && (
                    <p className="text-[11px] text-muted-foreground mt-1 ml-9">
                      {new Date(gc.last_message_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                </button>
              ))}
            </>
          )}

          {/* 1-on-1 Conversations Section */}
          {conversations.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                {language === 'nl' ? 'Privéberichten' : language === 'fr' ? 'Messages privés' : 'Direct Messages'}
              </p>
            </div>
          )}
          {conversations.length === 0 && groupChats.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">{l.noConversations}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{l.startFromTask}</p>
            </div>
          ) : (
            conversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => { setActiveConversation(convo.id); setActiveGroupChat(null); }}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-muted/50 ${
                  activeConversation === convo.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground text-sm truncate">
                    {getConversationDisplayName(convo)}
                  </p>
                  {(convo.unread_count || 0) > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground min-w-[18px] text-center">
                      {convo.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {convo.tasks?.title || 'Gesprek'} · {convo.tasks?.clubs?.name || ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(convo.updated_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Messages area */}
        <div className={`${(!activeConversation && !activeGroupChat) ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
          {activeGroupChat && userId ? (
            <>
              <div className="px-4 py-2 border-b border-border bg-card md:hidden">
                <button
                  onClick={() => setActiveGroupChat(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← {l.back}
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <EventGroupChat
                  eventId={activeGroupChat}
                  eventTitle={groupChats.find(gc => gc.id === activeGroupChat)?.title || ''}
                  userId={userId}
                  language={language}
                />
              </div>
            </>
          ) : !activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <MessageCircle className="w-16 h-16 opacity-20" />
            </div>
          ) : (
            <>
              {/* Active conversation header */}
              <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden text-sm text-muted-foreground hover:text-foreground"
                >
                  ← {l.back}
                </button>
                <p className="font-medium text-foreground text-sm">{otherName}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => {
                  const isMe = msg.sender_id === userId;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}>
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                            <img src={msg.attachment_url} alt={msg.attachment_name || 'Afbeelding'} className="max-w-full rounded-lg max-h-60 object-cover" />
                          </a>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <audio controls src={msg.attachment_url} className="max-w-full mb-1.5" />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'document' && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 mb-1.5 px-3 py-2 rounded-lg ${isMe ? 'bg-primary-foreground/10' : 'bg-background/50'}`}
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="text-xs truncate">{msg.attachment_name || 'Document'}</span>
                          </a>
                        )}
                        {msg.content && !(msg.attachment_url && msg.content === `📎 ${msg.attachment_name}`) && (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.attachment_url && msg.content === `📎 ${msg.attachment_name}` && !msg.attachment_type && (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                          <span className={`text-[10px] ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {new Date(msg.created_at).toLocaleTimeString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          {isMe && (
                            msg.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/80" />
                            ) : (
                              <Check className="w-3 h-3 text-primary-foreground/50" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment preview */}
              {attachmentFile && (
                <div className="border-t border-border bg-card px-3 pt-2">
                  <div className="flex items-center gap-2 max-w-3xl mx-auto p-2 rounded-lg bg-muted/50">
                    {attachmentPreview ? (
                      <img src={attachmentPreview} alt="Preview" className="w-12 h-12 rounded object-cover" />
                    ) : attachmentFile.type.startsWith('audio/') ? (
                      <Music className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-xs text-foreground truncate flex-1">{attachmentFile.name}</span>
                    <button onClick={clearAttachment} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-border bg-card p-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
                {recording ? (
                  <div className="flex items-center gap-2 max-w-3xl mx-auto">
                    <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl border border-destructive/50 bg-destructive/5">
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm text-destructive font-medium">{formatRecordingTime(recordingTime)}</span>
                      <span className="text-xs text-muted-foreground">Opname bezig...</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                      title="Stop opname"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 max-w-3xl mx-auto">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2.5 rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground transition-colors"
                      title="Bijlage toevoegen"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      onClick={startRecording}
                      className="px-3 py-2.5 rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground transition-colors"
                      title="Audio opnemen"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={l.typeMessage}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={handleSend}
                      disabled={(!newMessage.trim() && !attachmentFile) || sending}
                      className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
