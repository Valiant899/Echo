import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';  // Fixed import
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiCalendar, FiLogIn } from 'react-icons/fi';
import { toast } from 'react-toastify';

const colors = {
  darkBg: "#121212",
  panelBg: "#1e1e1e",
  accent: "#4da6ff",
  textLight: "#e0e0e0",
  textMuted: "#a0a0a0",
};

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: ''
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await signup(formData.email, formData.password);
      // In a real app, you would also save the additional user data to Firestore
      toast.success('Account created successfully!');
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
          Create Account
        </h2>
        <p style={{ color: colors.textMuted }}>
          Join Echo today
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
            <FiUser size={20} />
          </div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full Name"
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
            <FiMail size={20} />
          </div>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
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
            <FiCalendar size={20} />
          </div>
          <input
            type="date"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              backgroundColor: colors.darkBg,
              border: `1px solid ${colors.darkBg}`,
              borderRadius: '6px',
              color: formData.birthDate ? colors.textLight : colors.textMuted,
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
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            required
            minLength="6"
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
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm Password"
            required
            minLength="6"
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
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: colors.textMuted, margin: '0' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: colors.accent,
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}