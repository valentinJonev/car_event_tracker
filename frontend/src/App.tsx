import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';

// ── Real pages ──────────────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import EventListPage from './pages/EventListPage';
import EventMapPage from './pages/EventMapPage';
import EventFormPage from './pages/EventFormPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import BecomeOrganiserPage from './pages/BecomeOrganiserPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import OrganisersPage from './pages/OrganisersPage';
import OrganiserDetailPage from './pages/OrganiserDetailPage';
import MyCalendarPage from './pages/MyCalendarPage';

/**
 * Redirect /events/:id to /events?detail=:id so the modal handles it.
 */
function EventDetailRedirect() {
  const id = window.location.pathname.split('/events/')[1]?.split('/')[0];
  return <Navigate to={`/events?detail=${id}`} replace />;
}

// ── App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/events" element={<EventListPage />} />
          <Route path="/events/:id" element={<EventDetailRedirect />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
