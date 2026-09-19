import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { WatchProfilesPage } from './pages/WatchProfilesPage';
import { WatchProfileCreatePage } from './pages/WatchProfileCreatePage';
import { WatchProfileDetailPage } from './pages/WatchProfileDetailPage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationDetailPage } from './pages/NotificationDetailPage';
import { ScansPage } from './pages/ScansPage';
import { ScanDetailPage } from './pages/ScanDetailPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="watch-profiles" element={<WatchProfilesPage />} />
            <Route path="watch-profiles/new" element={<WatchProfileCreatePage />} />
            <Route path="watch-profiles/:id" element={<WatchProfileDetailPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/:id" element={<JobDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="notifications/:id" element={<NotificationDetailPage />} />
            <Route path="scans" element={<ScansPage />} />
            <Route path="scans/:id" element={<ScanDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
