import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { CheckCircle, Circle, Users, ChevronDown, ChevronRight, ChevronLeft, CreditCard, FileText, FileSignature, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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
  const [briefingPdfUrls, setBriefingPdfUrls] = useState<Map<string, string>>(new Map());
  const [contractUrls, setContractUrls] = useState<Map<string, string>>(new Map());
  const navigate = useNavigate();
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
            volunteerName: prof?.full_name || prof?.email || (language === 'nl' ? 'Onbekend' : language === 'fr' ? 'Inconnu' : 'Unknown'),
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

    // Load briefing PDF URLs from chat messages and contract URLs
    const pdfMap = new Map<string, string>();
    const ctrMap = new Map<string, string>();

    // Get all volunteer IDs
    const allVolIds = [...new Set(result.flatMap(bp => bp.groups.flatMap(g => g.volunteers.map(v => v.volunteerId))))];

    if (allVolIds.length > 0) {
      // Find briefing PDFs sent via chat (messages with attachment_type='document' and briefing in content)
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, volunteer_id')
        .eq('task_id', taskId)
        .in('volunteer_id', allVolIds);

      if (convos && convos.length > 0) {
        const convoIds = convos.map(c => c.id);
        const convoVolMap = new Map(convos.map(c => [c.id, c.volunteer_id]));

        const { data: msgs } = await supabase
          .from('messages')
          .select('conversation_id, attachment_url, content')
          .in('conversation_id', convoIds)
          .eq('attachment_type', 'document')
          .not('attachment_url', 'is', null)
          .order('created_at', { ascending: false });

        if (msgs) {
          for (const msg of msgs) {
            const volId = convoVolMap.get(msg.conversation_id);
            if (volId && !pdfMap.has(volId) && msg.content?.includes('📋')) {
              pdfMap.set(volId, msg.attachment_url!);
            }
          }
        }
      }

      // Get contract document URLs
      const { data: sigs } = await supabase
        .from('signature_requests')
        .select('volunteer_id, document_url, status')
        .eq('task_id', taskId)
        .in('volunteer_id', allVolIds);

      if (sigs) {
        for (const sig of sigs) {
          if (sig.document_url) {
            ctrMap.set(sig.volunteer_id, sig.document_url);
          }
        }
      }
    }

    setBriefingPdfUrls(pdfMap);
    setContractUrls(ctrMap);
    setLoading(false);
  };

  // Find selected volunteer's data — merge blocks from ALL groups
  const selectedVolData = (() => {
    if (!selectedVolunteer) return null;
    const bp = briefingsProgress.find(b => b.briefingId === selectedVolunteer.briefingId);
    if (!bp) return null;
    const allBlocks: BlockProgress[] = [];
    let totalBlocks = 0;
    let completedBlocks = 0;
    bp.groups.forEach(g => {
      const vol = g.volunteers.find(v => v.volunteerId === selectedVolunteer.volunteerId);
      if (vol) {
        allBlocks.push(...vol.blocks);
        totalBlocks += vol.totalBlocks;
        completedBlocks += vol.completedBlocks;
      }
    });
    if (allBlocks.length === 0) return null;
    return {
      volunteerId: selectedVolunteer.volunteerId,
      volunteerName: selectedVolunteer.volunteerName,
      blocks: allBlocks,
      totalBlocks,
      completedBlocks,
    };
  })();

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
              // Deduplicate volunteers and aggregate blocks across all groups
              const seenVols = new Map<string, { volunteerId: string; volunteerName: string; briefingId: string; groupId: string; totalBlocks: number; completedBlocks: number }>();
              bp.groups.forEach(group => {
                group.volunteers.forEach(vol => {
                  const existing = seenVols.get(vol.volunteerId);
                  if (existing) {
                    existing.totalBlocks += vol.totalBlocks;
                    existing.completedBlocks += vol.completedBlocks;
                  } else {
                    seenVols.set(vol.volunteerId, {
                      volunteerId: vol.volunteerId,
                      volunteerName: vol.volunteerName,
                      briefingId: bp.briefingId,
                      groupId: group.groupId,
                      totalBlocks: vol.totalBlocks,
                      completedBlocks: vol.completedBlocks,
                    });
                  }
                });
              });

              return Array.from(seenVols.values()).map((entry) => {
                const pct = entry.totalBlocks > 0 ? Math.round((entry.completedBlocks / entry.totalBlocks) * 100) : 0;
                const allDone = pct === 100 && entry.totalBlocks > 0;
                return (
                  <div key={`${bp.briefingId}-${entry.volunteerId}`} className="bg-muted/30 rounded-xl p-3 space-y-2">
                    <button
                      onClick={() => setSelectedVolunteer({ volunteerId: entry.volunteerId, volunteerName: entry.volunteerName, briefingId: entry.briefingId, groupId: entry.groupId })}
                      className="w-full text-left hover:bg-muted/50 transition-colors rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{entry.volunteerName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {entry.completedBlocks}/{entry.totalBlocks} {l.sections}
                          {allDone && ' ✓'}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2 mt-2" />
                    </button>

                    {/* Document preview buttons */}
                    {(briefingPdfUrls.has(entry.volunteerId) || contractUrls.has(entry.volunteerId)) && (
                      <div className="flex gap-2 mt-1">
                        {briefingPdfUrls.has(entry.volunteerId) && (
                          <a
                            href={briefingPdfUrls.get(entry.volunteerId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-muted/50 hover:bg-muted text-foreground transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            {language === 'nl' ? 'Briefing PDF' : language === 'fr' ? 'PDF Briefing' : 'Briefing PDF'}
                          </a>
                        )}
                        {contractUrls.has(entry.volunteerId) && (
                          <a
                            href={contractUrls.get(entry.volunteerId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-muted/50 hover:bg-muted text-foreground transition-colors"
                          >
                            <FileSignature className="w-3.5 h-3.5 text-primary" />
                            {language === 'nl' ? 'Contract' : language === 'fr' ? 'Contrat' : 'Contract'}
                          </a>
                        )}
                      </div>
                    )}

                    {allDone && (
                      <Button
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => { onOpenChange(false); navigate('/payments'); }}
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" />
                        {language === 'nl' ? 'Betaling regelen' : language === 'fr' ? 'Gérer le paiement' : 'Manage payment'}
                      </Button>
                    )}
                  </div>
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
