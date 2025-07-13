import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FiUsers, FiMic, FiClock, FiHash, FiTrash2, FiSearch, FiLock, FiPlus } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import styled, { keyframes } from 'styled-components';


// Styled components
const spinAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Loader = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid ${props => props.theme.panelBg};
  border-top-color: ${props => props.theme.accent};
  border-radius: 50%;
  animation: ${spinAnimation} 1s linear infinite;
`;

const Container = styled.div`
  background-color: ${props => props.theme.darkBg};
  min-height: 100vh;
  padding: 2rem 1rem;
  font-family: 'Inter', sans-serif;
  color: ${props => props.theme.textLight};
  max-width: 1200px;
  margin: 0 auto;
`;

const RoomCard = styled.div`
  background-color: ${props => props.theme.panelBg};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
`;

const theme = {
  darkBg: '#121212',
  panelBg: '#1e1e1e',
  accent: '#4da6ff',
  textLight: '#e0e0e0',
  textMuted: '#a0a0a0',
  success: '#10b981',
  danger: '#ef4444'
};

const placeholderImages = {
  general: 'https://via.placeholder.com/350x160/2a2a2a/cccccc?text=General+Discussion',
  gaming: 'https://via.placeholder.com/350x160/2a2a2a/cccccc?text=Gaming',
  tech: 'https://via.placeholder.com/350x160/2a2a2a/cccccc?text=Technology',
  music: 'https://via.placeholder.com/350x160/2a2a2a/cccccc?text=Music',
  business: 'https://via.placeholder.com/350x160/2a2a2a/cccccc?text=Business',
  default: 'https://via.placeholder.com/350x160/2a2a2a/cccccc?text=Room+Image'
};

const categoryTabs = [
  { id: 'all', name: 'All Rooms' },
  { id: 'trending', name: 'Trending' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'tech', name: 'Technology' },
  { id: 'music', name: 'Music' },
  { id: 'business', name: 'Business' }
];

function VoiceRooms() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, 
          (querySnapshot) => {
            const roomsData = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setRooms(roomsData);
            setFilteredRooms(roomsData);
            setLoading(false);
            setError(null);
          },
          (error) => {
            console.error('Firestore error:', error);
            setError('Failed to load rooms. Please try again.');
            setLoading(false);
            toast.error('Failed to load rooms');
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    filterRooms();
  }, [activeTab, searchQuery, rooms]);

  const filterRooms = () => {
    let result = [...rooms];
    
    if (activeTab !== 'all' && activeTab !== 'trending') {
      result = result.filter(room => room.category === activeTab);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(room => 
        room.title.toLowerCase().includes(query) || 
        (room.hashtags && room.hashtags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    if (activeTab === 'trending') {
      result.sort((a, b) => (b.currentListeners || 0) - (a.currentListeners || 0));
    }
    
    setFilteredRooms(result);
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return 'Just now';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleDeleteRoom = async (roomId, creatorId) => {
    if (currentUser?.uid !== creatorId) {
      toast.error('Only room creator can delete this room');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this room?')) return;

    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      toast.success('Room deleted successfully');
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room');
    }
  };

  if (error) {
    return (
      <Container theme={theme}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: theme.danger }}>{error}</h2>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: theme.accent,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem 1.5rem',
              marginTop: '1rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container theme={theme}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ 
          fontSize: '2.2rem', 
          fontWeight: 700, 
          marginBottom: '0.5rem',
          color: theme.accent
        }}>
          Live Voice Rooms
        </h1>
        <p style={{ color: theme.textMuted, fontSize: '1rem' }}>
          Join trending discussions or start your own room
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          gap: '0.5rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {categoryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                backgroundColor: activeTab === tab.id ? theme.accent : theme.panelBg,
                color: activeTab === tab.id ? 'white' : theme.textMuted,
                border: 'none',
                borderRadius: '20px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                fontWeight: activeTab === tab.id ? 600 : 400,
                flexShrink: 0
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <FiSearch style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: theme.textMuted
          }} />
          <input
            type="text"
            placeholder="Search rooms or hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: theme.panelBg,
              color: theme.textLight,
              fontSize: '1rem',
              width: '100%'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Loader theme={theme} />
        </div>
      ) : filteredRooms.length === 0 ? (
        <div style={{ 
          backgroundColor: theme.panelBg,
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h3 style={{ color: theme.textLight, marginBottom: '1rem' }}>
            No rooms found
          </h3>
          <p style={{ color: theme.textMuted, marginBottom: '1.5rem' }}>
            {searchQuery ? 'Try a different search' : 'Be the first to create a room!'}
          </p>
          <button
            onClick={() => navigate('/create-room')}
            style={{
              backgroundColor: theme.accent,
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem 1.5rem',
              color: 'white',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto',
              ':hover': {
                backgroundColor: '#3a8de6'
              }
            }}
          >
            <FiPlus size={18} />
            Create Room
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredRooms.map((room) => (
            <RoomCard 
              key={room.id} 
              theme={theme}
              onClick={() => navigate(`/call/${room.id}`)}
            >
              {currentUser?.uid === room.creatorId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRoom(room.id, room.creatorId);
                  }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: theme.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                  title="Delete room"
                >
                  <FiTrash2 size={14} />
                </button>
              )}

              <div style={{ 
                height: '160px',
                backgroundImage: `url(${room.thumbnailUrl || placeholderImages[room.category] || placeholderImages.default})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-start',
                padding: '1rem',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  left: '0.5rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: theme.textLight,
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  textTransform: 'capitalize'
                }}>
                  {room.category || 'General'}
                </div>
                {!room.isPublic && (
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: theme.textLight,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <FiLock size={12} /> Private
                  </div>
                )}
              </div>
              
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ 
                  margin: '0 0 0.75rem',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: theme.textLight,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {room.title}
                </h3>
                
                {room.hashtags && room.hashtags.length > 0 && (
                  <div style={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    {room.hashtags.map(tag => (
                      <span key={tag} style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(74, 144, 226, 0.2)',
                        color: theme.accent,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        <FiHash size={12} style={{ marginRight: '0.25rem' }} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiUsers color={theme.textMuted} />
                    <span style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
                      {room.currentListeners || 0}/{room.maxListeners || 20}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiMic color={theme.textMuted} />
                    <span style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
                      {room.currentSpeakers || 1}/{room.speakers || 4}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {room.creatorPhoto ? (
                      <img 
                        src={room.creatorPhoto} 
                        alt="Creator" 
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: theme.accent,
                        color: theme.textLight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        {room.creatorName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
                      {room.creatorName || 'User'}
                    </span>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem',
                    color: theme.textMuted,
                    fontSize: '0.85rem'
                  }}>
                    <FiClock size={14} />
                    <span>{formatTime(room.createdAt)}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/call/${room.id}`);
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: theme.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    ':hover': {
                      backgroundColor: '#3a8de6'
                    }
                  }}
                >
                  Join Room
                </button>
              </div>
            </RoomCard>
          ))}
        </div>
      )}
    </Container>
  );
}

export default VoiceRooms;