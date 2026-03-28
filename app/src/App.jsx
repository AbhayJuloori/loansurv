import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import BorrowerAnalysis from './pages/BorrowerAnalysis'
import CohortExplorer from './pages/CohortExplorer'
import ModelPerformance from './pages/ModelPerformance'
import Methodology from './pages/Methodology'

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="bg-bg min-h-screen" style={{ paddingTop: 48 }}>
        <Routes>
          <Route path="/"            element={<BorrowerAnalysis />} />
          <Route path="/cohort"      element={<CohortExplorer />}   />
          <Route path="/performance" element={<ModelPerformance />} />
          <Route path="/methodology" element={<Methodology />}      />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
