import { Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import AdminPlanListing from './pages/AdminPlanListing'
import CreatePlan from './pages/CreatePlan/index'
import UploadCenter from './pages/DataManagement/UploadCenter'
import DerivedVariables from './pages/DataManagement/DerivedVariables'
import IncentiveBreakdown from './pages/IncentiveBreakdown'
import Leaderboard from './pages/Leaderboard'
import PayoutDisbursement from './pages/PayoutDisbursement'
import TeamPerformance from './pages/TeamPerformance'
import IntegrationDashboard from './pages/Integration/IntegrationDashboard'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="admin/plans" element={<AdminPlanListing />} />
        <Route path="plans/create" element={<CreatePlan />} />
        <Route path="data/upload" element={<UploadCenter />} />
        <Route path="data/variables" element={<DerivedVariables />} />
        <Route path="incentive/breakdown" element={<IncentiveBreakdown />} />
        <Route path="incentive/leaderboard" element={<Leaderboard />} />
        <Route path="payout/disbursement" element={<PayoutDisbursement />} />
        <Route path="team/performance" element={<TeamPerformance />} />
        <Route path="integration/dashboard" element={<IntegrationDashboard />} />
      </Route>
    </Routes>
  )
}

export default App
