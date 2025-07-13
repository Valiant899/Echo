import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { FiLock, FiUnlock, FiUsers, FiMic, FiTag, FiUser } from 'react-icons/fi';

const RoomCreationPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    speakers: 2,
    listeners: 10,
    category: 'general',
    isPublic: true,
    password: ''
  });

  // Check authentication status on mount
  useEffect(() => {
    if (!currentUser) {
      toast.info('Please log in to create a room');
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const colors = {
    darkBg: '#121212',
    panelBg: '#1e1e1e',
    accent: '#4da6ff',
    textLight: '#e0e0e0',
    textMuted: '#a0a0a0',
    error: '#ff4d4d'
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'speakers' || name === 'listeners' ? parseInt(value) : value
    }));
  };

  const toggleRoomPrivacy = () => {
    setFormData(prev => ({
      ...prev,
      isPublic: !prev.isPublic,
      password: ''
    }));
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!currentUser) {
      toast.error('You must be logged in to create a room');
      navigate('/login');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a room title');
      setLoading(false);
      return;
    }

    if (!formData.isPublic && formData.password.length < 4) {
      toast.error('Password must be at least 4 characters');
      setLoading(false);
      return;
    }

    try {
      // 1. Create room document with auto-generated ID
      const roomRef = doc(collection(db, 'rooms'));
      const roomData = {
        id: roomRef.id,
        title: formData.title.trim(),
        speakers: formData.speakers,
        currentSpeakers: 1,
        maxListeners: formData.listeners,
        currentListeners: 0,
        category: formData.category,
        isPublic: formData.isPublic,
        ...(!formData.isPublic && { password: formData.password }),
        createdAt: serverTimestamp(),
        creatorId: currentUser.uid,
        creatorName: currentUser.displayName || 'Anonymous',
        creatorPhoto: currentUser.photoURL || '',
        participants: [currentUser.uid],
        isActive: true,
        lastActive: serverTimestamp()
      };

      await setDoc(roomRef, roomData);

      // 2. Add creator as host participant with explicit document ID
      await setDoc(doc(db, 'rooms', roomRef.id, 'participants', currentUser.uid), {
        id: currentUser.uid,
        userId: currentUser.uid,
        name: currentUser.displayName || 'Host',
        photoURL: currentUser.photoURL || '',
        joinedAt: serverTimestamp(),
        isSpeaker: true,
        isHost: true, // Critical - marks user as host
        isMuted: false,
        lastActive: serverTimestamp(),
        raiseHand: false
      });

      navigate(`/call/${roomRef.id}`, { state: { isHost: true } });
      toast.success(`${formData.isPublic ? 'Public' : 'Private'} room created successfully!`);

    } catch (error) {
      console.error('Error creating room:', error);
      toast.error(`Failed to create room: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: colors.darkBg,
      minHeight: '100vh',
      color: colors.textLight,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '2rem',
        backgroundColor: colors.panelBg,
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <h2 style={{
          color: colors.accent,
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontSize: '1.75rem',
          fontWeight: '600'
        }}>
          Create New Room
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Room Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: colors.textLight,
              fontWeight: '500'
            }}>
              Room Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter room title"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2a2a2a',
                color: colors.textLight,
                fontSize: '1rem'
              }}
              maxLength={50}
              required
            />
          </div>

          {/* Privacy Toggle */}
          <div style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {formData.isPublic ? (
                <FiUnlock style={{ marginRight: '0.5rem', color: colors.accent }} />
              ) : (
                <FiLock style={{ marginRight: '0.5rem', color: colors.accent }} />
              )}
              <span style={{ fontWeight: '500' }}>
                {formData.isPublic ? 'Public Room' : 'Private Room'}
              </span>
            </div>
            
            <button
              type="button"
              onClick={toggleRoomPrivacy}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: formData.isPublic ? '#2a2a2a' : colors.accent,
                color: formData.isPublic ? colors.textLight : 'white',
                border: `1px solid ${formData.isPublic ? colors.textMuted : colors.accent}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {formData.isPublic ? 'Make Private' : 'Make Public'}
            </button>
          </div>

          {/* Password Field */}
          {!formData.isPublic && (
            <div style={{ 
              marginBottom: '1.5rem',
              padding: '0.75rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: colors.textLight,
                fontWeight: '500'
              }}>
                Room Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Set room password (min 4 characters)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#1e1e1e',
                  color: colors.textLight
                }}
                minLength={4}
                required
              />
            </div>
          )}

          {/* Room Settings Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Speakers */}
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '0.5rem',
                color: colors.textLight,
                fontWeight: '500'
              }}>
                <FiMic style={{ marginRight: '0.5rem' }} />
                Speakers
              </label>
              <select
                name="speakers"
                value={formData.speakers}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#1e1e1e',
                  color: colors.textLight
                }}
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Listeners */}
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '0.5rem',
                color: colors.textLight,
                fontWeight: '500'
              }}>
                <FiUsers style={{ marginRight: '0.5rem' }} />
                Max Listeners
              </label>
              <select
                name="listeners"
                value={formData.listeners}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#1e1e1e',
                  color: colors.textLight
                }}
              >
                {[5, 10, 15, 20, 30, 50].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div style={{ 
            marginBottom: '2rem',
            padding: '0.75rem',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.5rem',
              color: colors.textLight,
              fontWeight: '500'
            }}>
              <FiTag style={{ marginRight: '0.5rem' }} />
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#1e1e1e',
                color: colors.textLight
              }}
            >
              <option value="general">General Discussion</option>
              <option value="tech">Technology</option>
              <option value="gaming">Gaming</option>
              <option value="music">Music</option>
              <option value="business">Business</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? colors.textMuted : colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {loading ? 'Creating...' : `Create ${formData.isPublic ? 'Public' : 'Private'} Room`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoomCreationPage;