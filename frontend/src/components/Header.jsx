
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiMenu, FiX, FiUser } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Header() {
  const colors = {
    darkBg: '#121212',
    panelBg: '#1e1e1e',
    accent: '#4da6ff',
    textLight: '#e0e0e0',
    textMuted: '#a0a0a0',
    white: '#fff',
    accentHover: '#3a8de6',
    buttonGray: '#2d2d2d',
    buttonGrayHover: '#3a3a3a',
  };

  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isCreateRoomHovered, setIsCreateRoomHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [userData, setUserData] = useState(null);

  // Fetch user data when currentUser changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
    };

    fetchUserData();
  }, [currentUser]);

  // Handle window resize for mobile/desktop detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCreateRoom = () => {
    if (!currentUser) {
      toast.error('Please login to create a room');
      navigate('/login');
      return;
    }
    navigate('/create-room');
    setMenuOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm('');
      setSearchOpen(false);
    }
  };

  const handleProfileAction = () => {
    if (!currentUser) {
      navigate('/login');
    } else {
      setProfileDropdownOpen(!profileDropdownOpen);
    }
  };

  const handleProfileKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleProfileAction();
    }
  };

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    navigate('/');
    toast.success('Logged out successfully');
  };

  const userInitial = useMemo(() => {
    if (!currentUser) return <FiUser size={18} />;
    if (currentUser.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }
    return currentUser.email.charAt(0).toUpperCase();
  }, [currentUser]);

  return (
    <header
      style={{
        backgroundColor: colors.darkBg,
        padding: '1.5rem 0',
        boxShadow: '0 2px 6px rgb(0 0 0 / 0.7)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        {/* Logo & Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.textLight,
              fontSize: '1.5rem',
              padding: '0.5rem',
              display: isMobile ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>

          <Link
            to="/"
            style={{
              color: colors.accent,
              fontWeight: '700',
              fontSize: '2rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            aria-label="Go to homepage"
          >
            Echo
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav style={{ display: isMobile ? 'none' : 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link
              to="/highlights"
              style={{
                color: location.pathname === '/highlights' ? colors.accent : colors.textMuted,
                textDecoration: 'none',
                fontWeight: location.pathname === '/highlights' ? '700' : '400',
                transition: 'color 0.3s ease',
                fontSize: '1.1rem',
              }}
            >
              Highlights
            </Link>
            <Link
              to="/"
              style={{
                color: location.pathname === '/' ? colors.accent : colors.textMuted,
                textDecoration: 'none',
                fontWeight: location.pathname === '/' ? '700' : '400',
                transition: 'color 0.3s ease',
                fontSize: '1.1rem',
              }}
            >
              Voice Rooms
            </Link>
            <Link
              to="/news"
              style={{
                color: location.pathname === '/news' ? colors.accent : colors.textMuted,
                textDecoration: 'none',
                fontWeight: location.pathname === '/news' ? '700' : '400',
                transition: 'color 0.3s ease',
                fontSize: '1.1rem',
              }}
            >
              News Feed
            </Link>

            <form
              onSubmit={handleSearchSubmit}
              style={{ position: 'relative' }}
            >
              <input
                type="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search"
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '24px',
                  border: 'none',
                  backgroundColor: colors.panelBg,
                  color: colors.textLight,
                  fontSize: '1rem',
                  outline: 'none',
                  width: '240px',
                }}
              />
              <button
                type="submit"
                aria-label="Search"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FiSearch size={18} />
              </button>
            </form>
          </div>
        </nav>

        {/* Desktop Actions */}
        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button
            onClick={handleCreateRoom}
            onMouseEnter={() => setIsCreateRoomHovered(true)}
            onMouseLeave={() => setIsCreateRoomHovered(false)}
            style={{
              backgroundColor: isCreateRoomHovered ? colors.buttonGrayHover : colors.buttonGray,
              border: 'none',
              borderRadius: '24px',
              color: colors.textLight,
              cursor: 'pointer',
              fontWeight: '600',
              padding: '0.75rem 1.5rem',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.2s',
              height: '48px',
            }}
            aria-label="Create a new voice room"
          >
            <div
              style={{
                position: 'relative',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FiPlus
                size={18}
                style={{
                  position: 'absolute',
                  transition: 'transform 0.3s ease',
                  transform: isCreateRoomHovered ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
              <FiPlus
                size={18}
                style={{
                  position: 'absolute',
                  transition: 'transform 0.3s ease',
                  transform: isCreateRoomHovered ? 'rotate(0deg)' : 'rotate(90deg)',
                }}
              />
            </div>
            <span>Create Room</span>
          </button>

          <div style={{ position: 'relative' }}>
            <div
              onClick={handleProfileAction}
              onKeyDown={handleProfileKeyDown}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: userData?.profilePicture ? 'transparent' : colors.accent,
                color: colors.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '1.1rem',
                transition: 'transform 0.2s',
                overflow: 'hidden',
                border: userData?.profilePicture ? '2px solid ' + colors.accent : 'none'
              }}
              aria-label="User profile"
              role="button"
              tabIndex={0}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {userData?.profilePicture ? (
                <img 
                  src={userData.profilePicture} 
                  alt="Profile" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                    e.target.parentNode.style.backgroundColor = colors.accent;
                  }}
                />
              ) : (
                userInitial
              )}
            </div>

            {profileDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '55px',
                  backgroundColor: colors.panelBg,
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  minWidth: '240px',
                  zIndex: 1001,
                  overflow: 'hidden',
                }}
              >
                {currentUser ? (
                  <>
                    <div
                      key="profile-info"
                      style={{
                        padding: '1.25rem',
                        borderBottom: `1px solid ${colors.darkBg}`,
                      }}
                    >
                      <p
                        style={{
                          color: colors.textLight,
                          fontWeight: '600',
                          margin: 0,
                          fontSize: '1.1rem',
                        }}
                      >
                        {userData?.authorname || currentUser.displayName || currentUser.email}
                      </p>
                      <p
                        style={{
                          color: colors.textMuted,
                          fontSize: '0.9rem',
                          margin: '0.25rem 0 0',
                        }}
                      >
                        {currentUser.email}
                      </p>
                    </div>
                    <Link
                      key="profile-link"
                      to="/profile"
                      style={{
                        display: 'block',
                        padding: '1rem 1.25rem',
                        color: colors.textLight,
                        textDecoration: 'none',
                        fontSize: '1rem',
                        transition: 'background-color 0.2s',
                      }}
                      onClick={() => setProfileDropdownOpen(false)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Your Profile
                    </Link>
                    <button
                      key="logout"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '1rem 1.25rem',
                        color: colors.textLight,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      key="login"
                      to="/login"
                      style={{
                        display: 'block',
                        padding: '1rem 1.25rem',
                        color: colors.textLight,
                        textDecoration: 'none',
                        fontSize: '1rem',
                        transition: 'background-color 0.2s',
                      }}
                      onClick={() => setProfileDropdownOpen(false)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Log In
                    </Link>
                    <Link
                      key="signup"
                      to="/signup"
                      style={{
                        display: 'block',
                        padding: '1rem 1.25rem',
                        color: colors.textLight,
                        textDecoration: 'none',
                        fontSize: '1rem',
                        transition: 'background-color 0.2s',
                      }}
                      onClick={() => setProfileDropdownOpen(false)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Button */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label={searchOpen ? 'Close search' : 'Open search'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textLight,
            fontSize: '1.5rem',
            padding: '0.5rem',
            display: isMobile ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FiSearch size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          style={{
            display: isMobile ? 'block' : 'none',
            backgroundColor: colors.darkBg,
            padding: '0.5rem 0',
            borderTop: `1px solid ${colors.panelBg}`,
            width: '100%',
          }}
        >
          <Link
            to="/highlights"
            style={{
              color: location.pathname === '/highlights' ? colors.accent : colors.textMuted,
              textDecoration: 'none',
              fontWeight: location.pathname === '/highlights' ? '700' : '400',
              padding: '1rem 2rem',
              display: 'block',
              fontSize: '1.1rem',
              transition: 'background-color 0.2s',
            }}
            onClick={() => setMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Highlights
          </Link>
          <Link
            to="/"
            style={{
              color: location.pathname === '/' ? colors.accent : colors.textMuted,
              textDecoration: 'none',
              fontWeight: location.pathname === '/' ? '700' : '400',
              padding: '1rem 2rem',
              display: 'block',
              fontSize: '1.1rem',
              transition: 'background-color 0.2s',
            }}
            onClick={() => setMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Voice Rooms
          </Link>
          <Link
            to="/news"
            style={{
              color: location.pathname === '/news' ? colors.accent : colors.textMuted,
              textDecoration: 'none',
              fontWeight: location.pathname === '/news' ? '700' : '400',
              padding: '1rem 2rem',
              display: 'block',
              fontSize: '1.1rem',
              transition: 'background-color 0.2s',
            }}
            onClick={() => setMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            News Feed
          </Link>
          {currentUser && (
            <Link
              to="/profile"
              style={{
                color: location.pathname === '/profile' ? colors.accent : colors.textMuted,
                textDecoration: 'none',
                fontWeight: location.pathname === '/profile' ? '700' : '400',
                padding: '1rem 2rem',
                display: 'block',
                fontSize: '1.1rem',
                transition: 'background-color 0.2s',
              }}
              onClick={() => setMenuOpen(false)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Your Profile
            </Link>
          )}
          <button
            onClick={handleCreateRoom}
            style={{
              backgroundColor: isCreateRoomHovered ? colors.buttonGrayHover : colors.buttonGray,
              border: 'none',
              borderRadius: '8px',
              color: colors.textLight,
              cursor: 'pointer',
              fontWeight: '600',
              padding: '1rem',
              fontSize: '1.1rem',
              width: 'calc(100% - 4rem)',
              margin: '1rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={() => setIsCreateRoomHovered(true)}
            onMouseLeave={() => setIsCreateRoomHovered(false)}
            aria-label="Create a new voice room"
          >
            <FiPlus size={18} />
            Create Room
          </button>
          {currentUser ? (
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.textMuted,
                cursor: 'pointer',
                fontWeight: '400',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                width: '100%',
                textAlign: 'left',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Log Out
            </button>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: colors.textMuted,
                  textDecoration: 'none',
                  fontWeight: '400',
                  padding: '1rem 2rem',
                  display: 'block',
                  borderTop: `1px solid ${colors.panelBg}`,
                  fontSize: '1.1rem',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => setMenuOpen(false)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                style={{
                  color: colors.textMuted,
                  textDecoration: 'none',
                  fontWeight: '400',
                  padding: '1rem 2rem',
                  display: 'block',
                  fontSize: '1.1rem',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => setMenuOpen(false)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.panelBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}

      {/* Mobile Search */}
      {searchOpen && (
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: isMobile ? 'block' : 'none',
            backgroundColor: colors.darkBg,
            padding: '1rem 2rem',
            borderTop: `1px solid ${colors.panelBg}`,
            width: '100%',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '24px',
                border: 'none',
                backgroundColor: colors.panelBg,
                color: colors.textLight,
                fontSize: '1rem',
                outline: 'none',
                width: '100%',
              }}
              autoFocus
            />
            <button
              type="submit"
              aria-label="Search"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                cursor: 'pointer',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FiSearch size={18} />
            </button>
          </div>
        </form>
      )}
    </header>
  );
}