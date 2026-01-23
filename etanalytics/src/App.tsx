import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import IssuerDashboard from './pages/IssuerDashboard'
import AnalysisDashboard from './pages/AnalysisDashboard'
import Login from './pages/Login'
import DemoLogin from './pages/DemoLogin'
import Signup from './pages/Signup'
import ApplicationStatus from './pages/ApplicationStatus'
import ClientServices from './pages/ClientServices'
import About from './pages/About'
import Contact from './pages/Contact'
import Careers from './pages/Careers'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import TermsOfService from './pages/legal/TermsOfService'
import GDPR from './pages/legal/GDPR'
import Security from './pages/legal/Security'
import InvestorDashboard from './pages/investor/InvestorDashboard'
import { RegisterProvider } from './store/RegisterContext'
import { ActivityProvider } from './store/ActivityContext'
import { ETFDatabaseProvider } from './store/ETFDatabaseContext'

function App() {
  return (
    <ActivityProvider>
      {/* RegisterProvider must come BEFORE ETFDatabaseProvider so registers are in localStorage first */}
      <RegisterProvider>
        <ETFDatabaseProvider>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/demo-login" element={<DemoLogin />} />
            
            {/* Company Pages */}
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/careers" element={<Careers />} />
            
            {/* Legal Pages */}
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/legal/gdpr" element={<GDPR />} />
            <Route path="/legal/security" element={<Security />} />
            
            {/* Live Signup Flow */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/application-status" element={<ApplicationStatus />} />
            
            {/* Portals */}
            <Route path="/issuer/*" element={<IssuerDashboard />} />
            <Route path="/analysis/*" element={<AnalysisDashboard />} />
            
            {/* Admin Portal */}
            <Route path="/client-services/*" element={<ClientServices />} />
            
            {/* Investor Portal */}
            <Route path="/investors" element={<InvestorDashboard />} />
          </Routes>
        </ETFDatabaseProvider>
      </RegisterProvider>
    </ActivityProvider>
  )
}

export default App
