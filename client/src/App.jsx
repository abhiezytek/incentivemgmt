import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'

// New module pages
import Dashboard from './pages/Dashboard'
import KPIConfig from './pages/KPIConfig/index'
import SchemeManagement from './pages/SchemeManagement/index'
import ReviewAdjustments from './pages/ReviewAdjustments'
import ExceptionLog from './pages/ExceptionLog'
import OrgDomainMapping from './pages/OrgDomainMapping'
import IntegrationMonitor from './pages/Integration/IntegrationDashboard'
import PayoutDisbursement from './pages/PayoutDisbursement'
import Settings from './pages/Settings'
import SystemStatus from './pages/SystemStatus'
import Notifications from './pages/Notifications'

// Legacy pages (still accessible via redirects)
import AdminPlanListing from './pages/AdminPlanListing'
import CreatePlan from './pages/CreatePlan/index'
import UploadCenter from './pages/DataManagement/UploadCenter'
import DerivedVariables from './pages/DataManagement/DerivedVariables'
import IncentiveBreakdown from './pages/IncentiveBreakdown'
import Leaderboard from './pages/Leaderboard'
import TeamPerformance from './pages/TeamPerformance'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* ── New primary routes ── */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="kpi-config" element={<KPIConfig />} />
        <Route path="scheme-management" element={<SchemeManagement />} />
        <Route path="review-adjustments" element={<ReviewAdjustments />} />
        <Route path="exception-log" element={<ExceptionLog />} />
        <Route path="org-domain-mapping" element={<OrgDomainMapping />} />
        <Route path="integration" element={<IntegrationMonitor />} />
        <Route path="payouts" element={<PayoutDisbursement />} />
        <Route path="settings" element={<Settings />} />
        <Route path="system-status" element={<SystemStatus />} />
        <Route path="notifications" element={<Notifications />} />

        {/* ── Legacy routes preserved for backward compatibility ── */}
        <Route path="admin/plans" element={<AdminPlanListing />} />
        <Route path="plans/create" element={<CreatePlan />} />
        <Route path="data/upload" element={<UploadCenter />} />
        <Route path="data/variables" element={<DerivedVariables />} />
        <Route path="incentive/breakdown" element={<IncentiveBreakdown />} />
        <Route path="incentive/leaderboard" element={<Leaderboard />} />
        <Route path="payout/disbursement" element={<PayoutDisbursement />} />
        <Route path="team/performance" element={<TeamPerformance />} />
        <Route path="integration/dashboard" element={<IntegrationMonitor />} />

        {/* ── Redirects from old to new ── */}
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default App
