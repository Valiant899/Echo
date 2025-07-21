import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

const colors = {
  darkBg: "#121212",
  panelBg: "#1e1e1e",
  accent: "#4da6ff",
  textLight: "#e0e0e0",
  textMuted: "#a0a0a0",
  warning: "#ff9800",
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      console.log('Attempting login with email:', email);
      
      // Attempt login
      const userCredential = await login(email, password);
      
      // Check verification status but don't block login
      if (!userCredential.user.emailVerified) {
        toast.warning(
          <div>
            <p>Your email is not yet verified.</p>
            <p>Please check your inbox for the verification email.</p>
          </div>, 
          { autoClose: 5000 }
        );
      }
      
      console.log('Login successful, navigating to /highlights');
      navigate('/highlights');
      
    } catch (err) {
      console.error('Login failed:', {
        message: err.message,
        details: 'No additional details'
      });
      
      toast.error(err.message);
    } finally {
      setLoading(false);
      console.log('Login attempt completed, loading state:', false);
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '2rem auto',
      padding: '2rem',
      backgroundColor: colors.panelBg,
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{
          margin: '0 0 0.5rem',
          color: colors.textLight,
          fontSize: '1.75rem'
        }}>
          Welcome Back
        </h2>
        <p style={{ color: colors.textMuted }}>
          Log in to your Echo account
        </p>
      </div>

      {/* Verification warning banner */}
      {showVerificationWarning && (
        <div style={{
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderLeft: `4px solid ${colors.warning}`,
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
          borderRadius: '4px'
        }}>
          <FiAlertCircle size={20} color={colors.warning} />
          <div>
            <p style={{ 
              margin: '0 0 0.25rem', 
              color: colors.textLight,
              fontWeight: '500'
            }}>
              Email not verified
            </p>
            <p style={{ 
              margin: 0, 
              color: colors.textMuted,
              fontSize: '0.9rem'
            }}>
              Please check your inbox for the verification email.
              <br />
              <Link 
                to="/resend-verification" 
                style={{
                  color: colors.accent,
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Resend verification
              </Link>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.textMuted
          }}>
            <FiMail size={20} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={{
              width: '84%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              backgroundColor: colors.darkBg,
              border: `1px solid ${colors.darkBg}`,
              borderRadius: '6px',
              color: colors.textLight,
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = colors.accent}
            onBlur={(e) => e.target.style.borderColor = colors.darkBg}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.textMuted
          }}>
            <FiLock size={20} />
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={{
              width: '84%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              backgroundColor: colors.darkBg,
              border: `1px solid ${colors.darkBg}`,
              borderRadius: '6px',
              color: colors.textLight,
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = colors.accent}
            onBlur={(e) => e.target.style.borderColor = colors.darkBg}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            backgroundColor: loading ? '#3a8de6' : colors.accent,
            opacity: loading ? 0.8 : 1
          }}
          onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#3a8de6')}
          onMouseOut={(e) => !loading && (e.target.style.backgroundColor = colors.accent)}
        >
          <FiLogIn size={20} />
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: colors.textMuted, margin: '0' }}>
          Don't have an account?{' '}
          <Link
            to="/signup"
            style={{
              color: colors.accent,
              textDecoration: 'none',
              fontWeight: '600'
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Sign up
          </Link>
        </p>
        <p style={{ margin: '1rem 0 0' }}>
          <Link
            to="/forgot-password"
            style={{
              color: colors.textMuted,
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}