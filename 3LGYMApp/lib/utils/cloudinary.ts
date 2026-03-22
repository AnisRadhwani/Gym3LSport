import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Uploads an image to Cloudinary with optimization
 * @param imageUri - The local URI of the image to upload
 * @param folder - The folder to store the image in (users, coaches, or events)
 * @returns The URL of the uploaded image, or null if upload failed
 */
export const uploadImageToCloudinary = async (
  imageUri: string,
  folder: 'users' | 'coaches' | 'events'
): Promise<string | null> => {
  if (!imageUri) {
    console.error('No image URI provided to uploadImageToCloudinary');
    return null;
  }

  try {
    console.log('Compressing image before upload');
    // Compress and resize the image before uploading
    const compressedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1080 } }], // Resize to reasonable dimensions
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    console.log('Creating form data for Cloudinary upload');
    const data = new FormData();
    data.append('file', {
      uri: compressedImage.uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    } as any);
    data.append('upload_preset', '3lgym_preset');
    data.append('folder', `3lgym/${folder}`);
    
    // For unsigned uploads, we can't include transformation parameters in the URL
    // We'll apply transformations after the image is uploaded
    
    console.log(`Making request to Cloudinary API for ${folder} image upload`);
    const res = await axios.post(
      'https://api.cloudinary.com/v1_1/dofxydghg/image/upload',
      data,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
      }
    );
    
    console.log('Cloudinary response received:', res.status, res.statusText);
    
    if (res.data && res.data.secure_url) {
      console.log('Image upload successful, received secure URL');
      // Apply transformations by modifying the URL
      const optimizedUrl = getOptimizedImageUrl(res.data.secure_url);
      return optimizedUrl;
    } else {
      console.error('Unexpected Cloudinary response format:', JSON.stringify(res.data));
      return null;
    }
  } catch (err) {
    console.error('Cloudinary Upload Error:', err);
    if (axios.isAxiosError(err)) {
      console.error('Request failed with status:', err.response?.status);
      console.error('Error response data:', JSON.stringify(err.response?.data));
      console.error('Error request config:', JSON.stringify({
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers,
        timeout: err.config?.timeout,
      }));
    }
    return null;
  }
}; 

/**
 * Converts a standard Cloudinary URL to an optimized one with auto format and quality
 * @param url - The original Cloudinary URL
 * @returns The optimized URL with f_auto,q_auto parameters
 */
export const getOptimizedImageUrl = (url: string | undefined | null): string => {
  if (!url || !url.includes('cloudinary.com')) {
    return url || '';
  }
  
  // If URL already has optimization parameters, return as is
  if (url.includes('f_auto') || url.includes('q_auto')) {
    return url;
  }
  
  // Insert f_auto,q_auto into the URL
  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto/'
  );
}; 