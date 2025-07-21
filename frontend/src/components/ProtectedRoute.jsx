import { useAuth } from '../contexts/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ redirectPath = '/login' }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading">Loading authentication...</div>;
  }

  if (!currentUser) {
    // Preserve intended location for redirect back after login
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Critical: Pass all route props including state
  return <Outlet context={{ location }} />;
}