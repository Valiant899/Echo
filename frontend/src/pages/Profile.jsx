import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FiLogOut, FiUser, FiUsers, FiMic, FiVideo, FiTrash2, FiPlay, FiSearch, FiLock, FiPlus } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import ProfilePictureUploader from './ProfilePictureUploader';
import styled, { keyframes } from 'styled-components';

// Theme (aligned with App.jsx and index.css)
const theme = {
  darkBg: '#121212',
  panelBg: '#1e1e1e',
  accent: '#4da6ff',
  textLight: '#e0e0e0',
  textMuted: '#a0a0a0',
  highlight: '#7c4dff',
  success: '#28a745',
  danger: '#dc3545'
};

const placeholderImages = {
  default: 'https://via.placeholder.com/400x120/2a2a2a/cccccc?text=Room+Thumbnail',
  profile: 'https://via.placeholder.com/28/4da6ff/ffffff?text=A'
};

// Styled Components
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
  padding: 2rem;
  font-family: 'Inter', sans-serif;
  color: ${props => props.theme.textLight};
  max-width: 1200px;
  margin: 0 auto;
  ${props => props.debug && 'border: 1px dashed rgba(255, 0, 0, 0.3);'}
`;

const UnauthorizedContainer = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.textLight};
  max-width: 600px;
  margin: 0 auto;
  ${props => props.debug && 'border: 1px dashed rgba(255, 0, 0, 0.3);'}
`;

const UnauthorizedTitle = styled.h2`
  margin-bottom: 1rem;
  font-size: 1.5rem;
`;

const AuthButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const Button = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background-color: ${props => props.theme.accent};
  color: white;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  font-size: 1rem;
  &:hover {
    background-color: #3a8bd6;
    transform: translateY(-1px);
  }
`;

const ButtonOutline = styled(Button)`
  background-color: transparent;
  border: 1px solid ${props => props.theme.accent};
  color: ${props => props.theme.accent};
  &:hover {
    background-color: rgba(77, 166, 255, 0.1);
  }
`;

const ButtonDanger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background-color: ${props => props.theme.danger};
  color: white;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  font-size: 1rem;
  &:hover {
    background-color: #c82333;
  }
`;

const ButtonSmall = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background-color: ${props => props.theme.accent};
  color: white;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
  &:hover {
    background-color: #3a8bd6;
    transform: translateY(-1px);
  }
`;

const ProfileHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background-color: ${props => props.theme.panelBg};
  border-radius: 12px;
  margin-bottom: 2rem;
  ${props => props.debug && 'border: 1px dashed rgba(255, 0, 0, 0.3);'}
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.h1`
  margin: 0 0 0.5rem;
  font-size: 2rem;
  font-weight: 600;
`;

const ProfileEmail = styled.p`
  margin: 0;
  color: ${props => props.theme.textMuted};
  font-size: 1rem;
  margin-bottom: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  ${props => props.debug && 'border: 1px dashed rgba(255, 0, 0, 0.3);'}
`;

const StatCardStyled = styled.div`
  background-color: ${props => props.theme.panelBg};
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const StatIcon = styled.div`
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  color: ${props => props.$highlight ? props.theme.highlight : props.theme.accent};
  background-color: ${props => props.$highlight ? 'rgba(124, 77, 255, 0.1)' : 'rgba(77, 166, 255, 0.1)'};
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: ${props => props.$highlight ? props.theme.highlight : props.theme.textLight};
`;

const StatLabel = styled.div`
  font-size: 0.95rem;
  color: ${props => props.theme.textMuted};
  font-weight: 500;
`;

const ContentSection = styled.section`
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.panelBg};
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.textLight};
`;

const Count = styled.span`
  color: ${props => props.theme.textMuted};
  font-weight: normal;
  font-size: 1rem;
  margin-left: 0.5rem;
`;

const HighlightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  ${props => props.debug && 'border: 1px dashed rgba(255, 0, 0, 0.3);'}
`;

const HighlightCardStyled = styled.div`
  background-color: ${props => props.theme.panelBg};
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const VideoContainer = styled.div`
  position: relative;
  padding-top: 56.25%;
  background-color: #000;
`;

const Video = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Image = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const VideoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
`;

const VideoPlaceholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.textMuted};
`;

const HighlightContent = styled.div`
  padding: 1rem;
`;

const HighlightHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const HighlightTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
`;

const IconButton = styled.button`
  background-color: transparent;
  border: none;
  color: ${props => props.danger ? props.theme.danger : props.theme.textMuted};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const HighlightMetaStyled = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
`;

const RoomsColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
    /* Alternative: grid-template-columns: 2fr 1fr; for wider "Your Rooms" */
  }
  ${props => props.debug && 'border: 1px dashed rgba(255, 0, 0, 0.3);'}
`;

const RoomsList = styled.div`
  display: grid;
  gap: 1rem;
`;

const RoomCardStyled = styled(Link)`
  background-color: ${props => props.theme.panelBg};
  padding: 1rem;
  border-radius: 8px;
  text-decoration: none;
  color: ${props => props.theme.textLight};
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
  height: 100%;
  &:hover {
    transform: translateY(-2px);
  }
`;

const RoomThumbnail = styled.div`
  position: relative;
  height: 160px;
  background-image: url(${props => props.src || placeholderImages.default});
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  overflow: hidden;
`;

const ThumbnailOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ParticipantCount = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const RoomContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 0.5rem;
`;

const RoomTitle = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RoomCreator = styled.p`
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
  margin-bottom: 0.75rem;
`;

const RoomFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  margin-top: auto;
`;

const HostBadge = styled.span`
  background-color: rgba(77, 166, 255, 0.1);
  color: ${props => props.theme.accent};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const HostContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const EmptyStateStyled = styled.div`
  background-color: ${props => props.theme.panelBg};
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
`;

const EmptyMessage = styled.p`
  margin-bottom: 1rem;
  color: ${props => props.theme.textMuted};
`;

const LogoutSection = styled.div`
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid ${props => props.theme.panelBg};
  text-align: center;
`;

const Loading = styled.div`
  color: ${props => props.theme.textMuted};
  text-align: center;
  padding: 2rem;
`;

// Main Component
export default function Profile({ AvatarComponent }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [createdRooms, setCreatedRooms] = useState([]);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [userCache, setUserCache] = useState({});
  const [loading, setLoading] = useState({
    rooms: true,
    highlights: true
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [username, setUsername] = useState('');
  const [pagination, setPagination] = useState({
    highlights: { limit: 6, loadedAll: false },
    createdRooms: { limit: 6, loadedAll: false },
    joinedRooms: { limit: 6, loadedAll: false }
  });

  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    // Log theme to verify propagation
    console.log('Current theme:', theme);

    // Fetch username
    const fetchUsername = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (isMounted && userDoc.exists()) {
          setUsername(userDoc.data().authorname || '');
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching username:', error);
          toast.error('Failed to load username');
        }
      }
    };

    fetchUsername();

    const fetchUserData = async (authorId) => {
      if (userCache[authorId]) {
        return userCache[authorId];
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', authorId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userInfo = {
            authorname: userData.authorname || 'Anonymous',
            profilePicture: userData.profilePicture || ''
          };
          if (isMounted) {
            setUserCache(prev => ({ ...prev, [authorId]: userInfo }));
          }
          return userInfo;
        }
        return { authorname: 'Anonymous', profilePicture: '' };
      } catch (error) {
        if (isMounted) {
          console.error(`Error fetching user ${authorId}:`, error);
        }
        return { authorname: 'Anonymous', profilePicture: '' };
      }
    };

    const unsubscribeHighlights = onSnapshot(
      query(collection(db, 'highlights'), where('authorId', '==', currentUser.uid)),
      (snapshot) => {
        if (isMounted) {
          setHighlights(snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null
          })));
          setLoading(prev => ({ ...prev, highlights: false }));
        }
      },
      (error) => {
        if (isMounted) {
          console.error("Error getting highlights: ", error);
          toast.error("Failed to load highlights");
          setLoading(prev => ({ ...prev, highlights: false }));
        }
      }
    );

    const unsubscribeCreatedRooms = onSnapshot(
      query(collection(db, 'rooms'), where('authorId', '==', currentUser.uid)),
      async (snapshot) => {
        const roomsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null
        }));
        const updatedRooms = await Promise.all(
          roomsData.map(async (room) => {
            const userData = await fetchUserData(room.authorId);
            return {
              ...room,
              authorName: userData.authorname,
              authorPicture: userData.profilePicture
            };
          })
        );
        if (isMounted) {
          setCreatedRooms(updatedRooms);
          setLoading(prev => ({ ...prev, rooms: false }));
        }
      },
      (error) => {
        if (isMounted) {
          console.error("Error getting created rooms: ", error);
          toast.error("Failed to load your rooms");
          setLoading(prev => ({ ...prev, rooms: false }));
        }
      }
    );

    const unsubscribeJoinedRooms = onSnapshot(
      query(
        collection(db, 'rooms'),
        where('participants', 'array-contains', { userId: currentUser.uid })
      ),
      async (snapshot) => {
        const roomsData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            // Get the specific participant data from subcollection
            const participantSnap = await getDoc(
              doc(db, 'rooms', doc.id, 'participants', currentUser.uid)
            );
            
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
              joinedAt: participantSnap.exists() 
                ? participantSnap.data().joinedAt?.toDate() 
                : null
            };
          })
        );

        // Sort by joinedAt (most recent first), then by createdAt
        const sortedRooms = roomsData.sort((a, b) => {
          const aDate = a.joinedAt || a.createdAt || new Date(0);
          const bDate = b.joinedAt || b.createdAt || new Date(0);
          return bDate - aDate;
        });

        const updatedRooms = await Promise.all(
          sortedRooms.map(async (room) => {
            const userData = await fetchUserData(room.authorId);
            return {
              ...room,
              authorName: userData.authorname,
              authorPicture: userData.profilePicture
            };
          })
        );

        if (isMounted) {
          setJoinedRooms(updatedRooms);
          setLoading(prev => ({ ...prev, rooms: false }));
        }
      },
      (error) => {
        if (isMounted) {
          console.error("Error getting joined rooms: ", error);
          toast.error("Failed to load joined rooms");
          setLoading(prev => ({ ...prev, rooms: false }));
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeHighlights();
      unsubscribeCreatedRooms();
      unsubscribeJoinedRooms();
    };
  }, [currentUser, userCache]);

  const handleLogout = async () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm('Are you sure you want to delete this room? All room data will be permanently removed.')) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
        toast.success('Room deleted successfully');
      } catch (error) {
        toast.error('Failed to delete room: ' + error.message);
      }
    }
  };

  const handleDeleteHighlight = async (highlightId) => {
    if (!currentUser) {
      toast.error('Please sign in to manage highlights');
      navigate('/login');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this highlight?')) return;

    try {
      await deleteDoc(doc(db, 'highlights', highlightId));
      toast.success('Highlight deleted successfully');
    } catch (error) {
      console.error('Error deleting highlight:', error);
      toast.error('Failed to delete highlight');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Permanently delete ALL data?")) return;

    setIsDeleting(true);
    const user = auth.currentUser;

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        prompt("Enter your password to confirm deletion")
      );
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      await auth.signOut();

      window.sessionStorage.clear();
      window.localStorage.clear();

      navigate('/');
      toast.success("Account permanently deleted");
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(`Deletion failed: ${error.message}`);
      setIsDeleting(false);
    }
  };

  if (!currentUser) {
    return (
      <Container>
        <UnauthorizedContainer>
          <UnauthorizedTitle>Please log in to view your profile</UnauthorizedTitle>
          <AuthButtons>
            <Button to="/login">
              <FiUser /> Log In
            </Button>
            <ButtonOutline to="/signup">
              Sign Up
            </ButtonOutline>
          </AuthButtons>
        </UnauthorizedContainer>
      </Container>
    );
  }

  return (
    <Container>
      {/* Profile Header */}
      <ProfileHeader>
        <ProfilePictureUploader currentUser={currentUser} />
        <ProfileInfo>
          <ProfileName>@{username || currentUser.email.split('@')[0]}</ProfileName>
          <ProfileEmail>{currentUser.email}</ProfileEmail>
          <ButtonGroup>
            <Button to="/create-room">
              <FiPlus size={16} /> Create Room
            </Button>
            <ButtonOutline to="/create-highlight">
              <FiPlus size={16} /> Create Highlight
            </ButtonOutline>
          </ButtonGroup>
        </ProfileInfo>
      </ProfileHeader>

      {/* Stats Section */}
      <StatsGrid>
        <StatCard icon={<FiMic />} label="Rooms Created" value={createdRooms.length} />
        <StatCard icon={<FiUsers />} label="Rooms Joined" value={joinedRooms.length} />
        <StatCard 
          icon={<FiVideo />} 
          label="Highlights" 
          value={highlights.length} 
          $highlight
        />
      </StatsGrid>

      {/* Content Sections */}
      <div style={{ display: 'grid', gap: '2rem' }}>
        <Section 
          title="Your Highlights" 
          count={highlights.length}
          loading={loading.highlights}
          action={{ to: '/create-highlight', text: 'New Highlight' }}
        >
          {highlights.length > 0 ? (
            <>
              <HighlightsGrid>
                {highlights.slice(0, pagination.highlights.limit).map(highlight => (
                  <HighlightCard 
                    key={highlight.id}
                    highlight={highlight}
                    onDelete={handleDeleteHighlight}
                  />
                ))}
              </HighlightsGrid>
              {!pagination.highlights.loadedAll && highlights.length > pagination.highlights.limit && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <ButtonOutline
                    as="button"
                    onClick={() => setPagination(prev => ({
                      ...prev,
                      highlights: {
                        limit: prev.highlights.limit + 6,
                        loadedAll: prev.highlights.limit + 6 >= highlights.length
                      }
                    }))}
                  >
                    Load More Highlights
                  </ButtonOutline>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              message="No highlights created yet"
              action={{ to: '/create-highlight', text: 'Create Highlight' }}
            />
          )}
        </Section>

        <RoomsColumns>
          <Section 
            title="Your Rooms" 
            count={createdRooms.length}
            loading={loading.rooms}
            action={{ to: '/create-room', text: 'Create Room' }}
          >
            {loading.rooms ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <Loader />
              </div>
            ) : createdRooms.length > 0 ? (
              <>
                <RoomsList>
                  {createdRooms.slice(0, pagination.createdRooms.limit).map(room => (
                    <RoomCard 
                      key={room.id} 
                      room={room} 
                      isHost={currentUser?.uid === room.authorId}
                      onDelete={handleDeleteRoom}
                    />
                  ))}
                </RoomsList>
                {!pagination.createdRooms.loadedAll && createdRooms.length > pagination.createdRooms.limit && (
                  <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <ButtonOutline
                      as="button"
                      onClick={() => setPagination(prev => ({
                        ...prev,
                        createdRooms: {
                          limit: prev.createdRooms.limit + 6,
                          loadedAll: prev.createdRooms.limit + 6 >= createdRooms.length
                        }
                      }))}
                    >
                      Load More Rooms
                    </ButtonOutline>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                message="No rooms created yet"
                action={{ to: '/create-room', text: 'Create Room' }}
              />
            )}
          </Section>

          <Section 
            title="Joined Rooms" 
            count={joinedRooms.length}
            loading={loading.rooms}
            action={{ to: '/rooms', text: 'Browse Rooms' }}
          >
            {loading.rooms ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <Loader />
              </div>
            ) : joinedRooms.length > 0 ? (
              <>
                <RoomsList>
                  {joinedRooms.slice(0, pagination.joinedRooms.limit).map(room => (
                    <RoomCard 
                      key={room.id} 
                      room={room} 
                      isHost={currentUser?.uid === room.authorId}
                      onDelete={currentUser?.uid === room.authorId ? handleDeleteRoom : null}
                    />
                  ))}
                </RoomsList>
                {!pagination.joinedRooms.loadedAll && joinedRooms.length > pagination.joinedRooms.limit && (
                  <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <ButtonOutline
                      as="button"
                      onClick={() => setPagination(prev => ({
                        ...prev,
                        joinedRooms: {
                          limit: prev.joinedRooms.limit + 6,
                          loadedAll: prev.joinedRooms.limit + 6 >= joinedRooms.length
                        }
                      }))}
                    >
                      Load More Joined Rooms
                    </ButtonOutline>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                message="No joined rooms yet"
                action={{ to: '/rooms', text: 'Browse Rooms' }}
              />
            )}
          </Section>
        </RoomsColumns>
      </div>

      {/* Account Actions */}
      <LogoutSection>
        <ButtonGroup>
          <ButtonDanger onClick={handleLogout}>
            <FiLogOut /> Log Out
          </ButtonDanger>
          <ButtonOutline
            as="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            style={{ borderColor: theme.danger, color: theme.danger, opacity: isDeleting ? 0.7 : 1 }}
          >
            <FiTrash2 /> {isDeleting ? 'Deleting...' : 'Delete Account'}
          </ButtonOutline>
        </ButtonGroup>
      </LogoutSection>
    </Container>
  );
}

// Reusable Components
function StatCard({ icon, label, value, $highlight = false }) {
  return (
    <StatCardStyled>
      <StatIcon $highlight={$highlight}>{icon}</StatIcon>
      <StatValue $highlight={$highlight}>{value}</StatValue>
      <StatLabel>{label}</StatLabel>
    </StatCardStyled>
  );
}

function Section({ title, count, children, loading, action }) {
  return (
    <ContentSection>
      <SectionHeader>
        <SectionTitle>
          {title} <Count>({count})</Count>
        </SectionTitle>
        {action && (
          <ButtonSmall to={action.to}>
            {action.text}
          </ButtonSmall>
        )}
      </SectionHeader>
      {loading ? (
        <Loading>Loading...</Loading>
      ) : children}
    </ContentSection>
  );
}

function HighlightCard({ highlight, onDelete }) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const mediaPreviewUrl = highlight.thumbnailUrl || 
                        (highlight.mediaUrl ? `${highlight.mediaUrl}#t=3` : null);

  const handleCardClick = () => {
    navigate(`/highlights/${highlight.id}`);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(highlight.id);
  };

  return (
    <HighlightCardStyled
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <VideoContainer>
        {highlight.mediaUrl ? (
          <>
            {mediaPreviewUrl ? (
              mediaPreviewUrl.includes('#t=') ? (
                <Video
                  src={mediaPreviewUrl}
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Image
                  src={mediaPreviewUrl}
                  alt={highlight.title || 'Highlight thumbnail'}
                />
              )
            ) : (
              <VideoPlaceholder>No preview available</VideoPlaceholder>
            )}
            <VideoOverlay>
              <FiPlay size={32} />
            </VideoOverlay>
          </>
        ) : (
          <VideoPlaceholder>Media unavailable</VideoPlaceholder>
        )}
      </VideoContainer>
      <HighlightContent>
        <HighlightHeader>
          <HighlightTitle>{highlight.title || 'Untitled Highlight'}</HighlightTitle>
          <IconButton danger onClick={handleDeleteClick}>
            <FiTrash2 size={16} />
          </IconButton>
        </HighlightHeader>
        <HighlightMetaStyled>
          <span>{highlight.createdAt ? highlight.createdAt.toLocaleDateString() : 'Unknown date'}</span>
          {highlight.description && <p>{highlight.description}</p>}
        </HighlightMetaStyled>
      </HighlightContent>
    </HighlightCardStyled>
  );
}

function RoomCard({ room, isHost = false, onDelete }) {
  return (
    <RoomCardStyled to={`/room/${room.id}`}>
      <RoomThumbnail src={room.thumbnailUrl}>
        <ThumbnailOverlay>
          <ParticipantCount>
            <FiUsers size={14} /> {room.participants?.length || 0}
          </ParticipantCount>
          {room.isPrivate && <FiLock size={14} />}
        </ThumbnailOverlay>
      </RoomThumbnail>
      <RoomContent>
        <RoomTitle>{room.title || 'Untitled Room'}</RoomTitle>
        <RoomCreator>
          {isHost ? 'Created by you' : `By @${room.authorName || 'anonymous'}`}
        </RoomCreator>
        <RoomFooter>
          {isHost && (
            <HostContainer>
              <HostBadge>Host</HostBadge>
              {onDelete && (
                <IconButton
                  danger
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(room.id);
                  }}
                >
                  <FiTrash2 size={16} />
                </IconButton>
              )}
            </HostContainer>
          )}
          <span style={{ fontSize: '0.8rem', color: theme.textMuted }}>
            {room.joinedAt 
              ? `Joined: ${room.joinedAt.toLocaleDateString()}`
              : room.createdAt 
                ? `Created: ${room.createdAt.toLocaleDateString()}`
                : 'Unknown date'}
          </span>
        </RoomFooter>
      </RoomContent>
    </RoomCardStyled>
  );
}

function EmptyState({ message, action }) {
  return (
    <EmptyStateStyled>
      <EmptyMessage>{message}</EmptyMessage>
      {action && (
        <Button to={action.to}>
          {action.text}
        </Button>
      )}
    </EmptyStateStyled>
  );
}