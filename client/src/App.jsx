import { Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import AdminPlanListing from './pages/AdminPlanListing'
import CreatePlan from './pages/CreatePlan'
import DerivedVariables from './pages/DataManagement/DerivedVariables'
import UploadPerformance from './pages/DataManagement/UploadPerformance'
import TeamPerformance from './pages/TeamPerformance'
import Leaderboard from './pages/Leaderboard'
import PayoutDisbursement from './pages/PayoutDisbursement'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="admin/plans" element={<AdminPlanListing />} />
        <Route path="plans/create" element={<CreatePlan />} />
        <Route path="data/variables" element={<DerivedVariables />} />
        <Route path="data/upload-performance" element={<UploadPerformance />} />
        <Route path="team/performance" element={<TeamPerformance />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="payout/disbursement" element={<PayoutDisbursement />} />
      </Route>
    </Routes>
  )
}

export default App
