import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import IOSInstallOverlay from "@/components/IOSInstallOverlay";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import { autoResubscribeIfNeeded } from "@/lib/pushNotifications";

import RequireAuth from "./components/RequireAuth";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const VolunteerLanding = lazy(() => import("./pages/VolunteerLanding"));
const ClubsLanding = lazy(() => import("./pages/ClubsLanding"));
const Login = lazy(() => import("./pages/Login"));
const ClubLogin = lazy(() => import("./pages/ClubLogin"));
const ClubSignup = lazy(() => import("./pages/ClubSignup"));
const Signup = lazy(() => import("./pages/Signup"));
const VolunteerDashboard = lazy(() => import("./pages/VolunteerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));
const Chat = lazy(() => import("./pages/Chat"));
const ClubOwnerDashboard = lazy(() => import("./pages/ClubOwnerDashboard"));
const ClubInviteAccept = lazy(() => import("./pages/ClubInviteAccept"));
const PaymentsOverview = lazy(() => import("./pages/PaymentsOverview"));
const ContractBuilder = lazy(() => import("./pages/ContractBuilder"));
const BriefingBuilder = lazy(() => import("./pages/BriefingBuilder"));
const ComplianceDashboard = lazy(() => import("./pages/ComplianceDashboard"));
const LoyaltyPrograms = lazy(() => import("./pages/LoyaltyPrograms"));
const TicketingDashboard = lazy(() => import("./pages/TicketingDashboard"));
const TicketScanner = lazy(() => import("./pages/TicketScanner"));
const SepaPayouts = lazy(() => import("./pages/SepaPayouts"));
const AcademyBuilder = lazy(() => import("./pages/AcademyBuilder"));
const PhysicalTrainings = lazy(() => import("./pages/PhysicalTrainings"));
const VolunteerTraining = lazy(() => import("./pages/VolunteerTraining"));
const CertificateBuilder = lazy(() => import("./pages/CertificateBuilder"));
const ExternalPartners = lazy(() => import("./pages/ExternalPartners"));
const PartnerLogin = lazy(() => import("./pages/PartnerLogin"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const ReportingDashboard = lazy(() => import("./pages/ReportingDashboard"));
const ReportBuilder = lazy(() => import("./pages/ReportBuilder"));
const EventsManager = lazy(() => import("./pages/EventsManager"));
const ZonePlanning = lazy(() => import("./pages/ZonePlanning"));
const PlanningOverview = lazy(() => import("./pages/PlanningOverview"));
const MonthlyPlanning = lazy(() => import("./pages/MonthlyPlanning"));
const SafetyDashboard = lazy(() => import("./pages/SafetyDashboard"));
const SafetyOverview = lazy(() => import("./pages/SafetyOverview"));
const SafetyEventHub = lazy(() => import("./pages/SafetyEventHub"));
const SafetyClosing = lazy(() => import("./pages/SafetyClosing"));
const Community = lazy(() => import("./pages/Community"));
const CommunityClubDetail = lazy(() => import("./pages/CommunityClubDetail"));
const CommunityPartnerDetail = lazy(() => import("./pages/CommunityPartnerDetail"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const VolunteerHelp = lazy(() => import("./pages/VolunteerHelp"));
const StressTest = lazy(() => import("./pages/StressTest"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  // Auto-resubscribe push if user has push enabled but subscription was cleared
  useEffect(() => {
    const timer = setTimeout(() => autoResubscribeIfNeeded(), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PushPermissionBanner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<VolunteerLanding />} />
            <Route path="/clubs" element={<ClubsLanding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/club-login" element={<ClubLogin />} />
            <Route path="/club-signup" element={<ClubSignup />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<RequireAuth><VolunteerDashboard /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="/task/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
            <Route path="/club-dashboard" element={<RequireAuth redirectTo="/club-login"><ClubOwnerDashboard /></RequireAuth>} />
            <Route path="/command-center" element={<RequireAuth redirectTo="/club-login"><CommandCenter /></RequireAuth>} />
            <Route path="/club-invite/:token" element={<ClubInviteAccept />} />
            <Route path="/payments" element={<RequireAuth redirectTo="/club-login"><PaymentsOverview /></RequireAuth>} />
            <Route path="/contract-builder" element={<RequireAuth redirectTo="/club-login"><ContractBuilder /></RequireAuth>} />
            <Route path="/briefing-builder" element={<RequireAuth redirectTo="/club-login"><BriefingBuilder /></RequireAuth>} />
            <Route path="/compliance" element={<RequireAuth redirectTo="/club-login"><ComplianceDashboard /></RequireAuth>} />
            <Route path="/loyalty" element={<RequireAuth redirectTo="/club-login"><LoyaltyPrograms /></RequireAuth>} />
            <Route path="/ticketing" element={<RequireAuth redirectTo="/club-login"><TicketingDashboard /></RequireAuth>} />
            <Route path="/scan" element={<RequireAuth><TicketScanner /></RequireAuth>} />
            <Route path="/sepa-payouts" element={<RequireAuth redirectTo="/club-login"><SepaPayouts /></RequireAuth>} />
            <Route path="/academy" element={<RequireAuth redirectTo="/club-login"><AcademyBuilder /></RequireAuth>} />
            <Route path="/academy/physical-trainings" element={<RequireAuth redirectTo="/club-login"><PhysicalTrainings /></RequireAuth>} />
            <Route path="/academy/certificate-builder" element={<RequireAuth redirectTo="/club-login"><CertificateBuilder /></RequireAuth>} />
            <Route path="/training/:trainingId" element={<RequireAuth><VolunteerTraining /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/chat/:conversationId" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/partner-login" element={<PartnerLogin />} />
            <Route path="/external-partners" element={<RequireAuth redirectTo="/club-login"><ExternalPartners /></RequireAuth>} />
            <Route path="/partner-dashboard" element={<RequireAuth redirectTo="/partner-login"><PartnerDashboard /></RequireAuth>} />
            <Route path="/reporting" element={<RequireAuth redirectTo="/club-login"><ReportingDashboard /></RequireAuth>} />
            <Route path="/report-builder" element={<RequireAuth redirectTo="/club-login"><ReportBuilder /></RequireAuth>} />
            <Route path="/events-manager" element={<RequireAuth redirectTo="/club-login"><EventsManager /></RequireAuth>} />
            <Route path="/planning" element={<RequireAuth redirectTo="/club-login"><PlanningOverview /></RequireAuth>} />
            <Route path="/monthly-planning" element={<RequireAuth redirectTo="/club-login"><MonthlyPlanning /></RequireAuth>} />
            <Route path="/planning/:taskId" element={<RequireAuth redirectTo="/club-login"><ZonePlanning /></RequireAuth>} />
            <Route path="/safety" element={<RequireAuth redirectTo="/club-login"><SafetyOverview /></RequireAuth>} />
            <Route path="/safety/:eventId" element={<RequireAuth redirectTo="/club-login"><SafetyEventHub /></RequireAuth>} />
            <Route path="/safety/:eventId/control-room" element={<RequireAuth redirectTo="/club-login"><SafetyDashboard /></RequireAuth>} />
            <Route path="/safety/:eventId/closing" element={<RequireAuth redirectTo="/club-login"><SafetyClosing /></RequireAuth>} />
            <Route path="/community" element={<RequireAuth><Community /></RequireAuth>} />
            <Route path="/community/club/:clubId" element={<RequireAuth><CommunityClubDetail /></RequireAuth>} />
            <Route path="/community/partner/:partnerId" element={<RequireAuth><CommunityPartnerDetail /></RequireAuth>} />
            <Route path="/help" element={<RequireAuth><VolunteerHelp /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <IOSInstallOverlay />
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
  );
};

export default App;
