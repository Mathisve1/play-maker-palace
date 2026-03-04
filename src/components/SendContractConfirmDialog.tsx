import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileSignature, Loader2, User, Mail, Phone, Building2, MapPin, Calendar, Clock, Euro } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { ContractBlock } from '@/types/contract';
import ContractPreview from '@/components/ContractPreview';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface VolunteerInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  bank_iban?: string | null;
  bank_holder_name?: string | null;
}

interface TaskInfo {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
  start_time?: string | null;
  end_time?: string | null;
  expense_amount?: number | null;
  expense_reimbursement?: boolean;
  contract_template_id?: string | null;
}

interface SendContractConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: VolunteerInfo;
  task: TaskInfo;
  clubId?: string;
  clubName?: string;
  language: Language;
  onSent: () => void;
}

const labels = {
  nl: {
    title: 'Contract versturen',
    description: 'Controleer de gegevens. Het contract wordt gepersonaliseerd met deze data en vervolgens verstuurd naar de vrijwilliger.',
    volunteerDetails: 'Vrijwilliger',
    taskDetails: 'Taakgegevens',
    send: 'Contract versturen',
    sending: 'PDF genereren & versturen...',
    success: 'Contract verstuurd naar de vrijwilliger!',
    error: 'Er ging iets mis bij het versturen.',
    noTemplate: 'Geen contractsjabloon gekoppeld aan deze taak.',
    templateNotFound: 'Contractsjabloon niet gevonden.',
    noTemplateData: 'Dit sjabloon heeft geen opgeslagen blokstructuur. Open de Contract Builder en sla het opnieuw op.',
    to: 'tot',
    expense: 'Vergoeding',
    noName: 'Naam niet ingevuld',
    noEmail: 'E-mail niet ingevuld',
    noPhone: 'Niet ingevuld',
    skip: 'Later versturen',
    loadingTemplate: 'Sjabloon laden...',
  },
  fr: {
    title: 'Envoyer le contrat',
    description: 'Vérifiez les données. Le contrat sera personnalisé avec ces informations puis envoyé au bénévole.',
    volunteerDetails: 'Bénévole',
    taskDetails: 'Détails de la tâche',
    send: 'Envoyer le contrat',
    sending: 'Génération PDF & envoi...',
    success: 'Contrat envoyé au bénévole!',
    error: "Une erreur est survenue lors de l'envoi.",
    noTemplate: 'Aucun modèle de contrat lié à cette tâche.',
    templateNotFound: 'Modèle de contrat introuvable.',
    noTemplateData: "Ce modèle n'a pas de structure sauvegardée. Ouvrez le Contract Builder et sauvegardez-le.",
    to: 'à',
    expense: 'Indemnité',
    noName: 'Nom non renseigné',
    noEmail: 'E-mail non renseigné',
    noPhone: 'Non renseigné',
    skip: 'Envoyer plus tard',
    loadingTemplate: 'Chargement du modèle...',
  },
  en: {
    title: 'Send contract',
    description: 'Review the details. The contract will be personalized with this data and then sent to the volunteer.',
    volunteerDetails: 'Volunteer',
    taskDetails: 'Task details',
    send: 'Send contract',
    sending: 'Generating PDF & sending...',
    success: 'Contract sent to the volunteer!',
    error: 'Something went wrong while sending.',
    noTemplate: 'No contract template linked to this task.',
    templateNotFound: 'Contract template not found.',
    noTemplateData: 'This template has no saved block structure. Open the Contract Builder and save it again.',
    to: 'to',
    expense: 'Reimbursement',
    noName: 'Name not provided',
    noEmail: 'Email not provided',
    noPhone: 'Not provided',
    skip: 'Send later',
    loadingTemplate: 'Loading template...',
  },
};

const formatDate = (dateStr: string | null, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateLong = (dateStr: string | null, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (dateStr: string | null, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const SendContractConfirmDialog = ({ open, onOpenChange, volunteer, task, clubId, clubName, language, onSent }: SendContractConfirmDialogProps) => {
  const [sending, setSending] = useState(false);
  const [templateBlocks, setTemplateBlocks] = useState<ContractBlock[] | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [fullTask, setFullTask] = useState<any>(null);
  const [clubData, setClubData] = useState<{ name: string; logo_url: string | null; owner_name: string | null } | null>(null);
  const [clubSignatureUrl, setClubSignatureUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const l = labels[language];

  // Load template data and additional info when dialog opens
  useEffect(() => {
    if (!open || !task.contract_template_id) return;

    setLoadingTemplate(true);

    const loadData = async () => {
      // Fetch template_data, full task details, club data in parallel
      const [templateRes, taskRes] = await Promise.all([
        supabase
          .from('contract_templates')
          .select('template_data, club_id')
          .eq('id', task.contract_template_id!)
          .maybeSingle(),
        supabase
          .from('tasks')
          .select('*, clubs(name, logo_url, owner_id)')
          .eq('id', task.id)
          .maybeSingle(),
      ]);

      if (templateRes.data?.template_data) {
        setTemplateBlocks(templateRes.data.template_data as unknown as ContractBlock[]);
      }

      if (taskRes.data) {
        setFullTask(taskRes.data);
        const club = (taskRes.data as any)?.clubs;
        if (club) {
          // Fetch owner name
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', club.owner_id)
            .maybeSingle();
          setClubData({
            name: club.name,
            logo_url: club.logo_url,
            owner_name: ownerProfile?.full_name || null,
          });

          // Check for club signature
          const resolvedClubId = clubId || templateRes.data?.club_id || taskRes.data.club_id;
          if (resolvedClubId) {
            const sigPath = `${resolvedClubId}/signature.png`;
            const { data: sigData } = supabase.storage.from('club-signatures').getPublicUrl(sigPath);
            if (sigData?.publicUrl) {
              try {
                const res = await fetch(sigData.publicUrl, { method: 'HEAD' });
                if (res.ok) setClubSignatureUrl(sigData.publicUrl);
              } catch {}
            }
          }
        }
      }

      setLoadingTemplate(false);
    };

    loadData();
  }, [open, task.contract_template_id, task.id, clubId]);

  // Build field values for the contract
  const buildFieldValues = (): Record<string, string> => {
    const vals: Record<string, string> = {};
    const t = fullTask || task;

    if (volunteer.full_name) vals['Naam'] = volunteer.full_name;
    if (volunteer.email) vals['E-mail'] = volunteer.email;
    if (volunteer.phone) vals['Telefoon'] = volunteer.phone;
    if (volunteer.bank_iban) vals['IBAN'] = volunteer.bank_iban;
    if (volunteer.bank_holder_name) vals['Rekeninghouder'] = volunteer.bank_holder_name;
    if (clubData?.name || clubName) vals['Clubnaam'] = clubData?.name || clubName || '';
    if (t.title) vals['Taak'] = t.title;
    if (t.task_date) vals['Datum'] = formatDateLong(t.task_date) || '';
    if (t.location) vals['Locatie'] = t.location;

    // Time range
    if (t.start_time && t.end_time) {
      const start = formatTime(t.start_time, language);
      const end = formatTime(t.end_time, language);
      vals['Uren'] = `${start} - ${end}`;
    } else if (t.start_time) {
      vals['Uren'] = formatTime(t.start_time, language) || '';
    }

    // Expense
    if (t.expense_reimbursement && t.expense_amount) {
      vals['Onkostenvergoeding'] = `€${Number(t.expense_amount).toFixed(2)}`;
    }

    // Always set Datum if not set
    if (!vals['Datum']) {
      vals['Datum'] = new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    return vals;
  };

  // Generate PDF from the rendered preview with proper page breaks
  const generatePdf = async (): Promise<{ blob: Blob; pages: { start: number; end: number }[]; pxPerMm: number; scale: number }> => {
    const el = previewRef.current;
    if (!el) throw new Error('Preview element not found');

    // Wait a tick for images to render
    await new Promise(r => setTimeout(r, 500));

    const scale = 2;
    const canvas = await html2canvas(el, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const pxPerMm = (794 * scale) / pdfWidth; // pixels per mm at captured scale

    // Get block positions for smart page breaks
    const blockElements = el.querySelectorAll('[data-block]');
    const blockPositions = Array.from(blockElements).map(block => {
      const rect = block as HTMLElement;
      return {
        top: rect.offsetTop * scale,
        bottom: (rect.offsetTop + rect.offsetHeight) * scale,
      };
    });

    const pageHeightPx = pdfPageHeight * pxPerMm;
    const pages: { start: number; end: number }[] = [];
    let currentStart = 0;

    while (currentStart < canvas.height) {
      let targetEnd = currentStart + pageHeightPx;

      if (targetEnd >= canvas.height) {
        pages.push({ start: currentStart, end: canvas.height });
        break;
      }

      // Find optimal break point - look for a gap between blocks near the target end
      let bestBreak = targetEnd;
      for (const block of blockPositions) {
        // If a block straddles the page boundary, break before it
        if (block.top > currentStart && block.top < targetEnd && block.bottom > targetEnd) {
          bestBreak = block.top - 4; // Small padding before the block
          break;
        }
      }

      // Also check if there's a block gap closer to the target
      for (let i = blockPositions.length - 1; i >= 0; i--) {
        const block = blockPositions[i];
        if (block.bottom > currentStart && block.bottom <= targetEnd && block.bottom > targetEnd - pageHeightPx * 0.15) {
          // This block ends within 15% of the page bottom - good break point
          bestBreak = block.bottom + 4;
          break;
        }
      }

      if (bestBreak <= currentStart) bestBreak = targetEnd; // fallback
      pages.push({ start: currentStart, end: Math.min(bestBreak, canvas.height) });
      currentStart = bestBreak;
    }

    // Render each page
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      const page = pages[i];
      const sliceHeight = page.end - page.start;

      // Create a canvas slice for this page
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, page.start, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      }

      const imgData = pageCanvas.toDataURL('image/png');
      const imgHeightMm = (sliceHeight / pxPerMm);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeightMm);
    }

    return { blob: pdf.output('blob'), pages, pxPerMm, scale };
  };

  // Calculate signature field position relative to the PDF page
  const calcSignaturePosition = (
    el: HTMLElement,
    pages: { start: number; end: number }[],
    pxPerMm: number,
    scale: number
  ) => {
    const sigEl = el.querySelector('[data-signature-field]') as HTMLElement | null;
    if (!sigEl) return null;

    const sigTop = sigEl.offsetTop * scale;
    const pdfWidth = 210; // mm
    const pdfPageHeight = 297; // mm

    // Find which page the signature lands on
    let sigPage = 0;
    let sigYOnPage = 0;
    for (let i = 0; i < pages.length; i++) {
      if (sigTop >= pages[i].start && sigTop < pages[i].end) {
        sigPage = i;
        sigYOnPage = (sigTop - pages[i].start) / pxPerMm; // mm from top of this page
        break;
      }
    }

    // Convert to relative coordinates (0-1 range)
    const relY = sigYOnPage / pdfPageHeight;
    // The signature is in the right column (~56% from left)
    const relX = 0.56;

    return { page: sigPage, x: relX, y: relY };
  };

  const handleSend = async () => {
    if (!task.contract_template_id) {
      toast.error(l.noTemplate);
      return;
    }
    if (!templateBlocks || templateBlocks.length === 0) {
      toast.error(l.noTemplateData);
      return;
    }

    setSending(true);
    try {
      // 1. Generate personalized PDF
      const pdfResult = await generatePdf();
      const pdfFile = new File([pdfResult.blob], `contract_${volunteer.id}_${task.id}.pdf`, { type: 'application/pdf' });

      // Calculate dynamic signature position
      const sigPos = previewRef.current
        ? calcSignaturePosition(previewRef.current, pdfResult.pages, pdfResult.pxPerMm, pdfResult.scale)
        : null;

      // 2. Upload to storage
      const resolvedClubId = clubId || fullTask?.club_id || 'unknown';
      const filePath = `${resolvedClubId}/personalized/${Date.now()}_${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contract-templates')
        .upload(filePath, pdfFile, { contentType: 'application/pdf' });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 3. Get signed URL for the PDF
      const { data: urlData } = await supabase.storage
        .from('contract-templates')
        .createSignedUrl(filePath, 600);

      if (!urlData?.signedUrl) throw new Error('Could not get download URL');

      // 4. Call edge function with personalized PDF
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=send-personalized-contract`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdf_url: urlData.signedUrl,
            task_id: task.id,
            volunteer_id: volunteer.id,
            volunteer_email: volunteer.email,
            volunteer_name: volunteer.full_name,
            signature_position: sigPos,
          }),
        }
      );

      const result = await resp.json();
      if (resp.ok && result.success) {
        toast.success(l.success);
        onSent();
        onOpenChange(false);
      } else {
        toast.error(result.error || l.error);
      }
    } catch (err: any) {
      console.error('Send contract error:', err);
      toast.error(err.message || l.error);
    }
    setSending(false);
  };

  const InfoRow = ({ icon: Icon, label, value, muted }: { icon: any; label: string; value: string; muted?: boolean }) => (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={muted ? 'text-muted-foreground/60 italic' : 'text-foreground font-medium'}>{value}</span>
    </div>
  );

  const fieldValues = templateBlocks ? buildFieldValues() : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            {l.title}
          </DialogTitle>
          <DialogDescription>{l.description}</DialogDescription>
        </DialogHeader>

        {loadingTemplate ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{l.loadingTemplate}</span>
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Volunteer details */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{l.volunteerDetails}</p>
              <InfoRow icon={User} label="Naam" value={volunteer.full_name || l.noName} muted={!volunteer.full_name} />
              <InfoRow icon={Mail} label="E-mail" value={volunteer.email || l.noEmail} muted={!volunteer.email} />
              <InfoRow icon={Phone} label="Telefoon" value={volunteer.phone || l.noPhone} muted={!volunteer.phone} />
              {volunteer.bank_iban && (
                <InfoRow icon={Building2} label="IBAN" value={volunteer.bank_iban} />
              )}
            </div>

            {/* Task details */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{l.taskDetails}</p>
              <InfoRow icon={FileSignature} label="Taak" value={task.title} />
              {(clubData?.name || clubName) && <InfoRow icon={Building2} label="Club" value={clubData?.name || clubName || ''} />}
              {task.task_date && <InfoRow icon={Calendar} label="Datum" value={formatDate(task.task_date, language)!} />}
              {task.location && <InfoRow icon={MapPin} label="Locatie" value={task.location} />}
              {(fullTask?.start_time || task.start_time) && (
                <InfoRow
                  icon={Clock}
                  label="Tijd"
                  value={`${formatTime(fullTask?.start_time || task.start_time, language)}${(fullTask?.end_time || task.end_time) ? ` ${l.to} ${formatTime(fullTask?.end_time || task.end_time, language)}` : ''}`}
                />
              )}
              {(fullTask?.expense_reimbursement || task.expense_reimbursement) && (fullTask?.expense_amount || task.expense_amount) && (
                <InfoRow icon={Euro} label={l.expense} value={`€${Number(fullTask?.expense_amount || task.expense_amount).toFixed(2)}`} />
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {l.skip}
          </Button>
          <Button
            className="flex-1"
            onClick={handleSend}
            disabled={sending || !volunteer.email || loadingTemplate || !templateBlocks}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {l.sending}
              </>
            ) : (
              <>
                <FileSignature className="w-4 h-4" />
                {l.send}
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Hidden contract preview for PDF generation */}
      {templateBlocks && templateBlocks.length > 0 && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <ContractPreview
            ref={previewRef}
            blocks={templateBlocks}
            fieldValues={fieldValues}
            clubName={clubData?.name || clubName}
            clubLogoUrl={clubData?.logo_url}
            clubOwnerName={clubData?.owner_name}
            clubSignatureUrl={clubSignatureUrl}
            volunteerName={volunteer.full_name || undefined}
          />
        </div>
      )}
    </Dialog>
  );
};

export default SendContractConfirmDialog;
