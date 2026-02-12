import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
            <Route path="/dashboard" element={<VolunteerDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/task/:id" element={<TaskDetail />} />
            <Route path="/club-dashboard" element={<ClubOwnerDashboard />} />
            <Route path="/club-invite/:token" element={<ClubInviteAccept />} />
            <Route path="/payments" element={<PaymentsOverview />} />
            <Route path="/contract-builder" element={<ContractBuilder />} />
            <Route path="/briefing-builder" element={<BriefingBuilder />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
