import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Pin, AlertTriangle, Info, MessageCircle, Loader2 } from 'lucide-react';
import { Language } from '@/i18n/translations';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface FeedItem {
  id: string;
  event_id: string;
  user_id: string;
  type: string;
  title: string | null;
  content: string;
  photo_url: string | null;
  pinned: boolean;
  created_at: string;
}

interface Props {
  eventId: string;
  language: Language;
}

const typeIcons: Record<string, any> = {
  update: Info,
  alert: AlertTriangle,
  announcement: Radio,
  message: MessageCircle,
};

const typeColors: Record<string, string> = {
  update: 'bg-primary/10 text-primary',
  alert: 'bg-destructive/10 text-destructive',
  announcement: 'bg-accent/10 text-accent-foreground',
  message: 'bg-secondary/10 text-secondary',
};

const LiveEventFeed = ({ eventId, language }: Props) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('event_feed')
        .select('*')
        .eq('event_id', eventId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setItems(data);
        const uids = [...new Set(data.map((i: FeedItem) => i.user_id))] as string[];
        if (uids.length > 0) {
          const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', uids);
          if (profs) {
            const map: Record<string, string> = {};
            profs.forEach(p => { map[p.id] = p.full_name || ''; });
            setProfiles(map);
          }
        }
      }
      setLoading(false);
    };
    load();

    // Realtime
    const channel = supabase
      .channel(`event-feed-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_feed',
        filter: `event_id=eq.${eventId}`,
      }, (payload: any) => {
        setItems(prev => [payload.new as FeedItem, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border text-center">
        <Radio className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {t3(language, 'Geen updates beschikbaar', 'Aucune mise à jour', 'No updates available')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        {t3(language, 'Live updates', 'Mises à jour en direct', 'Live updates')}
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </h3>

      <AnimatePresence>
        {items.map((item, i) => {
          const Icon = typeIcons[item.type] || Info;
          const colorClass = typeColors[item.type] || typeColors.update;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-card rounded-2xl p-3 border ${item.pinned ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
            >
              <div className="flex gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                  {item.pinned ? <Pin className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  {item.title && <p className="text-sm font-semibold text-foreground">{item.title}</p>}
                  <p className="text-sm text-foreground">{item.content}</p>
                  {item.photo_url && (
                    <img src={item.photo_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{profiles[item.user_id] || ''}</span>
                    <span>·</span>
                    <span>{new Date(item.created_at).toLocaleTimeString(language === 'nl' ? 'nl-BE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default LiveEventFeed;
