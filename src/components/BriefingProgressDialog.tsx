import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { CheckCircle, Circle, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface VolunteerProgress {
  volunteerId: string;
  volunteerName: string;
  totalItems: number;
  checkedItems: number;
  items: { label: string; checked: boolean }[];
}

interface GroupProgress {
  groupId: string;
  groupName: string;
  groupColor: string;
  volunteers: VolunteerProgress[];
}

const labels = {
  nl: {
    title: 'Briefing voortgang',
    noData: 'Geen checklist-items gevonden.',
    progress: 'voortgang',
    allComplete: 'Alles afgevinkt!',
  },
  fr: {
    title: 'Progression du briefing',
    noData: 'Aucun élément de checklist trouvé.',
    progress: 'progression',
    allComplete: 'Tout complété !',
  },
  en: {
    title: 'Briefing progress',
    noData: 'No checklist items found.',
    progress: 'progress',
    allComplete: 'All complete!',
  },
};

interface BriefingProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  language: Language;
}

const BriefingProgressDialog = ({ open, onOpenChange, taskId, language }: BriefingProgressDialogProps) => {
  const [groupsProgress, setGroupsProgress] = useState<GroupProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const l = labels[language];

  useEffect(() => {
    if (!open) return;
    loadProgress();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`briefing-progress-${taskId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'briefing_checklist_progress',
      }, () => {
        loadProgress();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, taskId]);

  const loadProgress = async () => {
    // Get briefing
    const { data: briefing } = await supabase
      .from('briefings')
      .select('id')
      .eq('task_id', taskId)
      .maybeSingle();

    if (!briefing) { setLoading(false); return; }

    // Get groups
    const { data: groups } = await supabase
      .from('briefing_groups')
      .select('id, name, color')
      .eq('briefing_id', briefing.id)
      .order('sort_order');

    if (!groups || groups.length === 0) { setLoading(false); return; }

    const groupIds = groups.map(g => g.id);

    // Get group volunteers
    const { data: gvs } = await supabase
      .from('briefing_group_volunteers')
      .select('group_id, volunteer_id')
      .in('group_id', groupIds);

    // Get volunteer profiles
    const volIds = [...new Set((gvs || []).map(v => v.volunteer_id))];
    let profiles: any[] = [];
    if (volIds.length > 0) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', volIds);
      profiles = p || [];
    }
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Get checklist blocks & items per group
    const { data: blocks } = await supabase
      .from('briefing_blocks')
      .select('id, group_id')
      .in('group_id', groupIds)
      .eq('type', 'checklist');

    const blockIds = (blocks || []).map(b => b.id);
    let checklistItems: any[] = [];
    if (blockIds.length > 0) {
      const { data: items } = await supabase
        .from('briefing_checklist_items')
        .select('id, block_id, label')
        .in('block_id', blockIds)
        .order('sort_order');
      checklistItems = items || [];
    }

    // Get all progress records
    const itemIds = checklistItems.map(ci => ci.id);
    let progressRecords: any[] = [];
    if (itemIds.length > 0) {
      const { data: prog } = await supabase
        .from('briefing_checklist_progress')
        .select('checklist_item_id, volunteer_id, checked')
        .in('checklist_item_id', itemIds);
      progressRecords = prog || [];
    }

    // Build block->group map
    const blockGroupMap = new Map((blocks || []).map(b => [b.id, b.group_id]));

    // Build group progress
    const result: GroupProgress[] = groups.map(g => {
      const groupVols = (gvs || []).filter(v => v.group_id === g.id);
      const groupBlockIds = (blocks || []).filter(b => b.group_id === g.id).map(b => b.id);
      const groupItems = checklistItems.filter(ci => groupBlockIds.includes(ci.block_id));

      const volunteers: VolunteerProgress[] = groupVols.map(gv => {
        const prof = profileMap.get(gv.volunteer_id);
        const items = groupItems.map(ci => {
          const prog = progressRecords.find(
            p => p.checklist_item_id === ci.id && p.volunteer_id === gv.volunteer_id && p.checked
          );
          return { label: ci.label, checked: !!prog };
        });

        return {
          volunteerId: gv.volunteer_id,
          volunteerName: prof?.full_name || prof?.email || 'Onbekend',
          totalItems: groupItems.length,
          checkedItems: items.filter(i => i.checked).length,
          items,
        };
      });

      return { groupId: g.id, groupName: g.name, groupColor: g.color, volunteers };
    });

    setGroupsProgress(result.filter(g => g.volunteers.length > 0));
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {l.title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groupsProgress.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{l.noData}</p>
        ) : (
          <div className="space-y-6">
            {groupsProgress.map(group => (
              <div key={group.groupId}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.groupColor }} />
                  <span className="text-sm font-semibold text-foreground">{group.groupName}</span>
                </div>

                <div className="space-y-3">
                  {group.volunteers.map(vol => {
                    const pct = vol.totalItems > 0 ? Math.round((vol.checkedItems / vol.totalItems) * 100) : 0;
                    return (
                      <div key={vol.volunteerId} className="bg-muted/30 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{vol.volunteerName}</span>
                          <span className="text-xs text-muted-foreground">
                            {vol.checkedItems}/{vol.totalItems}
                            {pct === 100 && ' ✓'}
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <div className="space-y-1">
                          {vol.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              {item.checked
                                ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                : <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              }
                              <span className={item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BriefingProgressDialog;
