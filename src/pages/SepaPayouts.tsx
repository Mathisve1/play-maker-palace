import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, FileSignature, Loader2, AlertTriangle,
  CheckCircle, Clock, Building2, Users, Euro, Search, Ban,
  FileText, History, ChevronDown, ChevronUp, RotateCcw, Flag,
  FileSpreadsheet, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import ClubPageLayout from '@/components/ClubPageLayout';
import NotificationBell from '@/components/NotificationBell';
import { BELGIAN_BANKS, findBic } from '@/components/OnboardingForm';
import { DocusealForm } from '@docuseal/react';
import { generateAccountingPdf, type BatchItemForPdf } from '@/lib/generateAccountingPdf';

interface PayableVolunteer {
  volunteerId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  iban: string;
  bic: string;
  holderName: string;
  amount: number;
  taskTitle: string;
  taskId: string;
  taskDate: string | null;
  signupId: string;
  ibanValid: boolean;
}

interface SepaBatch {
  id: string;
  batch_reference: string;
  batch_message: string | null;
  total_amount: number;
  item_count: number;
  status: string;
  created_at: string;
  signer_name: string | null;
  docuseal_document_url: string | null;
}

interface SepaBatchItem {
  id: string;
  batch_id: string;
  volunteer_id: string;
  task_id: string;
  amount: number;
  iban: string;
  bic: string | null;
  holder_name: string | null;
  status: string;
  error_flag: boolean;
  error_message: string | null;
}

const validateIban = (iban: string): boolean => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) return false;
  return true;
};

const SepaPayouts = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { clubId: contextClubId, clubInfo, userId: contextUserId } = useClubContext();

  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [payables, setPayables] = useState<PayableVolunteer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [batchMessage, setBatchMessage] = useState('');
  const [clubIban, setClubIban] = useState('');
  const [clubBic, setClubBic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [showSigningDialog, setShowSigningDialog] = useState(false);
  const [batches, setBatches] = useState<SepaBatch[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingDownloadBatchId, setPendingDownloadBatchId] = useState<string | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadBatchRef, setDownloadBatchRef] = useState('');
  const [downloadXmlContent, setDownloadXmlContent] = useState<string | null>(null);
  const [downloadDocUrl, setDownloadDocUrl] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<Record<string, SepaBatchItem[]>>({});
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [flaggingItem, setFlaggingItem] = useState<string | null>(null);
  const [rollbackSigningUrl, setRollbackSigningUrl] = useState<string | null>(null);
  const [rollbackBatchId, setRollbackBatchId] = useState<string | null>(null);
  const [showRollbackSigningDialog, setShowRollbackSigningDialog] = useState(false);

  useEffect(() => {
    init();
  }, [contextClubId]);

  const init = async () => {
    setLoading(true);
    if (!contextClubId || !contextUserId) { setLoading(false); return; }
    setCurrentUserId(contextUserId);
    setClubId(contextClubId);
    setClubName(clubInfo?.name || '');

    // Fetch tasks with expense reimbursement
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, task_date, expense_amount, compensation_type')
      .eq('club_id', contextClubId!)
      .eq('expense_reimbursement', true);

    if (!tasks || tasks.length === 0) { setLoading(false); return; }

    // Fetch assigned signups
    const taskIds = tasks.map(t => t.id);
    const { data: signups } = await supabase
      .from('task_signups')
      .select('id, task_id, volunteer_id, status')
      .in('task_id', taskIds)
      .eq('status', 'accepted');

    if (!signups || signups.length === 0) { setLoading(false); return; }

    // Fetch volunteer profiles
    const volunteerIds = [...new Set(signups.map(s => s.volunteer_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, bank_iban, bank_bic, bank_holder_name')
      .in('id', volunteerIds) as any;

    // Fetch existing SEPA batch items to exclude already-processed volunteers
    const { data: existingItems } = await supabase
      .from('sepa_batch_items')
      .select('volunteer_id, task_id, batch_id')
      .in('task_id', taskIds);

    // Also fetch existing volunteer_payments with completed status
    const { data: existingPayments } = await supabase
      .from('volunteer_payments')
      .select('volunteer_id, task_id, status')
      .in('task_id', taskIds)
      .in('status', ['paid', 'completed']);

    const paidSet = new Set([
      ...(existingItems || []).map(i => `${i.volunteer_id}-${i.task_id}`),
      ...(existingPayments || []).map(p => `${p.volunteer_id}-${p.task_id}`),
    ]);

    const payableList: PayableVolunteer[] = [];
    for (const signup of signups) {
      if (paidSet.has(`${signup.volunteer_id}-${signup.task_id}`)) continue;
      const task = tasks.find(t => t.id === signup.task_id);
      const profile = profiles?.find(p => p.id === signup.volunteer_id);
      if (!task || !profile) continue;

      const iban = (profile.bank_iban || '').replace(/\s/g, '').toUpperCase();
      const bic = (profile as any).bank_bic || '';

      payableList.push({
        volunteerId: profile.id,
        fullName: profile.full_name || t3('Onbekend', 'Inconnu', 'Unknown'),
        email: profile.email || '',
        avatarUrl: profile.avatar_url,
        iban,
        bic,
        holderName: profile.bank_holder_name || profile.full_name || '',
        amount: Number(task.expense_amount) || 0,
        taskTitle: task.title,
        taskId: task.id,
        taskDate: task.task_date,
        signupId: signup.id,
        ibanValid: validateIban(iban),
      });
    }

    setPayables(payableList);

    // Fetch batch history
    const { data: batchHistory } = await supabase
      .from('sepa_batches')
      .select('id, batch_reference, batch_message, total_amount, item_count, status, created_at, signer_name, docuseal_document_url')
      .eq('club_id', contextClubId!)
      .order('created_at', { ascending: false })
      .limit(20);

    setBatches((batchHistory as SepaBatch[]) || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return payables;
    const q = search.toLowerCase();
    return payables.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      p.taskTitle.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  }, [payables, search]);

  const selectableFiltered = filtered.filter(p => p.ibanValid && p.amount > 0);

  const toggleAll = () => {
    if (selected.size === selectableFiltered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableFiltered.map(p => `${p.volunteerId}-${p.taskId}`)));
    }
  };

  const toggleOne = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const selectedPayables = payables.filter(p => selected.has(`${p.volunteerId}-${p.taskId}`));
  const totalAmount = selectedPayables.reduce((sum, p) => sum + p.amount, 0);

  const handleGenerateSepa = async () => {
    if (selected.size === 0) return;
    if (!clubIban.trim()) {
      toast.error(t3('Vul het IBAN van de club in', 'Veuillez saisir l\'IBAN du club', 'Please enter the club IBAN'));
      return;
    }
    if (!batchMessage.trim()) {
      toast.error(t3('Vul een batch mededeling in', 'Veuillez saisir un message de lot', 'Please enter a batch message'));
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const batchRef = `SEPA-${Date.now().toString(36).toUpperCase()}`;

      // Create batch in DB
      const { data: batch, error: batchError } = await supabase
        .from('sepa_batches')
        .insert({
          club_id: clubId!,
          created_by: session.user.id,
          total_amount: totalAmount,
          item_count: selected.size,
          batch_reference: batchRef,
          batch_message: batchMessage,
        })
        .select()
        .single();

      if (batchError || !batch) throw new Error(batchError?.message || 'Failed to create batch');

      // Create batch items
      const items = selectedPayables.map(p => ({
        batch_id: batch.id,
        volunteer_id: p.volunteerId,
        task_id: p.taskId,
        amount: p.amount,
        iban: p.iban,
        bic: p.bic,
        holder_name: p.holderName,
      }));

      const { error: itemsError } = await supabase
        .from('sepa_batch_items')
        .insert(items);

      if (itemsError) throw new Error(itemsError.message);

      // Generate XML
      const cleanIban = clubIban.replace(/\s/g, '').toUpperCase();
      const xmlRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sepa-generate?action=generate-xml`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batchId: batch.id,
            clubIban: cleanIban,
            clubBic: clubBic.replace(/\s/g, '').toUpperCase(),
          }),
        }
      );

      const xmlData = await xmlRes.json();
      if (!xmlRes.ok || !xmlData.success) throw new Error(xmlData.error || 'XML generation failed');

      setCurrentBatchId(batch.id);

      // Get user profile for signer info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user.id)
        .single();

      // Create DocuSeal signing
      const signRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sepa-generate?action=create-signing`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batchId: batch.id,
            signerName: profile?.full_name || session.user.email,
            signerEmail: profile?.email || session.user.email,
          }),
        }
      );

      const signData = await signRes.json();
      if (!signRes.ok || !signData.success) throw new Error(signData.error || 'Signing creation failed');

      setSigningUrl(signData.signingUrl);
      setShowSigningDialog(true);
      toast.success(t3('SEPA batch aangemaakt. Onderteken nu het document.', 'Lot SEPA créé. Signez le document.', 'SEPA batch created. Sign the document now.'));
    } catch (err: any) {
      toast.error(err.message || 'Er ging iets mis');
    }
    setGenerating(false);
  };

  const handleSigningComplete = async () => {
    setShowSigningDialog(false);
    setSigningUrl(null);
    
    if (!currentBatchId) return;

    // Poll for signed status
    toast.info(t3('Verwerken... Even geduld.', 'Traitement... Veuillez patienter.', 'Processing... Please wait.'));
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from('sepa_batches')
        .select('status, xml_content, batch_reference, docuseal_document_url')
        .eq('id', currentBatchId)
        .single();

      if (data?.status === 'signed' || attempts > 30) {
        clearInterval(poll);
        if (data?.status === 'signed' && data.xml_content) {
          // Show download dialog instead of auto-downloading
          setDownloadBatchRef(data.batch_reference);
          setDownloadXmlContent(data.xml_content);
          setDownloadDocUrl(data.docuseal_document_url || null);
          setPendingDownloadBatchId(currentBatchId);
          setShowDownloadDialog(true);
          setSelected(new Set());
          init(); // Refresh
        } else if (attempts > 30) {
          toast.error(t3('Ondertekening niet ontvangen. Probeer opnieuw.', 'Signature non reçue. Réessayez.', 'Signature not received. Please try again.'));
        }
      }
    }, 2000);
  };

  const handleDownloadBatchXml = async (batchId: string) => {
    const { data } = await supabase
      .from('sepa_batches')
      .select('xml_content, batch_reference, docuseal_document_url, status')
      .eq('id', batchId)
      .single();
    
    if (!data || !data.xml_content || !['signed', 'downloaded'].includes(data.status)) {
      toast.error(t3('Batch is niet ondertekend of XML ontbreekt.', 'Lot non signé ou XML manquant.', 'Batch not signed or XML missing.'));
      return;
    }

    setDownloadBatchRef(data.batch_reference);
    setDownloadXmlContent(data.xml_content);
    setDownloadDocUrl(data.docuseal_document_url || null);
    setPendingDownloadBatchId(batchId);
    setShowDownloadDialog(true);
  };

  const performDownloadXml = async () => {
    if (!downloadXmlContent || !pendingDownloadBatchId) return;
    downloadXml(downloadXmlContent, `${downloadBatchRef}.xml`);

    // Mark as downloaded
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sepa-generate?action=mark-downloaded`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batchId: pendingDownloadBatchId }),
        }
      );
    }
    toast.success(t3('SEPA XML gedownload!', 'SEPA XML téléchargé !', 'SEPA XML downloaded!'));
    init();
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadXml = (content: string, filename: string) => {
    downloadFile(content, filename, 'application/xml');
  };

  const handleDownloadAccountingPdf = async (batchId: string) => {
    try {
      // Get batch info
      const batch = batches.find(b => b.id === batchId);
      if (!batch || !['signed', 'downloaded'].includes(batch.status)) {
        toast.error(t3('Batch moet eerst ondertekend zijn.', 'Le lot doit d\'abord être signé.', 'Batch must be signed first.'));
        return;
      }

      // Get batch items with task details
      let items = batchItems[batchId];
      if (!items) {
        const { data } = await supabase
          .from('sepa_batch_items')
          .select('*')
          .eq('batch_id', batchId);
        if (!data || data.length === 0) {
          toast.error(t3('Geen items in batch', 'Aucun élément dans le lot', 'No items in batch'));
          return;
        }
        items = data as SepaBatchItem[];
        setBatchItems(prev => ({ ...prev, [batchId]: items! }));
      }

      // Get task details for each item
      const taskIds = [...new Set(items.map(i => i.task_id))];
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, task_date')
        .in('id', taskIds);
      const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);

      // Get volunteer names
      const volIds = [...new Set(items.map(i => i.volunteer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', volIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || '']) || []);

      const pdfItems: BatchItemForPdf[] = items.map(item => {
        const task = taskMap.get(item.task_id);
        return {
          holder_name: item.holder_name,
          iban: item.iban,
          bic: item.bic,
          amount: item.amount,
          task_title: task?.title || '—',
          task_date: task?.task_date || null,
          volunteer_name: profileMap.get(item.volunteer_id) || item.holder_name || 'Onbekend',
          error_flag: item.error_flag,
        };
      });

      const doc = generateAccountingPdf({
        batchReference: batch.batch_reference,
        batchMessage: batch.batch_message,
        clubName,
        clubIban,
        signerName: batch.signer_name,
        createdAt: batch.created_at,
        totalAmount: Number(batch.total_amount),
        itemCount: batch.item_count,
        items: pdfItems,
        language,
      });

      const filePrefix = t3('Verantwoordingsstuk', 'Justificatif', 'AccountingDoc');
      doc.save(`${filePrefix}-${batch.batch_reference}.pdf`);
      toast.success(t3('Boekhoudkundig verantwoordingsstuk gedownload!', 'Justificatif comptable téléchargé !', 'Accounting document downloaded!'));
    } catch (err: any) {
      toast.error(err.message || t3('PDF generatie mislukt', 'Échec de la génération PDF', 'PDF generation failed'));
    }
  };

  const handleDownloadCsv = async (batchId: string) => {
    const items = batchItems[batchId] || [];
    if (items.length === 0) {
      // Fetch items first
      const { data } = await supabase
        .from('sepa_batch_items')
        .select('*')
        .eq('batch_id', batchId)
        .eq('error_flag', false);
      if (!data || data.length === 0) {
        toast.error(t3('Geen items in batch', 'Aucun élément dans le lot', 'No items in batch'));
        return;
      }
      const batch = batches.find(b => b.id === batchId);
      const csvContent = generateCsv(data as SepaBatchItem[], batch?.batch_message || '');
      downloadFile(csvContent, `${batch?.batch_reference || 'batch'}.csv`, 'text/csv;charset=utf-8');
    } else {
      const validItems = items.filter(i => !i.error_flag);
      const batch = batches.find(b => b.id === batchId);
      const csvContent = generateCsv(validItems, batch?.batch_message || '');
      downloadFile(csvContent, `${batch?.batch_reference || 'batch'}.csv`, 'text/csv;charset=utf-8');
    }
    toast.success(t3('CSV gedownload!', 'CSV téléchargé !', 'CSV downloaded!'));
  };

  const generateCsv = (items: SepaBatchItem[], message: string): string => {
    const header = t3('Naam,IBAN,BIC,Bedrag,Mededeling', 'Nom,IBAN,BIC,Montant,Message', 'Name,IBAN,BIC,Amount,Message');
    const rows = items.map(item => {
      const name = (item.holder_name || '').replace(/"/g, '""');
      const iban = item.iban.replace(/\s/g, '');
      const bic = (item.bic || '').replace(/\s/g, '');
      const amount = Number(item.amount).toFixed(2);
      const msg = message.replace(/"/g, '""');
      return `"${name}","${iban}","${bic}","${amount}","${msg}"`;
    });
    return [header, ...rows].join('\n');
  };

  const handleRollback = async (batchId: string) => {
    if (!confirm(t3('Weet je zeker dat je deze batch wilt terugdraaien? Je moet eerst een annuleringsverklaring ondertekenen.', 'Êtes-vous sûr de vouloir annuler ce lot ? Vous devez d\'abord signer une déclaration d\'annulation.', 'Are you sure you want to roll back this batch? You must first sign a cancellation declaration.'))) return;
    setRollingBack(batchId);
    setRollbackBatchId(batchId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get user profile for signer info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user.id)
        .single();

      // Create DocuSeal signing for rollback confirmation
      const batch = batches.find(b => b.id === batchId);
      const signRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sepa-generate?action=create-rollback-signing`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batchId,
            batchReference: batch?.batch_reference || '',
            totalAmount: batch?.total_amount || 0,
            itemCount: batch?.item_count || 0,
            signerName: profile?.full_name || session.user.email,
            signerEmail: profile?.email || session.user.email,
          }),
        }
      );

      const signData = await signRes.json();
      if (!signRes.ok || !signData.success) throw new Error(signData.error || 'Ondertekening aanmaken mislukt');

      setRollbackSigningUrl(signData.signingUrl);
      setShowRollbackSigningDialog(true);
    } catch (err: any) {
      toast.error(err.message || 'Rollback mislukt');
      setRollingBack(null);
      setRollbackBatchId(null);
    }
  };

  const handleRollbackSigningComplete = async () => {
    setShowRollbackSigningDialog(false);
    setRollbackSigningUrl(null);

    if (!rollbackBatchId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Now perform the actual rollback
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sepa-generate?action=rollback`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batchId: rollbackBatchId }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Rollback failed');
      toast.success(t3('Batch verwijderd na ondertekening. Vrijwilligers staan opnieuw in de betaallijst.', 'Lot supprimé après signature. Les bénévoles sont de retour dans la liste de paiement.', 'Batch removed after signing. Volunteers are back in the payment list.'));
      init();
    } catch (err: any) {
      toast.error(err.message || 'Rollback mislukt');
    }
    setRollingBack(null);
    setRollbackBatchId(null);
  };

  const handleFlagItem = async (itemId: string, flag: boolean, message?: string) => {
    setFlaggingItem(itemId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sepa-generate?action=flag-item`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemId, errorFlag: flag, errorMessage: message }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Flag failed');
      toast.success(flag ? t3('Transactie gemarkeerd als fout.', 'Transaction marquée comme erreur.', 'Transaction flagged as error.') : t3('Fout-markering verwijderd.', 'Marqueur d\'erreur supprimé.', 'Error flag removed.'));
      // Update local state
      setBatchItems(prev => {
        const updated = { ...prev };
        for (const batchId of Object.keys(updated)) {
          updated[batchId] = updated[batchId].map(item =>
            item.id === itemId ? { ...item, error_flag: flag, error_message: flag ? (message || 'Fout gemarkeerd') : null } : item
          );
        }
        return updated;
      });
      init();
    } catch (err: any) {
      toast.error(err.message || 'Markering mislukt');
    }
    setFlaggingItem(null);
  };

  const loadBatchItems = async (batchId: string) => {
    if (batchItems[batchId]) {
      setExpandedBatchId(expandedBatchId === batchId ? null : batchId);
      return;
    }
    const { data } = await supabase
      .from('sepa_batch_items')
      .select('*')
      .eq('batch_id', batchId);
    if (data) {
      setBatchItems(prev => ({ ...prev, [batchId]: data as SepaBatchItem[] }));
    }
    setExpandedBatchId(batchId);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> {t3('Open', 'Ouvert', 'Open')}</Badge>;
      case 'awaiting_signature': return <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-200"><FileSignature className="w-3 h-3" /> {t3('Wacht op handtekening', 'En attente de signature', 'Awaiting signature')}</Badge>;
      case 'signed': return <Badge className="gap-1 bg-blue-500/10 text-blue-600 border-blue-200"><CheckCircle className="w-3 h-3" /> {t3('Ondertekend', 'Signé', 'Signed')}</Badge>;
      case 'downloaded': return <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-200"><Download className="w-3 h-3" /> {t3('Geëxporteerd', 'Exporté', 'Exported')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{payables.length}</p>
                <p className="text-xs text-muted-foreground">{t3('Openstaande vergoedingen', 'Remboursements en attente', 'Outstanding reimbursements')}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{selected.size}</p>
                <p className="text-xs text-muted-foreground">{t3('Geselecteerd', 'Sélectionnés', 'Selected')}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Euro className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">€{totalAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{t3('Totaalbedrag geselecteerd', 'Montant total sélectionné', 'Total amount selected')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Club IBAN + Batch Message */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {t3('Club Bankgegevens & Mededeling', 'Données bancaires & Message', 'Club Bank Details & Message')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t3('Club IBAN *', 'IBAN du club *', 'Club IBAN *')}</label>
              <Input
                value={clubIban}
                onChange={e => {
                  const val = e.target.value.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase();
                  setClubIban(val);
                  // Auto-detect BIC from IBAN country
                }}
                placeholder="BE00 0000 0000 0000"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t3('Club BIC', 'BIC du club', 'Club BIC')}</label>
              <Input
                value={clubBic}
                onChange={e => setClubBic(e.target.value.toUpperCase())}
                placeholder="KREDBEBB"
                className="font-mono text-sm"
                maxLength={11}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t3('Batch Mededeling *', 'Message du lot *', 'Batch Message *')}</label>
              <Input
                value={batchMessage}
                onChange={e => setBatchMessage(e.target.value)}
                placeholder={`Vrijwilligersvergoeding ${clubName} - ${new Date().toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })}`}
                maxLength={140}
              />
            </div>
          </div>
        </div>

        {/* Search + Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t3('Zoek op naam, taak of e-mail...', 'Rechercher par nom, tâche ou e-mail...', 'Search by name, task or email...')}
                className="pl-9"
              />
            </div>
            <Button
              onClick={handleGenerateSepa}
              disabled={selected.size === 0 || generating || !clubIban.trim() || !batchMessage.trim()}
              className="gap-2 w-full sm:w-auto"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Genereren...</>
              ) : (
                <><FileSignature className="w-4 h-4" /> SEPA XML Genereren ({selected.size})</>
              )}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Euro className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">{t3('Geen openstaande vergoedingen', 'Aucun remboursement en attente', 'No outstanding reimbursements')}</p>
              <p className="text-sm mt-1">{t3('Alle vrijwilligers zijn uitbetaald of er zijn geen taken met onkostenvergoeding.', 'Tous les bénévoles sont payés ou aucune tâche avec remboursement.', 'All volunteers are paid or no tasks with reimbursement.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selected.size === selectableFiltered.length && selectableFiltered.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>{t3('Vrijwilliger', 'Bénévole', 'Volunteer')}</TableHead>
                    <TableHead>{t3('Taak', 'Tâche', 'Task')}</TableHead>
                    <TableHead>{t3('Datum', 'Date', 'Date')}</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>BIC</TableHead>
                    <TableHead className="text-right">{t3('Bedrag', 'Montant', 'Amount')}</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const key = `${p.volunteerId}-${p.taskId}`;
                    const disabled = !p.ibanValid || p.amount <= 0;
                    return (
                      <TableRow key={key} className={disabled ? 'opacity-60' : ''}>
                        <TableCell>
                          {disabled ? (
                            <div className="w-4 h-4 flex items-center justify-center" title="IBAN ongeldig of bedrag ontbreekt">
                              <Ban className="w-4 h-4 text-destructive" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={selected.has(key)}
                              onCheckedChange={() => toggleOne(key)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={p.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">{p.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">{p.fullName}</p>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.taskTitle}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.taskDate ? new Date(p.taskDate).toLocaleDateString('nl-BE') : '-'}
                        </TableCell>
                        <TableCell>
                          {p.iban ? (
                            <span className={`font-mono text-xs ${p.ibanValid ? 'text-foreground' : 'text-destructive'}`}>
                              {p.iban.replace(/(.{4})/g, '$1 ').trim()}
                            </span>
                          ) : (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {t3('Ontbreekt', 'Manquant', 'Missing')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{p.bic || '-'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-foreground">€{p.amount.toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Clock className="w-3 h-3" /> Open
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Total Bar */}
          {selected.size > 0 && (
            <div className="p-4 bg-primary/5 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selected.size}</span> vrijwilligers geselecteerd
              </p>
              <p className="text-lg font-bold text-foreground">
                Totaal: <span className="text-primary">€{totalAmount.toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Batch History */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 flex items-center justify-between text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Batch Geschiedenis ({batches.length})
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHistory && batches.length > 0 && (
            <div className="border-t border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                     <TableHead>Referentie</TableHead>
                     <TableHead>Mededeling</TableHead>
                     <TableHead>Bedrag</TableHead>
                     <TableHead>Transacties</TableHead>
                     <TableHead>Ondertekenaar</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Datum</TableHead>
                     <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map(b => (
                    <React.Fragment key={b.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => loadBatchItems(b.id)}>
                      <TableCell className="font-mono text-xs">{b.batch_reference}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{b.batch_message || '-'}</TableCell>
                      <TableCell className="font-semibold">€{Number(b.total_amount).toFixed(2)}</TableCell>
                      <TableCell>{b.item_count}</TableCell>
                      <TableCell className="text-sm">{b.signer_name || '-'}</TableCell>
                      <TableCell>{statusBadge(b.status)}</TableCell>
                       <TableCell className="text-sm text-muted-foreground">
                         {new Date(b.created_at).toLocaleDateString('nl-BE')}
                       </TableCell>
                       <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                         <div className="flex items-center gap-1.5 justify-end flex-wrap">
                           {['signed', 'downloaded'].includes(b.status) && (
                             <>
                               <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleDownloadBatchXml(b.id)}>
                                 <Download className="w-3.5 h-3.5" /> XML
                               </Button>
                               <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleDownloadAccountingPdf(b.id)}>
                                 <FileText className="w-3.5 h-3.5" /> PDF
                               </Button>
                               <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleDownloadCsv(b.id)}>
                                 <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                               </Button>
                             </>
                           )}
                           {['signed', 'downloaded'].includes(b.status) && (
                             <Button
                               size="sm"
                               variant="outline"
                               className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                               onClick={() => handleRollback(b.id)}
                               disabled={rollingBack === b.id}
                             >
                               {rollingBack === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                               Terugdraaien
                             </Button>
                           )}
                           {!['signed', 'downloaded'].includes(b.status) && b.status !== 'awaiting_signature' && (
                             <span className="text-xs text-muted-foreground">—</span>
                           )}
                         </div>
                       </TableCell>
                    </TableRow>
                    {/* Expandable batch items */}
                    {expandedBatchId === b.id && batchItems[b.id] && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0 bg-muted/10">
                          <div className="p-4 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Transacties in batch</p>
                            {batchItems[b.id].map(item => (
                              <div key={item.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${item.error_flag ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{item.holder_name || 'Onbekend'}</p>
                                    <p className="text-xs font-mono text-muted-foreground">{item.iban}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="font-semibold text-foreground">€{Number(item.amount).toFixed(2)}</span>
                                  {item.error_flag && (
                                    <span className="text-xs text-destructive flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      {item.error_message || 'Fout'}
                                    </span>
                                  )}
                                  <Button
                                    size="sm"
                                    variant={item.error_flag ? 'outline' : 'ghost'}
                                    className={`gap-1 text-xs ${item.error_flag ? 'text-foreground' : 'text-destructive'}`}
                                    disabled={flaggingItem === item.id}
                                    onClick={() => {
                                      if (item.error_flag) {
                                        handleFlagItem(item.id, false);
                                      } else {
                                        const msg = prompt('Reden voor fout-markering (bijv. "IBAN onbekend"):');
                                        if (msg !== null) {
                                          handleFlagItem(item.id, true, msg || 'Fout gemarkeerd');
                                        }
                                      }
                                    }}
                                  >
                                    {flaggingItem === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
                                    {item.error_flag ? 'Markering opheffen' : 'Markeer als fout'}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {showHistory && batches.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground border-t border-border">
              Nog geen batches aangemaakt.
            </div>
          )}
        </div>
      </div>

      {/* DocuSeal Signing Dialog */}
      <Dialog open={showSigningDialog} onOpenChange={(open) => {
        if (!open) {
          handleSigningComplete();
        }
        setShowSigningDialog(open);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" />
              SEPA Uitbetalingsverklaring Ondertekenen
            </DialogTitle>
            <DialogDescription>
              Onderteken de verklaring om het SEPA XML-bestand te downloaden. Na ondertekening worden vrijwilligers automatisch genotificeerd.
            </DialogDescription>
          </DialogHeader>
          {signingUrl ? (
            <DocusealForm
              src={signingUrl}
              withTitle={false}
              withSendCopyButton={false}
              onComplete={() => handleSigningComplete()}
              className="w-full"
            />
          ) : (
            <div className="h-[500px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Download Dialog after signing */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Batch ondertekend!
            </DialogTitle>
            <DialogDescription>
              De SEPA batch <span className="font-mono font-semibold">{downloadBatchRef}</span> is succesvol ondertekend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button
              className="w-full gap-2"
              onClick={() => {
                performDownloadXml();
              }}
            >
              <Download className="w-4 h-4" /> SEPA XML Downloaden
            </Button>
            {pendingDownloadBatchId && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleDownloadCsv(pendingDownloadBatchId!)}
              >
                <FileSpreadsheet className="w-4 h-4" /> CSV Downloaden
              </Button>
            )}
            {downloadDocUrl && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  window.open(downloadDocUrl, '_blank');
                }}
              >
                <FileSignature className="w-4 h-4" /> Ondertekende Verklaring Downloaden
              </Button>
            )}

            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Boekhoudkundig Verantwoordingsstuk
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Dit PDF-document bevat een gedetailleerd overzicht van alle vrijwilligers, hun taken, data en vergoedingen. 
                Bewaar dit document in je boekhouding als bewijs voor de uitbetaling conform de Belgische vrijwilligerswet.
              </p>
              {pendingDownloadBatchId && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleDownloadAccountingPdf(pendingDownloadBatchId!)}
                >
                  <FileText className="w-4 h-4" /> Verantwoordingsstuk PDF Downloaden
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setShowDownloadDialog(false)}
            >
              Sluiten
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rollback Signing Dialog */}
      <Dialog open={showRollbackSigningDialog} onOpenChange={(open) => {
        if (!open && !rollbackSigningUrl) {
          setRollingBack(null);
          setRollbackBatchId(null);
        }
        setShowRollbackSigningDialog(open);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-destructive" />
              Annuleringsverklaring Ondertekenen
            </DialogTitle>
            <DialogDescription>
              Onderteken deze verklaring om de batch terug te draaien. Na ondertekening worden de vrijwilligers opnieuw beschikbaar in de betaallijst.
            </DialogDescription>
          </DialogHeader>
          {rollbackSigningUrl ? (
            <DocusealForm
              src={rollbackSigningUrl}
              withTitle={false}
              withSendCopyButton={false}
              onComplete={() => handleRollbackSigningComplete()}
              className="w-full"
            />
          ) : (
            <div className="h-[500px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClubPageLayout>
  );
};

export default SepaPayouts;
