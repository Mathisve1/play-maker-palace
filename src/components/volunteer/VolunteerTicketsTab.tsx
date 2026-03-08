import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, CheckCircle, Clock, Shield } from 'lucide-react';
import TicketDownloadButtons from '@/components/TicketDownloadButtons';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

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

interface SeasonQR {
  id: string;
  barcode: string;
  checkin_count: number;
  volunteer_status: string;
  template_name: string;
  template_category: string;
  season_name: string;
  club_name: string;
}

interface Props {
  tickets: VolunteerTicket[];
  language: string;
  profile: { full_name: string; email: string } | null;
  userId?: string;
}

const VolunteerTicketsTab = ({ tickets, language, profile, userId }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const [seasonQRs, setSeasonQRs] = useState<SeasonQR[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('season_contracts')
        .select('id, barcode, checkin_count, volunteer_status, template_id, season_id, club_id')
        .eq('volunteer_id', userId)
        .in('status', ['signed', 'sent', 'pending']);

      if (!data || data.length === 0) return;

      const templateIds = [...new Set(data.map(d => d.template_id))];
      const seasonIds = [...new Set(data.map(d => d.season_id))];
      const clubIds = [...new Set(data.map(d => d.club_id))];

      const [tmplRes, seasonRes, clubRes] = await Promise.all([
        supabase.from('season_contract_templates').select('id, name, category').in('id', templateIds),
        supabase.from('seasons').select('id, name').in('id', seasonIds),
        supabase.from('clubs').select('id, name').in('id', clubIds),
      ]);

      const tmplMap = new Map((tmplRes.data || []).map(t => [t.id, t]));
      const seasonMap = new Map((seasonRes.data || []).map(s => [s.id, s.name]));
      const clubMap = new Map((clubRes.data || []).map(c => [c.id, c.name]));

      setSeasonQRs(data.filter(d => d.barcode).map(d => {
        const tmpl = tmplMap.get(d.template_id);
        return {
          id: d.id,
          barcode: d.barcode!,
          checkin_count: d.checkin_count || 0,
          volunteer_status: d.volunteer_status || 'proef',
          template_name: tmpl?.name || 'Seizoenscontract',
          template_category: tmpl?.category || '',
          season_name: seasonMap.get(d.season_id) || '',
          club_name: clubMap.get(d.club_id) || '',
        };
      }));
    })();
  }, [userId]);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Tickets</h1>

      {/* Season QR codes */}
      {seasonQRs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {t('Seizoens QR-codes', 'QR codes saisonniers', 'Season QR codes')}
          </h2>
          {seasonQRs.map((sq, i) => (
            <motion.div key={sq.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl shadow-sm border border-primary/20 overflow-hidden">
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{sq.template_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {sq.club_name && <span className="text-xs text-muted-foreground">{sq.club_name}</span>}
                      {sq.season_name && <Badge variant="outline" className="text-[10px]">{sq.season_name}</Badge>}
                    </div>
                  </div>
                  <Badge variant={sq.volunteer_status === 'actief' ? 'default' : 'secondary'} className="text-[11px] shrink-0">
                    {sq.volunteer_status === 'actief'
                      ? t('Actief', 'Actif', 'Active')
                      : `${t('Proef', 'Essai', 'Trial')} (${sq.checkin_count}/4)`}
                  </Badge>
                </div>
              </div>
              <div className="border-t border-dashed border-border mx-3" />
              <div className="p-5 pt-3 flex flex-col items-center gap-3">
                <div className="bg-white rounded-xl p-3 shadow-sm"><QRCodeSVG value={sq.barcode} size={160} level="H" /></div>
                <div className="bg-foreground/5 rounded-xl px-6 py-2 flex flex-col items-center gap-0.5">
                  <span className="text-xs font-mono font-bold tracking-widest text-foreground">{sq.barcode}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('Toon deze QR-code bij het inchecken op events', 'Montrez ce QR code lors de l\'enregistrement', 'Show this QR code when checking in at events')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Regular tickets */}
      {tickets.length === 0 && seasonQRs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('Geen tickets.', 'Aucun ticket.', 'No tickets.')}</p>
        </div>
      ) : tickets.length > 0 && (
        <div className="space-y-3">
          {seasonQRs.length > 0 && (
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('Eventtickets', 'Tickets événements', 'Event tickets')}
            </h2>
          )}
          {tickets.map((ticket, i) => (
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
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerTicketsTab;
