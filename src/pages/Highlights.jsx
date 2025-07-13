import React, { useState, useEffect } from 'react';
import { FiHeart, FiMessageSquare, FiShare2, FiScissors, FiMenu, FiX } from 'react-icons/fi';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getHighlights } from '../lib/highlight-api';

const tabs = ['🔥 Trending', '⚡ New', '🏆 Top', '💡 Debates', '🎤 Speeches', '🤝 Discussions'];
const topics = ['All Topics', 'Politics', 'Technology', 'Science', 'Culture', 'Sports', 'Philosophy'];
const sortOptions = ['Most Applauded', 'Most Viewed', 'Most Commented', 'Newest First'];

const PageWrapper = styled.div`
  background-color: #121212;
  color: #e0e0e0;
  min-height: 100vh;
  padding: 20px;
`;

const FiltersToggle = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: #e0e0e0;
  font-size: 24px;
  cursor: pointer;
  z-index: 1001;
`;

const FilterPanel = styled.div.attrs(props => ({
  style: {
    transform: `translateX(${props.$isOpen ? '0' : '100%'})`
  }
}))`
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100vh;
  background-color: #1e1e1e;
  z-index: 1000;
  padding: 20px;
  transition: transform 0.3s ease;
  overflow-y: auto;
`;

const Overlay = styled.div.attrs(props => ({
  style: {
    display: props.$isOpen ? 'block' : 'none'
  }
}))`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  z-index: 999;
`;

const HighlightCard = styled.div`
  background-color: #1e1e1e;
  border-radius: 10px;
  border: 1px solid #2a2a2a;
  padding: 15px;
  margin-bottom: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
`;

const HighlightsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('🔥 Trending');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [sortBy, setSortBy] = useState('Most Applauded');
  const [showVideoOnly, setShowVideoOnly] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const highlightsData = await getHighlights();
        setHighlights(highlightsData);
      } catch (error) {
        console.error("Failed to fetch highlights:", error);
        toast.error('Failed to load highlights');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHighlights();
  }, []);

  const openHighlightCreation = () => {
    if (currentUser) {
      navigate('/create-highlight');
    } else {
      toast.error('Please log in to create a highlight');
      navigate('/login');
    }
  };

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

      <div style={{ maxWidth: '600px', margin: '80px auto 0', padding: '0 10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading highlights...</p>
          </div>
        ) : highlights.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '60px', color: '#a0a0a0' }}>
            <h2>No Highlights Yet</h2>
            {currentUser && (
              <button
                onClick={openHighlightCreation}
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  background: '#4da6ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Be the first to post a highlight
              </button>
            )}
          </div>
        ) : (
          highlights.map(highlight => (
            <HighlightCard key={highlight.id}>
              <h4>{highlight.title}</h4>
              <p>{highlight.description}</p>
              {highlight.mediaUrl && (
                highlight.mediaUrl.includes('video') ? (
                  <video 
                    src={highlight.mediaUrl} 
                    controls 
                    style={{ 
                      width: '100%', 
                      maxHeight: '400px',
                      backgroundColor: '#000',
                      marginTop: '10px'
                    }} 
                  />
                ) : (
                  <img 
                    src={highlight.mediaUrl} 
                    alt={highlight.title} 
                    style={{ 
                      width: '100%', 
                      maxHeight: '400px',
                      objectFit: 'contain',
                      marginTop: '10px'
                    }} 
                  />
                )
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button style={{ background: 'none', border: 'none', color: '#e0e0e0', display: 'flex', alignItems: 'center' }}>
                  <FiHeart style={{ marginRight: '5px' }} /> {highlight.likes || 0}
                </button>
                <button style={{ background: 'none', border: 'none', color: '#e0e0e0', display: 'flex', alignItems: 'center' }}>
                  <FiMessageSquare style={{ marginRight: '5px' }} /> Comment
                </button>
                <button style={{ background: 'none', border: 'none', color: '#e0e0e0', display: 'flex', alignItems: 'center' }}>
                  <FiShare2 style={{ marginRight: '5px' }} /> Share
                </button>
              </div>
            </HighlightCard>
          ))
        )}
      </div>

      {currentUser && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
          <button
            onClick={openHighlightCreation}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#4da6ff',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            aria-label="Create new highlight"
          >
            <FiScissors />
          </button>
        </div>
      )}
    </PageWrapper>
  );
};

export default HighlightsPage;