import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FiUpload, FiImage, FiVideo, FiX, FiArrowLeft } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createHighlight } from '@/lib/highlight-api';
import { getAuth, sendEmailVerification } from 'firebase/auth';

const colors = {
  darkBg: '#121212',
  panelBg: '#1e1e1e',
  accent: '#4da6ff',
  textLight: '#e0e0e0',
  textMuted: '#a0a0a0',
  danger: '#dc3545',
  success: '#28a745'
};

export default function HighlightCreationPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const auth = getAuth();
  const [showVerificationBanner, setShowVerificationBanner] = useState(
    currentUser && !currentUser.emailVerified
  );
  const [resendCooldown, setResendCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleResendVerification = async () => {
    try {
      if (resendCooldown) {
        toast.error(`Please wait ${cooldownSeconds} seconds before resending`);
        return;
      }

      const auth = getAuth();
      await sendEmailVerification(auth.currentUser);
      
      // Start cooldown (60 seconds)
      setResendCooldown(true);
      let seconds = 60;
      setCooldownSeconds(seconds);
      
      const timer = setInterval(() => {
        seconds -= 1;
        setCooldownSeconds(seconds);
        if (seconds <= 0) {
          clearInterval(timer);
          setResendCooldown(false);
        }
      }, 1000);

      toast.success("Verification email sent! Check your inbox and spam folder.");
    } catch (error) {
      console.error("Failed to send verification email:", error);
      
      if (error.code === 'auth/too-many-requests') {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error("Failed to send verification. Please try again.");
      }
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelection(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelection(file);
  };

  const handleFileSelection = (file) => {
    if (!file.type.match('image.*') && !file.type.match('video.*')) {
      toast.error('Please upload an image or video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size should be less than 50MB');
      return;
    }

    setMedia(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMedia(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser?.emailVerified) {
      toast.error('Email verification required', {
        description: 'Please verify your email before creating highlights',
        action: {
          label: resendCooldown ? `Wait ${cooldownSeconds}s` : 'Resend',
          onClick: !resendCooldown ? handleResendVerification : undefined
        }
      });
      return;
    }

    if (!title.trim()) {
      toast.error('Please provide a title');
      return;
    }

    if (!media) {
      toast.error('Please select a media file');
      return;
    }

    setLoading(true);

    try {
      toast.info('Creating your highlight...');
      
      await createHighlight({
        title: title.trim(),
        description: description.trim(),
        mediaFile: media,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        createdAt: new Date().toISOString()
      });

      toast.success('Highlight created successfully!');
      navigate('/highlights');
    } catch (error) {
      console.error('Highlight creation error:', error);
      
      if (error.message.includes('verify') || error.code === 'auth/email-not-verified') {
        setShowVerificationBanner(true);
        toast.error('Complete email verification to continue', {
          action: {
            label: 'Open Email',
            onClick: () => window.open('https://mail.google.com', '_blank')
          }
        });
      } else {
        toast.error(error.message || 'Failed to create highlight');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div style={{
        backgroundColor: colors.darkBg,
        minHeight: '100vh',
        color: colors.textLight,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <p style={{ marginBottom: '1.5rem' }}>Please log in to host content.</p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: colors.accent,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: colors.darkBg,
      minHeight: '100vh',
      color: colors.textLight,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {currentUser && !currentUser.emailVerified && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>Email Not Verified</strong>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Please check your inbox for the verification email
            </p>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resendCooldown}
            style={{
              backgroundColor: resendCooldown ? '#cccccc' : '#004085',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: resendCooldown ? 'not-allowed' : 'pointer'
            }}
          >
            {resendCooldown ? `Resend (${cooldownSeconds}s)` : 'Resend Email'}
          </button>
        </div>
      )}

      <div style={{
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '2rem',
        backgroundColor: colors.panelBg,
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <Link 
          to="/highlights" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: colors.accent,
            textDecoration: 'none',
            marginBottom: '1.5rem'
          }}
        >
          <FiArrowLeft /> Back to Highlights
        </Link>
        
        <h2 style={{
          color: colors.accent,
          marginBottom: '1.5rem',
          fontSize: '1.75rem',
          fontWeight: '600'
        }}>
          Create New Highlight
        </h2>
        
        <p style={{ 
          color: colors.textMuted,
          marginBottom: '2rem'
        }}>
          Share your best moments with the community
        </p>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: colors.textLight,
              fontWeight: '500'
            }}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your highlight a title"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2a2a2a',
                color: colors.textLight,
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: colors.textLight,
              fontWeight: '500'
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2a2a2a',
                color: colors.textLight,
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Media Upload */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: colors.textLight,
              fontWeight: '500'
            }}>
              Media *
            </label>
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              style={{
                border: `2px dashed ${isDragging ? colors.accent : colors.textMuted}`,
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragging ? '#2a2a2a' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                style={{ display: 'none' }}
              />
              {!media ? (
                <div>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    color: colors.textMuted,
                    marginBottom: '1rem'
                  }}>
                    <FiUpload size={24} />
                  </div>
                  <p style={{ marginBottom: '0.5rem' }}>
                    Drag & drop files here or click to browse
                  </p>
                  <p style={{ 
                    fontSize: '0.875rem',
                    color: colors.textMuted
                  }}>
                    Supports images and videos (max 50MB)
                  </p>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMedia();
                    }}
                    style={{
                      position: 'absolute',
                      top: '-0.75rem',
                      right: '-0.75rem',
                      backgroundColor: colors.danger,
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '1.5rem',
                      height: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <FiX size={14} />
                  </button>
                  {media.type.startsWith('image') ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FiImage size={24} color={colors.accent} />
                      <div>
                        <p>{media.name}</p>
                        <p style={{ 
                          fontSize: '0.875rem',
                          color: colors.textMuted
                        }}>
                          {(media.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FiVideo size={24} color={colors.accent} />
                      <div>
                        <p>{media.name}</p>
                        <p style={{ 
                          fontSize: '0.875rem',
                          color: colors.textMuted
                        }}>
                          {(media.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div style={{ 
              marginBottom: '1.5rem',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'black'
            }}>
              {media.type.startsWith('video') ? (
                <video
                  src={previewUrl}
                  controls
                  style={{
                    width: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain'
                  }}
                />
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? colors.textMuted : colors.success,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>↻</span>
                <span>Posting...</span>
              </>
            ) : (
              'Create Highlight'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}