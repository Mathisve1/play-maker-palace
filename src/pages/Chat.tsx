import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { Language } from '@/i18n/translations';

interface Conversation {
  id: string;
  task_id: string;
  volunteer_id: string;
  club_owner_id: string;
  updated_at: string;
  tasks?: { title: string; clubs?: { name: string } | null } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
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

const langLabels: Record<Language, string> = { nl: 'NL', fr: 'FR', en: 'EN' };

const Chat = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const l = chatLabels[language];

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherName, setOtherName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Init: check auth, load conversations, handle new conversation from task
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setUserId(session.user.id);

      // If coming from a task page with taskId and clubOwnerId params, find or create conversation
      const taskId = searchParams.get('taskId');
      const clubOwnerId = searchParams.get('clubOwnerId');

      if (taskId && clubOwnerId) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .eq('volunteer_id', session.user.id)
          .maybeSingle();

        if (existing) {
          setActiveConversation(existing.id);
        } else {
          const { data: created, error } = await supabase
            .from('conversations')
            .insert({
              task_id: taskId,
              volunteer_id: session.user.id,
              club_owner_id: clubOwnerId,
            })
            .select('id')
            .single();
          if (error) {
            toast.error(error.message);
          } else if (created) {
            setActiveConversation(created.id);
          }
        }
      }

      // Load all conversations
      const { data: convos } = await supabase
        .from('conversations')
        .select('*, tasks(title, clubs(name))')
        .order('updated_at', { ascending: false });
      setConversations((convos as unknown as Conversation[]) || []);
      setLoading(false);
    };
    init();
  }, [navigate, searchParams]);

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
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', otherId)
          .maybeSingle();
        setOtherName(profile?.full_name || profile?.email || '');
      }

      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', activeConversation)
        .neq('sender_id', userId);
    };
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversation}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => [...prev, msg]);
        // Mark as read if not from us
        if (msg.sender_id !== userId) {
          supabase.from('messages').update({ read: true }).eq('id', msg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, userId, conversations]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation || !userId) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: userId,
      content: newMessage.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setNewMessage('');
      // Update conversation updated_at
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => activeConversation ? setActiveConversation(null) : navigate('/dashboard')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{l.back}</span>
            </button>
            <h1 className="font-heading font-semibold text-foreground">
              {activeConversation && otherName ? otherName : l.title}
            </h1>
          </div>
          <Logo size="sm" linkTo="/dashboard" />
          <div className="flex items-center gap-2">
            {(['nl', 'fr', 'en'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  language === lang ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {langLabels[lang]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Conversation list - show on mobile when no active, always on desktop */}
        <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border bg-card overflow-y-auto`}>
          {conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">{l.noConversations}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{l.startFromTask}</p>
            </div>
          ) : (
            conversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => setActiveConversation(convo.id)}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-muted/50 ${
                  activeConversation === convo.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
              >
                <p className="font-medium text-foreground text-sm truncate">
                  {convo.tasks?.title || 'Gesprek'}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {convo.tasks?.clubs?.name || ''}
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
        <div className={`${!activeConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <MessageCircle className="w-16 h-16 opacity-20" />
            </div>
          ) : (
            <>
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
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border bg-card p-3">
                <div className="flex gap-2 max-w-3xl mx-auto">
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
                    disabled={!newMessage.trim() || sending}
                    className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
