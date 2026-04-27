import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import WorkOrders from './pages/workorders/WorkOrders'
import WorkOrderDetail from './pages/workorders/WorkOrderDetail'
import NewWorkOrder from './pages/workorders/NewWorkOrder'
import DispatchBoard from './pages/dispatch/DispatchBoard'
import Timesheets from './pages/timesheets/Timesheets'
import Clients from './pages/clients/Clients'
import Assets from './pages/assets/Assets'
import Maintenance from './pages/maintenance/Maintenance'
import Invoices from './pages/invoices/Invoices'
import Settings from './pages/settings/Settings'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="work-orders">
                <Route index element={<WorkOrders />} />
                <Route path="new" element={<NewWorkOrder />} />
                <Route path=":id" element={<WorkOrderDetail />} />
              </Route>
              <Route path="dispatch"    element={<DispatchBoard />} />
              <Route path="timesheets"  element={<Timesheets />} />
              <Route path="clients"     element={<Clients />} />
              <Route path="assets"      element={<Assets />} />
              <Route path="maintenance" element={<Maintenance />} />
              <Route path="invoices"    element={<Invoices />} />
              <Route path="settings"    element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
