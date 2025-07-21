// components/Avatar.js
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { FiUser } from 'react-icons/fi';

const Avatar = ({ userId, size = 40 }) => {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!userId) return;

    // Real-time listener for profile picture changes
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPhotoUrl(data.profilePicture || '');
        setUsername(data.displayName || 'User');
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={username}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={() => setPhotoUrl('')}
        />
      ) : (
        <FiUser size={size * 0.5} />
      )}
    </div>
  );
};

export default Avatar;