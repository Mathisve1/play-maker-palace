import jsPDF from 'jspdf';
import { Language } from '@/i18n/translations';

export interface SafetyIncidentForPdf {
  id: string;
  incident_type_label: string;
  incident_type_color: string;
  zone_name: string | null;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  photo_url: string | null;
}

export interface SafetyZoneForPdf {
  name: string;
  color: string;
  checklist_total: number;
  checklist_done: number;
}

export interface ClosingTaskForPdf {
  description: string;
  status: string;
  assigned_volunteer: string | null;
  requires_photo: boolean;
  requires_note: boolean;
  photo_url: string | null;
  note: string | null;
  completed_at: string | null;
}

export interface SafetyReportParams {
  eventTitle: string;
  eventDate: string | null;
  clubName: string;
  generatedBy: string;
  zones: SafetyZoneForPdf[];
  incidents: SafetyIncidentForPdf[];
  closingTasks: ClosingTaskForPdf[];
  totalChecklistItems: number;
  totalChecklistDone: number;
  language?: Language;
}

const pdfLabels = {
  nl: {
    title: 'VEILIGHEIDSRAPPORT',
    subtitle: 'Safety & Security — Evenementrapportage',
    event: 'Evenement',
    eventLabel: 'Evenement:',
    dateLabel: 'Datum:',
    orgLabel: 'Organisatie:',
    preparedBy: 'Opgesteld door:',
    reportDate: 'Rapport datum:',
    summary: 'Samenvatting',
    incidents: 'Incidenten',
    resolved: 'opgelost',
    highPriority: 'Hoog prioriteit',
    noHigh: '✓ geen',
    checklist: 'Checklist',
    closingTasks: 'Sluitingstaken',
    zonesTitle: 'Zones & Checklist Status',
    noZones: 'Geen zones geconfigureerd.',
    zone: 'Zone',
    items: 'Items',
    done: 'Afgerond',
    status: 'Status',
    complete: '✓ Compleet',
    incidentLog: 'Incidentenlogboek',
    noIncidents: 'Geen incidenten geregistreerd tijdens dit evenement.',
    time: 'Tijd',
    type: 'Type',
    description: 'Beschrijving',
    statusResolved: '✓ Opgelost',
    statusBusy: '⏳ Bezig',
    statusNew: '⚠ Nieuw',
    distributionByType: 'Verdeling per type:',
    incident: 'incident',
    incidentPlural: 'en',
    closingProcedure: 'Sluitingsprocedure',
    noClosing: 'Geen sluitingstaken geconfigureerd.',
    assigned: 'Toegewezen:',
    photoYes: 'Foto: ✓',
    photoMissing: 'Foto: ontbreekt',
    noteLabel: 'Notitie:',
    noteMissing: 'Notitie: ontbreekt',
    completedAt: 'Afgerond:',
    safetyReport: 'Veiligheidsrapport',
    page: 'Pagina',
    of: 'van',
  },
  fr: {
    title: 'RAPPORT DE SÉCURITÉ',
    subtitle: 'Safety & Security — Rapport d\'événement',
    event: 'Événement',
    eventLabel: 'Événement :',
    dateLabel: 'Date :',
    orgLabel: 'Organisation :',
    preparedBy: 'Établi par :',
    reportDate: 'Date du rapport :',
    summary: 'Résumé',
    incidents: 'Incidents',
    resolved: 'résolu(s)',
    highPriority: 'Haute priorité',
    noHigh: '✓ aucun',
    checklist: 'Checklist',
    closingTasks: 'Tâches de clôture',
    zonesTitle: 'Zones & Statut Checklist',
    noZones: 'Aucune zone configurée.',
    zone: 'Zone',
    items: 'Items',
    done: 'Terminé',
    status: 'Statut',
    complete: '✓ Complété',
    incidentLog: 'Journal des incidents',
    noIncidents: 'Aucun incident enregistré durant cet événement.',
    time: 'Heure',
    type: 'Type',
    description: 'Description',
    statusResolved: '✓ Résolu',
    statusBusy: '⏳ En cours',
    statusNew: '⚠ Nouveau',
    distributionByType: 'Répartition par type :',
    incident: 'incident',
    incidentPlural: 's',
    closingProcedure: 'Procédure de clôture',
    noClosing: 'Aucune tâche de clôture configurée.',
    assigned: 'Assigné :',
    photoYes: 'Photo : ✓',
    photoMissing: 'Photo : manquante',
    noteLabel: 'Note :',
    noteMissing: 'Note : manquante',
    completedAt: 'Terminé :',
    safetyReport: 'Rapport de sécurité',
    page: 'Page',
    of: 'de',
  },
  en: {
    title: 'SAFETY REPORT',
    subtitle: 'Safety & Security — Event Report',
    event: 'Event',
    eventLabel: 'Event:',
    dateLabel: 'Date:',
    orgLabel: 'Organisation:',
    preparedBy: 'Prepared by:',
    reportDate: 'Report date:',
    summary: 'Summary',
    incidents: 'Incidents',
    resolved: 'resolved',
    highPriority: 'High priority',
    noHigh: '✓ none',
    checklist: 'Checklist',
    closingTasks: 'Closing tasks',
    zonesTitle: 'Zones & Checklist Status',
    noZones: 'No zones configured.',
    zone: 'Zone',
    items: 'Items',
    done: 'Done',
    status: 'Status',
    complete: '✓ Complete',
    incidentLog: 'Incident Log',
    noIncidents: 'No incidents recorded during this event.',
    time: 'Time',
    type: 'Type',
    description: 'Description',
    statusResolved: '✓ Resolved',
    statusBusy: '⏳ In progress',
    statusNew: '⚠ New',
    distributionByType: 'Distribution by type:',
    incident: 'incident',
    incidentPlural: 's',
    closingProcedure: 'Closing Procedure',
    noClosing: 'No closing tasks configured.',
    assigned: 'Assigned:',
    photoYes: 'Photo: ✓',
    photoMissing: 'Photo: missing',
    noteLabel: 'Note:',
    noteMissing: 'Note: missing',
    completedAt: 'Completed:',
    safetyReport: 'Safety Report',
    page: 'Page',
    of: 'of',
  },
};

export function generateSafetyReportPdf(params: SafetyReportParams): jsPDF {
  const {
    eventTitle, eventDate, clubName, generatedBy,
    zones, incidents, closingTasks,
    totalChecklistItems, totalChecklistDone,
  } = params;
  const lang = params.language || 'nl';
  const l = pdfLabels[lang];
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const addPageIfNeeded = (space: number) => {
    if (y + space > pageHeight - 20) { doc.addPage(); y = margin; }
  };

  const drawSectionLine = () => {
    doc.setDrawColor(200); doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y); y += 6;
  };

  // ===== HEADER =====
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text(l.title, margin, y); y += 8;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(l.subtitle, margin, y); y += 8;
  drawSectionLine();

  // ===== EVENT INFO =====
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text(l.event, margin, y); y += 5;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);

  const eventInfo = [
    [l.eventLabel, eventTitle],
    [l.dateLabel, eventDate ? new Date(eventDate).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
    [l.orgLabel, clubName],
    [l.preparedBy, generatedBy],
    [l.reportDate, new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ];
  for (const [label, value] of eventInfo) {
    doc.setFont('helvetica', 'bold'); doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal'); doc.text(value, margin + 35, y); y += 4.5;
  }
  y += 5; drawSectionLine();

  // ===== SUMMARY =====
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text(l.summary, margin, y); y += 6;

  const totalIncidents = incidents.length;
  const resolvedIncidents = incidents.filter(i => i.status === 'opgelost').length;
  const highPriority = incidents.filter(i => i.priority === 'high').length;
  const closingDone = closingTasks.filter(t => t.status === 'completed').length;

  const kpiData = [
    { label: l.incidents, value: String(totalIncidents), sub: `${resolvedIncidents} ${l.resolved}` },
    { label: l.highPriority, value: String(highPriority), sub: highPriority > 0 ? '⚠️' : l.noHigh },
    { label: l.checklist, value: `${totalChecklistDone}/${totalChecklistItems}`, sub: totalChecklistItems > 0 ? `${Math.round((totalChecklistDone / totalChecklistItems) * 100)}%` : '—' },
    { label: l.closingTasks, value: `${closingDone}/${closingTasks.length}`, sub: closingTasks.length > 0 ? `${Math.round((closingDone / closingTasks.length) * 100)}%` : '—' },
  ];

  const boxWidth = (pageWidth - 2 * margin - 9) / 4;
  kpiData.forEach((kpi, i) => {
    const bx = margin + i * (boxWidth + 3);
    doc.setFillColor(245, 245, 245); doc.roundedRect(bx, y, boxWidth, 18, 2, 2, 'F');
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
    doc.text(kpi.value, bx + boxWidth / 2, y + 8, { align: 'center' });
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(kpi.label, bx + boxWidth / 2, y + 13, { align: 'center' });
    doc.setFontSize(6); doc.text(kpi.sub, bx + boxWidth / 2, y + 16.5, { align: 'center' });
  });
  y += 24; drawSectionLine();

  // ===== ZONES =====
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text(l.zonesTitle, margin, y); y += 6;

  if (zones.length === 0) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(l.noZones, margin, y); y += 5;
  } else {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80);
    doc.text(l.zone, margin, y); doc.text(l.items, margin + 80, y);
    doc.text(l.done, margin + 100, y); doc.text(l.status, margin + 125, y);
    y += 2; doc.line(margin, y, pageWidth - margin, y); y += 4;

    doc.setFont('helvetica', 'normal'); doc.setTextColor(40);
    zones.forEach((zone, i) => {
      addPageIfNeeded(6);
      if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(margin, y - 3, pageWidth - 2 * margin, 5, 'F'); }
      doc.setFontSize(8);
      doc.text(zone.name, margin, y); doc.text(String(zone.checklist_total), margin + 80, y);
      doc.text(String(zone.checklist_done), margin + 100, y);
      const pct = zone.checklist_total > 0 ? Math.round((zone.checklist_done / zone.checklist_total) * 100) : 0;
      doc.text(pct === 100 ? l.complete : `${pct}%`, margin + 125, y); y += 5;
    });
  }
  y += 5; drawSectionLine();

  // ===== INCIDENTS =====
  addPageIfNeeded(20);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text(l.incidentLog, margin, y); y += 6;

  if (incidents.length === 0) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(l.noIncidents, margin, y); y += 5;
  } else {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80);
    doc.text(l.time, margin, y); doc.text(l.type, margin + 18, y);
    doc.text(l.zone, margin + 62, y); doc.text(l.description, margin + 90, y);
    doc.text(l.status, pageWidth - margin, y, { align: 'right' });
    y += 2; doc.line(margin, y, pageWidth - margin, y); y += 4;

    doc.setFont('helvetica', 'normal'); doc.setTextColor(40);
    const sorted = [...incidents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    sorted.forEach((inc, i) => {
      addPageIfNeeded(6);
      if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(margin, y - 3, pageWidth - 2 * margin, 5, 'F'); }
      doc.setFontSize(7);
      doc.text(new Date(inc.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }), margin, y);
      doc.setFontSize(8);
      doc.text(inc.incident_type_label.substring(0, 22), margin + 18, y);
      doc.text((inc.zone_name || '—').substring(0, 15), margin + 62, y);
      doc.text((inc.description || '—').substring(0, 30), margin + 90, y);
      const statusLabel = inc.status === 'opgelost' ? l.statusResolved : inc.status === 'bezig' ? l.statusBusy : l.statusNew;
      doc.text(statusLabel, pageWidth - margin, y, { align: 'right' }); y += 5;
    });

    y += 3; addPageIfNeeded(10);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
    doc.text(l.distributionByType, margin, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const typeMap = new Map<string, SafetyIncidentForPdf[]>();
    incidents.forEach(inc => {
      if (!typeMap.has(inc.incident_type_label)) typeMap.set(inc.incident_type_label, []);
      typeMap.get(inc.incident_type_label)!.push(inc);
    });
    typeMap.forEach((incs, typeName) => {
      addPageIfNeeded(5);
      doc.text(`• ${typeName}: ${incs.length} ${l.incident}${incs.length > 1 ? l.incidentPlural : ''} (${incs.filter(i => i.status === 'opgelost').length} ${l.resolved})`, margin + 3, y);
      y += 4;
    });
  }
  y += 5; drawSectionLine();

  // ===== CLOSING TASKS =====
  addPageIfNeeded(15);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text(l.closingProcedure, margin, y); y += 6;

  if (closingTasks.length === 0) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(l.noClosing, margin, y); y += 5;
  } else {
    closingTasks.forEach((task, i) => {
      addPageIfNeeded(14);
      const isDone = task.status === 'completed';
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(isDone ? 34 : 150);
      doc.text(`${isDone ? '✓' : '○'} ${i + 1}. ${task.description}`, margin, y); y += 4;
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
      const details: string[] = [];
      if (task.assigned_volunteer) details.push(`${l.assigned} ${task.assigned_volunteer}`);
      if (task.requires_photo) details.push(task.photo_url ? l.photoYes : l.photoMissing);
      if (task.requires_note) details.push(task.note ? `${l.noteLabel} "${task.note.substring(0, 40)}"` : l.noteMissing);
      if (task.completed_at) details.push(`${l.completedAt} ${new Date(task.completed_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`);
      if (details.length > 0) { doc.text(details.join('  |  '), margin + 5, y); y += 4; }
      y += 1;
    });
  }

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`${clubName} — ${eventTitle} — ${l.safetyReport}`, margin, pageHeight - 8);
    doc.text(`${l.page} ${i} ${l.of} ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}
