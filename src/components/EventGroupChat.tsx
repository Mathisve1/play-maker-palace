import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Language } from '@/i18n/translations';

interface ChatMessage {
  id: string;
  event_id: string;
  user_id: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

interface EventGroupChatProps {
  eventId: string;
  eventTitle: string;
  userId: string;
  language: Language;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

const EventGroupChat = ({ eventId, eventTitle, userId, language }: EventGroupChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string }>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('event_chats')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (data) {
        setMessages(data);
        // Load profiles for unique user IDs
        const uids = [...new Set(data.map((m: ChatMessage) => m.user_id))] as string[];
        if (uids.length > 0) {
          const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', uids);
          if (profs) {
            const map: Record<string, { full_name: string }> = {};
            profs.forEach(p => { map[p.id] = { full_name: p.full_name }; });
            setProfiles(map);
          }
        }
      }
      setLoading(false);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel(`event-chat-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_chats',
        filter: `event_id=eq.${eventId}`,
      }, async (payload: any) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMsg]);
        // Load profile if needed
        if (!profiles[newMsg.user_id]) {
          const { data: prof } = await supabase.from('profiles').select('id, full_name').eq('id', newMsg.user_id).single();
          if (prof) setProfiles(prev => ({ ...prev, [prof.id]: { full_name: prof.full_name } }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const { error } = await supabase.from('event_chats').insert({
      event_id: eventId,
      user_id: userId,
      message: input.trim(),
    });
    if (error) toast.error(error.message);
    else setInput('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{eventTitle}</p>
          <p className="text-sm text-muted-foreground">
            {t3(language, 'Groepschat', 'Chat de groupe', 'Group chat')}
            {messages.length > 0 && ` · ${new Set(messages.map(m => m.user_id)).size} ${t3(language, 'deelnemers', 'participants', 'participants')}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-base">{t3(language, 'Start het gesprek!', 'Démarrez la conversation !', 'Start the conversation!')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isMe = msg.user_id === userId;
              const name = profiles[msg.user_id]?.full_name || '?';
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
              const isContinuation = prevMsg?.user_id === msg.user_id;
              const isLastInGroup = !nextMsg || nextMsg.user_id !== msg.user_id;
              const spacingClass = !isContinuation && idx > 0 ? 'mt-4' : 'mt-1';

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''} ${spacingClass}`}
                >
                  {/* Avatar */}
                  {!isMe && isLastInGroup ? (
                    <Avatar className="h-8 w-8 shrink-0 mb-0.5">
                      <AvatarFallback className="text-[11px] font-bold bg-secondary/10 text-secondary rounded-xl">
                        {name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : !isMe ? (
                    <div className="w-8 shrink-0" />
                  ) : null}

                  <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && !isContinuation && (
                      <p className="text-xs font-medium text-muted-foreground mb-1 ml-1">{name}</p>
                    )}
                    <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? `bg-primary text-primary-foreground ${isLastInGroup ? 'rounded-br-md' : ''}`
                        : `bg-card border border-border text-foreground ${isLastInGroup ? 'rounded-bl-md' : ''}`
                    }`}
                      style={!isMe ? { boxShadow: 'var(--shadow-card)' } : undefined}
                    >
                      {msg.message}
                    </div>
                    {isLastInGroup && (
                      <p className="text-[11px] text-muted-foreground mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString(language === 'nl' ? 'nl-BE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={t3(language, 'Typ een bericht...', 'Tapez un message...', 'Type a message...')}
          className="flex-1 px-4 py-3 rounded-2xl bg-muted text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="icon" className="h-12 w-12 rounded-2xl" onClick={handleSend} disabled={sending || !input.trim()}>
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
};

export default EventGroupChat;
