import jsPDF from 'jspdf';

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
}

export function generateAccountingPdf(params: AccountingPdfParams): jsPDF {
  const {
    batchReference,
    batchMessage,
    clubName,
    signerName,
    createdAt,
    totalAmount,
    itemCount,
    items,
    clubIban,
  } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  const addPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
      // Footer on new page
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`${clubName} — ${batchReference}`, margin, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Pagina ${doc.getNumberOfPages()}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }
  };

  // ===== HEADER =====
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('VERANTWOORDINGSSTUK', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Vrijwilligersvergoedingen — Belgisch Vrijwilligersstatuut', margin, y);
  y += 4;
  doc.text('Wet van 3 juli 2005 betreffende de rechten van vrijwilligers (B.S. 29/08/2005)', margin, y);
  y += 8;

  // Line
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== ORGANISATIEGEGEVENS =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Organisatie', margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  const orgDetails = [
    ['Naam:', clubName],
    ['IBAN:', clubIban || '—'],
    ['Verantwoordelijke:', signerName || '—'],
  ];
  for (const [label, value] of orgDetails) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 4.5;
  }
  y += 3;

  // ===== BATCHGEGEVENS =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Batchgegevens', margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  const batchDate = new Date(createdAt);
  const formattedDate = batchDate.toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const batchDetails = [
    ['Referentie:', batchReference],
    ['Datum:', formattedDate],
    ['Mededeling:', batchMessage || '—'],
    ['Aantal transacties:', String(itemCount)],
    ['Totaalbedrag:', `€ ${totalAmount.toFixed(2)}`],
  ];
  for (const [label, value] of batchDetails) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 4.5;
  }
  y += 5;

  // Line
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== DETAILOVERZICHT =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Detailoverzicht Vergoedingen', margin, y);
  y += 6;

  // Table Header
  const colX = {
    nr: margin,
    name: margin + 8,
    task: margin + 48,
    date: margin + 100,
    iban: margin + 125,
    amount: pageWidth - margin,
  };

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);
  doc.text('Nr', colX.nr, y);
  doc.text('Vrijwilliger', colX.name, y);
  doc.text('Taak / Opdracht', colX.task, y);
  doc.text('Datum', colX.date, y);
  doc.text('IBAN', colX.iban, y);
  doc.text('Bedrag', colX.amount, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Table rows
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);

  const validItems = items.filter(i => !i.error_flag);
  let runningTotal = 0;

  validItems.forEach((item, index) => {
    addPageIfNeeded(10);
    
    const name = (item.volunteer_name || item.holder_name || 'Onbekend').substring(0, 25);
    const task = (item.task_title || '—').substring(0, 28);
    const date = item.task_date
      ? new Date(item.task_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';
    const iban = item.iban ? item.iban.replace(/(.{4})/g, '$1 ').trim().substring(0, 22) : '—';
    const amount = `€ ${Number(item.amount).toFixed(2)}`;
    runningTotal += Number(item.amount);

    // Alternate row background
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
  doc.text('TOTAAL', margin, y);
  doc.text(`€ ${runningTotal.toFixed(2)}`, colX.amount, y, { align: 'right' });
  y += 10;

  // ===== WETTELIJK KADER =====
  addPageIfNeeded(45);
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Wettelijk Kader', margin, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  const legalLines = [
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
  ];

  for (const line of legalLines) {
    addPageIfNeeded(5);
    doc.text(line, margin, y);
    y += 3.8;
  }

  y += 6;

  // ===== ONDERTEKENING =====
  addPageIfNeeded(30);
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Ondertekening', margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text(`Opgesteld en digitaal ondertekend door: ${signerName || '—'}`, margin, y);
  y += 4;
  doc.text(`Datum: ${formattedDate}`, margin, y);
  y += 4;
  doc.text('Dit document werd digitaal ondertekend via DocuSeal en heeft bewijskracht', margin, y);
  y += 3.5;
  doc.text('conform de Europese eIDAS-verordening (EU) Nr. 910/2014.', margin, y);
  y += 8;

  doc.text('Handtekening: ____________________________', margin, y);
  y += 4;
  doc.text(`Naam: ${signerName || '____________________________'}`, margin, y);

  // ===== FOOTER on all pages =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `${clubName} — ${batchReference} — Gegenereerd op ${new Date().toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      margin,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(
      `Pagina ${i} van ${totalPages}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  return doc;
}
