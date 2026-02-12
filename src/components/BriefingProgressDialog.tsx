import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { CheckCircle, Circle, Users, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [selectedVolunteer, setSelectedVolunteer] = useState<{ volunteerId: string; volunteerName: string; briefingId: string; groupId: string } | null>(null);
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

  // Find selected volunteer's data
  const selectedVolData = selectedVolunteer
    ? briefingsProgress
        .find(bp => bp.briefingId === selectedVolunteer.briefingId)
        ?.groups.find(g => g.groupId === selectedVolunteer.groupId)
        ?.volunteers.find(v => v.volunteerId === selectedVolunteer.volunteerId)
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelectedVolunteer(null); onOpenChange(o); }}>
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
        ) : selectedVolunteer && selectedVolData ? (
          /* ─── Detail view: selected volunteer ─── */
          <div className="space-y-4">
            <button
              onClick={() => setSelectedVolunteer(null)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              {language === 'nl' ? 'Terug' : language === 'fr' ? 'Retour' : 'Back'}
            </button>

            <div>
              <h3 className="text-sm font-semibold text-foreground">{selectedVolData.volunteerName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedVolData.completedBlocks}/{selectedVolData.totalBlocks} {l.sections}
              </p>
              <Progress value={selectedVolData.totalBlocks > 0 ? (selectedVolData.completedBlocks / selectedVolData.totalBlocks) * 100 : 0} className="h-2 mt-2" />
            </div>

            <div className="space-y-2">
              {selectedVolData.blocks.map(block => (
                <div key={block.blockId} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    {block.completed
                      ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <span className={block.completed ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}>
                      {block.blockTitle}
                    </span>
                  </div>
                  {block.checklistItems && block.checklistItems.length > 0 && (
                    <div className="ml-6 mt-2 space-y-1">
                      {block.checklistItems.map((ci, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          {ci.checked
                            ? <CheckCircle className="w-3 h-3 text-green-600 shrink-0" />
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
          </div>
        ) : (
          /* ─── Overview: flat list of volunteer names only ─── */
          <div className="space-y-2">
            {briefingsProgress.map(bp => {
              // Deduplicate volunteers across groups
              const seenVols = new Map<string, { vol: VolunteerProgress; briefingId: string; groupId: string }>();
              bp.groups.forEach(group => {
                group.volunteers.forEach(vol => {
                  if (!seenVols.has(vol.volunteerId)) {
                    seenVols.set(vol.volunteerId, { vol, briefingId: bp.briefingId, groupId: group.groupId });
                  }
                });
              });

              return Array.from(seenVols.entries()).map(([volId, { vol, briefingId, groupId }]) => {
                const pct = vol.totalBlocks > 0 ? Math.round((vol.completedBlocks / vol.totalBlocks) * 100) : 0;
                return (
                  <button
                    key={`${bp.briefingId}-${volId}`}
                    onClick={() => setSelectedVolunteer({ volunteerId: vol.volunteerId, volunteerName: vol.volunteerName, briefingId, groupId })}
                    className="w-full text-left bg-muted/30 rounded-xl p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{vol.volunteerName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {vol.completedBlocks}/{vol.totalBlocks} {l.sections}
                        {pct === 100 && ' ✓'}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </button>
                );
              });
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BriefingProgressDialog;
