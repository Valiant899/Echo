import { db } from '../firebase';
import { 
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  doc
} from 'firebase/firestore';
import { uploadMedia, uploadThumbnail } from './media-upload';
import { auth } from '../firebase';

/**
 * Fetches the most current user profile data from Firestore
 */
async function getCurrentUserProfile(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return {
        authorname: userDoc.data().authorname || 'Anonymous',
        profilePicture: userDoc.data().profilePicture || null,
        displayName: userDoc.data().displayName || ''
      };
    }
    throw new Error('User profile not found in Firestore');
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
}


/**
 * Creates a highlight with perfectly synchronized user data
 */
export async function createHighlight(highlightData) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // 1. Get FRESH user profile data (name + pfp)
    const { authorname, profilePicture } = await getCurrentUserProfile(user.uid);

    // 2. Upload media files
    const mediaResult = await uploadMedia(highlightData.mediaFile);
    const thumbnailUrl = highlightData.thumbnailFile 
      ? (await uploadThumbnail(highlightData.thumbnailFile)).url 
      : null;

    // 3. Prepare document with SYNCED user data
    const docData = {
      title: highlightData.title.trim(),
      description: highlightData.description?.trim() || '',
      mediaUrl: mediaResult.url,
      mediaType: mediaResult.type,
      thumbnailUrl,
      // Critical: Using Firestore user document data
      authorId: user.uid,
      authorName: authorname,       // From users collection
      authorPicture: profilePicture, // From users collection
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likes: 0,
      views: 0,
      commentsCount: 0,
      tags: highlightData.tags || [],
      status: 'active',
      _dataVersion: 2 // Track schema version
    };

    console.log('Creating highlight with:', {
      authorName: authorname,
      profilePicture: profilePicture ? 'exists' : 'null'
    });

    // 4. Create the document
    const docRef = await addDoc(collection(db, 'highlights'), docData);
    
    return { 
      id: docRef.id,
      ...docData,
      // Convert timestamps for client use
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
  } catch (error) {
    console.error('Highlight creation failed:', {
      error: error.message,
      stack: error.stack,
      userId: auth.currentUser?.uid
    });
    throw new Error(`Failed to create highlight: ${error.message}`);
  }
}


/**
 * Fetch highlights with optional filters
 */
export async function getHighlights(options = {}) {
  try {
    // Create base query
    let q = query(collection(db, 'highlights'));
    
    // Apply filters
    if (options.userId) {
      q = query(q, where('authorId', '==', options.userId));
    }
    
    // Default sorting
    q = query(q, orderBy('createdAt', 'desc'));
    
    // Apply limit if specified
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    // Execute query
    const snapshot = await getDocs(q);
    
    // Transform results
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    }));
    
  } catch (error) {
    console.error('Error fetching highlights:', error);
    throw new Error(`Failed to fetch highlights: ${error.message}`);
  }
}