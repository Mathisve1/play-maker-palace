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

export interface MonthlyAttendance {
  month: string; // e.g. "2025-01"
  label: string; // e.g. "Jan 2025"
  signups: number;
  attended: number;
  rate: number; // 0-100
}

export interface ContractTypeCompensation {
  contractType: string;
  totalCompensation: number;
  volunteerCount: number;
}

export interface ContractStatusSummary {
  signed: number;
  pending: number;
  sent: number;
  total: number;
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
  // New sections
  monthlyAttendance?: MonthlyAttendance[];
  top5Volunteers?: SeasonReportVolunteer[];
  compensationPerContractType?: ContractTypeCompensation[];
  contractStatus?: ContractStatusSummary;
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
    section1b: '2. Aanwezigheidsgraad per maand',
    month: 'Maand',
    signups: 'Inschrijvingen',
    attended: 'Aanwezig',
    rate: 'Opkomst %',
    section1c: '3. Top 5 meest actieve vrijwilligers',
    rank: '#',
    section1d: '4. Vergoedingen per contracttype',
    volCount: 'Vrijwilligers',
    section1e: '5. Contractstatus',
    signed: 'Ondertekend',
    pending: 'In afwachting',
    open: 'Open',
    total: 'Totaal',
    section2: '6. Per vrijwilliger',
    name: 'Naam',
    contractType: 'Contracttype',
    tasks: 'Taken',
    hours: 'Uren',
    compensation: 'Vergoeding',
    section3: '7. Verdeling per taaktype',
    type: 'Type',
    count: 'Aantal',
    section4: '8. Financieel overzicht — SEPA batches',
    reference: 'Referentie',
    date: 'Datum',
    items: 'Items',
    amount: 'Bedrag',
    status: 'Status',
    section5: '9. Compliance-verklaring',
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
    section1b: '2. Taux de présence par mois',
    month: 'Mois',
    signups: 'Inscriptions',
    attended: 'Présents',
    rate: 'Taux %',
    section1c: '3. Top 5 bénévoles les plus actifs',
    rank: '#',
    section1d: '4. Indemnités par type de contrat',
    volCount: 'Bénévoles',
    section1e: '5. Statut des contrats',
    signed: 'Signés',
    pending: 'En attente',
    open: 'Ouverts',
    total: 'Total',
    section2: '6. Par bénévole',
    name: 'Nom',
    contractType: 'Type de contrat',
    tasks: 'Tâches',
    hours: 'Heures',
    compensation: 'Indemnité',
    section3: '7. Répartition par type de tâche',
    type: 'Type',
    count: 'Nombre',
    section4: '8. Aperçu financier — lots SEPA',
    reference: 'Référence',
    date: 'Date',
    items: 'Éléments',
    amount: 'Montant',
    status: 'Statut',
    section5: '9. Déclaration de conformité',
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
    section1b: '2. Monthly attendance rate',
    month: 'Month',
    signups: 'Sign-ups',
    attended: 'Attended',
    rate: 'Rate %',
    section1c: '3. Top 5 most active volunteers',
    rank: '#',
    section1d: '4. Compensation per contract type',
    volCount: 'Volunteers',
    section1e: '5. Contract status',
    signed: 'Signed',
    pending: 'Pending',
    open: 'Open',
    total: 'Total',
    section2: '6. Per volunteer',
    name: 'Name',
    contractType: 'Contract type',
    tasks: 'Tasks',
    hours: 'Hours',
    compensation: 'Compensation',
    section3: '7. Distribution per task type',
    type: 'Type',
    count: 'Count',
    section4: '8. Financial overview — SEPA batches',
    reference: 'Reference',
    date: 'Date',
    items: 'Items',
    amount: 'Amount',
    status: 'Status',
    section5: '9. Compliance declaration',
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
    noData: '—',
  },
};

export async function generateSeasonReport(params: SeasonReportParams): Promise<jsPDF> {
  const {
    clubName, clubLogoUrl, seasonName, seasonStart, seasonEnd,
    totalVolunteers, totalTasks, totalHours, totalCompensation,
    volunteers, taskTypes, sepaBatches,
    monthlyAttendance, top5Volunteers, compensationPerContractType, contractStatus,
  } = params;
  const lang = params.language || 'nl';
  const l = labels[lang];
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
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

  // ===== LOGO + HEADER =====
  let logoLoaded = false;
  if (clubLogoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = clubLogoUrl;
      });
      const maxH = 14;
      const ratio = img.width / img.height;
      const imgW = maxH * ratio;
      doc.addImage(img, 'PNG', margin, y, Math.min(imgW, 30), maxH);
      logoLoaded = true;
    } catch {
      // Logo load failed, continue without
    }
  }

  const headerX = logoLoaded ? margin + 34 : margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(l.title, headerX, y + 5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(l.subtitle, headerX, y + 11);

  y += (logoLoaded ? 18 : 14);
  doc.setFontSize(8);
  doc.text(l.lawRef, margin, y);
  y += 5;

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

  // ===== SECTION 2: MONTHLY ATTENDANCE =====
  if (monthlyAttendance && monthlyAttendance.length > 0) {
    drawSectionTitle(l.section1b);

    const colMA = { month: margin, signups: margin + 50, attended: margin + 80, rate: margin + 110, bar: margin + 130 };

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80);
    doc.text(l.month, colMA.month, y);
    doc.text(l.signups, colMA.signups, y);
    doc.text(l.attended, colMA.attended, y);
    doc.text(l.rate, colMA.rate, y);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);

    monthlyAttendance.forEach((ma, index) => {
      addPageIfNeeded(7);
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3, contentWidth, 5, 'F');
      }
      doc.text(ma.label, colMA.month, y);
      doc.text(String(ma.signups), colMA.signups, y);
      doc.text(String(ma.attended), colMA.attended, y);
      doc.text(`${ma.rate}%`, colMA.rate, y);

      // Mini bar chart
      const barW = 30;
      const barH = 3;
      doc.setFillColor(230, 230, 230);
      doc.rect(colMA.bar, y - 2.5, barW, barH, 'F');
      if (ma.rate > 0) {
        const r = ma.rate < 50 ? 220 : ma.rate < 75 ? 200 : 59;
        const g = ma.rate < 50 ? 80 : ma.rate < 75 ? 160 : 130;
        const b = ma.rate < 50 ? 80 : ma.rate < 75 ? 50 : 246;
        doc.setFillColor(r, g, b);
        doc.rect(colMA.bar, y - 2.5, (barW * ma.rate) / 100, barH, 'F');
      }
      y += 5;
    });
    y += 3;
  }

  // ===== SECTION 3: TOP 5 VOLUNTEERS =====
  if (top5Volunteers && top5Volunteers.length > 0) {
    drawSectionTitle(l.section1c);

    const colT5 = { rank: margin, name: margin + 8, tasks: margin + 55, hours: margin + 80, comp: pageWidth - margin };

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80);
    doc.text(l.rank, colT5.rank, y);
    doc.text(l.name, colT5.name, y);
    doc.text(l.tasks, colT5.tasks, y);
    doc.text(l.hours, colT5.hours, y);
    doc.text(l.compensation, colT5.comp, y, { align: 'right' });
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);

    top5Volunteers.forEach((vol, i) => {
      addPageIfNeeded(6);
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3, contentWidth, 5, 'F');
      }
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      doc.text(`${medal} ${i + 1}`, colT5.rank, y);
      doc.text(vol.name.substring(0, 30), colT5.name, y);
      doc.text(String(vol.taskCount), colT5.tasks, y);
      doc.text(vol.hours.toFixed(1), colT5.hours, y);
      doc.text(fmtCurrency(vol.compensation), colT5.comp, y, { align: 'right' });
      y += 5;
    });
    y += 3;
  }

  // ===== SECTION 4: COMPENSATION PER CONTRACT TYPE =====
  if (compensationPerContractType && compensationPerContractType.length > 0) {
    drawSectionTitle(l.section1d);

    const colCT = { type: margin, vols: margin + 60, comp: pageWidth - margin };

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80);
    doc.text(l.contractType, colCT.type, y);
    doc.text(l.volCount, colCT.vols, y);
    doc.text(l.compensation, colCT.comp, y, { align: 'right' });
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);

    let ctTotal = 0;
    compensationPerContractType.forEach((ct, i) => {
      addPageIfNeeded(6);
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3, contentWidth, 5, 'F');
      }
      doc.text(ct.contractType.substring(0, 35), colCT.type, y);
      doc.text(String(ct.volunteerCount), colCT.vols, y);
      doc.text(fmtCurrency(ct.totalCompensation), colCT.comp, y, { align: 'right' });
      ctTotal += ct.totalCompensation;
      y += 5;
    });

    addPageIfNeeded(8);
    y += 1;
    doc.setDrawColor(100);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text(l.total, margin, y);
    doc.text(fmtCurrency(ctTotal), colCT.comp, y, { align: 'right' });
    y += 6;
  }

  // ===== SECTION 5: CONTRACT STATUS =====
  if (contractStatus) {
    drawSectionTitle(l.section1e);

    doc.setFontSize(9);
    doc.setTextColor(60);
    const csRows = [
      [l.signed, String(contractStatus.signed)],
      [l.pending, String(contractStatus.pending)],
      [l.open, String(contractStatus.sent)],
      [l.total, String(contractStatus.total)],
    ];

    // Render as colored KPI blocks
    const blockW = contentWidth / 4;
    csRows.forEach(([label, value], i) => {
      const bx = margin + i * blockW;
      addPageIfNeeded(20);
      doc.setFillColor(i === 0 ? 240 : 248, i === 0 ? 253 : 248, i === 0 ? 244 : 248);
      doc.roundedRect(bx + 1, y, blockW - 2, 16, 2, 2, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(i === 3 ? 59 : 30, i === 0 ? 130 : 30, i === 0 ? 70 : 30);
      doc.text(value, bx + blockW / 2, y + 7, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(label, bx + blockW / 2, y + 13, { align: 'center' });
    });
    y += 22;
  }

  // ===== SECTION 6: PER VOLUNTEER =====
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

  // ===== SECTION 7: PER TASK TYPE =====
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

  // ===== SECTION 8: SEPA BATCHES =====
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

  // ===== SECTION 9: COMPLIANCE =====
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
    doc.text(`${clubName} — ${seasonName} — ${l.generatedBy} ${genDate} — ${l.version} 2.0`, margin, pageHeight - 8);
    doc.text(`${l.page} ${i} ${l.of} ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}
