import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
// BottomTabBar removed - replaced by sidebar navigation
import IOSInstallOverlay from "@/components/IOSInstallOverlay";
import { initOneSignal } from "@/lib/onesignal";
import RequireAuth from "./components/RequireAuth";
import VolunteerLanding from "./pages/VolunteerLanding";
import ClubsLanding from "./pages/ClubsLanding";
import Login from "./pages/Login";
import ClubLogin from "./pages/ClubLogin";
import ClubSignup from "./pages/ClubSignup";
import Signup from "./pages/Signup";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TaskDetail from "./pages/TaskDetail";
import Chat from "./pages/Chat";
import ClubOwnerDashboard from "./pages/ClubOwnerDashboard";
import ClubInviteAccept from "./pages/ClubInviteAccept";
import PaymentsOverview from "./pages/PaymentsOverview";
import ContractBuilder from "./pages/ContractBuilder";
import BriefingBuilder from "./pages/BriefingBuilder";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import LoyaltyPrograms from "./pages/LoyaltyPrograms";
import TicketingDashboard from "./pages/TicketingDashboard";
import TicketScanner from "./pages/TicketScanner";
import SepaPayouts from "./pages/SepaPayouts";
import AcademyBuilder from "./pages/AcademyBuilder";
import PhysicalTrainings from "./pages/PhysicalTrainings";
import VolunteerTraining from "./pages/VolunteerTraining";
import CertificateBuilder from "./pages/CertificateBuilder";
import ExternalPartners from "./pages/ExternalPartners";
import PartnerLogin from "./pages/PartnerLogin";
import PartnerDashboard from "./pages/PartnerDashboard";
import ReportingDashboard from "./pages/ReportingDashboard";
import ReportBuilder from "./pages/ReportBuilder";
import EventsManager from "./pages/EventsManager";
import ZonePlanning from "./pages/ZonePlanning";
import PlanningOverview from "./pages/PlanningOverview";
import MonthlyPlanning from "./pages/MonthlyPlanning";
import SafetyDashboard from "./pages/SafetyDashboard";
import SafetyOverview from "./pages/SafetyOverview";
import SafetyEventHub from "./pages/SafetyEventHub";
import SafetyClosing from "./pages/SafetyClosing";
import Community from "./pages/Community";
import CommunityClubDetail from "./pages/CommunityClubDetail";
import CommunityPartnerDetail from "./pages/CommunityPartnerDetail";
import CommandCenter from "./pages/CommandCenter";
import VolunteerHelp from "./pages/VolunteerHelp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initOneSignal();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
          <IOSInstallOverlay />
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
  );
};

export default App;
