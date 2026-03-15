import jsPDF from 'jspdf';

export interface InvoicePdfParams {
  clubName: string;
  invoiceMonth: number;
  invoiceYear: number;
  volunteerCount: number;
  volunteerAmountCents: number;
  partnerSeatsCount: number;
  partnerSeatsAmountCents: number;
  totalAmountCents: number;
  status: string;
  language: string;
}

const monthNames: Record<string, string[]> = {
  nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const generateInvoicePdf = (params: InvoicePdfParams) => {
  const { clubName, invoiceMonth, invoiceYear, volunteerCount, volunteerAmountCents, partnerSeatsCount, partnerSeatsAmountCents, totalAmountCents, status, language } = params;
  const lang = language === 'fr' ? 'fr' : language === 'nl' ? 'nl' : 'en';
  const months = monthNames[lang] || monthNames.en;

  const t = (nl: string, fr: string, en: string) => lang === 'nl' ? nl : lang === 'fr' ? fr : en;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(t('FACTUUR', 'FACTURE', 'INVOICE'), pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`PlayMaker Palace`, 14, y);
  y += 5;
  doc.text(`${t('Factuurdatum', 'Date de facturation', 'Invoice date')}: 01/${String(invoiceMonth).padStart(2, '0')}/${invoiceYear}`, 14, y);
  y += 5;
  doc.text(`${t('Periode', 'Période', 'Period')}: ${months[invoiceMonth - 1]} ${invoiceYear}`, 14, y);
  y += 10;

  // Club info
  doc.setFont('helvetica', 'bold');
  doc.text(t('Klant', 'Client', 'Customer'), 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(clubName, 14, y);
  y += 10;

  // Status
  doc.setFont('helvetica', 'bold');
  const statusText = status === 'paid' ? t('BETAALD', 'PAYÉ', 'PAID') : t('OPENSTAAND', 'EN ATTENTE', 'PENDING');
  doc.text(`Status: ${statusText}`, pageWidth - 14, y - 5, { align: 'right' });
  y += 5;

  // Line items header
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(t('Omschrijving', 'Description', 'Description'), 14, y);
  doc.text(t('Aantal', 'Quantité', 'Qty'), 120, y);
  doc.text(t('Prijs', 'Prix', 'Price'), 145, y);
  doc.text(t('Totaal', 'Total', 'Total'), pageWidth - 14, y, { align: 'right' });
  y += 3;
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');

  // Volunteers line
  if (volunteerCount > 0) {
    doc.text(t('Seizoenscontracten vrijwilligers', 'Contrats saisonniers bénévoles', 'Season contracts volunteers'), 14, y);
    doc.text(String(volunteerCount), 120, y);
    doc.text('€15,00', 145, y);
    doc.text(`€${(volunteerAmountCents / 100).toFixed(2)}`, pageWidth - 14, y, { align: 'right' });
    y += 7;
  }

  // Partner seats line
  if (partnerSeatsCount > 0) {
    doc.text(t('Partner zitjes (seizoen)', 'Sièges partenaires (saison)', 'Partner seats (season)'), 14, y);
    doc.text(String(partnerSeatsCount), 120, y);
    doc.text('€15,00', 145, y);
    doc.text(`€${(partnerSeatsAmountCents / 100).toFixed(2)}`, pageWidth - 14, y, { align: 'right' });
    y += 7;
  }

  // Total
  y += 3;
  doc.line(14, y, pageWidth - 14, y);
  y += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(t('TOTAAL', 'TOTAL', 'TOTAL'), 14, y);
  doc.text(`€${(totalAmountCents / 100).toFixed(2)}`, pageWidth - 14, y, { align: 'right' });

  // Footer
  y += 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(t('Betaling verschuldigd binnen 30 dagen.', 'Paiement dû dans les 30 jours.', 'Payment due within 30 days.'), 14, y);
  y += 4;
  doc.text(t('Bij vragen: billing@playmakerpalace.com', 'Questions: billing@playmakerpalace.com', 'Questions: billing@playmakerpalace.com'), 14, y);

  doc.save(`factuur-${months[invoiceMonth - 1]}-${invoiceYear}.pdf`);
};
