// media-upload.js
export const uploadMedia = async (file) => {
  // Mock implementation - replace with actual upload logic
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        url: `https://storage.example.com/uploads/${file.name}-${Date.now()}`,
        type: file.type.startsWith('video') ? 'video' : 'image',
        size: file.size
      });
    }, 1000);
  });
};