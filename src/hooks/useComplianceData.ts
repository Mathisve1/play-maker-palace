import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const YEARLY_LIMIT = 3233.91;
export const HOURS_LIMIT = 190;

export interface ComplianceStatus {
  internalIncome: number;
  externalIncome: number;
  totalIncome: number;
  remainingBudget: number;
  externalHours: number;
  percentUsed: number;
  status: 'green' | 'orange' | 'red';
  lastDeclarationDate: string | null;
  hasCurrentMonthDeclaration: boolean;
  declarationsPending: boolean;
}

export const getComplianceStatus = (totalIncome: number): 'green' | 'orange' | 'red' => {
  if (totalIncome >= YEARLY_LIMIT) return 'red';
  if (totalIncome >= YEARLY_LIMIT * 0.8) return 'orange';
  return 'green';
};

export const useComplianceData = (volunteerId: string | null, year?: number) => {
  const currentYear = year || new Date().getFullYear();
  const [data, setData] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);

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

      // 2. External income + hours from declarations
      const { data: declarations } = await supabase
        .from('compliance_declarations')
        .select('*')
        .eq('volunteer_id', volunteerId)
        .eq('declaration_year', currentYear);

      const externalIncome = (declarations || [])
        .reduce((sum, d) => sum + Number(d.external_income || 0), 0);

      const externalHours = (declarations || [])
        .reduce((sum, d) => sum + (d.external_hours || 0), 0);

      // 3. Last declaration date
      const sorted = (declarations || [])
        .sort((a, b) => new Date(b.declared_at).getTime() - new Date(a.declared_at).getTime());
      const lastDeclarationDate = sorted.length > 0 ? sorted[0].declared_at : null;

      // 4. Check if current month has declaration
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const hasCurrentMonthDeclaration = (declarations || [])
        .some(d => d.declaration_month === currentMonth && d.declaration_year === currentYear);

      // Check if any previous months are missing (from January or from first payment)
      const declaredMonths = new Set((declarations || []).map(d => d.declaration_month));
      let declarationsPending = false;
      for (let m = 1; m < currentMonth; m++) {
        if (!declaredMonths.has(m)) {
          declarationsPending = true;
          break;
        }
      }
      // Current month is also pending if not declared
      if (!hasCurrentMonthDeclaration) declarationsPending = true;

      const totalIncome = internalIncome + externalIncome;
      const remainingBudget = Math.max(0, YEARLY_LIMIT - totalIncome);
      const percentUsed = Math.min(100, (totalIncome / YEARLY_LIMIT) * 100);
      const status = getComplianceStatus(totalIncome);

      setData({
        internalIncome,
        externalIncome,
        totalIncome,
        remainingBudget,
        externalHours,
        percentUsed,
        status,
        lastDeclarationDate,
        hasCurrentMonthDeclaration,
        declarationsPending,
      });
      setLoading(false);
    };

    load();
  }, [volunteerId, currentYear]);

  return { data, loading, refresh: () => { setLoading(true); } };
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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  for (const vid of volunteerIds) {
    const volPayments = (payments || [])
      .filter(p => p.volunteer_id === vid && p.paid_at && new Date(p.paid_at).getFullYear() === currentYear);
    const internalIncome = volPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

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
    const remainingBudget = Math.max(0, YEARLY_LIMIT - totalIncome);
    const percentUsed = Math.min(100, (totalIncome / YEARLY_LIMIT) * 100);
    const status = getComplianceStatus(totalIncome);

    result.set(vid, {
      internalIncome,
      externalIncome,
      totalIncome,
      remainingBudget,
      externalHours,
      percentUsed,
      status,
      lastDeclarationDate,
      hasCurrentMonthDeclaration,
      declarationsPending,
    });
  }

  return result;
};
