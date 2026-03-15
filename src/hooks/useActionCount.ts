import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared hook that calculates the exact number of pending action items,
 * matching the logic used by CommandCenter to build its items array.
 * Includes realtime subscriptions with debounce for live badge updates.
 */
export const useActionCount = (clubId: string | null) => {
  const [actionCount, setActionCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!clubId) { setActionCount(0); return; }
    let total = 0;

    const [{ data: tasks }, { data: plans }] = await Promise.all([
      supabase.from('tasks')
        .select('id, contract_template_id')
        .eq('club_id', clubId)
        .eq('status', 'open'),
      supabase.from('monthly_plans')
        .select('id, contract_template_id')
        .eq('club_id', clubId)
        .eq('status', 'published'),
    ]);

    // --- Task signups ---
    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);

      const [{ data: signups }, { data: existingTickets }, { data: existingSignatures }] = await Promise.all([
        supabase.from('task_signups')
          .select('id, task_id, volunteer_id, status')
          .in('task_id', taskIds)
          .in('status', ['pending', 'assigned']),
        supabase.from('volunteer_tickets')
          .select('volunteer_id, task_id')
          .eq('club_id', clubId)
          .in('task_id', taskIds),
        supabase.from('signature_requests')
          .select('task_id, volunteer_id')
          .in('task_id', taskIds),
      ]);

      const ticketSet = new Set((existingTickets || []).map(t => `${t.volunteer_id}_${t.task_id}`));
      const signatureSet = new Set((existingSignatures || []).map(s => `${s.volunteer_id}_${s.task_id}`));
      const tasksWithContract = new Map(tasks.filter(t => t.contract_template_id).map(t => [t.id, true]));

      (signups || []).forEach(s => {
        if (s.status === 'pending') total++;
        if (s.status === 'assigned') {
          // Contract needed (has template + no signature request yet)
          if (tasksWithContract.has(s.task_id) && !signatureSet.has(`${s.volunteer_id}_${s.task_id}`)) {
            total++;
          }
          // Ticket needed (no ticket yet)
          if (!ticketSet.has(`${s.volunteer_id}_${s.task_id}`)) {
            total++;
          }
        }
      });
    }

    // --- Monthly planning ---
    if (plans && plans.length > 0) {
      const planIds = plans.map(p => p.id);
      const plansWithContract = new Set(plans.filter(p => p.contract_template_id).map(p => p.id));

      const { data: enrollments } = await supabase
        .from('monthly_enrollments')
        .select('id, plan_id, approval_status, contract_status')
        .in('plan_id', planIds);

      const enrs = enrollments || [];

      enrs.forEach(e => {
        if (e.approval_status === 'pending') total++;
        if (e.approval_status === 'approved' && e.contract_status === 'pending' && plansWithContract.has(e.plan_id)) total++;
      });

      if (enrs.length > 0) {
        const enrIds = enrs.map(e => e.id);
        const { data: daySignups } = await supabase
          .from('monthly_day_signups')
          .select('id, status, ticket_barcode')
          .in('enrollment_id', enrIds);

        (daySignups || []).forEach(ds => {
          if (ds.status === 'pending') total++;
          if (ds.status === 'assigned' && !ds.ticket_barcode) total++;
        });
      }
    }

    setActionCount(total);
  }, [clubId]);

  useEffect(() => {
    fetchCount();

    if (!clubId) return;

    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchCount(), 1000);
    };

    const channel = supabase
      .channel(`action-count-${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_signups' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_enrollments' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_day_signups' }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [clubId, fetchCount]);

  return { actionCount, refetchCount: fetchCount };
};
