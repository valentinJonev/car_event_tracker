import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';

// ── Real pages ──────────────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EventListPage from './pages/EventListPage';
import EventDetailPage from './pages/EventDetailPage';
import EventMapPage from './pages/EventMapPage';
import EventFormPage from './pages/EventFormPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import BecomeOrganiserPage from './pages/BecomeOrganiserPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import OrganisersPage from './pages/OrganisersPage';
import OrganiserDetailPage from './pages/OrganiserDetailPage';
import MyCalendarPage from './pages/MyCalendarPage';

// ── App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/events" element={<EventListPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/map" element={<EventMapPage />} />
          <Route path="/organisers" element={<OrganisersPage />} />
          <Route path="/organisers/:id" element={<OrganiserDetailPage />} />

          {/* Authenticated routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <SubscriptionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-calendar"
            element={
              <ProtectedRoute>
                <MyCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/become-organiser"
            element={
              <ProtectedRoute>
                <BecomeOrganiserPage />
              </ProtectedRoute>
            }
          />

          {/* Organiser / Admin routes */}
          <Route
            path="/events/new"
            element={
              <ProtectedRoute>
                <RoleGuard
                  roles={['organiser', 'admin']}
                  fallback={<Navigate to="/become-organiser" replace />}
                >
                  <EventFormPage />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              <ProtectedRoute>
                <RoleGuard
                  roles={['organiser', 'admin']}
                  fallback={<Navigate to="/events" replace />}
                >
                  <EventFormPage />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleGuard
                  roles={['admin']}
                  fallback={<Navigate to="/events" replace />}
                >
                  <AdminPage />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
