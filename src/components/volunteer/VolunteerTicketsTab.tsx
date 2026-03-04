import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, CheckCircle, Clock } from 'lucide-react';
import TicketDownloadButtons from '@/components/TicketDownloadButtons';

interface VolunteerTicket {
  id: string;
  task_id: string | null;
  event_id: string | null;
  club_id: string;
  status: string;
  ticket_url: string | null;
  barcode: string | null;
  external_ticket_id: string | null;
  created_at: string;
  checked_in_at: string | null;
  task_title?: string;
  club_name?: string;
  event_title?: string;
}

interface Props {
  tickets: VolunteerTicket[];
  language: string;
  profile: { full_name: string; email: string } | null;
}

const VolunteerTicketsTab = ({ tickets, language, profile }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Tickets</h1>
      {tickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('Geen tickets.', 'Aucun ticket.', 'No tickets.')}</p>
        </div>
      ) : (
        tickets.map((ticket, i) => (
          <motion.div key={ticket.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-card rounded-2xl shadow-sm border overflow-hidden ${ticket.status === 'checked_in' ? 'border-accent/30' : 'border-border'}`}>
            <div className="p-5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{ticket.task_title || ticket.event_title || 'Ticket'}</p>
                  {ticket.club_name && <p className="text-xs text-muted-foreground mt-0.5">{ticket.club_name}</p>}
                </div>
                <div className="shrink-0">
                  {ticket.status === 'checked_in' ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent-foreground">
                      <CheckCircle className="w-3.5 h-3.5" />{t('Ingecheckt', 'Enregistré', 'Checked in')}
                    </span>
                  ) : ticket.status === 'sent' ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                      <Ticket className="w-3.5 h-3.5" />{t('Geldig', 'Valide', 'Valid')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />{t('In afwachting', 'En attente', 'Pending')}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(ticket.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {ticket.barcode && (
              <>
                <div className="border-t border-dashed border-border mx-3" />
                <div className="p-5 pt-3 flex flex-col items-center gap-3">
                  <div className="bg-white rounded-xl p-3 shadow-sm"><QRCodeSVG value={ticket.barcode} size={160} level="H" /></div>
                  <div className="bg-foreground/5 rounded-xl px-6 py-2 flex flex-col items-center gap-0.5">
                    <span className="text-xs font-mono font-bold tracking-widest text-foreground">{ticket.barcode}</span>
                  </div>
                  <TicketDownloadButtons barcode={ticket.barcode} ticketTitle={ticket.task_title || 'Ticket'} clubName={ticket.club_name} eventTitle={ticket.event_title} ticketId={ticket.id} volunteerName={profile?.full_name || undefined} language={language} />
                </div>
              </>
            )}
          </motion.div>
        ))
      )}
    </div>
  );
};

export default VolunteerTicketsTab;
