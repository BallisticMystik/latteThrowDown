import { useState, useCallback, useRef } from 'react';

const ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

export interface MediaAsset {
  id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  duration_seconds: number | null;
  url: string;
}

interface UseVideoUploadReturn {
  upload: (file: File) => void;
  reset: () => void;
  uploading: boolean;
  progress: number;
  error: string | null;
  mediaAsset: MediaAsset | null;
}

export function useVideoUpload(): UseVideoUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaAsset, setMediaAsset] = useState<MediaAsset | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const reset = useCallback(() => {
    // Abort any in-flight upload
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setUploading(false);
    setProgress(0);
    setError(null);
    setMediaAsset(null);
  }, []);

  const upload = useCallback((file: File) => {
    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Allowed: MP4, WebM, MOV, JPEG, PNG, WebP.`);
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const limitMB = maxSize / (1024 * 1024);
      setError(`File too large. Maximum size is ${limitMB}MB for ${isVideo ? 'video' : 'image'} files.`);
      return;
    }

    // Reset previous state
    setError(null);
    setMediaAsset(null);
    setProgress(0);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setProgress(pct);
      }
    });

    xhr.addEventListener('load', () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText) as { success: boolean; data?: MediaAsset; error?: string };
          if (res.success && res.data) {
            setMediaAsset(res.data);
            setProgress(100);
          } else {
            setError(res.error ?? 'Upload failed');
          }
        } catch {
          setError('Invalid response from server');
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText) as { error?: string };
          setError(res.error ?? `Upload failed (${xhr.status})`);
        } catch {
          setError(`Upload failed (${xhr.status})`);
        }
      }
      setUploading(false);
    });

    xhr.addEventListener('error', () => {
      xhrRef.current = null;
      setError('Network error — please check your connection and try again.');
      setUploading(false);
    });

    xhr.addEventListener('abort', () => {
      xhrRef.current = null;
      setUploading(false);
    });

    xhr.open('POST', `${API_BASE}/api/media/upload`);
    xhr.withCredentials = true;
    // Do NOT set Content-Type — let the browser set the multipart boundary
    xhr.send(formData);
  }, []);

  return { upload, reset, uploading, progress, error, mediaAsset };
}
