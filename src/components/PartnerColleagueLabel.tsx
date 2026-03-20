/**
 * PartnerColleagueLabel
 *
 * Shows "🔥 N collega's van [Partner] werken hier!" on a task card when
 * the viewing volunteer has a linked_partner_id and colleagues from that
 * same partner are already signed up for the task.
 *
 * Usage:
 *   <PartnerColleagueLabel taskId={task.id} viewerId={currentUserId} />
 *
 * Returns null when:
 *   • The viewer has no linked_partner_id
 *   • No colleagues are on this task
 *   • The RPC call is still loading
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Flame } from 'lucide-react';

interface Props {
  taskId: string;
  viewerId: string;
  className?: string;
}

interface ColleagueData {
  count: number;
  partner_name: string | null;
  names: string[];
}

const PartnerColleagueLabel = ({ taskId, viewerId, className = '' }: Props) => {
  const { language } = useLanguage();
  const nl = language === 'nl';
  const fr = language === 'fr';
  const t3 = (nlS: string, frS: string, enS: string) => nl ? nlS : fr ? frS : enS;

  const [data, setData] = useState<ColleagueData | null>(null);

  useEffect(() => {
    if (!taskId || !viewerId) return;
    (supabase as any)
      .rpc('get_partner_colleagues_on_task', { p_task_id: taskId, p_viewer_id: viewerId })
      .then(({ data: result }: { data: ColleagueData | null }) => {
        if (result && result.count > 0) setData(result);
      });
  }, [taskId, viewerId]);

  if (!data || data.count === 0) return null;

  const firstName = data.names?.[0] ?? '';
  const rest = data.count - 1;

  const label = data.count === 1
    ? t3(
        `${firstName} (${data.partner_name}) werkt hier ook!`,
        `${firstName} (${data.partner_name}) travaille ici aussi !`,
        `${firstName} (${data.partner_name}) is also working here!`
      )
    : rest === 0
      ? t3(
          `${data.count} collega's van ${data.partner_name} werken hier`,
          `${data.count} collègues de ${data.partner_name} travaillent ici`,
          `${data.count} colleagues from ${data.partner_name} are here`
        )
      : t3(
          `${firstName} en ${rest} andere collega's van ${data.partner_name} werken hier`,
          `${firstName} et ${rest} autre(s) collègue(s) de ${data.partner_name} travaillent ici`,
          `${firstName} and ${rest} other colleague(s) from ${data.partner_name} are here`
        );

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-medium ${className}`}
      title={data.names.join(', ')}
    >
      <Flame className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
};

export default PartnerColleagueLabel;
