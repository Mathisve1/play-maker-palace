import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WidgetInstance, DEFAULT_LAYOUT } from './widgetRegistry';

export function useDashboardLayout(clubId: string | null, userId: string) {
  const [layout, setLayout] = useState<WidgetInstance[]>(DEFAULT_LAYOUT);
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!clubId || !userId) return;
    const load = async () => {
      const { data } = await supabase
        .from('dashboard_layouts')
        .select('id, layout')
        .eq('user_id', userId)
        .eq('club_id', clubId)
        .maybeSingle();
      
      if (data) {
        setLayoutId(data.id);
        try {
          const parsed = data.layout as unknown as WidgetInstance[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLayout(parsed);
          }
        } catch {
          // use default
        }
      }
      setLoaded(true);
    };
    load();
  }, [clubId, userId]);

  const saveLayout = useCallback(async (newLayout: WidgetInstance[]) => {
    if (!clubId || !userId) return;
    setLayout(newLayout);

    if (layoutId) {
      await supabase
        .from('dashboard_layouts')
        .update({ layout: newLayout as any })
        .eq('id', layoutId);
    } else {
      const { data } = await supabase
        .from('dashboard_layouts')
        .insert({ user_id: userId, club_id: clubId, layout: newLayout as any })
        .select('id')
        .maybeSingle();
      if (data) setLayoutId(data.id);
    }
  }, [clubId, userId, layoutId]);

  const resetLayout = useCallback(async () => {
    setLayout(DEFAULT_LAYOUT);
    if (!clubId || !userId) return;
    if (layoutId) {
      await supabase
        .from('dashboard_layouts')
        .update({ layout: DEFAULT_LAYOUT as any })
        .eq('id', layoutId);
    }
  }, [clubId, userId, layoutId]);

  return { layout, setLayout, saveLayout, resetLayout, loaded };
}
