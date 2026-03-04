import jsPDF from 'jspdf';
import { Language } from '@/i18n/translations';

export interface BatchItemForPdf {
  holder_name: string | null;
  iban: string;
  bic: string | null;
  amount: number;
  task_title: string;
  task_date: string | null;
  volunteer_name: string;
  error_flag: boolean;
}

export interface AccountingPdfParams {
  batchReference: string;
  batchMessage: string | null;
  clubName: string;
  clubIban: string;
  signerName: string | null;
  createdAt: string;
  totalAmount: number;
  itemCount: number;
  items: BatchItemForPdf[];
  language?: Language;
}

const pdfLabels = {
  nl: {
    title: 'VERANTWOORDINGSSTUK',
    subtitle: 'Vrijwilligersvergoedingen — Belgisch Vrijwilligersstatuut',
    lawRef: 'Wet van 3 juli 2005 betreffende de rechten van vrijwilligers (B.S. 29/08/2005)',
    org: 'Organisatie',
    name: 'Naam:',
    iban: 'IBAN:',
    responsible: 'Verantwoordelijke:',
    batchDetails: 'Batchgegevens',
    reference: 'Referentie:',
    date: 'Datum:',
    message: 'Mededeling:',
    transactionCount: 'Aantal transacties:',
    totalAmount: 'Totaalbedrag:',
    detailOverview: 'Detailoverzicht Vergoedingen',
    nr: 'Nr',
    volunteer: 'Vrijwilliger',
    taskCol: 'Taak / Opdracht',
    dateCol: 'Datum',
    amount: 'Bedrag',
    unknown: 'Onbekend',
    total: 'TOTAAL',
    legalTitle: 'Wettelijk Kader',
    legalLines: [
      'Dit document is opgesteld conform de Belgische wetgeving inzake vrijwilligerswerk:',
      '',
      '• Wet van 3 juli 2005 betreffende de rechten van vrijwilligers',
      '• KB van 20 december 2023 tot vaststelling van de maximumbedragen voor de kostenvergoeding aan vrijwilligers',
      `• Jaarlijks plafond ${new Date().getFullYear()}: € 3.233,91 (forfaitaire kostenvergoeding)`,
      '• Dagplafond: € 40,67 per dag',
      '• Maximaal 190 uren per kwartaal bij dezelfde organisatie',
      '',
      'De bovenstaande vergoedingen zijn kostenvergoedingen (geen loon) en zijn vrijgesteld van',
      'sociale zekerheidsbijdragen en belastingen, mits het jaarlijks plafond niet wordt overschreden.',
      '',
      'Bij overschrijding van het jaarplafond zijn RSZ-bijdragen verschuldigd op het volledige bedrag',
      'conform art. 17 van het KB van 28/11/1969 betreffende de sociale zekerheid.',
    ],
    signatureTitle: 'Ondertekening',
    signedBy: 'Opgesteld en digitaal ondertekend door:',
    digitalSig1: 'Dit document werd digitaal ondertekend via DocuSeal en heeft bewijskracht',
    digitalSig2: 'conform de Europese eIDAS-verordening (EU) Nr. 910/2014.',
    signature: 'Handtekening:',
    nameLine: 'Naam:',
    generatedOn: 'Gegenereerd op',
    page: 'Pagina',
    of: 'van',
  },
  fr: {
    title: 'PIÈCE JUSTIFICATIVE',
    subtitle: 'Indemnités bénévoles — Statut belge du bénévolat',
    lawRef: 'Loi du 3 juillet 2005 relative aux droits des volontaires (M.B. 29/08/2005)',
    org: 'Organisation',
    name: 'Nom :',
    iban: 'IBAN :',
    responsible: 'Responsable :',
    batchDetails: 'Détails du lot',
    reference: 'Référence :',
    date: 'Date :',
    message: 'Communication :',
    transactionCount: 'Nombre de transactions :',
    totalAmount: 'Montant total :',
    detailOverview: 'Détail des indemnités',
    nr: 'N°',
    volunteer: 'Bénévole',
    taskCol: 'Tâche / Mission',
    dateCol: 'Date',
    amount: 'Montant',
    unknown: 'Inconnu',
    total: 'TOTAL',
    legalTitle: 'Cadre légal',
    legalLines: [
      'Ce document est établi conformément à la législation belge sur le bénévolat :',
      '',
      '• Loi du 3 juillet 2005 relative aux droits des volontaires',
      '• AR du 20 décembre 2023 fixant les montants maximaux des indemnités des bénévoles',
      `• Plafond annuel ${new Date().getFullYear()} : € 3.233,91 (indemnité forfaitaire)`,
      '• Plafond journalier : € 40,67 par jour',
      '• Maximum 190 heures par trimestre chez la même organisation',
      '',
      'Les indemnités ci-dessus sont des remboursements de frais (pas un salaire) et sont exonérées',
      'de cotisations sociales et d\'impôts, à condition que le plafond annuel ne soit pas dépassé.',
      '',
      'En cas de dépassement du plafond annuel, des cotisations ONSS sont dues sur la totalité',
      'conformément à l\'art. 17 de l\'AR du 28/11/1969 relatif à la sécurité sociale.',
    ],
    signatureTitle: 'Signature',
    signedBy: 'Établi et signé numériquement par :',
    digitalSig1: 'Ce document a été signé numériquement via DocuSeal et a force probante',
    digitalSig2: 'conformément au règlement européen eIDAS (UE) n° 910/2014.',
    signature: 'Signature :',
    nameLine: 'Nom :',
    generatedOn: 'Généré le',
    page: 'Page',
    of: 'de',
  },
  en: {
    title: 'ACCOUNTING DOCUMENT',
    subtitle: 'Volunteer Reimbursements — Belgian Volunteer Statute',
    lawRef: 'Law of 3 July 2005 concerning the rights of volunteers (B.S. 29/08/2005)',
    org: 'Organisation',
    name: 'Name:',
    iban: 'IBAN:',
    responsible: 'Responsible:',
    batchDetails: 'Batch Details',
    reference: 'Reference:',
    date: 'Date:',
    message: 'Message:',
    transactionCount: 'Number of transactions:',
    totalAmount: 'Total amount:',
    detailOverview: 'Reimbursement Details',
    nr: 'No',
    volunteer: 'Volunteer',
    taskCol: 'Task / Assignment',
    dateCol: 'Date',
    amount: 'Amount',
    unknown: 'Unknown',
    total: 'TOTAL',
    legalTitle: 'Legal Framework',
    legalLines: [
      'This document is drawn up in accordance with Belgian legislation on volunteering:',
      '',
      '• Law of 3 July 2005 concerning the rights of volunteers',
      '• Royal Decree of 20 December 2023 setting maximum volunteer reimbursement amounts',
      `• Annual limit ${new Date().getFullYear()}: € 3,233.91 (lump-sum reimbursement)`,
      '• Daily limit: € 40.67 per day',
      '• Maximum 190 hours per quarter with the same organisation',
      '',
      'The above reimbursements are expense reimbursements (not wages) and are exempt from',
      'social security contributions and taxes, provided the annual limit is not exceeded.',
      '',
      'If the annual limit is exceeded, social security contributions are due on the full amount',
      'in accordance with Art. 17 of the Royal Decree of 28/11/1969 on social security.',
    ],
    signatureTitle: 'Signature',
    signedBy: 'Prepared and digitally signed by:',
    digitalSig1: 'This document was digitally signed via DocuSeal and has evidential value',
    digitalSig2: 'in accordance with European eIDAS Regulation (EU) No. 910/2014.',
    signature: 'Signature:',
    nameLine: 'Name:',
    generatedOn: 'Generated on',
    page: 'Page',
    of: 'of',
  },
};

export function generateAccountingPdf(params: AccountingPdfParams): jsPDF {
  const {
    batchReference, batchMessage, clubName, signerName,
    createdAt, totalAmount, itemCount, items, clubIban,
  } = params;
  const lang = params.language || 'nl';
  const l = pdfLabels[lang];
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const addPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`${clubName} — ${batchReference}`, margin, doc.internal.pageSize.getHeight() - 8);
      doc.text(`${l.page} ${doc.getNumberOfPages()}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }
  };

  // ===== HEADER =====
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(l.title, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(l.subtitle, margin, y);
  y += 4;
  doc.text(l.lawRef, margin, y);
  y += 8;

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== ORGANISATION =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(l.org, margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  const orgDetails = [
    [l.name, clubName],
    [l.iban, clubIban || '—'],
    [l.responsible, signerName || '—'],
  ];
  for (const [label, value] of orgDetails) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 4.5;
  }
  y += 3;

  // ===== BATCH DETAILS =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(l.batchDetails, margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  const batchDate = new Date(createdAt);
  const formattedDate = batchDate.toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const batchDetails = [
    [l.reference, batchReference],
    [l.date, formattedDate],
    [l.message, batchMessage || '—'],
    [l.transactionCount, String(itemCount)],
    [l.totalAmount, `€ ${totalAmount.toFixed(2)}`],
  ];
  for (const [label, value] of batchDetails) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 4.5;
  }
  y += 5;

  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== DETAIL TABLE =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(l.detailOverview, margin, y);
  y += 6;

  const colX = {
    nr: margin, name: margin + 8, task: margin + 48,
    date: margin + 100, iban: margin + 125, amount: pageWidth - margin,
  };

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);
  doc.text(l.nr, colX.nr, y);
  doc.text(l.volunteer, colX.name, y);
  doc.text(l.taskCol, colX.task, y);
  doc.text(l.dateCol, colX.date, y);
  doc.text('IBAN', colX.iban, y);
  doc.text(l.amount, colX.amount, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);

  const contentWidth = pageWidth - 2 * margin;
  const validItems = items.filter(i => !i.error_flag);
  let runningTotal = 0;

  validItems.forEach((item, index) => {
    addPageIfNeeded(10);
    const name = (item.volunteer_name || item.holder_name || l.unknown).substring(0, 25);
    const task = (item.task_title || '—').substring(0, 28);
    const date = item.task_date
      ? new Date(item.task_date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';
    const iban = item.iban ? item.iban.replace(/(.{4})/g, '$1 ').trim().substring(0, 22) : '—';
    const amount = `€ ${Number(item.amount).toFixed(2)}`;
    runningTotal += Number(item.amount);

    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 3, contentWidth, 5, 'F');
    }

    doc.setTextColor(40);
    doc.text(String(index + 1), colX.nr, y);
    doc.text(name, colX.name, y);
    doc.text(task, colX.task, y);
    doc.text(date, colX.date, y);
    doc.setFontSize(7);
    doc.text(iban, colX.iban, y);
    doc.setFontSize(8);
    doc.text(amount, colX.amount, y, { align: 'right' });
    y += 5;
  });

  // Total line
  addPageIfNeeded(15);
  y += 2;
  doc.setDrawColor(100);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(l.total, margin, y);
  doc.text(`€ ${runningTotal.toFixed(2)}`, colX.amount, y, { align: 'right' });
  y += 10;

  // ===== LEGAL FRAMEWORK =====
  addPageIfNeeded(45);
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(l.legalTitle, margin, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  for (const line of l.legalLines) {
    addPageIfNeeded(5);
    doc.text(line, margin, y);
    y += 3.8;
  }
  y += 6;

  // ===== SIGNATURE =====
  addPageIfNeeded(30);
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(l.signatureTitle, margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text(`${l.signedBy} ${signerName || '—'}`, margin, y);
  y += 4;
  doc.text(`${l.date} ${formattedDate}`, margin, y);
  y += 4;
  doc.text(l.digitalSig1, margin, y);
  y += 3.5;
  doc.text(l.digitalSig2, margin, y);
  y += 8;

  doc.text(`${l.signature} ____________________________`, margin, y);
  y += 4;
  doc.text(`${l.nameLine} ${signerName || '____________________________'}`, margin, y);

  // ===== FOOTER on all pages =====
  const totalPages = doc.getNumberOfPages();
  const genDate = new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`${clubName} — ${batchReference} — ${l.generatedOn} ${genDate}`, margin, doc.internal.pageSize.getHeight() - 8);
    doc.text(`${l.page} ${i} ${l.of} ${totalPages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }

  return doc;
}
