import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/marketing'
import AppHome from './pages/Landing'
import Landowner from './pages/Landowner'
import Regulator from './pages/Regulator'
import Broker from './pages/Broker'
import Developer from './pages/Developer'
import Planning from './pages/Planning'
import PlanningApplicationDetail from './pages/PlanningApplicationDetail'
import Operator from './pages/Operator'
import SubmissionPortal from './pages/SubmissionPortal'
import Exchange from './pages/Exchange'
import Profile from './pages/Profile'

function App() {
  return (
    <Routes>
      {/* App role selector (original) */}
      <Route path="/" element={<AppHome />} />
      
      {/* Marketing landing page */}
      <Route path="/home" element={<LandingPage />} />
      
      {/* Role-specific dashboards */}
      <Route path="/landowner" element={<Landowner />} />
      <Route path="/regulator" element={<Regulator />} />
      <Route path="/broker" element={<Broker />} />
      <Route path="/developer" element={<Developer />} />
      <Route path="/planning" element={<Planning />} />
      <Route path="/planning/application/:id" element={<PlanningApplicationDetail />} />
      <Route path="/operator" element={<Operator />} />
      <Route path="/submission-portal" element={<SubmissionPortal />} />
      <Route path="/exchange" element={<Exchange />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  )
}

export default App

