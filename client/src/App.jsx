import { Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import AdminPlanListing from './pages/AdminPlanListing'
import CreatePlan from './pages/CreatePlan'
import DerivedVariables from './pages/DataManagement/DerivedVariables'
import UploadPerformance from './pages/DataManagement/UploadPerformance'
import UploadPolicyTransactions from './pages/DataManagement/UploadPolicyTransactions'
import UploadAgents from './pages/DataManagement/UploadAgents'
import UploadPersistencyData from './pages/DataManagement/UploadPersistencyData'
import UploadProducts from './pages/DataManagement/UploadProducts'
import UploadIncentiveRates from './pages/DataManagement/UploadIncentiveRates'
import UploadCenter from './pages/DataManagement/UploadCenter'
import TeamPerformance from './pages/TeamPerformance'
import Leaderboard from './pages/Leaderboard'
import PayoutDisbursement from './pages/PayoutDisbursement'
import IncentiveBreakdown from './pages/IncentiveBreakdown'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="admin/plans" element={<AdminPlanListing />} />
        <Route path="plans/create" element={<CreatePlan />} />
        <Route path="data/upload-center" element={<UploadCenter />} />
        <Route path="data/variables" element={<DerivedVariables />} />
        <Route path="data/upload-performance" element={<UploadPerformance />} />
        <Route path="data/upload-transactions" element={<UploadPolicyTransactions />} />
        <Route path="data/upload-agents" element={<UploadAgents />} />
        <Route path="data/upload-persistency" element={<UploadPersistencyData />} />
        <Route path="data/upload-products" element={<UploadProducts />} />
        <Route path="data/upload-rates" element={<UploadIncentiveRates />} />
        <Route path="team/performance" element={<TeamPerformance />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="payout/disbursement" element={<PayoutDisbursement />} />
        <Route path="incentive/breakdown" element={<IncentiveBreakdown />} />
      </Route>
    </Routes>
  )
}

export default App
