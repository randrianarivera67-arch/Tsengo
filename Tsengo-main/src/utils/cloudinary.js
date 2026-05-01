// src/utils/cloudinary.js
// Asiana ny Cloudinary config anao eto
// 1. Mankanesa amin'ny cloudinary.com → Free account
// 2. Dashboard → Copy ny Cloud Name
// 3. Settings → Upload → Add upload preset → Unsigned → Copy ny preset name

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload file (image na video) any amin'ny Cloudinary
 * @param {File} file - ilay file hoentina
 * @param {string} folder - toerana ao amin'ny Cloudinary (ex: 'tsengo/posts')
 * @param {function} onProgress - callback progress (0-100)
 * @returns {Promise<{url: string, publicId: string, type: string}>}
 */
export async function uploadToCloudinary(file, folder = 'tsengo', onProgress = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  // Detect resource type
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    // Progress tracking
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          type: isVideo ? 'video' : 'image',
          width: data.width,
          height: data.height,
          duration: data.duration || null,
        });
      } else {
        reject(new Error('Upload Cloudinary nisy olana: ' + xhr.responseText));
      }
    };

    xhr.onerror = () => reject(new Error('Réseau olana'));
    xhr.send(formData);
  });
}

/**
 * Upload audio blob any amin'ny Cloudinary (resource_type: raw)
 * @param {Blob} blob - ilay audio blob (webm/mp3...)
 * @param {string} folder - toerana ao amin'ny Cloudinary
 * @param {function} onProgress - callback progress (0-100)
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadAudioToCloudinary(blob, folder = 'tsengo/audio', onProgress = null) {
  const formData = new FormData();
  formData.append('file', blob, 'voice.webm');
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, publicId: data.public_id });
      } else {
        reject(new Error('Upload audio Cloudinary nisy olana: ' + xhr.responseText));
      }
    };

    xhr.onerror = () => reject(new Error('Réseau olana'));
    xhr.send(formData);
  });
}

/**
 * Get optimized image URL from Cloudinary
 * @param {string} url - original Cloudinary URL
 * @param {object} options - { width, height, quality }
 */
export function optimizeImage(url, { width = 800, quality = 'auto' } = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${width},q_${quality},f_auto/`);
}

/**
 * Get thumbnail for video
 */
export function videoThumbnail(url) {
  if (!url || !url.includes('cloudinary.com')) return '';
  return url.replace('/upload/', '/upload/so_0,w_600,q_auto,f_jpg/').replace('.mp4', '.jpg').replace('.mov', '.jpg').replace('.avi', '.jpg');
}
