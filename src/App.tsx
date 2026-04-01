import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PeriodProvider } from './contexts/PeriodContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { Toaster } from './components/ui/toaster';
import Login from './pages/Login';
import SignupIndividual from './pages/SignupIndividual';
import SignupBusiness from './pages/SignupBusiness';
import InviteAccept from './pages/InviteAccept';
import Activate from './pages/Activate';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Documents from './pages/Documents';
import Leads from './pages/Leads';
import Agenda from './pages/Agenda';
import Saturno from './pages/Saturno';
import SaturnoMeetPrejoin from './pages/SaturnoMeet';
import SaturnoMeetLive from './pages/SaturnoMeetLive';
import SaturnoMeetThanks from './pages/SaturnoMeetThanks';
import { SaturnoRedirect } from './components/SaturnoRedirect';
import AIConfig from './pages/AIConfig';
import Settings from './pages/Settings';
import Organizations from './pages/Organizations';
import Users from './pages/Users';
import APIKeys from './pages/APIKeys';
import { AIMaturity } from './pages/AIMaturity';
import Chat from './pages/Chat';
import ChatUnified from './pages/ChatUnified';
import Channels from './pages/Channels';
import Discovery from './pages/Discovery';
import WabaCallback from './pages/WabaCallback';

function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <PeriodProvider>
          <Router>
            <Routes>
          {/* Redirect raiz para login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup/individual" element={<SignupIndividual />} />
          <Route path="/invite/accept" element={<InviteAccept />} />
          <Route path="/signup/business" element={<SignupBusiness />} />
          <Route path="/activate" element={<Activate />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ai-maturity" element={<AIMaturity />} />
          <Route path="/chat" element={<ChatUnified />} />
          <Route path="/conversations" element={<ChatUnified />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/upload" element={<Documents />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route
            path="/saturno/m/:meetId"
            element={
              <SaturnoRedirect>
                <SaturnoMeetPrejoin />
              </SaturnoRedirect>
            }
          />
          <Route
            path="/saturno/m/:meetId/live"
            element={
              <SaturnoRedirect>
                <SaturnoMeetLive />
              </SaturnoRedirect>
            }
          />
          <Route
            path="/saturno/meet/:code"
            element={
              <SaturnoRedirect>
                <SaturnoMeetPrejoin />
              </SaturnoRedirect>
            }
          />
          <Route
            path="/saturno/meet/:code/live"
            element={
              <SaturnoRedirect>
                <SaturnoMeetLive />
              </SaturnoRedirect>
            }
          />
          <Route
            path="/saturno/thanks"
            element={
              <SaturnoRedirect>
                <SaturnoMeetThanks />
              </SaturnoRedirect>
            }
          />
          <Route
            path="/saturno"
            element={
              <SaturnoRedirect>
                <Saturno />
              </SaturnoRedirect>
            }
          />
          <Route path="/ai/prompt" element={<AIConfig />} />
          <Route path="/ai/model" element={<AIConfig />} />
          <Route path="/ai/examples" element={<AIConfig />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/users" element={<Users />} />
          <Route path="/api-keys" element={<APIKeys />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/integrations/waba/callback" element={<WabaCallback />} />
          <Route path="/integrations/whatsapp/callback" element={<WabaCallback />} />
            </Routes>
          </Router>
          <Toaster />
        </PeriodProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}

export default App;

