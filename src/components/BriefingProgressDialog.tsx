import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { CheckCircle, Circle, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BlockProgress {
  blockId: string;
  blockTitle: string;
  blockType: string;
  completed: boolean;
  checklistItems?: { label: string; checked: boolean }[];
}

interface VolunteerProgress {
  volunteerId: string;
  volunteerName: string;
  blocks: BlockProgress[];
  totalBlocks: number;
  completedBlocks: number;
}

interface GroupProgress {
  groupId: string;
  groupName: string;
  groupColor: string;
  volunteers: VolunteerProgress[];
}

interface BriefingProgress {
  briefingId: string;
  briefingTitle: string;
  groups: GroupProgress[];
}

const labels = {
  nl: {
    title: 'Briefing opvolging',
    noData: 'Geen briefings gevonden.',
    allComplete: 'Alles afgevinkt!',
    sections: 'secties',
  },
  fr: {
    title: 'Suivi du briefing',
    noData: 'Aucun briefing trouvé.',
    allComplete: 'Tout complété !',
    sections: 'sections',
  },
  en: {
    title: 'Briefing follow-up',
    noData: 'No briefings found.',
    allComplete: 'All complete!',
    sections: 'sections',
  },
};

interface BriefingProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  language: Language;
}

const BriefingProgressDialog = ({ open, onOpenChange, taskId, language }: BriefingProgressDialogProps) => {
  const [briefingsProgress, setBriefingsProgress] = useState<BriefingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVols, setExpandedVols] = useState<Set<string>>(new Set());
  const l = labels[language];

  useEffect(() => {
    if (!open) return;
    loadProgress();

    const ch1 = supabase
      .channel(`block-progress-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'briefing_block_progress' }, () => loadProgress())
      .subscribe();
    const ch2 = supabase
      .channel(`checklist-progress-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'briefing_checklist_progress' }, () => loadProgress())
      .subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [open, taskId]);

  const toggleVol = (key: string) => {
    setExpandedVols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const loadProgress = async () => {
    // Get ALL briefings for this task
    const { data: allBriefings } = await supabase
      .from('briefings')
      .select('id, title')
      .eq('task_id', taskId)
      .order('created_at');

    if (!allBriefings || allBriefings.length === 0) { setLoading(false); return; }

    const result: BriefingProgress[] = [];

    for (const briefing of allBriefings) {
      const { data: groups } = await supabase
        .from('briefing_groups')
        .select('id, name, color')
        .eq('briefing_id', briefing.id)
        .order('sort_order');

      if (!groups || groups.length === 0) continue;

      const groupIds = groups.map(g => g.id);

      // Get volunteers per group
      const { data: gvs } = await supabase
        .from('briefing_group_volunteers')
        .select('group_id, volunteer_id')
        .in('group_id', groupIds);

      // Fallback: if no group volunteers assigned, use task_signups
      let effectiveGvs = gvs || [];
      if (effectiveGvs.length === 0) {
        const { data: signups } = await supabase
          .from('task_signups')
          .select('volunteer_id')
          .eq('task_id', taskId);

        // Assign all signed-up volunteers to all groups
        effectiveGvs = (signups || []).flatMap(s =>
          groups!.map(g => ({ group_id: g.id, volunteer_id: s.volunteer_id }))
        );
      }

      const volIds = [...new Set(effectiveGvs.map(v => v.volunteer_id))];
      let profiles: any[] = [];
      if (volIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('id, full_name, email').in('id', volIds);
        profiles = p || [];
      }
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      // Get ALL blocks (not just checklists)
      const { data: blocks } = await supabase
        .from('briefing_blocks')
        .select('id, group_id, type, title, sort_order')
        .in('group_id', groupIds)
        .order('sort_order');

      const allBlockIds = (blocks || []).map(b => b.id);

      // Get checklist items for checklist blocks
      const checklistBlockIds = (blocks || []).filter(b => b.type === 'checklist').map(b => b.id);
      let checklistItems: any[] = [];
      if (checklistBlockIds.length > 0) {
        const { data: items } = await supabase
          .from('briefing_checklist_items')
          .select('id, block_id, label')
          .in('block_id', checklistBlockIds)
          .order('sort_order');
        checklistItems = items || [];
      }

      // Get block progress
      let blockProgressRecords: any[] = [];
      if (allBlockIds.length > 0) {
        const { data: bp } = await supabase
          .from('briefing_block_progress')
          .select('block_id, volunteer_id, completed')
          .in('block_id', allBlockIds);
        blockProgressRecords = bp || [];
      }

      // Get checklist progress
      const itemIds = checklistItems.map(ci => ci.id);
      let checklistProgressRecords: any[] = [];
      if (itemIds.length > 0) {
        const { data: cp } = await supabase
          .from('briefing_checklist_progress')
          .select('checklist_item_id, volunteer_id, checked')
          .in('checklist_item_id', itemIds);
        checklistProgressRecords = cp || [];
      }

      const groupsProgress: GroupProgress[] = groups.map(g => {
        const groupVols = effectiveGvs.filter(v => v.group_id === g.id);
        const groupBlocks = (blocks || []).filter(b => b.group_id === g.id);

        const volunteers: VolunteerProgress[] = groupVols.map(gv => {
          const prof = profileMap.get(gv.volunteer_id);
          const volBlocks: BlockProgress[] = groupBlocks.map(bl => {
            const bp = blockProgressRecords.find(
              r => r.block_id === bl.id && r.volunteer_id === gv.volunteer_id && r.completed
            );
            let clItems: { label: string; checked: boolean }[] | undefined;
            if (bl.type === 'checklist') {
              const items = checklistItems.filter(ci => ci.block_id === bl.id);
              clItems = items.map(ci => ({
                label: ci.label,
                checked: !!checklistProgressRecords.find(
                  r => r.checklist_item_id === ci.id && r.volunteer_id === gv.volunteer_id && r.checked
                ),
              }));
            }
            return {
              blockId: bl.id,
              blockTitle: bl.title || bl.type,
              blockType: bl.type,
              completed: !!bp,
              checklistItems: clItems,
            };
          });

          return {
            volunteerId: gv.volunteer_id,
            volunteerName: prof?.full_name || prof?.email || 'Onbekend',
            blocks: volBlocks,
            totalBlocks: groupBlocks.length,
            completedBlocks: volBlocks.filter(b => b.completed).length,
          };
        });

        return { groupId: g.id, groupName: g.name, groupColor: g.color, volunteers };
      });

      result.push({
        briefingId: briefing.id,
        briefingTitle: briefing.title,
        groups: groupsProgress.filter(g => g.volunteers.length > 0),
      });
    }

    setBriefingsProgress(result);
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
        ) : briefingsProgress.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{l.noData}</p>
        ) : (
          <div className="space-y-6">
            {briefingsProgress.map(bp => (
              <div key={bp.briefingId}>
                {briefingsProgress.length > 1 && (
                  <h3 className="text-sm font-semibold text-foreground mb-3">{bp.briefingTitle}</h3>
                )}
                {bp.groups.map(group => (
                  <div key={group.groupId} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.groupColor }} />
                      <span className="text-sm font-semibold text-foreground">{group.groupName}</span>
                    </div>

                    <div className="space-y-2">
                      {group.volunteers.map(vol => {
                        const pct = vol.totalBlocks > 0 ? Math.round((vol.completedBlocks / vol.totalBlocks) * 100) : 0;
                        const volKey = `${bp.briefingId}-${group.groupId}-${vol.volunteerId}`;
                        const isExpanded = expandedVols.has(volKey);

                        return (
                          <div key={vol.volunteerId} className="bg-muted/30 rounded-xl p-3 space-y-2">
                            <button
                              onClick={() => toggleVol(volKey)}
                              className="flex items-center justify-between w-full text-left"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                                <span className="text-sm font-medium text-foreground">{vol.volunteerName}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {vol.completedBlocks}/{vol.totalBlocks} {l.sections}
                                {pct === 100 && ' ✓'}
                              </span>
                            </button>
                            <Progress value={pct} className="h-2" />

                            {isExpanded && (
                              <div className="space-y-1.5 pt-1">
                                {vol.blocks.map(block => (
                                  <div key={block.blockId}>
                                    <div className="flex items-center gap-2 text-xs">
                                      {block.completed
                                        ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                        : <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                      }
                                      <span className={block.completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                                        {block.blockTitle}
                                      </span>
                                    </div>
                                    {block.checklistItems && block.checklistItems.length > 0 && (
                                      <div className="ml-6 mt-1 space-y-0.5">
                                        {block.checklistItems.map((ci, idx) => (
                                          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                            {ci.checked
                                              ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                              : <Circle className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                            }
                                            <span className={ci.checked ? 'text-muted-foreground line-through' : 'text-muted-foreground'}>
                                              {ci.label}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BriefingProgressDialog;
