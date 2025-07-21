// src/pages/VerificationSuccess.jsx
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function VerificationSuccess() {
  const { currentUser, reloadUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkVerification = async () => {
      try {
        // Reload user data to get latest verification status
        await reloadUser();
        
        if (!currentUser) {
          navigate('/login');
          return;
        }

        if (currentUser.emailVerified) {
          toast.success('Email successfully verified!');
          navigate('/highlights');
        } else {
          // If not verified after reload, wait a bit and try again
          setTimeout(checkVerification, 2000);
        }
      } catch (error) {
        console.error('Verification check failed:', error);
        toast.error('Error verifying email status');
        navigate('/');
      }
    };

    checkVerification();
  }, [currentUser, navigate, reloadUser]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <LoadingSpinner size="large" />
      <h2 style={{ marginTop: '2rem' }}>Verifying your email...</h2>
      <p>Please wait while we confirm your verification status</p>
    </div>
  );
}