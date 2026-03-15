import { useNavigate } from 'react-router-dom';
import MonthlyPlanningKPIs from '@/components/MonthlyPlanningKPIs';
import { KpiWidget } from '@/components/dashboard/KpiWidget';
import { ShortcutsWidget } from '@/components/dashboard/ShortcutsWidget';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { ActionListWidget } from '@/components/dashboard/ActionListWidget';
import { SeasonProgressWidget } from '@/components/dashboard/SeasonProgressWidget';
import { ContractStatusWidget } from '@/components/dashboard/ContractStatusWidget';
import { AttendanceRateWidget } from '@/components/dashboard/AttendanceRateWidget';
import { RevenueWidget } from '@/components/dashboard/RevenueWidget';
import { WidgetInstance } from '@/components/dashboard/widgetRegistry';
import { ComplianceStatus } from '@/hooks/useComplianceData';
import { Calendar, CalendarDays, CreditCard, Shield, Ticket } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface WidgetRendererProps {
  widget: WidgetInstance;
  language: Language;
  clubId: string | null;
  // KPI data
  events: { id: string; event_date: string | null; title: string; location: string | null }[];
  allSignups: { status: string; volunteer_id: string }[];
  signatureStatuses: Record<string, { status: string }>;
  pendingEnrollmentCount: number;
  pendingDaySignupCount: number;
  pendingTicketCount: number;
  complianceMap: Map<string, ComplianceStatus>;
  volunteerPayments: Record<string, { status: string }>;
}

export const WidgetRenderer = ({
  widget, language, clubId, events, allSignups, signatureStatuses,
  pendingEnrollmentCount, pendingDaySignupCount, pendingTicketCount,
  complianceMap, volunteerPayments,
}: WidgetRendererProps) => {
  const navigate = useNavigate();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcomingEventCount = events.filter(e => e.event_date && new Date(e.event_date) >= now && new Date(e.event_date) <= in30).length;
  const pendingSignupCount = allSignups.filter(s => s.status === 'pending').length;
  const activeVolunteerCount = new Set(allSignups.filter(s => s.status === 'assigned').map(s => s.volunteer_id)).size;
  const unsignedContractCount = Object.values(signatureStatuses).filter(s => s.status === 'pending').length;

  switch (widget.type) {
    case 'kpi_upcoming_events':
      return <KpiWidget type={widget.type} value={upcomingEventCount} language={language} onClick={() => navigate('/events-manager')} />;
    case 'kpi_pending_signups':
      return <KpiWidget type={widget.type} value={pendingSignupCount} language={language} onClick={() => navigate('/command-center')} />;
    case 'kpi_active_volunteers':
      return <KpiWidget type={widget.type} value={activeVolunteerCount} language={language} onClick={() => navigate('/reporting')} />;
    case 'kpi_unsigned_contracts':
      return <KpiWidget type={widget.type} value={unsignedContractCount} language={language} onClick={() => navigate('/reporting?tab=compliance')} />;
    case 'kpi_pending_enrollments':
      return <KpiWidget type={widget.type} value={pendingEnrollmentCount} language={language} onClick={() => navigate('/command-center')} />;
    case 'kpi_day_signups_pending':
      return <KpiWidget type={widget.type} value={pendingDaySignupCount} language={language} onClick={() => navigate('/command-center')} />;
    case 'monthly_planning':
      return (
        <div className="w-full h-full bg-card rounded-2xl border border-border p-4 overflow-auto">
          <MonthlyPlanningKPIs clubId={clubId} language={language} navigate={navigate} />
        </div>
      );
    case 'shortcuts':
      return <ShortcutsWidget language={language} />;
    case 'recent_activity':
      return <RecentActivityWidget clubId={clubId} language={language} />;
    case 'action_list':
      return <ActionListWidget clubId={clubId} language={language} />;
    case 'upcoming_events': {
      const futureEvents = events.filter(e => !e.event_date || new Date(e.event_date) >= now);
      return (
        <div className="w-full h-full bg-card rounded-2xl border border-border p-4 overflow-auto">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-primary" />
            {language === 'nl' ? 'Evenementen' : 'Events'}
            <button onClick={() => navigate('/events-manager')} className="ml-auto text-xs text-primary hover:underline">
              {language === 'nl' ? 'Alles bekijken' : 'View all'} →
            </button>
          </h3>
          {futureEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {language === 'nl' ? 'Geen evenementen.' : 'No events.'}
            </p>
          ) : (
            <div className="space-y-2">
              {futureEvents.slice(0, 5).map(event => (
                <button key={event.id} onClick={() => navigate('/events-manager')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    case 'pending_tickets':
      return (
        <div className="w-full h-full bg-card rounded-2xl border border-border p-4 flex flex-col justify-center items-center group cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/ticketing')}>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Ticket className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingTicketCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{language === 'nl' ? 'Tickets te genereren' : 'Tickets to generate'}</p>
          <p className="text-[10px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {language === 'nl' ? 'Naar ticketing →' : 'Go to ticketing →'}
          </p>
        </div>
      );
    case 'compliance_overview':
      return (
        <div className="w-full h-full bg-card rounded-2xl border border-border p-4 flex flex-col justify-center items-center group cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/compliance')}>
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{Array.from(complianceMap.values()).filter(c => c.hasCurrentMonthDeclaration).length}</p>
          <p className="text-xs text-muted-foreground mt-1">{language === 'nl' ? 'Vrijwilligers met verklaring' : 'Volunteers with declaration'}</p>
          <p className="text-[10px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {language === 'nl' ? 'Compliance bekijken →' : 'View compliance →'}
          </p>
        </div>
      );
    case 'payments_summary':
      return (
        <div className="w-full h-full bg-card rounded-2xl border border-border p-4 flex flex-col justify-center items-center group cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/sepa-payouts')}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <CreditCard className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Object.values(volunteerPayments).filter(p => p.status === 'pending').length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{language === 'nl' ? 'Openstaande betalingen' : 'Pending payments'}</p>
          <p className="text-[10px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {language === 'nl' ? 'Betalingen bekijken →' : 'View payments →'}
          </p>
        </div>
      );
    case 'season_progress':
      return <SeasonProgressWidget clubId={clubId} language={language} />;
    case 'contract_status':
      return <ContractStatusWidget clubId={clubId} language={language} />;
    case 'attendance_rate':
      return <AttendanceRateWidget clubId={clubId} language={language} />;
    case 'revenue':
      return <RevenueWidget clubId={clubId} language={language} />;
    default:
      return (
        <div className="w-full h-full bg-card rounded-2xl border border-dashed border-border p-4 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Widget: {widget.type}</p>
        </div>
      );
  }
};
