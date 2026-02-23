import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TicketDownloadButtonsProps {
  barcode: string;
  ticketTitle: string;
  clubName?: string;
  eventTitle?: string;
  ticketId: string;
  volunteerName?: string;
  dateOfBirth?: string | null;
  language: string;
}

const TicketDownloadButtons = ({ barcode, ticketTitle, clubName, eventTitle, ticketId, volunteerName, dateOfBirth, language }: TicketDownloadButtonsProps) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const labels = {
    nl: { pdf: 'Download PDF' },
    fr: { pdf: 'Télécharger PDF' },
    en: { pdf: 'Download PDF' },
  };
  const l = labels[language as keyof typeof labels] || labels.nl;

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 180] });

      // Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 100, 180, 'F');

      // Header bar
      doc.setFillColor(34, 34, 34);
      doc.rect(0, 0, 100, 28, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TICKET', 50, 12, { align: 'center' });

      // Subtitle
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(clubName || 'De 12e Man', 50, 20, { align: 'center' });

      // Event / task title
      doc.setTextColor(34, 34, 34);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const title = eventTitle || ticketTitle || 'Event Ticket';
      const titleLines = doc.splitTextToSize(title, 80);
      doc.text(titleLines, 50, 38, { align: 'center' });

      const yAfterTitle = 38 + titleLines.length * 6;

      // Volunteer name
      if (volunteerName) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 34, 34);
        doc.text(volunteerName, 50, yAfterTitle + 2, { align: 'center' });
      }
      // Date of birth
      if (dateOfBirth) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        const dobLabel = language === 'nl' ? 'Geboortedatum' : language === 'fr' ? 'Date de naissance' : 'Date of birth';
        doc.text(`${dobLabel}: ${dateOfBirth}`, 50, yAfterTitle + 8, { align: 'center' });
      }

      const yAfterVolunteer = yAfterTitle + (volunteerName ? 6 : 0) + (dateOfBirth ? 8 : 0);
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(10, yAfterVolunteer + 4, 90, yAfterVolunteer + 4);

      // QR code from hidden canvas
      const canvas = qrRef.current?.querySelector('canvas');
      if (canvas) {
        const qrDataUrl = canvas.toDataURL('image/png');
        const qrSize = 50;
        const qrX = (100 - qrSize) / 2;
        const qrY = yAfterVolunteer + 10;
        
        // White background for QR
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.setLineDashPattern([], 0);
        doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3, 'S');
        
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        // Barcode text
        const barcodeY = qrY + qrSize + 10;
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(15, barcodeY - 2, 70, 14, 2, 2, 'F');
        doc.setTextColor(34, 34, 34);
        doc.setFontSize(10);
        doc.setFont('courier', 'bold');
        doc.text(barcode, 50, barcodeY + 5, { align: 'center' });

        // Instruction
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140, 140, 140);
        const scanText = language === 'nl' ? 'Toon deze QR-code bij het inchecken' : language === 'fr' ? 'Présentez ce QR code à l\'entrée' : 'Show this QR code at check-in';
        doc.text(scanText, 50, barcodeY + 16, { align: 'center' });
      }

      // Footer
      doc.setFontSize(6);
      doc.setTextColor(180, 180, 180);
      doc.text('Powered by De 12e Man', 50, 174, { align: 'center' });

      const filename = `ticket-${barcode}.pdf`;
      doc.save(filename);
      toast.success(language === 'nl' ? 'PDF gedownload!' : language === 'fr' ? 'PDF téléchargé!' : 'PDF downloaded!');
    } catch (e: any) {
      console.error('PDF generation error:', e);
      toast.error(e.message || 'PDF error');
    }
    setDownloadingPdf(false);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Hidden QR canvas for PDF */}
      <div ref={qrRef} className="absolute -left-[9999px] -top-[9999px]">
        <QRCodeCanvas value={barcode} size={400} level="H" />
      </div>

      <button
        onClick={handleDownloadPdf}
        disabled={downloadingPdf}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {l.pdf}
      </button>
    </div>
  );
};

export default TicketDownloadButtons;
