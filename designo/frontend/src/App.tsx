import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Wizard from './pages/Wizard'
import PhotoStudio from './pages/PhotoStudio'
import Studio from './pages/Studio'
import Sites from './pages/Sites'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import Mailbox from './pages/Mailbox'
import Documents from './pages/Documents'
import Playbook from './pages/Playbook'
import RequireAuth from './components/RequireAuth'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

const guard = (el: JSX.Element) => <RequireAuth>{el}</RequireAuth>

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <div className="grain-overlay" aria-hidden />
      <div className="vignette-overlay" aria-hidden />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        {/* Studio (admin session required) */}
        <Route path="/start" element={guard(<Landing />)} />
        <Route path="/create" element={guard(<Wizard />)} />
        <Route path="/project/:id/brief" element={guard(<Wizard />)} />
        <Route path="/project/:id/photos" element={guard(<PhotoStudio />)} />
        <Route path="/project/:id/studio" element={guard(<Studio />)} />
        <Route path="/sites" element={guard(<Sites />)} />
        <Route path="/leads" element={guard(<Leads />)} />
        <Route path="/leads/:id" element={guard(<LeadDetail />)} />
        <Route path="/mailbox" element={guard(<Mailbox />)} />
        <Route path="/documents" element={guard(<Documents />)} />
        <Route path="/playbook" element={guard(<Playbook />)} />
      </Routes>
    </BrowserRouter>
  )
}
