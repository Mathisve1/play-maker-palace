import jsPDF from 'jspdf';

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
}

export function generateSafetyReportPdf(params: SafetyReportParams): jsPDF {
  const {
    eventTitle, eventDate, clubName, generatedBy,
    zones, incidents, closingTasks,
    totalChecklistItems, totalChecklistDone,
  } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const addPageIfNeeded = (space: number) => {
    if (y + space > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
  };

  const drawSectionLine = () => {
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // ===== HEADER =====
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('VEILIGHEIDSRAPPORT', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Safety & Security — Evenementrapportage', margin, y);
  y += 8;

  drawSectionLine();

  // ===== EVENT INFO =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Evenement', margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  const eventInfo = [
    ['Evenement:', eventTitle],
    ['Datum:', eventDate ? new Date(eventDate).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
    ['Organisatie:', clubName],
    ['Opgesteld door:', generatedBy],
    ['Rapport datum:', new Date().toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ];
  for (const [label, value] of eventInfo) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 4.5;
  }
  y += 5;

  drawSectionLine();

  // ===== SAMENVATTING =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Samenvatting', margin, y);
  y += 6;

  const totalIncidents = incidents.length;
  const resolvedIncidents = incidents.filter(i => i.status === 'opgelost').length;
  const highPriority = incidents.filter(i => i.priority === 'high').length;
  const mediumPriority = incidents.filter(i => i.priority === 'medium').length;
  const lowPriority = incidents.filter(i => i.priority === 'low').length;
  const closingDone = closingTasks.filter(t => t.status === 'completed').length;

  // KPI boxes
  const kpiData = [
    { label: 'Incidenten', value: String(totalIncidents), sub: `${resolvedIncidents} opgelost` },
    { label: 'Hoog prioriteit', value: String(highPriority), sub: highPriority > 0 ? '⚠️' : '✓ geen' },
    { label: 'Checklist', value: `${totalChecklistDone}/${totalChecklistItems}`, sub: totalChecklistItems > 0 ? `${Math.round((totalChecklistDone / totalChecklistItems) * 100)}%` : '—' },
    { label: 'Sluitingstaken', value: `${closingDone}/${closingTasks.length}`, sub: closingTasks.length > 0 ? `${Math.round((closingDone / closingTasks.length) * 100)}%` : '—' },
  ];

  const boxWidth = (pageWidth - 2 * margin - 9) / 4;
  kpiData.forEach((kpi, i) => {
    const bx = margin + i * (boxWidth + 3);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(bx, y, boxWidth, 18, 2, 2, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text(kpi.value, bx + boxWidth / 2, y + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(kpi.label, bx + boxWidth / 2, y + 13, { align: 'center' });

    doc.setFontSize(6);
    doc.text(kpi.sub, bx + boxWidth / 2, y + 16.5, { align: 'center' });
  });
  y += 24;

  drawSectionLine();

  // ===== ZONES CHECKLIST OVERZICHT =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Zones & Checklist Status', margin, y);
  y += 6;

  if (zones.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Geen zones geconfigureerd.', margin, y);
    y += 5;
  } else {
    // Table header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80);
    doc.text('Zone', margin, y);
    doc.text('Items', margin + 80, y);
    doc.text('Afgerond', margin + 100, y);
    doc.text('Status', margin + 125, y);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);
    zones.forEach((zone, i) => {
      addPageIfNeeded(6);
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3, pageWidth - 2 * margin, 5, 'F');
      }
      doc.setFontSize(8);
      doc.text(zone.name, margin, y);
      doc.text(String(zone.checklist_total), margin + 80, y);
      doc.text(String(zone.checklist_done), margin + 100, y);

      const pct = zone.checklist_total > 0 ? Math.round((zone.checklist_done / zone.checklist_total) * 100) : 0;
      const status = pct === 100 ? '✓ Compleet' : `${pct}%`;
      doc.text(status, margin + 125, y);
      y += 5;
    });
  }
  y += 5;

  drawSectionLine();

  // ===== INCIDENTEN OVERZICHT =====
  addPageIfNeeded(20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Incidentenlogboek', margin, y);
  y += 6;

  if (incidents.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Geen incidenten geregistreerd tijdens dit evenement.', margin, y);
    y += 5;
  } else {
    // Group by type
    const typeMap = new Map<string, SafetyIncidentForPdf[]>();
    incidents.forEach(inc => {
      const key = inc.incident_type_label;
      if (!typeMap.has(key)) typeMap.set(key, []);
      typeMap.get(key)!.push(inc);
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80);
    doc.text('Tijd', margin, y);
    doc.text('Type', margin + 18, y);
    doc.text('Zone', margin + 62, y);
    doc.text('Beschrijving', margin + 90, y);
    doc.text('Status', pageWidth - margin, y, { align: 'right' });
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);

    // Sort by created_at ascending (timeline)
    const sorted = [...incidents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    sorted.forEach((inc, i) => {
      addPageIfNeeded(6);
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3, pageWidth - 2 * margin, 5, 'F');
      }
      doc.setFontSize(7);
      const time = new Date(inc.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
      doc.text(time, margin, y);
      doc.setFontSize(8);
      doc.text(inc.incident_type_label.substring(0, 22), margin + 18, y);
      doc.text((inc.zone_name || '—').substring(0, 15), margin + 62, y);
      doc.text((inc.description || '—').substring(0, 30), margin + 90, y);

      const statusLabel = inc.status === 'opgelost' ? '✓ Opgelost' : inc.status === 'bezig' ? '⏳ Bezig' : '⚠ Nieuw';
      doc.text(statusLabel, pageWidth - margin, y, { align: 'right' });
      y += 5;
    });

    // Summary by type
    y += 3;
    addPageIfNeeded(10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60);
    doc.text('Verdeling per type:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    typeMap.forEach((incs, typeName) => {
      addPageIfNeeded(5);
      doc.text(`• ${typeName}: ${incs.length} incident${incs.length > 1 ? 'en' : ''} (${incs.filter(i => i.status === 'opgelost').length} opgelost)`, margin + 3, y);
      y += 4;
    });
  }
  y += 5;

  drawSectionLine();

  // ===== SLUITINGSTAKEN =====
  addPageIfNeeded(15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Sluitingsprocedure', margin, y);
  y += 6;

  if (closingTasks.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Geen sluitingstaken geconfigureerd.', margin, y);
    y += 5;
  } else {
    closingTasks.forEach((task, i) => {
      addPageIfNeeded(14);
      const isDone = task.status === 'completed';
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isDone ? 34 : 150);
      doc.text(`${isDone ? '✓' : '○'} ${i + 1}. ${task.description}`, margin, y);
      y += 4;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      
      const details: string[] = [];
      if (task.assigned_volunteer) details.push(`Toegewezen: ${task.assigned_volunteer}`);
      if (task.requires_photo) details.push(task.photo_url ? 'Foto: ✓' : 'Foto: ontbreekt');
      if (task.requires_note) details.push(task.note ? `Notitie: "${task.note.substring(0, 40)}"` : 'Notitie: ontbreekt');
      if (task.completed_at) details.push(`Afgerond: ${new Date(task.completed_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`);

      if (details.length > 0) {
        doc.text(details.join('  |  '), margin + 5, y);
        y += 4;
      }
      y += 1;
    });
  }

  // ===== FOOTER on all pages =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `${clubName} — ${eventTitle} — Veiligheidsrapport`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Pagina ${i} van ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  return doc;
}
