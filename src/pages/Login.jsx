import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';  // Fixed import
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import { toast } from 'react-toastify';

const colors = {
  darkBg: "#121212",
  panelBg: "#1e1e1e",
  accent: "#4da6ff",
  textLight: "#e0e0e0",
  textMuted: "#a0a0a0",
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(email, password);
      toast.success('Logged in successfully!');
      navigate('/profile');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              backgroundColor: colors.darkBg,
              border: `1px solid ${colors.darkBg}`,
              borderRadius: '6px',
              color: colors.textLight,
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              ':focus': {
                borderColor: colors.accent
              }
            }}
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
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              backgroundColor: colors.darkBg,
              border: `1px solid ${colors.darkBg}`,
              borderRadius: '6px',
              color: colors.textLight,
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              ':focus': {
                borderColor: colors.accent
              }
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: colors.accent,
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#3a8de6'
            }
          }}
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
              fontSize: '0.9rem',
              ':hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}