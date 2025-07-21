import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, setDoc, doc, deleteDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { FiLock, FiUnlock, FiUsers, FiMic, FiTag, FiImage, FiEdit } from 'react-icons/fi';

const RoomCreationPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    speakers: 2,
    listeners: 10,
    category: 'general',
    customCategory: '',
    isPublic: true,
  });

  const colors = {
    darkBg: '#121212',
    panelBg: '#1e1e1e',
    accent: '#4da6ff',
    textLight: '#e0e0e0',
    textMuted: '#a0a0a0',
    error: '#ff4d4d',
    customHighlight: '#2a4066',
  };

  // Check authentication and verification status
  useEffect(() => {
    if (!currentUser) {
      toast.info('Please log in to create a room');
      navigate('/login');
    } else if (!currentUser.emailVerified) {
      toast.error('Please verify your email before creating a room');
      navigate('/verify-email');
    }
  }, [currentUser, navigate]);

  // Handle component unmount and cleanup
  useEffect(() => {
    let isMounted = true;
    return () => {
      isMounted = false;
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  const handleThumbnailChange = async (file) => {
    if (!file) return;

    setThumbnailLoading(true);
    try {
      // Validate file type
      if (!file.type.match('image.*')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (20MB max)
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('Image size must be less than 20MB');
      }

      // Validate dimensions
      const dimensions = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error('Invalid image'));
        img.src = URL.createObjectURL(file);
      });

      if (dimensions.width < 400 || dimensions.height < 225) {
        throw new Error('Image must be at least 400x225 pixels');
      }

      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setThumbnailPreview(e.target.result);
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Thumbnail validation error:', error);
      toast.error(error.message);
    } finally {
      setThumbnailLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleThumbnailChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'speakers' || name === 'listeners' ? parseInt(value, 10) : value,
    }));
  };

  const toggleRoomPrivacy = () => {
    setFormData((prev) => ({
      ...prev,
      isPublic: !prev.isPublic,
    }));
  };

  const uploadThumbnail = async (roomId) => {
    if (!thumbnailFile) return null;
    try {
      const storageRef = ref(storage, `room-thumbnails/${roomId}`);
      await uploadBytes(storageRef, thumbnailFile);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      toast.error('Thumbnail upload failed - using default');
      return 'https://firebasestorage.googleapis.com/v0/b/echo-7ea46.appspot.com/o/room-thumbnails%2Fdefault-room.jpg?alt=media';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || thumbnailLoading) return;
    setLoading(true);
    setError(null);
    let roomRef = null;

    try {
      // Validate inputs
      if (!formData.title.trim()) {
        throw new Error('Room title is required');
      }
      if (formData.title.length > 100) {
        throw new Error('Room title must be 100 characters or less');
      }
      if (!thumbnailFile) {
        throw new Error('Room thumbnail is required');
      }
      if (formData.category === 'custom') {
        const customCat = formData.customCategory.trim().toLowerCase();
        if (!customCat || customCat.length < 3) {
          throw new Error('Custom category must be at least 3 characters');
        }
        if (/[^a-z0-9 ]/.test(customCat)) {
          throw new Error('Custom category can only contain letters, numbers, and spaces');
        }
        if (customCat.length > 30) {
          throw new Error('Custom category must be 30 characters or less');
        }
      }

      // Rate limiting: max 5 rooms per day
      const userRooms = await getDocs(
        query(
          collection(db, 'rooms'),
          where('authorId', '==', currentUser.uid)
        )
      );
      const recentRooms = userRooms.docs.filter(doc =>
        doc.data().createdAt?.toDate() > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      if (recentRooms.length >= 5) {
        throw new Error('Maximum 5 rooms per day');
      }

      // Create document reference
      roomRef = doc(collection(db, 'rooms'));
      const roomId = roomRef.id;

      // Upload thumbnail
      const thumbnailUrl = await uploadThumbnail(roomId);
      if (!thumbnailUrl) {
        throw new Error('Failed to generate thumbnail URL');
      }

      // Prepare room data
      const roomData = {
        id: roomId,
        title: formData.title.trim(),
        maxSpeakers: formData.speakers,
        currentSpeakers: 1,
        maxListeners: formData.listeners,
        currentListeners: 0,
        category: formData.category === 'custom' ? formData.customCategory.trim().toLowerCase() : formData.category,
        isPublic: formData.isPublic,
        isActive: true,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorPicture: currentUser.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participants: [currentUser.uid]
      };

      // Prepare participant data
      const participantData = {
        userId: currentUser.uid,
        name: currentUser.displayName || 'Host',
        photoURL: currentUser.photoURL || '',
        joinedAt: serverTimestamp(),
        isSpeaker: true,
        isHost: true,
        isMuted: false,
        cameraOff: true,
        leftAt: null,
      };

      // Validate required fields
      if (!roomData.authorId || !roomData.authorName) {
        throw new Error('Missing required author information');
      }

      // Only create Firestore room
      await setDoc(roomRef, roomData);
      await setDoc(
        doc(db, 'rooms', roomId, 'participants', currentUser.uid),
        participantData
      );
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Creation error:', error);
      toast.error('Room creation failed');
      // Cleanup: delete the Firestore doc if created
      if (roomRef) {
        await deleteDoc(roomRef).catch(cleanupError => {
          console.error('Firestore cleanup failed:', cleanupError);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: colors.darkBg,
      minHeight: '100vh',
      color: colors.textLight,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '1rem',
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '2rem',
        backgroundColor: colors.panelBg,
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}>
        <h2 style={{
          color: colors.accent,
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontSize: '1.75rem',
          fontWeight: '600',
        }}>
          Create New Room
        </h2>

        {error && (
          <div style={{
            backgroundColor: colors.error,
            color: 'white',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Room creation form">
          {/* Room Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: colors.textLight,
              fontWeight: '500',
            }} htmlFor="title">
              Room Title
            </label>
            <input
              type="text"
              id="title"
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
                fontSize: '1rem',
              }}
              maxLength={100}
              required
              aria-required="true"
            />
          </div>

          {/* Thumbnail Upload */}
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '0.75rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              border: `2px dashed ${thumbnailLoading ? colors.textMuted : colors.accent}`,
              cursor: thumbnailLoading ? 'not-allowed' : 'pointer',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !thumbnailLoading && fileInputRef.current.click()}
          >
            <label style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.5rem',
              color: colors.textLight,
              fontWeight: '500',
            }} htmlFor="thumbnail">
              <FiImage style={{ marginRight: '0.5rem' }} />
              Room Thumbnail
            </label>
            <input
              type="file"
              id="thumbnail"
              accept="image/*"
              onChange={(e) => handleThumbnailChange(e.target.files[0])}
              style={{ display: 'none' }}
              disabled={thumbnailLoading}
              ref={fileInputRef}
              required
              aria-required="true"
            />
            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                style={{
                  maxWidth: '200px',
                  marginTop: '0.75rem',
                  borderRadius: '6px',
                }}
              />
            ) : (
              <p style={{ color: colors.textMuted, marginTop: '0.5rem' }}>
                Drag and drop an image here or click to upload
              </p>
            )}
            {thumbnailLoading && (
              <p style={{ color: colors.textMuted, marginTop: '0.5rem' }}>
                Processing thumbnail...
              </p>
            )}
          </div>

          {/* Privacy Toggle */}
          <div style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {formData.isPublic ? (
                <>
                  <FiUnlock style={{ marginRight: '0.5rem', color: colors.accent }} />
                  <span>Public (Anyone can join)</span>
                </>
              ) : (
                <>
                  <FiLock style={{ marginRight: '0.5rem', color: colors.accent }} />
                  <span>Private (Invite only)</span>
                </>
              )}
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
                transition: 'all 0.2s',
              }}
              aria-label={formData.isPublic ? 'Make room private' : 'Make room public'}
            >
              {formData.isPublic ? 'Make Private' : 'Make Public'}
            </button>
          </div>
          {!formData.isPublic && (
            <p style={{
              fontSize: '0.85rem',
              color: colors.textMuted,
              marginTop: '0.5rem',
              fontStyle: 'italic',
            }}>
              Private rooms require you to invite participants manually
            </p>
          )}

          {/* Room Settings Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            {/* Speakers */}
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '0.5rem',
                color: colors.textLight,
                fontWeight: '500',
              }} htmlFor="speakers">
                <FiMic style={{ marginRight: '0.5rem' }} />
                Max Speakers
              </label>
              <select
                id="speakers"
                name="speakers"
                value={formData.speakers}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#1e1e1e',
                  color: colors.textLight,
                }}
                aria-label="Maximum number of speakers"
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Listeners */}
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '0.5rem',
                color: colors.textLight,
                fontWeight: '500',
              }} htmlFor="listeners">
                <FiUsers style={{ marginRight: '0.5rem' }} />
                Max Listeners
              </label>
              <select
                id="listeners"
                name="listeners"
                value={formData.listeners}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#1e1e1e',
                  color: colors.textLight,
                }}
                aria-label="Maximum number of listeners"
              >
                {[5, 10, 15, 20, 30, 50].map((num) => (
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
            borderRadius: '8px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.5rem',
              color: colors.textLight,
              fontWeight: '500',
            }} htmlFor="category">
              <FiTag style={{ marginRight: '0.5rem' }} />
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#1e1e1e',
                color: colors.textLight,
                marginBottom: formData.category === 'custom' ? '0.75rem' : '0',
              }}
              aria-label="Room category"
            >
              <option value="general">General Discussion</option>
              <option value="tech">Technology</option>
              <option value="gaming">Gaming</option>
              <option value="music">Music</option>
              <option value="business">Business</option>
              <option value="custom" style={{
                backgroundColor: colors.customHighlight,
                fontWeight: '600',
                color: colors.accent,
              }}>
                Create Custom Category
              </option>
            </select>
            {formData.category === 'custom' && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                backgroundColor: colors.customHighlight,
                borderRadius: '6px',
                border: `1px solid ${colors.accent}`,
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  color: colors.accent,
                  fontWeight: '600',
                }} htmlFor="customCategory">
                  <FiEdit style={{ marginRight: '0.5rem' }} />
                  Custom Category
                </label>
                <input
                  type="text"
                  id="customCategory"
                  name="customCategory"
                  value={formData.customCategory}
                  onChange={handleChange}
                  placeholder="Enter your unique category (e.g., Photography, Fitness)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#1e1e1e',
                    color: colors.textLight,
                    fontWeight: '500',
                  }}
                  maxLength={30}
                  required
                  aria-required="true"
                />
                <p style={{
                  fontSize: '0.85rem',
                  color: colors.textMuted,
                  marginTop: '0.5rem',
                  fontStyle: 'italic',
                }}>
                  Create a unique category that best describes your room's topic!
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || thumbnailLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: (loading || thumbnailLoading) ? colors.textMuted : colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (loading || thumbnailLoading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            aria-label={loading ? 'Creating room' : `Create ${formData.isPublic ? 'public' : 'private'} room`}
          >
            {loading ? 'Creating...' : `Create ${formData.isPublic ? 'Public' : 'Private'} Room`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoomCreationPage;