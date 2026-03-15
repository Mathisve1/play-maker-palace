import jsPDF from 'jspdf';
import { Language } from '@/i18n/translations';

export interface SeasonReportVolunteer {
  name: string;
  contractType: string;
  taskCount: number;
  hours: number;
  compensation: number;
}

export interface SeasonReportTaskType {
  type: string;
  count: number;
  totalHours: number;
  totalCompensation: number;
}

export interface SeasonReportBatch {
  reference: string;
  date: string;
  itemCount: number;
  totalAmount: number;
  status: string;
}

export interface SeasonReportParams {
  clubName: string;
  clubLogoUrl?: string | null;
  seasonName: string;
  seasonStart: string;
  seasonEnd: string;
  totalVolunteers: number;
  totalTasks: number;
  totalHours: number;
  totalCompensation: number;
  volunteers: SeasonReportVolunteer[];
  taskTypes: SeasonReportTaskType[];
  sepaBatches: SeasonReportBatch[];
  language?: Language;
}

const labels = {
  nl: {
    title: 'SEIZOENSRAPPORT',
    subtitle: 'Vrijwilligersvergoedingen — Belgisch Vrijwilligersstatuut',
    lawRef: 'Wet van 3 juli 2005 betreffende de rechten van vrijwilligers (B.S. 29/08/2005)',
    season: 'Seizoen',
    reportDate: 'Rapportdatum:',
    period: 'Periode:',
    section1: '1. Samenvatting',
    totalVolunteers: 'Totaal vrijwilligers:',
    totalTasks: 'Totaal taken:',
    totalHours: 'Totaal uren:',
    totalCompensation: 'Totaal vergoedingen:',
    section2: '2. Per vrijwilliger',
    name: 'Naam',
    contractType: 'Contracttype',
    tasks: 'Taken',
    hours: 'Uren',
    compensation: 'Vergoeding',
    section3: '3. Verdeling per taaktype',
    type: 'Type',
    count: 'Aantal',
    section4: '4. Financieel overzicht — SEPA batches',
    reference: 'Referentie',
    date: 'Datum',
    items: 'Items',
    amount: 'Bedrag',
    status: 'Status',
    section5: '5. Compliance-verklaring',
    complianceLines: [
      'Hierbij verklaren wij dat alle in dit rapport vermelde vergoedingen zijn uitbetaald',
      'conform de Belgische wetgeving inzake vrijwilligerswerk:',
      '',
      `• Jaarlijks plafond ${new Date().getFullYear()}: € 3.233,91 (forfaitaire kostenvergoeding)`,
      '• Dagplafond: € 40,67 per dag',
      '• Maximaal 190 uren per kwartaal bij dezelfde organisatie',
      '',
      'Alle vergoedingen vallen binnen de wettelijke plafonds. Bij overschrijding werden de',
      'betrokken vrijwilligers geblokkeerd en/of verwerkt via het Artikel 17-regime.',
    ],
    generatedBy: 'Gegenereerd via het platform op',
    version: 'Versie',
    page: 'Pagina',
    of: 'van',
    total: 'TOTAAL',
    noData: '—',
  },
  fr: {
    title: 'RAPPORT DE SAISON',
    subtitle: 'Indemnités bénévoles — Statut belge du bénévolat',
    lawRef: 'Loi du 3 juillet 2005 relative aux droits des volontaires (M.B. 29/08/2005)',
    season: 'Saison',
    reportDate: 'Date du rapport :',
    period: 'Période :',
    section1: '1. Résumé',
    totalVolunteers: 'Total bénévoles :',
    totalTasks: 'Total tâches :',
    totalHours: 'Total heures :',
    totalCompensation: 'Total indemnités :',
    section2: '2. Par bénévole',
    name: 'Nom',
    contractType: 'Type de contrat',
    tasks: 'Tâches',
    hours: 'Heures',
    compensation: 'Indemnité',
    section3: '3. Répartition par type de tâche',
    type: 'Type',
    count: 'Nombre',
    section4: '4. Aperçu financier — lots SEPA',
    reference: 'Référence',
    date: 'Date',
    items: 'Éléments',
    amount: 'Montant',
    status: 'Statut',
    section5: '5. Déclaration de conformité',
    complianceLines: [
      'Nous déclarons par la présente que toutes les indemnités mentionnées dans ce rapport',
      'ont été versées conformément à la législation belge sur le bénévolat :',
      '',
      `• Plafond annuel ${new Date().getFullYear()} : € 3.233,91 (indemnité forfaitaire)`,
      '• Plafond journalier : € 40,67 par jour',
      '• Maximum 190 heures par trimestre chez la même organisation',
      '',
      'Toutes les indemnités respectent les plafonds légaux. En cas de dépassement,',
      'les bénévoles concernés ont été bloqués et/ou traités via le régime Article 17.',
    ],
    generatedBy: 'Généré via la plateforme le',
    version: 'Version',
    page: 'Page',
    of: 'de',
    total: 'TOTAL',
    noData: '—',
  },
  en: {
    title: 'SEASON REPORT',
    subtitle: 'Volunteer Reimbursements — Belgian Volunteer Statute',
    lawRef: 'Law of 3 July 2005 concerning the rights of volunteers (B.S. 29/08/2005)',
    season: 'Season',
    reportDate: 'Report date:',
    period: 'Period:',
    section1: '1. Summary',
    totalVolunteers: 'Total volunteers:',
    totalTasks: 'Total tasks:',
    totalHours: 'Total hours:',
    totalCompensation: 'Total compensations:',
    section2: '2. Per volunteer',
    name: 'Name',
    contractType: 'Contract type',
    tasks: 'Tasks',
    hours: 'Hours',
    compensation: 'Compensation',
    section3: '3. Distribution per task type',
    type: 'Type',
    count: 'Count',
    section4: '4. Financial overview — SEPA batches',
    reference: 'Reference',
    date: 'Date',
    items: 'Items',
    amount: 'Amount',
    status: 'Status',
    section5: '5. Compliance declaration',
    complianceLines: [
      'We hereby declare that all reimbursements mentioned in this report have been paid',
      'in accordance with Belgian legislation on volunteering:',
      '',
      `• Annual limit ${new Date().getFullYear()}: € 3,233.91 (lump-sum reimbursement)`,
      '• Daily limit: € 40.67 per day',
      '• Maximum 190 hours per quarter with the same organisation',
      '',
      'All reimbursements fall within the legal limits. In case of exceeding limits,',
      'the volunteers involved were blocked and/or processed via the Article 17 regime.',
    ],
    generatedBy: 'Generated via the platform on',
    version: 'Version',
    page: 'Page',
    of: 'of',
    total: 'TOTAL',
    noData: '—',
  },
};

export function generateSeasonReport(params: SeasonReportParams): jsPDF {
  const {
    clubName, seasonName, seasonStart, seasonEnd,
    totalVolunteers, totalTasks, totalHours, totalCompensation,
    volunteers, taskTypes, sepaBatches,
  } = params;
  const lang = params.language || 'nl';
  const l = labels[lang];
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const addPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
  };

  const drawSectionTitle = (title: string) => {
    addPageIfNeeded(12);
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(title, margin, y);
    y += 7;
  };

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return d; }
  };

  const fmtCurrency = (n: number) => `€ ${n.toFixed(2)}`;

  // ===== COVER / HEADER =====
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(l.title, margin, y);
  y += 8;

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

  // Club & season info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(clubName, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  const infoRows = [
    [l.season + ':', seasonName],
    [l.period, `${fmtDate(seasonStart)} → ${fmtDate(seasonEnd)}`],
    [l.reportDate, new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ];
  for (const [label, value] of infoRows) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 4.5;
  }
  y += 5;

  // ===== SECTION 1: SUMMARY =====
  drawSectionTitle(l.section1);

  doc.setFontSize(9);
  doc.setTextColor(60);
  const summaryRows = [
    [l.totalVolunteers, String(totalVolunteers)],
    [l.totalTasks, String(totalTasks)],
    [l.totalHours, `${totalHours.toFixed(1)} h`],
    [l.totalCompensation, fmtCurrency(totalCompensation)],
  ];
  for (const [label, value] of summaryRows) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 45, y);
    y += 5;
  }
  y += 3;

  // ===== SECTION 2: PER VOLUNTEER =====
  drawSectionTitle(l.section2);

  const colX2 = { name: margin, contract: margin + 45, tasks: margin + 90, hours: margin + 110, comp: pageWidth - margin };

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);
  doc.text(l.name, colX2.name, y);
  doc.text(l.contractType, colX2.contract, y);
  doc.text(l.tasks, colX2.tasks, y);
  doc.text(l.hours, colX2.hours, y);
  doc.text(l.compensation, colX2.comp, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);
  const contentWidth = pageWidth - 2 * margin;

  volunteers.forEach((vol, index) => {
    addPageIfNeeded(6);
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 3, contentWidth, 5, 'F');
    }
    doc.text(vol.name.substring(0, 28), colX2.name, y);
    doc.text((vol.contractType || l.noData).substring(0, 22), colX2.contract, y);
    doc.text(String(vol.taskCount), colX2.tasks, y);
    doc.text(vol.hours.toFixed(1), colX2.hours, y);
    doc.text(fmtCurrency(vol.compensation), colX2.comp, y, { align: 'right' });
    y += 5;
  });

  // Total
  addPageIfNeeded(10);
  y += 1;
  doc.setDrawColor(100);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(l.total, margin, y);
  doc.text(fmtCurrency(totalCompensation), colX2.comp, y, { align: 'right' });
  y += 8;

  // ===== SECTION 3: PER TASK TYPE =====
  drawSectionTitle(l.section3);

  const colX3 = { type: margin, count: margin + 60, hours: margin + 90, comp: pageWidth - margin };

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);
  doc.text(l.type, colX3.type, y);
  doc.text(l.count, colX3.count, y);
  doc.text(l.hours, colX3.hours, y);
  doc.text(l.compensation, colX3.comp, y, { align: 'right' });
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);

  taskTypes.forEach((tt, index) => {
    addPageIfNeeded(6);
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 3, contentWidth, 5, 'F');
    }
    doc.text(tt.type.substring(0, 35), colX3.type, y);
    doc.text(String(tt.count), colX3.count, y);
    doc.text(tt.totalHours.toFixed(1), colX3.hours, y);
    doc.text(fmtCurrency(tt.totalCompensation), colX3.comp, y, { align: 'right' });
    y += 5;
  });
  y += 5;

  // ===== SECTION 4: SEPA BATCHES =====
  drawSectionTitle(l.section4);

  const colX4 = { ref: margin, date: margin + 45, items: margin + 80, amount: margin + 105, status: pageWidth - margin };

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);
  doc.text(l.reference, colX4.ref, y);
  doc.text(l.date, colX4.date, y);
  doc.text(l.items, colX4.items, y);
  doc.text(l.amount, colX4.amount, y);
  doc.text(l.status, colX4.status, y, { align: 'right' });
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);

  let batchTotal = 0;
  sepaBatches.forEach((batch, index) => {
    addPageIfNeeded(6);
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 3, contentWidth, 5, 'F');
    }
    doc.text(batch.reference.substring(0, 25), colX4.ref, y);
    doc.text(fmtDate(batch.date), colX4.date, y);
    doc.text(String(batch.itemCount), colX4.items, y);
    doc.text(fmtCurrency(batch.totalAmount), colX4.amount, y);
    doc.text(batch.status, colX4.status, y, { align: 'right' });
    batchTotal += batch.totalAmount;
    y += 5;
  });

  addPageIfNeeded(10);
  y += 1;
  doc.setDrawColor(100);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(l.total, margin, y);
  doc.text(fmtCurrency(batchTotal), colX4.amount, y);
  y += 8;

  // ===== SECTION 5: COMPLIANCE =====
  drawSectionTitle(l.section5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  for (const line of l.complianceLines) {
    addPageIfNeeded(5);
    doc.text(line, margin, y);
    y += 3.8;
  }
  y += 8;

  // ===== FOOTER on all pages =====
  const totalPages = doc.getNumberOfPages();
  const genDate = new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`${clubName} — ${seasonName} — ${l.generatedBy} ${genDate} — ${l.version} 1.0`, margin, pageHeight - 8);
    doc.text(`${l.page} ${i} ${l.of} ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}
