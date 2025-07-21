import React, { useState, useEffect, useRef } from 'react';
import { FiHeart, FiMessageSquare, FiShare2, FiScissors, FiMenu, FiX, FiVolume2, FiVolumeX } from 'react-icons/fi';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getHighlights } from '../lib/highlight-api';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const tabs = ['🔥 Trending', '⚡ New', '🏆 Top', '💡 Debates', '🎤 Speeches', '🤝 Discussions'];
const topics = ['All Topics', 'Politics', 'Technology', 'Science', 'Culture', 'Sports', 'Philosophy'];
const sortOptions = ['Most Applauded', 'Most Viewed', 'Most Commented', 'Newest First'];

const PageWrapper = styled.div`
  background-color: transparent;
  color: #ffffff;
  min-height: 100vh;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-x: hidden;
`;

const Header = styled.header`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 20px 0;
  h1 {
    font-size: 2.2rem;
    margin-bottom: 8px;
    color: #ffffff;
  }
  p {
    color: #a0a0a0;
    font-size: 1rem;
    margin-bottom: 20px;
  }
`;

const FiltersToggle = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid #333;
  color: #e0e0e0;
  font-size: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
`;

const FilterPanel = styled.div.attrs(props => ({
  style: {
    transform: `translateX(${props.$isOpen ? '0' : '100%'})`
  }
}))`
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100vh;
  background-color: #1a1a1a;
  z-index: 1000;
  padding: 20px;
  transition: transform 0.3s ease;
  overflow-y: auto;
  box-shadow: -5px 0 15px rgba(0,0,0,0.3);
`;

const Overlay = styled.div.attrs(props => ({
  style: {
    opacity: props.$isOpen ? '1' : '0',
    pointerEvents: props.$isOpen ? 'all' : 'none'
  }
}))`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.7);
  z-index: 999;
  transition: opacity 0.3s ease;
`;

const HighlightsContainer = styled.div`
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
`;

const HighlightCard = styled.div`
  background-color: transparent;
  border-radius: 0;
  border: none;
  padding: 0;
  margin-bottom: 0;
  max-width: 100%;
  width: 100%;
  height: 100vh;
  scroll-snap-align: start;
  position: relative;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding: 0 20px;
  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 12px;
    object-fit: cover;
    background-color: #2a2a2a; /* Fallback background for broken images */
  }
  div {
    h3 {
      margin: 0;
      font-size: 1rem;
      color: #ffffff;
    }
    p {
      margin: 0;
      font-size: 0.8rem;
      color: #a0a0a0;
    }
  }
`;

const MediaContainer = styled.div`
  width: 100%;
  margin: 15px 0;
  background-color: #000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  
  video, img {
    width: 100%;
    height: 70vh;
    max-height: none;
    object-fit: cover;
    display: block;
    cursor: pointer;
    border-radius: 12px;
  }

  video:fullscreen {
    object-fit: contain;
    border-radius: 0;
  }
`;

const MuteButton = styled.button`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  z-index: 10;
`;

const Content = styled.div`
  padding: 0 20px;
  h2 {
    font-size: 1.4rem;
    margin: 10px 0;
    color: #ffffff;
  }
  p {
    color: #d0d0d0;
    margin: 0 0 15px 0;
    line-height: 1.5;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 15px;
  margin: 15px 20px;
  button {
    background: none;
    border: none;
    color: #e0e0e0;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: color 0.2s;
    padding: 8px 12px;
    border-radius: 20px;
    
    &:hover {
      background: rgba(255,255,255,0.1);
    }
    
    &.active {
      color: #4da6ff;
    }
  }
`;

const CreateButton = styled.button`
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4da6ff, #3399ff);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(77, 166, 255, 0.3);
  z-index: 100;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 25px rgba(77, 166, 255, 0.4);
  }
`;

// Helper function to validate Firebase URLs with cache-busting
const validateFirebaseUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'firebasestorage.googleapis.com') {
      if (!parsed.searchParams.get('token')) {
        console.warn('Firebase URL missing token:', url);
        return null;
      }
      parsed.searchParams.set('t', Date.now());
      return parsed.toString();
    }
    return url;
  } catch {
    return null;
  }
};

// Helper function to fetch user data
const fetchUserData = async (authorId) => {
  if (!authorId) return { authorname: 'Guest', profilePicture: null };
  
  try {
    const userDoc = await getDoc(doc(db, 'users', authorId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Always use the Firestore document as the single source of truth
      return {
        authorname: data.authorname || data.displayName || 'Guest',
        profilePicture: data.profilePicture || null
      };
    }
    return { authorname: 'Guest', profilePicture: null };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return { authorname: 'Guest', profilePicture: null };
  }
};

const HighlightsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id: highlightId } = useParams();
  const videoRefs = useRef([]);
  const highlightsContainerRef = useRef(null);
  const [mutedStates, setMutedStates] = useState({});
  const [fullscreenStates, setFullscreenStates] = useState({});
  const [isPlaying, setIsPlaying] = useState({});
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('🔥 Trending');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [sortBy, setSortBy] = useState('Most Applauded');
  const [showVideoOnly, setShowVideoOnly] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState([]);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [userDataMap, setUserDataMap] = useState({}); // Store user data for all authors

  // Fetch highlights data
  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        setLoading(true);
        const highlightsData = await getHighlights();
        // Debug: Log relevant fields to inspect author data
        console.log('Fetched highlights:', highlightsData.map(h => ({
          id: h.id,
          authorId: h.authorId,
          username: h.username,
          profilePicture: h.profilePicture
        })));
        setHighlights(highlightsData);
        
        // Initialize muted and playing states
        const initialMutedStates = {};
        const initialPlayingStates = {};
        highlightsData.forEach(highlight => {
          if (highlight.mediaType === 'video') {
            initialMutedStates[highlight.id] = false; // Default to unmuted
            initialPlayingStates[highlight.id] = false;
          }
        });
        setMutedStates(initialMutedStates);
        setIsPlaying(initialPlayingStates);
      } catch (error) {
        console.error("Failed to fetch highlights:", error);
        toast.error('Failed to load highlights');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHighlights();
  }, []);

  // Fetch user data for all highlights
  useEffect(() => {
    const fetchAllUserData = async () => {
      // Include ALL authors (remove the currentUser?.uid filter)
      const authorIds = [...new Set(highlights
        .filter(h => h.authorId) // Only include highlights with authorId
        .map(h => h.authorId))];
      
      if (authorIds.length === 0) return;

      try {
        const userDataPromises = authorIds.map(async (authorId) => {
          const data = await fetchUserData(authorId);
          return { authorId, data };
        });
        const results = await Promise.all(userDataPromises);
        const newUserDataMap = results.reduce((acc, { authorId, data }) => ({
          ...acc,
          [authorId]: data
        }), {});
        setUserDataMap(prev => ({ ...prev, ...newUserDataMap }));
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchAllUserData();
  }, [highlights]); // Remove currentUser from dependencies

  // Play first video on initial load if no specific highlight is requested
  useEffect(() => {
    if (!highlightId && highlights.length > 0 && highlights[0].mediaType === 'video') {
      const firstVideoId = highlights[0].id;
      const firstVideo = videoRefs.current[firstVideoId];
      if (firstVideo) {
        setTimeout(() => {
          firstVideo.muted = false;
          firstVideo.play()
            .then(() => {
              setPlayingVideoId(firstVideoId);
              setIsPlaying(prev => ({ ...prev, [firstVideoId]: true }));
            })
            .catch(e => {
              console.log("First video autoplay prevented:", e);
              firstVideo.muted = true;
              firstVideo.play().catch(e => console.log("Muted autoplay also prevented:", e));
            });
        }, 500);
      }
    }
  }, [highlights, highlightId]);

  // Handle scroll between highlights
  useEffect(() => {
    const container = highlightsContainerRef.current;
    if (!container) return;

    let scrollTimeout;
    let isScrolling = false;

    const handleScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      clearTimeout(scrollTimeout);

      const containerHeight = container.clientHeight;
      const scrollPosition = container.scrollTop;
      const newIndex = Math.round(scrollPosition / containerHeight);

      if (newIndex !== currentHighlightIndex) {
        setCurrentHighlightIndex(newIndex);

        // Pause previous video
        if (currentHighlightIndex >= 0 && currentHighlightIndex < highlights.length) {
          const prevHighlight = highlights[currentHighlightIndex];
          if (prevHighlight.mediaType === 'video') {
            const prevVideo = videoRefs.current[prevHighlight.id];
            if (prevVideo) {
              prevVideo.pause();
              setIsPlaying(prev => ({ ...prev, [prevHighlight.id]: false }));
            }
          }
        }

        // Play new video
        if (newIndex >= 0 && newIndex < highlights.length) {
          const newHighlight = highlights[newIndex];
          if (newHighlight.mediaType === 'video') {
            const newVideo = videoRefs.current[newHighlight.id];
            if (newVideo) {
              newVideo.currentTime = 0;
              newVideo.muted = mutedStates[newHighlight.id] !== false;
              newVideo.play()
                .then(() => {
                  setPlayingVideoId(newHighlight.id);
                  setIsPlaying(prev => ({ ...prev, [newHighlight.id]: true }));
                })
                .catch(e => {
                  console.log("Autoplay prevented:", e);
                  newVideo.muted = true;
                  newVideo.play().catch(e => console.log("Muted autoplay also prevented:", e));
                });
            }
          }
        }
      }

      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentHighlightIndex, highlights, mutedStates]);

  // Handle specific highlight ID
  useEffect(() => {
    if (highlightId && highlights.length > 0 && highlightsContainerRef.current) {
      const index = highlights.findIndex(h => h.id === highlightId);
      if (index >= 0) {
        // Immediately position the container (no smooth scrolling)
        highlightsContainerRef.current.scrollTo({
          top: index * window.innerHeight,
          behavior: 'instant'
        });
        
        // Play the video immediately
        const video = videoRefs.current[highlightId];
        if (video) {
          video.currentTime = 0;
          video.muted = mutedStates[highlightId] !== false;
          video.play()
            .then(() => {
              setPlayingVideoId(highlightId);
              setIsPlaying(prev => ({ ...prev, [highlightId]: true }));
            })
            .catch(e => {
              console.log("Autoplay prevented:", e);
              video.muted = true;
              video.play().catch(e => console.log("Muted autoplay also prevented:", e));
            });
        }
        
        // Update the current index immediately
        setCurrentHighlightIndex(index);
      }
    }
  }, [highlightId, highlights, mutedStates]);

  const toggleMute = (videoId) => {
    setMutedStates(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
    
    const video = videoRefs.current[videoId];
    if (video) {
      video.muted = !video.muted;
    }
  };

  const handleVideoClick = (videoId) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    if (isPlaying[videoId]) {
      video.pause();
      setIsPlaying(prev => ({ ...prev, [videoId]: false }));
    } else {
      video.play()
        .then(() => setIsPlaying(prev => ({ ...prev, [videoId]: true })))
        .catch(e => console.log("Play failed:", e));
    }
  };

  const handleDoubleClick = (videoId) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen().catch(e => console.log("Fullscreen error:", e));
      setFullscreenStates(prev => ({ ...prev, [videoId]: true }));
    } else {
      document.exitFullscreen();
      setFullscreenStates(prev => ({ ...prev, [videoId]: false }));
    }
  };

  const handleLike = (postId) => {
    if (!currentUser) {
      toast.error('Please log in to like posts');
      navigate('/login', { state: { from: `/highlights/${postId}` } });
      return;
    }
    
    setLikedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId) 
        : [...prev, postId]
    );
  };

  const openHighlightCreation = () => {
    if (currentUser) {
      navigate('/create-highlight');
    } else {
      toast.error('Please log in to create a highlight');
      navigate('/login', { state: { from: '/create-highlight' } });
    }
  };

  const handleShare = (id) => {
    const url = `${window.location.origin}/highlights/${id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out this highlight',
        text: 'Thought you might like this highlight from Echo',
        url: url
      }).catch(e => console.log('Error sharing:', e));
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const handleCommentClick = (highlightId) => {
    if (!currentUser) {
      toast.error('Please log in to comment');
      navigate('/login', { state: { from: `/highlights/${highlightId}` } });
      return;
    }
    // Add your comment logic here if needed
  };

  const handleVideoEnded = (videoId) => {
    const video = videoRefs.current[videoId];
    if (video) {
      video.currentTime = 0;
      video.play().catch(e => console.log("Autoplay prevented:", e));
    }
  };

  const sortedHighlights = [...highlights]
    .filter(highlight => !showVideoOnly || highlight.mediaType === 'video')
    .sort((a, b) => {
      switch (sortBy) {
        case 'Most Applauded': return (b.likes || 0) - (a.likes || 0);
        case 'Most Viewed': return (b.views || 0) - (a.views || 0);
        case 'Most Commented': return (b.commentsCount || 0) - (a.commentsCount || 0);
        case 'Newest First': return new Date(b.createdAt) - new Date(a.createdAt);
        default: return 0;
      }
    });

  return (
    <PageWrapper>
      <FiltersToggle onClick={() => setShowFilters(!showFilters)}>
        {showFilters ? <FiX /> : <FiMenu />}
      </FiltersToggle>

      <Overlay $isOpen={showFilters} onClick={() => setShowFilters(false)} />
      <FilterPanel $isOpen={showFilters}>
        <h3>Filter Highlights</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>Categories</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  border: 'none',
                  background: activeTab === tab ? '#4da6ff' : '#2a2a2a',
                  color: activeTab === tab ? '#fff' : '#ccc',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>Topics</h4>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: '#2a2a2a',
              color: '#ccc',
              border: 'none'
            }}
          >
            {topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>Sort By</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortOptions.map(option => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: sortBy === option ? '#4da6ff' : '#2a2a2a',
                  color: sortBy === option ? '#fff' : '#ccc',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={showVideoOnly}
            onChange={() => setShowVideoOnly(!showVideoOnly)}
          />
          Show Video Only
        </label>
      </FilterPanel>

      <HighlightsContainer ref={highlightsContainerRef}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', height: '100vh' }}>
            <p>Loading highlights...</p>
          </div>
        ) : sortedHighlights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#a0a0a0', height: '100vh' }}>
            <h2>No Highlights Found</h2>
            <button
              onClick={openHighlightCreation}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: '#4da6ff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Create Your First Highlight
            </button>
          </div>
        ) : (
          sortedHighlights.map((highlight, index) => {
            // Derive display name
            const displayName = userDataMap[highlight.authorId]?.authorname || 'Guest';

            // Derive display avatar
            const profilePictureUrl = validateFirebaseUrl(userDataMap[highlight.authorId]?.profilePicture);

            return (
              <HighlightCard key={highlight.id}>
                <UserInfo>
                  <Link to={`/profile/${highlight.authorId || 'unknown'}`}>
                    <img 
                      src={profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2a2a2a&color=fff`}
                      alt={displayName}
                      onError={(e) => {
                        if (profilePictureUrl) {
                          console.error('Failed to load profile picture:', {
                            userId: highlight.authorId,
                            attemptedUrl: profilePictureUrl,
                            highlightId: highlight.id
                          });
                        }
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2a2a2a&color=fff`;
                      }}
                    />
                  </Link>
                  <div>
                    <Link to={`/profile/${highlight.authorId || 'unknown'}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3>{displayName}</h3>
                    </Link>
                    <p>{new Date(highlight.createdAt).toLocaleDateString()}</p>
                  </div>
                </UserInfo>
                
                {highlight.mediaUrl && (
                  <MediaContainer>
                    {highlight.mediaType === 'video' ? (
                      <>
                        <video 
                          ref={el => videoRefs.current[highlight.id] = el}
                          src={highlight.mediaUrl} 
                          controls={false}
                          playsInline
                          loop
                          muted={mutedStates[highlight.id] !== false}
                          onClick={() => handleVideoClick(highlight.id)}
                          onDoubleClick={() => handleDoubleClick(highlight.id)}
                          onEnded={() => handleVideoEnded(highlight.id)}
                        />
                        <MuteButton onClick={() => toggleMute(highlight.id)}>
                          {mutedStates[highlight.id] ? <FiVolumeX /> : <FiVolume2 />}
                        </MuteButton>
                      </>
                    ) : (
                      <img 
                        src={highlight.mediaUrl} 
                        alt={highlight.title} 
                      />
                    )}
                  </MediaContainer>
                )}

                <Content>
                  <h2>{highlight.title}</h2>
                  <p>{highlight.description}</p>
                </Content>

                <ActionBar>
                  <button 
                    className={likedPosts.includes(highlight.id) ? 'active' : ''}
                    onClick={() => handleLike(highlight.id)}
                  >
                    <FiHeart /> {highlight.likes || 0}
                  </button>
                  <button 
                    onClick={() => handleCommentClick(highlight.id)}
                    style={{ opacity: currentUser ? 1 : 0.7 }}
                  >
                    <FiMessageSquare /> {highlight.commentsCount || 0}
                  </button>
                  <button onClick={() => handleShare(highlight.id)}>
                    <FiShare2 /> Share
                  </button>
                </ActionBar>
              </HighlightCard>
            );
          })
        )}
      </HighlightsContainer>

      <CreateButton onClick={openHighlightCreation}>
        <FiScissors />
        {!currentUser && (
          <span style={{
            position: 'absolute',
            bottom: '-25px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            background: 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            Sign In to Create
          </span>
        )}
      </CreateButton>
    </PageWrapper>
  );
};

export default HighlightsPage;