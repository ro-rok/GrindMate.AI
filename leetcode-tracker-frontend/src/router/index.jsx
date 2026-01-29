import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Layout, { SimpleLayout } from '../components/layout/Layout';
import ErrorBoundary from '../components/ErrorBoundary';

// Lazy load page components for code splitting
const Landing = lazy(() => import('../pages/Landing'));
const Login = lazy(() => import('../pages/Login'));
const ForgetPassword = lazy(() => import('../pages/ForgetPassword'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const CompanyList = lazy(() => import('../pages/CompanyList'));
const QuestionList = lazy(() => import('../pages/QuestionList'));
const FocusMode = lazy(() => import('../pages/FocusMode'));
const Profile = lazy(() => import('../pages/Profile'));
const AdminPortal = lazy(() => import('../pages/AdminPortal'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Layout wrapper with Suspense
function SuspenseLayout({ children }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      {children}
    </Suspense>
  );
}

/**
 * Router configuration with lazy loading, protected routes, and page transitions
 * 
 * Features:
 * - Lazy loading for code splitting
 * - Protected routes with authentication
 * - Smooth page transitions with Framer Motion
 * - Layout components with sidebar/header
 * - Reduced motion support
 */
const router = createBrowserRouter([
  // Simple layout routes (no sidebar/header)
  {
    element: <SimpleLayout />,
    children: [
      {
        path: '/',
        element: (
          <SuspenseLayout>
            <Landing />
          </SuspenseLayout>
        ),
      },
      {
        path: '/login',
        element: (
          <SuspenseLayout>
            <Login />
          </SuspenseLayout>
        ),
      },
      {
        path: '/forget-password',
        element: (
          <SuspenseLayout>
            <ForgetPassword />
          </SuspenseLayout>
        ),
      },
    ],
  },
  // Main layout routes (with header, optional sidebar)
  {
    element: <Layout showHeader={true} showSidebar={false} />,
    children: [
      {
        path: '/dashboard',
        element: (
          <SuspenseLayout>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </SuspenseLayout>
        ),
      },
      {
        path: '/companies',
        element: (
          <SuspenseLayout>
            <CompanyList />
          </SuspenseLayout>
        ),
      },
      {
        path: '/companies/:companyId',
        element: (
          <SuspenseLayout>
            <QuestionList />
          </SuspenseLayout>
        ),
      },
      {
        path: '/companies/:companyId/random',
        element: (
          <SuspenseLayout>
            <Navigate to="/companies/:companyId" replace />
          </SuspenseLayout>
        ),
      },
      {
        path: '/focus/:questionId',
        element: (
          <SuspenseLayout>
            <FocusMode />
          </SuspenseLayout>
        ),
      },
      {
        path: '/profile',
        element: (
          <SuspenseLayout>
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </SuspenseLayout>
        ),
      },
      {
        path: '/admin',
        element: (
          <SuspenseLayout>
            <ErrorBoundary>
              <AdminPortal />
            </ErrorBoundary>
          </SuspenseLayout>
        ),
      },
      {
        path: '/admin/dashboard',
        element: (
          <SuspenseLayout>
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          </SuspenseLayout>
        ),
      },
    ],
  },
  // Catch-all 404 page - must be at root level to catch all unmatched routes
  {
    path: '*',
    element: (
      <SimpleLayout>
        <SuspenseLayout>
          <NotFound />
        </SuspenseLayout>
      </SimpleLayout>
    ),
  },
]);

export default router;
