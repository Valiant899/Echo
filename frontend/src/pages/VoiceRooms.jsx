import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, getDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { FiUsers, FiMic, FiClock, FiHash, FiSearch, FiLock, FiPlus } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useLiveKit } from '../contexts/LiveKitContext';
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
  ${props => props.debug && 'border: 1px dashed rgba(255, 0, 0, 0.3);'}
`;

const Container = styled.div`
  background-color: ${props => props.theme.darkBg};
  min-height: 100vh;
  padding: 2rem 1rem;
  font-family: 'Inter', sans-serif;
  color: ${props => props.theme.textLight};
  max-width: 1200px;
  margin: 0 auto;
  ${props => props.debug && 'border: 1px dashed rgba(255, 0, 0, 0.3);'}
`;

const RoomCard = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.panelBg};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
  position: relative;

  &:hover {
    transform: scale(1.015);
  }

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const Thumbnail = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background-color: #2a2a2a;
`;

const MetaContainer = styled.div`
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

const Title = styled.h3`
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: 600;
  color: ${props => props.theme.textLight};
  margin: 0;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AuthorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: ${props => props.theme.textMuted};
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
`;

const AuthorPlaceholder = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.theme.accent};
  color: ${props => props.theme.textLight};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted};
`;

const LiveBadge = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background-color: ${props => props.theme.danger};
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
`;

const PrivateBadge = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background-color: rgba(0, 0, 0, 0.7);
  color: ${props => props.theme.textLight};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const CategoryBadge = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background-color: rgba(0, 0, 0, 0.7);
  color: ${props => props.theme.textLight};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  text-transform: capitalize;
`;

const HashtagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const Hashtag = styled.span`
  display: flex;
  align-items: center;
  background-color: rgba(74, 144, 226, 0.2);
  color: ${props => props.theme.accent};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
`;

const TabsContainer = styled.div`
  display: flex;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  gap: 0.5rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabButton = styled.button`
  background-color: ${props => props.active === 'true' ? props.theme.accent : props.theme.panelBg};
  color: ${props => props.active === 'true' ? 'white' : props.theme.textMuted};
  border: none;
  border-radius: 20px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  font-weight: ${props => props.active === 'true' ? 600 : 400};
`;

const SearchContainer = styled.div`
  position: relative;
  max-width: 500px;
`;

const SearchInput = styled.input`
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 8px;
  border: none;
  background-color: ${props => props.theme.panelBg};
  color: ${props => props.theme.textLight};
  font-size: 1rem;
  width: 100%;
`;

const EmptyState = styled.div`
  background-color: ${props => props.theme.panelBg};
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
`;

const RetryButton = styled.button`
  background-color: ${props => props.theme.accent};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  margin-top: 1rem;
  cursor: pointer;
  font-weight: 600;
`;

const CreateButton = styled.button`
  background-color: ${props => props.theme.accent};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 auto;

  &:hover {
    background-color: #3a8bd6;
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
  default: 'https://via.placeholder.com/350x160/2a2a2a/cccccc?text=Room+Image',
  profile: 'https://via.placeholder.com/28/4da6ff/ffffff?text=A'
};

const categoryTabs = [
  { id: 'all', name: 'All Rooms' },
  { id: 'trending', name: 'Trending' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'tech', name: 'Technology' },
  { id: 'music', name: 'Music' },
  { id: 'business', name: 'Business' }
];

function getFirestoreErrorMessage(error) {
  switch (error.code) {
    case 'permission-denied':
      return 'You don\'t have permission to view these rooms';
    case 'unauthenticated':
      return 'Please sign in to view private rooms';
    case 'failed-precondition':
      return 'Database index required. Please try again later.';
    default:
      return 'Failed to load rooms. Please try again.';
  }
}

function VoiceRooms() {
  const { currentUser, ensureFreshToken, isValidFirebaseUser } = useAuth();
  const stableCurrentUser = useMemo(() => currentUser, [currentUser?.uid]);
  const { connect, disconnectFromRoom } = useLiveKit();
  const navigate = useNavigate();
  const functions = getFunctions();
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [userCache, setUserCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState(null);

  // Debug logging for authentication state
  useEffect(() => {
    console.log('Authentication state changed:', {
      uid: stableCurrentUser?.uid,
      hasGetIdToken: !!stableCurrentUser?.getIdToken,
      hasReload: !!stableCurrentUser?.reload,
      methods: stableCurrentUser ? Object.getOwnPropertyNames(Object.getPrototypeOf(stableCurrentUser)) : null
    });
  }, [stableCurrentUser]);

  // Optimized user cache
  const getUserData = useCallback(async (userId) => {
    if (userCache[userId]) return userCache[userId];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const data = userDoc.exists() ? userDoc.data() : null;
      setUserCache(prev => ({ ...prev, [userId]: data }));
      return data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }, [userCache]);

  // Join room function
  const joinRoom = async (roomId) => {
    if (!roomId) {
      toast.error('Invalid room ID');
      return;
    }

    // Validate user
    if (!isValidFirebaseUser(stableCurrentUser)) {
      toast.error('Authentication error. Please login again.');
      navigate('/login', { state: { from: `/room/${roomId}` } });
      return;
    }

    setIsNavigating(true);
    setJoiningRoomId(roomId);

    try {
      const joinFn = httpsCallable(functions, 'joinRoom');
      const { data } = await joinFn({ roomId });
      
      const tokenFn = httpsCallable(functions, 'generateMediaToken');
      const tokenData = await tokenFn({ roomName: roomId });
      
      await connect(roomId, stableCurrentUser.uid, tokenData.data.token);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Join error details:', error);
      
      let message = 'Join failed';
      if (error?.details?.code) {
        switch(error.details.code) {
          case 'room-full': 
            message = 'Room is full'; 
            break;
          case 'private-room': 
            message = 'You need an invite'; 
            break;
          case 'not-found': 
            message = 'Room not found'; 
            break;
        }
      }
      toast.error(message);
    } finally {
      setIsNavigating(false);
      setJoiningRoomId(null);
    }
  };

  // Fetch rooms with error handling
  const fetchRooms = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      const publicRoomsQuery = query(
        collection(db, 'rooms'),
        where('isPublic', '==', true)
      );

      let publicRoomsData = [];
      let privateRoomsData = [];

      const publicUnsubscribe = onSnapshot(
        publicRoomsQuery,
        async (publicSnap) => {
          console.log('Public rooms snapshot:', publicSnap.docs.map(doc => doc.id));
          publicRoomsData = await Promise.all(
            publicSnap.docs.map(async (doc) => {
              const room = { id: doc.id, ...doc.data() };
              const userData = await getUserData(room.authorId);
              return {
                ...room,
                authorName: userData?.authorname || 'Anonymous',
                authorPicture: userData?.profilePicture || ''
              };
            })
          );

          const allRooms = [...new Map([...publicRoomsData, ...privateRoomsData].map(room => [room.id, room])).values()];
          setRooms(allRooms);
          setFilteredRooms(allRooms);
          setLoading(false);
        },
        (error) => {
          console.error('Public rooms error:', error);
          setError(getFirestoreErrorMessage(error));
          setLoading(false);
          toast.error(getFirestoreErrorMessage(error));
        }
      );

      let privateUnsubscribe = null;
      if (isValidFirebaseUser(stableCurrentUser)) {
        const privateRoomsQuery = query(
          collection(db, 'rooms'),
          where('participants', 'array-contains', stableCurrentUser.uid)
        );
        
        privateUnsubscribe = onSnapshot(
          privateRoomsQuery,
          async (privateSnap) => {
            console.log('Private rooms snapshot:', privateSnap.docs.map(doc => doc.id));
            privateRoomsData = await Promise.all(
              privateSnap.docs.map(async (doc) => {
                const room = { id: doc.id, ...doc.data() };
                const userData = await getUserData(room.authorId);
                return {
                  ...room,
                  authorName: userData?.authorname || 'Anonymous',
                  authorPicture: userData?.profilePicture || ''
                };
              })
            );

            const allRooms = [...new Map([...publicRoomsData, ...privateRoomsData].map(room => [room.id, room])).values()];
            setRooms(allRooms);
            setFilteredRooms(allRooms);
            setLoading(false);
          },
          (error) => {
            console.error('Private rooms error:', error);
            setError(getFirestoreErrorMessage(error));
            setLoading(false);
            toast.error(getFirestoreErrorMessage(error));
          }
        );
      } else {
        setRooms(publicRoomsData);
        setFilteredRooms(publicRoomsData);
        setLoading(false);
      }

      return () => {
        publicUnsubscribe();
        privateUnsubscribe?.();
      };
    } catch (error) {
      console.error('Initial fetch error:', error);
      setError(getFirestoreErrorMessage(error));
      setLoading(false);
      toast.error(getFirestoreErrorMessage(error));
      return () => {};
    }
  }, [stableCurrentUser, getUserData, isValidFirebaseUser]);

  useEffect(() => {
    const unsubscribe = fetchRooms();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      disconnectFromRoom();
    };
  }, [fetchRooms, disconnectFromRoom]);

  // Filter rooms
  useEffect(() => {
    const filtered = rooms.filter(room => 
      room.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (room.hashtags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );
    setFilteredRooms(filtered);
  }, [searchQuery, rooms]);

  // Format timestamp
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

  if (error) {
    return (
      <Container theme={theme}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: theme.danger }}>{error}</h2>
          <RetryButton theme={theme} onClick={() => window.location.reload()}>
            Retry
          </RetryButton>
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
        <TabsContainer>
          {categoryTabs.map(tab => (
            <TabButton
              key={tab.id}
              active={(activeTab === tab.id).toString()}
              onClick={() => setActiveTab(tab.id)}
              theme={theme}
              aria-label={`Filter by ${tab.name}`}
            >
              {tab.name}
            </TabButton>
          ))}
        </TabsContainer>

        <SearchContainer>
          <FiSearch style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: theme.textMuted
          }} />
          <SearchInput
            type="text"
            placeholder="Search rooms or hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            theme={theme}
            aria-label="Search rooms or hashtags"
          />
        </SearchContainer>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Loader theme={theme} />
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState theme={theme}>
          <h3 style={{ color: theme.textLight, marginBottom: '1rem' }}>
            No rooms found
          </h3>
          <p style={{ color: theme.textMuted, marginBottom: '1.5rem' }}>
            {searchQuery ? 'Try a different search' : 'Be the first to create a room!'}
          </p>
          <CreateButton
            onClick={() => isValidFirebaseUser(stableCurrentUser) ? navigate('/room-create') : navigate('/login')}
            theme={theme}
            aria-label={isValidFirebaseUser(stableCurrentUser) ? 'Create a new room' : 'Sign in to create a room'}
          >
            <FiPlus size={18} />
            {isValidFirebaseUser(stableCurrentUser) ? 'Create Room' : 'Sign In to Create Room'}
          </CreateButton>
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredRooms.map((room) => (
            <RoomCard 
              key={room.id}
              theme={theme}
              onClick={() => joinRoom(room.id)}
              aria-label={`Join room: ${room.title}`}
              aria-disabled={isNavigating && joiningRoomId === room.id}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  joinRoom(room.id);
                }
              }}
            >
              {room.isLive && <LiveBadge theme={theme}>LIVE</LiveBadge>}
              {!room.isPublic && (
                <PrivateBadge theme={theme}>
                  <FiLock size={12} /> Private
                </PrivateBadge>
              )}
              {room.category && !room.isLive && (
                <CategoryBadge theme={theme}>{room.category}</CategoryBadge>
              )}
              <Thumbnail
                src={room.thumbnailUrl || placeholderImages.default}
                alt={`Thumbnail for ${room.title}`}
                onError={(e) => { e.target.src = placeholderImages.default; }}
              />
              <MetaContainer>
                <Title>{room.title || 'Untitled Room'}</Title>
                {room.hashtags && room.hashtags.length > 0 && (
                  <HashtagsContainer>
                    {room.hashtags.map(tag => (
                      <Hashtag key={tag} theme={theme}>
                        <FiHash size={12} style={{ marginRight: '0.25rem' }} />
                        {tag}
                      </Hashtag>
                    ))}
                  </HashtagsContainer>
                )}
                <AuthorRow>
                  {room.authorPicture ? (
                    <Avatar
                      src={room.authorPicture}
                      alt={`Avatar of ${room.authorName || 'Anonymous'}`}
                      onError={(e) => { e.target.src = placeholderImages.profile; }}
                    />
                  ) : (
                    <AuthorPlaceholder theme={theme}>
                      {room.authorName?.charAt(0) || 'A'}
                    </AuthorPlaceholder>
                  )}
                  <span>
                    {room.authorName || 'Anonymous'} • {formatTime(room.createdAt)}
                  </span>
                </AuthorRow>
                <StatsRow>
                  <span>
                    <FiMic size={13} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {room.currentSpeakers || 0} speakers
                  </span>
                  <span>
                    <FiUsers size={13} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {room.currentListeners || 0} listeners
                  </span>
                </StatsRow>
              </MetaContainer>
              {isNavigating && joiningRoomId === room.id && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Loader theme={theme} />
                </div>
              )}
            </RoomCard>
          ))}
        </div>
      )}
    </Container>
  );
}

export default VoiceRooms;