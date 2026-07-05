import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Wizard from './pages/Wizard'
import PhotoStudio from './pages/PhotoStudio'
import Studio from './pages/Studio'
import Sites from './pages/Sites'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <div className="grain-overlay" aria-hidden />
      <div className="vignette-overlay" aria-hidden />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create" element={<Wizard />} />
        <Route path="/project/:id/brief" element={<Wizard />} />
        <Route path="/project/:id/photos" element={<PhotoStudio />} />
        <Route path="/project/:id/studio" element={<Studio />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
      </Routes>
    </BrowserRouter>
  )
}
