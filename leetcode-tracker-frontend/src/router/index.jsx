import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoaderTerminal from '../components/LoaderTerminal';

// Lazy load page components for code splitting
const Landing = lazy(() => import('../pages/Landing'));
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const CompanyList = lazy(() => import('../pages/CompanyList'));
const QuestionList = lazy(() => import('../pages/QuestionList'));
const FocusMode = lazy(() => import('../pages/FocusMode'));
const Profile = lazy(() => import('../pages/Profile'));
const Analytics = lazy(() => import('../pages/Analytics'));

// Layout wrapper with Suspense
function SuspenseLayout({ children }) {
  return (
    <Suspense fallback={<LoaderTerminal />}>
      {children}
    </Suspense>
  );
}

/**
 * Router configuration with lazy loading and protected routes
 */
const router = createBrowserRouter([
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
        <ProtectedRoute>
          <CompanyList />
        </ProtectedRoute>
      </SuspenseLayout>
    ),
  },
  {
    path: '/companies/:companyId',
    element: (
      <SuspenseLayout>
        <ProtectedRoute>
          <QuestionList />
        </ProtectedRoute>
      </SuspenseLayout>
    ),
  },
  {
    path: '/companies/:companyId/random',
    element: (
      <SuspenseLayout>
        <ProtectedRoute>
          <Navigate to="/companies/:companyId" replace />
        </ProtectedRoute>
      </SuspenseLayout>
    ),
  },
  {
    path: '/focus/:questionId',
    element: (
      <SuspenseLayout>
        <ProtectedRoute>
          <FocusMode />
        </ProtectedRoute>
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
    path: '/analytics',
    element: (
      <SuspenseLayout>
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </SuspenseLayout>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
