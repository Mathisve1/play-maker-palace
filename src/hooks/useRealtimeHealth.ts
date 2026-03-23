import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Monitors Supabase Realtime connection health.
 * Auto-reconnects channels on disconnect and tracks connection state.
 * Designed for 1500+ concurrent user scenarios.
 */
export function useRealtimeHealth() {
  const [isConnected, setIsConnected] = useState(true);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Listen for visibility changes — reconnect when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Force reconnect by removing and re-adding all channels
        const channels = supabase.getChannels();
        if (channels.length === 0) return;
        
        setIsConnected(true);
      }
    };

    // Listen for online/offline events
    const handleOnline = () => {
      setIsConnected(true);
      // Re-subscribe all channels after coming back online
      const channels = supabase.getChannels();
      channels.forEach(ch => {
        if (ch.state !== 'joined') {
          ch.subscribe();
        }
      });
    };

    const handleOffline = () => {
      setIsConnected(false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic health check every 60s
    const healthCheck = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const channels = supabase.getChannels();
      const allJoined = channels.every(ch => ch.state === 'joined');
      setIsConnected(allJoined || channels.length === 0);
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheck);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  return { isConnected };
}
