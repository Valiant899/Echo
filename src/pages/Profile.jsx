import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FiLogOut, FiUser, FiPlusCircle, FiUsers, FiMic, FiScissors } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const colors = {
  darkBg: "#121212",
  panelBg: "#1e1e1e",
  accent: "#4da6ff",
  textLight: "#e0e0e0",
  textMuted: "#a0a0a0",
  success: "#28a745",
  danger: "#dc3545"
};

export default function Profile() {
  const { currentUser, logout } = useAuth();
  const [createdRooms, setCreatedRooms] = useState([]);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      if (!currentUser) return;
      
      try {
        // Fetch rooms created by user
        const createdQuery = query(
          collection(db, 'rooms'),
          where('creatorId', '==', currentUser.uid)
        );
        const createdSnapshot = await getDocs(createdQuery);
        setCreatedRooms(createdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Fetch rooms user has joined
        const joinedQuery = query(
          collection(db, 'rooms'),
          where('participants', 'array-contains', currentUser.uid)
        );
        const joinedSnapshot = await getDocs(joinedQuery);
        setJoinedRooms(joinedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        toast.error('Failed to load rooms');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (!currentUser) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: colors.textLight,
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Please log in to view your profile</h2>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link 
            to="/login" 
            style={{
              color: 'white',
              backgroundColor: colors.accent,
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'background-color 0.2s',
              ':hover': {
                backgroundColor: colors.accentHover
              }
            }}
          >
            Log In
          </Link>
          <Link 
            to="/signup" 
            style={{
              color: colors.accent,
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              border: `1px solid ${colors.accent}`,
              transition: 'background-color 0.2s',
              ':hover': {
                backgroundColor: 'rgba(77, 166, 255, 0.1)'
              }
            }}
          >
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem',
      color: colors.textLight
    }}>
      {/* Profile Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '2.5rem',
        paddingBottom: '1.5rem',
        borderBottom: `1px solid ${colors.panelBg}`
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: colors.panelBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: colors.accent,
          flexShrink: 0
        }}>
          <FiUser size={48} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{
            margin: '0 0 0.25rem',
            fontSize: '2rem',
            color: colors.textLight,
            fontWeight: '700'
          }}>
            {currentUser.displayName || currentUser.email.split('@')[0]}
          </h1>
          <p style={{
            margin: '0',
            color: colors.textMuted,
            fontSize: '1rem'
          }}>
            {currentUser.email}
          </p>
          
          {/* Quick Actions */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1.5rem'
          }}>
            <Link 
              to="/create-room" 
              style={{
                backgroundColor: colors.accent,
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: colors.accentHover
                }
              }}
            >
              <FiPlusCircle /> New Room
            </Link>
            
            <Link 
              to="/create-highlight" 
              style={{
                backgroundColor: colors.success,
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: '#218838'
                }
              }}
            >
              <FiScissors /> Create Highlight
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{
          backgroundColor: colors.panelBg,
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem',
            fontSize: '0.9rem',
            color: colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FiPlusCircle /> Rooms Created
          </h3>
          <p style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: '700',
            color: colors.accent
          }}>
            {createdRooms.length}
          </p>
        </div>
        
        <div style={{
          backgroundColor: colors.panelBg,
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem',
            fontSize: '0.9rem',
            color: colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FiUsers /> Rooms Joined
          </h3>
          <p style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: '700',
            color: colors.accent
          }}>
            {joinedRooms.length}
          </p>
        </div>
        
        <div style={{
          backgroundColor: colors.panelBg,
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem',
            fontSize: '0.9rem',
            color: colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FiScissors /> Highlights
          </h3>
          <p style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: '700',
            color: colors.success
          }}>
            Coming Soon
          </p>
        </div>
      </div>

      {/* Rooms Sections */}
      <div style={{
        display: 'grid',
        gap: '2rem',
        gridTemplateColumns: '1fr 1fr'
      }}>
        {/* Created Rooms */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <FiMic /> Your Rooms
            </h2>
            <Link 
              to="/create-room" 
              style={{
                color: colors.accent,
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <FiPlusCircle size={14} /> New Room
            </Link>
          </div>
          
          {loading ? (
            <div style={{ 
              color: colors.textMuted,
              textAlign: 'center',
              padding: '2rem'
            }}>
              Loading your rooms...
            </div>
          ) : createdRooms.length > 0 ? (
            <div style={{
              display: 'grid',
              gap: '1rem'
            }}>
              {createdRooms.map(room => (
                <Link 
                  key={room.id} 
                  to={`/room/${room.id}`}
                  style={{
                    backgroundColor: colors.panelBg,
                    padding: '1.25rem',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: colors.textLight,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    ':hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <h3 style={{ 
                    margin: '0 0 0.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    {room.name}
                  </h3>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ 
                      color: colors.textMuted,
                      fontSize: '0.85rem'
                    }}>
                      {room.participants?.length || 0} participants
                    </span>
                    <span style={{
                      backgroundColor: 'rgba(77, 166, 255, 0.1)',
                      color: colors.accent,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Host
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{
              backgroundColor: colors.panelBg,
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              color: colors.textMuted,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p style={{ marginBottom: '1rem' }}>You haven't created any rooms yet</p>
              <Link 
                to="/create-room" 
                style={{
                  color: colors.accent,
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiPlusCircle /> Create your first room
              </Link>
            </div>
          )}
        </div>

        {/* Joined Rooms */}
        <div>
          <h2 style={{
            margin: '0 0 1.5rem',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <FiUsers /> Joined Rooms
          </h2>
          
          {loading ? (
            <div style={{ 
              color: colors.textMuted,
              textAlign: 'center',
              padding: '2rem'
            }}>
              Loading joined rooms...
            </div>
          ) : joinedRooms.length > 0 ? (
            <div style={{
              display: 'grid',
              gap: '1rem'
            }}>
              {joinedRooms.map(room => (
                <Link 
                  key={room.id} 
                  to={`/room/${room.id}`}
                  style={{
                    backgroundColor: colors.panelBg,
                    padding: '1.25rem',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: colors.textLight,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    ':hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <h3 style={{ 
                    margin: '0 0 0.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    {room.name}
                  </h3>
                  <p style={{ 
                    margin: 0,
                    color: colors.textMuted,
                    fontSize: '0.85rem'
                  }}>
                    Hosted by {room.creatorName || 'Anonymous'}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{
              backgroundColor: colors.panelBg,
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              color: colors.textMuted,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p style={{ marginBottom: '1rem' }}>You haven't joined any rooms yet</p>
              <Link 
                to="/rooms" 
                style={{
                  color: colors.accent,
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiUsers /> Browse rooms
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Logout Button */}
      <div style={{
        marginTop: '3rem',
        paddingTop: '2rem',
        borderTop: `1px solid ${colors.panelBg}`,
        textAlign: 'center'
      }}>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.danger}`,
            color: colors.danger,
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            fontWeight: '600',
            ':hover': {
              backgroundColor: 'rgba(220, 53, 69, 0.1)'
            }
          }}
        >
          <FiLogOut /> Log Out
        </button>
      </div>
    </div>
  );
}