import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Users, ClipboardList, Calendar, FileText, Loader2 } from 'lucide-react';

const labels = {
  nl: {
    placeholder: 'Zoek vrijwilligers, taken, evenementen...',
    noResults: 'Geen resultaten gevonden.',
    volunteers: 'Vrijwilligers',
    tasks: 'Taken',
    events: 'Evenementen',
    briefings: 'Briefings',
  },
  fr: {
    placeholder: 'Rechercher bénévoles, tâches, événements...',
    noResults: 'Aucun résultat trouvé.',
    volunteers: 'Bénévoles',
    tasks: 'Tâches',
    events: 'Événements',
    briefings: 'Briefings',
  },
  en: {
    placeholder: 'Search volunteers, tasks, events...',
    noResults: 'No results found.',
    volunteers: 'Volunteers',
    tasks: 'Tasks',
    events: 'Events',
    briefings: 'Briefings',
  },
};

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  type: 'volunteer' | 'task' | 'event' | 'briefing';
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId?: string | null;
  isClubOwner?: boolean;
}

const GlobalSearch = ({ open, onOpenChange, clubId, isClubOwner }: GlobalSearchProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = labels[language];
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // Debounced search
  useEffect(() => {
    if (!open) { setResults([]); setQuery(''); return; }
    if (!query || query.length < 2) { setResults([]); return; }

    const timer = setTimeout(async () => {
      setSearching(true);
      const q = `%${query}%`;
      const allResults: SearchResult[] = [];

      // Parallel queries
      const promises: Promise<void>[] = [];

      // Volunteers (club owners only)
      if (isClubOwner && clubId) {
        promises.push((async () => {
          // Get volunteer ids from club_memberships
          const { data: members } = await supabase
            .from('club_memberships')
            .select('volunteer_id')
            .eq('club_id', clubId)
            .eq('status', 'actief');
          const volIds = (members || []).map(m => m.volunteer_id);
          if (volIds.length > 0) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', volIds)
              .ilike('full_name', q)
              .limit(5);
            (data || []).forEach(p => allResults.push({
              id: p.id,
              label: p.full_name || p.email || '?',
              path: `/volunteer/${p.id}`,
              type: 'volunteer',
            }));
          }
        })());
      }

      // Tasks
      if (clubId) {
        promises.push((async () => {
          const { data } = await supabase
            .from('tasks')
            .select('id, title, task_date')
            .eq('club_id', clubId)
            .ilike('title', q)
            .order('task_date', { ascending: false })
            .limit(5);
          (data || []).forEach(t => allResults.push({
            id: t.id,
            label: t.title,
            sublabel: t.task_date ? new Date(t.task_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : undefined,
            path: `/task/${t.id}`,
            type: 'task',
          }));
        })());
      }

      // Events
      if (clubId) {
        promises.push((async () => {
          const { data } = await supabase
            .from('events')
            .select('id, title, event_date')
            .eq('club_id', clubId)
            .ilike('title', q)
            .order('event_date', { ascending: false })
            .limit(5);
          (data || []).forEach(e => allResults.push({
            id: e.id,
            label: e.title,
            sublabel: e.event_date ? new Date(e.event_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : undefined,
            path: `/safety/${e.id}`,
            type: 'event',
          }));
        })());
      }

      // Briefings
      if (clubId) {
        promises.push((async () => {
          const { data } = await supabase
            .from('briefings')
            .select('id, title, task_id')
            .eq('club_id', clubId)
            .ilike('title', q)
            .limit(5);
          (data || []).forEach(b => allResults.push({
            id: b.id,
            label: b.title,
            path: `/briefing-builder`,
            type: 'briefing',
          }));
        })());
      }

      await Promise.all(promises);
      setResults(allResults);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open, clubId, isClubOwner, locale]);

  const typeIcon = {
    volunteer: Users,
    task: ClipboardList,
    event: Calendar,
    briefing: FileText,
  };

  const grouped = {
    volunteer: results.filter(r => r.type === 'volunteer'),
    task: results.filter(r => r.type === 'task'),
    event: results.filter(r => r.type === 'event'),
    briefing: results.filter(r => r.type === 'briefing'),
  };

  const groupLabels = {
    volunteer: l.volunteers,
    task: l.tasks,
    event: l.events,
    briefing: l.briefings,
  };

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={l.placeholder}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {searching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!searching && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>{l.noResults}</CommandEmpty>
        )}
        {(['volunteer', 'task', 'event', 'briefing'] as const).map(type => {
          const items = grouped[type];
          if (items.length === 0) return null;
          const Icon = typeIcon[type];
          return (
            <CommandGroup key={type} heading={groupLabels[type]}>
              {items.map(item => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => handleSelect(item.path)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-[11px] text-muted-foreground">{item.sublabel}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;
