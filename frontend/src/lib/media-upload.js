import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, sendEmailVerification } from "firebase/auth";
import { storage } from "@/firebase";

/**
 * Uploads media files with duplicate prevention and cleanup
 * @param {File} file - The file to upload
 * @param {Object} options - Configuration options
 * @param {boolean} options.isThumbnail - If uploading a thumbnail
 * @param {string} options.parentId - Associated highlight ID for thumbnails
 * @param {string} options.existingPath - Path of existing file to replace
 * @returns {Promise<{url: string, path: string, type: 'video'|'image', metadata: object}>}
 */
export const uploadMedia = async (file, options = {}) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    // Authentication checks
    if (!user) throw new Error("AUTH_REQUIRED");
    if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
    if (!file) throw new Error("NO_FILE");

    // Configuration
    const isThumbnail = options.isThumbnail || false;
    const maxSize = isThumbnail ? 2 * 1024 * 1024 : 10 * 1024 * 1024; // 2MB/10MB
    const allowedTypes = isThumbnail ? 'image/.*' : '(image|video)/.*';

    // File validation
    if (file.size > maxSize) {
      throw new Error(`FILE_SIZE_EXCEEDED_${maxSize/1024/1024}MB`);
    }
    
    if (!file.type.match(allowedTypes)) {
      throw new Error(isThumbnail ? "THUMBNAIL_TYPE_INVALID" : "MEDIA_TYPE_INVALID");
    }

    // Clean up existing file if provided
    if (options.existingPath) {
      try {
        const oldRef = ref(storage, options.existingPath);
        await deleteObject(oldRef);
        console.log('Deleted old file:', options.existingPath);
      } catch (error) {
        console.warn('Old file deletion failed (may not exist):', error);
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.uid}_${Date.now()}.${fileExt}`;
    const storagePath = isThumbnail 
      ? `thumbnails/${fileName}` 
      : `highlights/${fileName}`;

    const storageRef = ref(storage, storagePath);

    // Upload metadata
    const uploadMetadata = {
      contentType: file.type,
      customMetadata: {
        owner: user.uid,
        uploaderEmail: user.email || 'unknown',
        originalName: encodeURIComponent(file.name),
        uploadedAt: new Date().toISOString(),
        ...(isThumbnail && { parentHighlight: options.parentId || 'none' }),
        ...(options.existingPath && { replaced: options.existingPath })
      }
    };

    // Execute upload
    const snapshot = await uploadBytes(storageRef, file, uploadMetadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      type: file.type.startsWith('video') ? 'video' : 'image',
      metadata: uploadMetadata.customMetadata
    };

  } catch (error) {
    console.error("Upload failed:", {
      error: error.message,
      code: error.code,
      file: file?.name,
      options
    });
    
    // Enhanced error mapping
    const errorMap = {
      // Firebase errors
      "storage/unauthorized": "UPLOAD_PERMISSION_DENIED",
      "storage/retry-limit-exceeded": "NETWORK_FAILURE",
      "storage/canceled": "UPLOAD_CANCELED",
      "storage/unknown": "STORAGE_ERROR",
      
      // Custom errors
      "AUTH_REQUIRED": "Please sign in to upload files",
      "EMAIL_NOT_VERIFIED": "Verify your email to upload",
      "NO_FILE": "No file selected",
      "FILE_SIZE_EXCEEDED_2MB": "Thumbnail must be <2MB",
      "FILE_SIZE_EXCEEDED_10MB": "Media must be <10MB",
      "THUMBNAIL_TYPE_INVALID": "Thumbnail must be an image",
      "MEDIA_TYPE_INVALID": "Only images/videos allowed"
    };

    const clientMessage = errorMap[error.code] || 
                         errorMap[error.message] || 
                         "Upload failed. Please try again.";

    // For email verification, include resend capability
    if (error.message === "EMAIL_NOT_VERIFIED") {
      error.resendVerification = async () => {
        await sendEmailVerification(getAuth().currentUser);
      };
    }

    throw new Error(clientMessage);
  }
};

/**
 * Specialized thumbnail uploader with parent reference
 * @param {File} imageFile - Thumbnail image file
 * @param {string} parentId - Associated highlight ID
 * @param {string} existingPath - Existing thumbnail path to replace
 */
export const uploadThumbnail = async (imageFile, parentId, existingPath = null) => {
  return uploadMedia(imageFile, {
    isThumbnail: true,
    parentId: parentId,
    existingPath: existingPath
  });
};

/**
 * Deletes media files from storage
 * @param {string} path - Full storage path to delete
 */
export const deleteMedia = async (path) => {
  try {
    if (!path) return;
    
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error("Delete failed:", {
      path,
      error: error.message
    });
    return false;
  }
};