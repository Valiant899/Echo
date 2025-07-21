import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

const RequireVerifiedEmail = ({ children }) => {
  const { currentUser, reloadUser } = useAuth();

  useEffect(() => {
    const checkVerification = async () => {
      if (currentUser && !currentUser.emailVerified) {
        await reloadUser(); // Force refresh verification status
        if (!currentUser.emailVerified) {
          toast.error('Please verify your email to access this feature');
        }
      }
    };
    checkVerification();
  }, [currentUser, reloadUser]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser.emailVerified) {
    return <Navigate to="/verify-required" replace />;
  }

  return children;
};

export default RequireVerifiedEmail;