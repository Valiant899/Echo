import { useState } from 'react';
import PropTypes from 'prop-types';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth, app } from '../firebase';
import { FiUser } from 'react-icons/fi';
import { toast } from 'react-toastify';

const ProfilePictureUploader = ({ currentUser }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const storage = getStorage(app);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);

    // Validate file
    if (!file.type.match('image/.*')) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      // Ensure user is authenticated
      if (!auth.currentUser) {
        throw new Error('You must be logged in to update your profile picture');
      }

      // Create reference with consistent path
      const storageRef = ref(storage, `profilePictures/${currentUser.uid}/profile.webp`);
      
      // Upload with metadata
      await uploadBytes(storageRef, file, {
        contentType: 'image/webp',
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update both Firestore and Auth
      await Promise.all([
        updateDoc(doc(db, 'users', currentUser.uid), {
          profilePicture: downloadURL,
          lastUpdated: new Date().toISOString()
        }),
        updateProfile(auth.currentUser, {
          photoURL: downloadURL
        })
      ]);

      toast.success('Profile picture updated successfully!');
      
      // Optional: Force cache refresh
      window.dispatchEvent(new Event('profilePictureUpdated'));
      
    } catch (err) {
      console.error("Upload error:", err);
      let errorMessage = 'Failed to update profile picture';
      
      if (err.code === 'storage/unauthorized') {
        errorMessage = 'You don\'t have permission to upload';
      } else if (err.code === 'permission-denied') {
        errorMessage = 'Please refresh and login again';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-upload-container">
      <label htmlFor="profile-upload" className={`upload-label ${uploading ? 'uploading' : ''}`}>
        <div className="avatar-container">
          {currentUser?.photoURL ? (
            <img 
              src={`${currentUser.photoURL}?${Date.now()}`}
              alt="Profile"
              className="avatar-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '';
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <FiUser size={60} className="default-avatar" />
          )}
          {uploading && (
            <div className="upload-overlay">
              <div className="upload-spinner" />
              <span>Uploading...</span>
            </div>
          )}
        </div>
      </label>
      
      <input
        id="profile-upload"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        style={{ display: 'none' }}
      />
      
      <button
        onClick={() => document.getElementById('profile-upload').click()}
        disabled={uploading}
        className="upload-button"
        aria-label="Change profile photo"
      >
        {uploading ? 'Uploading...' : 'Change Photo'}
      </button>
      
      {error && <p className="error-message">{error}</p>}

      <style jsx="true">{`
        .profile-upload-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .upload-label {
          cursor: pointer;
          position: relative;
          transition: opacity 0.2s;
        }
        
        .upload-label.uploading {
          cursor: wait;
          opacity: 0.8;
        }
        
        .avatar-container {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          background-color: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #4da6ff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          position: relative;
        }
        
        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .default-avatar {
          color: #4da6ff;
          opacity: 0.7;
        }
        
        .upload-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.8rem;
          gap: 0.5rem;
        }
        
        .upload-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        
        .upload-button {
          margin-top: 0.8rem;
          background: transparent;
          border: 1px solid #4da6ff;
          color: #4da6ff;
          cursor: pointer;
          padding: 0.4rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        
        .upload-button:hover:not(:disabled) {
          background: #4da6ff;
          color: white;
        }
        
        .upload-button:disabled {
          cursor: wait;
          opacity: 0.7;
        }
        
        .error-message {
          color: #dc3545;
          font-size: 0.8rem;
          margin-top: 0.5rem;
          text-align: center;
          max-width: 200px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

ProfilePictureUploader.propTypes = {
  currentUser: PropTypes.shape({
    uid: PropTypes.string.isRequired,
    photoURL: PropTypes.string,
  }).isRequired
};

export default ProfilePictureUploader;