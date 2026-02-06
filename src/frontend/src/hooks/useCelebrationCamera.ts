import { useCamera, CameraConfig } from '@/camera/useCamera';
import { useEffect, useState, useCallback, RefObject } from 'react';

interface CameraError {
  type: 'permission' | 'not-supported' | 'not-found' | 'unknown' | 'timeout';
  message: string;
}

interface UseCelebrationCameraReturn {
  isActive: boolean;
  isSupported: boolean | null;
  error: CameraError | null;
  isLoading: boolean;
  currentFacingMode: 'user' | 'environment';
  startCamera: () => Promise<boolean>;
  stopCamera: () => Promise<void>;
  capturePhoto: () => Promise<File | null>;
  switchCamera: (newFacingMode?: 'user' | 'environment') => Promise<boolean>;
  retry: () => Promise<boolean>;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isPreviewReady: boolean;
  waitForPreviewReady: () => Promise<boolean>;
}

/**
 * Wrapper around useCamera that ensures video preview is ready before allowing countdown/capture.
 * Handles stream attachment, playback readiness, and proper cleanup with robust readiness detection.
 */
export function useCelebrationCamera(config?: CameraConfig): UseCelebrationCameraReturn {
  const camera = useCamera(config);
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  // Monitor video element for readiness with robust checks
  useEffect(() => {
    const video = camera.videoRef.current;
    if (!video) return;

    const checkReadiness = () => {
      // Video is ready when:
      // 1. It has valid dimensions
      // 2. ReadyState is at least HAVE_CURRENT_DATA (2)
      // 3. It's not paused (or we can play it)
      const hasDimensions = video.videoWidth > 0 && video.videoHeight > 0;
      const hasData = video.readyState >= 2; // HAVE_CURRENT_DATA or higher
      const isPlayable = !video.paused || video.readyState >= 3; // HAVE_FUTURE_DATA
      
      const ready = hasDimensions && hasData && isPlayable;
      
      console.log('[useCelebrationCamera] Preview readiness check:', {
        hasDimensions,
        hasData,
        isPlayable,
        ready,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        paused: video.paused,
      });
      
      setIsPreviewReady(ready);
      
      return ready;
    };

    // Listen for various readiness events
    const handleLoadedMetadata = () => {
      console.log('[useCelebrationCamera] loadedmetadata event');
      checkReadiness();
    };

    const handleLoadedData = () => {
      console.log('[useCelebrationCamera] loadeddata event');
      checkReadiness();
    };

    const handleCanPlay = () => {
      console.log('[useCelebrationCamera] canplay event');
      // Attempt to play the video if not already playing
      if (video.paused) {
        video.play().catch((err) => {
          console.warn('[useCelebrationCamera] Video autoplay failed:', err);
        });
      }
      checkReadiness();
    };

    const handlePlaying = () => {
      console.log('[useCelebrationCamera] playing event');
      checkReadiness();
    };

    const handleTimeUpdate = () => {
      // Once we get time updates, we know video is definitely playing
      checkReadiness();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Initial check
    checkReadiness();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [camera.videoRef, camera.isActive]);

  // Reset preview ready state when camera stops
  useEffect(() => {
    if (!camera.isActive) {
      console.log('[useCelebrationCamera] Camera inactive, resetting preview ready state');
      setIsPreviewReady(false);
    }
  }, [camera.isActive]);

  // Wait for preview to be ready with timeout and robust checks
  const waitForPreviewReady = useCallback(async (): Promise<boolean> => {
    console.log('[useCelebrationCamera] waitForPreviewReady called');
    const video = camera.videoRef.current;
    if (!video) {
      console.error('[useCelebrationCamera] No video element available');
      return false;
    }

    // Helper to check if video is truly ready
    const isVideoReady = () => {
      const hasDimensions = video.videoWidth > 0 && video.videoHeight > 0;
      const hasData = video.readyState >= 2;
      const isPlayable = !video.paused || video.readyState >= 3;
      return hasDimensions && hasData && isPlayable;
    };

    // If already ready, return immediately
    if (isVideoReady()) {
      console.log('[useCelebrationCamera] Video already ready');
      setIsPreviewReady(true);
      return true;
    }

    console.log('[useCelebrationCamera] Waiting for video to be ready...');

    // Wait for video to be ready (with timeout)
    return new Promise((resolve) => {
      let resolved = false;
      let checkInterval: NodeJS.Timeout | null = null;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.warn('[useCelebrationCamera] Preview ready timeout after 5s');
          resolved = true;
          if (checkInterval) clearInterval(checkInterval);
          cleanup();
          resolve(false);
        }
      }, 5000); // 5 second timeout

      const checkAndResolve = () => {
        if (resolved) return;
        if (isVideoReady()) {
          console.log('[useCelebrationCamera] Video became ready');
          resolved = true;
          clearTimeout(timeout);
          if (checkInterval) clearInterval(checkInterval);
          cleanup();
          setIsPreviewReady(true);
          resolve(true);
        }
      };

      const handleMetadata = () => checkAndResolve();
      const handleLoadedData = () => checkAndResolve();
      const handleCanPlay = () => {
        if (video.paused) {
          video.play().catch(() => {});
        }
        checkAndResolve();
      };
      const handlePlaying = () => checkAndResolve();
      const handleTimeUpdate = () => checkAndResolve();

      video.addEventListener('loadedmetadata', handleMetadata);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('timeupdate', handleTimeUpdate);

      // Try to play immediately
      if (video.paused) {
        video.play().catch(() => {});
      }

      // Poll every 100ms as a fallback
      checkInterval = setInterval(checkAndResolve, 100);

      // Initial check
      checkAndResolve();

      // Cleanup function
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleMetadata);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    });
  }, [camera.videoRef]);

  // Enhanced stopCamera that properly cleans up stream
  const enhancedStopCamera = useCallback(async () => {
    console.log('[useCelebrationCamera] Stopping camera');
    const video = camera.videoRef.current;
    
    // Stop all tracks on the stream
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    
    // Call original stop
    await camera.stopCamera();
    setIsPreviewReady(false);
  }, [camera]);

  // Enhanced capturePhoto that returns null for transient issues (allowing retry) or throws for fatal errors
  const enhancedCapturePhoto = useCallback(async (): Promise<File | null> => {
    const video = camera.videoRef.current;
    const canvas = camera.canvasRef.current;
    
    console.log('[useCelebrationCamera] capturePhoto called');
    
    // Ensure video element exists (fatal if missing)
    if (!video) {
      const error = new Error('Video element not available');
      console.error('[useCelebrationCamera] Fatal:', error.message);
      throw error;
    }

    // Ensure canvas element exists (fatal if missing)
    if (!canvas) {
      const error = new Error('Canvas element not available');
      console.error('[useCelebrationCamera] Fatal:', error.message);
      throw error;
    }

    // Log current video state for diagnostics
    console.log('[useCelebrationCamera] Video state:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      ended: video.ended,
      currentTime: video.currentTime,
    });

    // Hard block: dimensions must be valid (transient - return null for retry)
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('[useCelebrationCamera] Video dimensions not ready (transient), returning null for retry');
      return null;
    }

    // Soft check: if video is paused, attempt to play it
    if (video.paused && !video.ended) {
      console.log('[useCelebrationCamera] Video is paused, attempting to play...');
      try {
        await video.play();
        // Wait briefly for playback to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[useCelebrationCamera] Video play successful');
      } catch (playError) {
        console.warn('[useCelebrationCamera] Failed to play video, continuing anyway:', playError);
      }
    }

    // Check if video ended (transient - return null for retry)
    if (video.ended) {
      console.warn('[useCelebrationCamera] Video has ended (transient), returning null for retry');
      return null;
    }

    // Check readyState (transient if not enough data)
    if (video.readyState < 2) {
      console.warn('[useCelebrationCamera] Video readyState < 2 (transient), returning null for retry');
      return null;
    }

    // Attempt manual capture using canvas
    console.log('[useCelebrationCamera] Attempting manual canvas capture...');
    
    try {
      // Get 2D context
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const error = new Error('Failed to get 2D context from canvas');
        console.error('[useCelebrationCamera] Fatal:', error.message);
        throw error;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('[useCelebrationCamera] Canvas sized to:', canvas.width, 'x', canvas.height);

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          config?.format || 'image/jpeg',
          config?.quality || 0.95
        );
      });

      if (!blob) {
        const error = new Error('Canvas toBlob returned null');
        console.error('[useCelebrationCamera] Fatal:', error.message);
        throw error;
      }

      if (blob.size === 0) {
        const error = new Error('Canvas toBlob returned empty blob');
        console.error('[useCelebrationCamera] Fatal:', error.message);
        throw error;
      }

      // Convert blob to File
      const file = new File([blob], 'selfie.jpg', { type: blob.type });
      
      console.log('[useCelebrationCamera] Manual capture successful:', {
        size: file.size,
        type: file.type,
      });

      return file;
    } catch (error) {
      // If manual capture fails, try the underlying camera hook as fallback
      console.warn('[useCelebrationCamera] Manual capture failed, trying camera.capturePhoto():', error);
      
      try {
        const result = await camera.capturePhoto();
        
        if (result) {
          console.log('[useCelebrationCamera] Fallback capture successful, file size:', result.size);
          return result;
        } else {
          console.warn('[useCelebrationCamera] Fallback capture returned null (transient), will retry');
          return null;
        }
      } catch (fallbackError) {
        // Both methods failed - this is fatal
        const error = new Error(`Both capture methods failed: ${fallbackError}`);
        console.error('[useCelebrationCamera] Fatal:', error.message);
        throw error;
      }
    }
  }, [camera, config]);

  return {
    isActive: camera.isActive,
    isSupported: camera.isSupported,
    error: camera.error,
    isLoading: camera.isLoading,
    currentFacingMode: camera.currentFacingMode,
    startCamera: camera.startCamera,
    stopCamera: enhancedStopCamera,
    capturePhoto: enhancedCapturePhoto,
    switchCamera: camera.switchCamera,
    retry: camera.retry,
    videoRef: camera.videoRef,
    canvasRef: camera.canvasRef,
    isPreviewReady,
    waitForPreviewReady,
  };
}
