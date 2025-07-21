import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiCalendar, FiLogIn, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { db } from '../firebase'; // Import your Firebase config
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

const colors = {
  darkBg: "#121212",
  panelBg: "#1e1e1e",
  accent: "#4da6ff",
  textLight: "#e0e0e0",
  textMuted: "#a0a0a0",
  success: "#4BB543",
  error: "#FF3333"
};

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const { signup, currentUser } = useAuth();
  const navigate = useNavigate();

  // Check username availability in real-time
  useEffect(() => {
    const checkUsernameAvailability = async () => {
      if (formData.username.length >= 3) {
        setCheckingUsername(true);
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('authorname', '==', formData.username));
          const querySnapshot = await getDocs(q);
          
          setUsernameAvailable(querySnapshot.empty);
        } catch (err) {
          console.error("Error checking username:", err);
          toast.error("Error checking username availability");
        } finally {
          setCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (formData.username) {
        checkUsernameAvailability();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [formData.username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields are filled
    if (!formData.name || !formData.username || !formData.birthDate) {
      toast.error('All fields are required');
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await signup(
        formData.email,
        formData.password,
        formData.name,        // displayName
        formData.username,    // authorname
        formData.birthDate    // birthDate
      );
      navigate('/profile');
    } catch (error) {
      toast.error(error.message);
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
        {/* Name Field */}
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
              width: '84%',
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

        {/* Username Field */}
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
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
            required
            minLength="3"
            style={{
              width: '84%',
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
          {formData.username && (
            <div style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {checkingUsername ? (
                <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>Checking...</span>
              ) : usernameAvailable === true ? (
                <>
                  <FiCheck color={colors.success} />
                  <span style={{ color: colors.success, fontSize: '0.8rem' }}>Available</span>
                </>
              ) : usernameAvailable === false ? (
                <>
                  <FiX color={colors.error} />
                  <span style={{ color: colors.error, fontSize: '0.8rem' }}>Taken</span>
                </>
              ) : null}
            </div>
          )}
          {formData.username.length > 0 && formData.username.length < 3 && (
            <p style={{ color: colors.error, fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              Username must be at least 3 characters
            </p>
          )}
        </div>

        {/* Email Field */}
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
              width: '84%',
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

        {/* Birth Date Field */}
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
            max={new Date().toISOString().split('T')[0]} // Prevent future dates
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
          />
        </div>

        {/* Password Field */}
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
              width: '84%',
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

        {/* Confirm Password Field */}
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
              width: '84%',
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || usernameAvailable === false}
          style={{
            backgroundColor: loading || usernameAvailable === false ? colors.textMuted : colors.accent,
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading || usernameAvailable === false ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: loading || usernameAvailable === false ? colors.textMuted : '#3a8de6'
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