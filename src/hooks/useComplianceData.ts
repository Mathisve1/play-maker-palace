import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const YEARLY_LIMIT = 3233.91;
export const HOURS_LIMIT = 190;

export interface ComplianceStatus {
  internalIncome: number;
  externalIncome: number;
  totalIncome: number;
  remainingBudget: number;
  internalHours: number;
  externalHours: number;
  totalHours: number;
  remainingHours: number;
  percentUsed: number;
  hoursPercentUsed: number;
  status: 'green' | 'orange' | 'red';
  lastDeclarationDate: string | null;
  hasCurrentMonthDeclaration: boolean;
  declarationsPending: boolean;
}

export const getComplianceStatus = (totalIncome: number, totalHours?: number): 'green' | 'orange' | 'red' => {
  if (totalIncome >= YEARLY_LIMIT || (totalHours !== undefined && totalHours >= HOURS_LIMIT)) return 'red';
  if (totalIncome >= YEARLY_LIMIT * 0.8 || (totalHours !== undefined && totalHours >= HOURS_LIMIT * 0.8)) return 'orange';
  return 'green';
};

// Calculate hours between two timestamps
const calculateHours = (startTime: string | null, endTime: string | null): number => {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
};

export const useComplianceData = (volunteerId: string | null, year?: number, refreshKey?: number) => {
  const currentYear = year || new Date().getFullYear();
  const [data, setData] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  useEffect(() => {
    if (!volunteerId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);

      // 1. Internal income: sum of succeeded payments this year
      const { data: payments } = await supabase
        .from('volunteer_payments')
        .select('amount, paid_at')
        .eq('volunteer_id', volunteerId)
        .eq('status', 'succeeded');

      const internalIncome = (payments || [])
        .filter(p => p.paid_at && new Date(p.paid_at).getFullYear() === currentYear)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // 2. Internal hours: from assigned task signups (task start_time/end_time)
      const { data: assignedSignups } = await supabase
        .from('task_signups')
        .select('task_id')
        .eq('volunteer_id', volunteerId)
        .eq('status', 'assigned');

      let internalHours = 0;
      if (assignedSignups && assignedSignups.length > 0) {
        const taskIds = assignedSignups.map(s => s.task_id);
        const { data: assignedTasks } = await supabase
          .from('tasks')
          .select('start_time, end_time, task_date')
          .in('id', taskIds);

        internalHours = (assignedTasks || [])
          .filter(t => {
            const taskDate = t.task_date ? new Date(t.task_date) : (t.start_time ? new Date(t.start_time) : null);
            return taskDate && taskDate.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + calculateHours(t.start_time, t.end_time), 0);
      }

      // 3. External income + hours from declarations
      const { data: declarations } = await supabase
        .from('compliance_declarations')
        .select('*')
        .eq('volunteer_id', volunteerId)
        .eq('declaration_year', currentYear);

      const externalIncome = (declarations || [])
        .reduce((sum, d) => sum + Number(d.external_income || 0), 0);

      const externalHours = (declarations || [])
        .reduce((sum, d) => sum + (d.external_hours || 0), 0);

      // 4. Last declaration date
      const sorted = (declarations || [])
        .sort((a, b) => new Date(b.declared_at).getTime() - new Date(a.declared_at).getTime());
      const lastDeclarationDate = sorted.length > 0 ? sorted[0].declared_at : null;

      // 5. Check if current month has declaration
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const hasCurrentMonthDeclaration = (declarations || [])
        .some(d => d.declaration_month === currentMonth && d.declaration_year === currentYear);

      const declaredMonths = new Set((declarations || []).map(d => d.declaration_month));
      let declarationsPending = false;
      for (let m = 1; m < currentMonth; m++) {
        if (!declaredMonths.has(m)) {
          declarationsPending = true;
          break;
        }
      }
      if (!hasCurrentMonthDeclaration) declarationsPending = true;

      const totalIncome = internalIncome + externalIncome;
      const totalHours = internalHours + externalHours;
      const remainingBudget = Math.max(0, YEARLY_LIMIT - totalIncome);
      const remainingHours = Math.max(0, HOURS_LIMIT - totalHours);
      const percentUsed = Math.min(100, (totalIncome / YEARLY_LIMIT) * 100);
      const hoursPercentUsed = Math.min(100, (totalHours / HOURS_LIMIT) * 100);
      const status = getComplianceStatus(totalIncome, totalHours);

      setData({
        internalIncome,
        externalIncome,
        totalIncome,
        remainingBudget,
        internalHours,
        externalHours,
        totalHours,
        remainingHours,
        hoursPercentUsed,
        percentUsed,
        status,
        lastDeclarationDate,
        hasCurrentMonthDeclaration,
        declarationsPending,
      });
      setLoading(false);
    };

    load();
  }, [volunteerId, currentYear, refreshKey, internalRefreshKey]);

  return { data, loading, refresh: () => setInternalRefreshKey(k => k + 1) };
};

// Batch fetch compliance data for multiple volunteers (for club views)
export const fetchBatchComplianceData = async (
  volunteerIds: string[],
  year?: number
): Promise<Map<string, ComplianceStatus>> => {
  const currentYear = year || new Date().getFullYear();
  const result = new Map<string, ComplianceStatus>();

  if (volunteerIds.length === 0) return result;

  // Batch fetch payments
  const { data: payments } = await supabase
    .from('volunteer_payments')
    .select('volunteer_id, amount, paid_at')
    .in('volunteer_id', volunteerIds)
    .eq('status', 'succeeded');

  // Batch fetch declarations
  const { data: declarations } = await supabase
    .from('compliance_declarations')
    .select('*')
    .in('volunteer_id', volunteerIds)
    .eq('declaration_year', currentYear);

  // Batch fetch assigned signups
  const { data: allSignups } = await supabase
    .from('task_signups')
    .select('volunteer_id, task_id')
    .in('volunteer_id', volunteerIds)
    .eq('status', 'assigned');

  // Fetch tasks for hours calculation
  let tasksMap = new Map<string, { start_time: string | null; end_time: string | null; task_date: string | null }>();
  if (allSignups && allSignups.length > 0) {
    const taskIds = [...new Set(allSignups.map(s => s.task_id))];
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, start_time, end_time, task_date')
      .in('id', taskIds);
    tasksMap = new Map((tasksData || []).map(t => [t.id, t]));
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  for (const vid of volunteerIds) {
    const volPayments = (payments || [])
      .filter(p => p.volunteer_id === vid && p.paid_at && new Date(p.paid_at).getFullYear() === currentYear);
    const internalIncome = volPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Internal hours from assigned tasks
    const volSignups = (allSignups || []).filter(s => s.volunteer_id === vid);
    const internalHours = volSignups.reduce((sum, s) => {
      const task = tasksMap.get(s.task_id);
      if (!task) return sum;
      const taskDate = task.task_date ? new Date(task.task_date) : (task.start_time ? new Date(task.start_time) : null);
      if (!taskDate || taskDate.getFullYear() !== currentYear) return sum;
      return sum + calculateHours(task.start_time, task.end_time);
    }, 0);

    const volDeclarations = (declarations || [])
      .filter((d: any) => d.volunteer_id === vid);
    const externalIncome = volDeclarations.reduce((sum: number, d: any) => sum + Number(d.external_income || 0), 0);
    const externalHours = volDeclarations.reduce((sum: number, d: any) => sum + (d.external_hours || 0), 0);

    const sorted = volDeclarations.sort((a: any, b: any) => new Date(b.declared_at).getTime() - new Date(a.declared_at).getTime());
    const lastDeclarationDate = sorted.length > 0 ? sorted[0].declared_at : null;

    const hasCurrentMonthDeclaration = volDeclarations.some((d: any) => d.declaration_month === currentMonth);
    const declaredMonths = new Set(volDeclarations.map((d: any) => d.declaration_month));
    let declarationsPending = !hasCurrentMonthDeclaration;
    for (let m = 1; m < currentMonth; m++) {
      if (!declaredMonths.has(m)) { declarationsPending = true; break; }
    }

    const totalIncome = internalIncome + externalIncome;
    const totalHours = internalHours + externalHours;
    const remainingBudget = Math.max(0, YEARLY_LIMIT - totalIncome);
    const remainingHours = Math.max(0, HOURS_LIMIT - totalHours);
    const percentUsed = Math.min(100, (totalIncome / YEARLY_LIMIT) * 100);
    const hoursPercentUsed = Math.min(100, (totalHours / HOURS_LIMIT) * 100);
    const status = getComplianceStatus(totalIncome, totalHours);

    result.set(vid, {
      internalIncome,
      externalIncome,
      totalIncome,
      remainingBudget,
      internalHours,
      externalHours,
      totalHours,
      remainingHours,
      hoursPercentUsed,
      percentUsed,
      status,
      lastDeclarationDate,
      hasCurrentMonthDeclaration,
      declarationsPending,
    });
  }

  return result;
};