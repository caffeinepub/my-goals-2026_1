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
 * Handles stream attachment, playback readiness, and proper cleanup.
 */
export function useCelebrationCamera(config?: CameraConfig): UseCelebrationCameraReturn {
  const camera = useCamera(config);
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  // Monitor video element for readiness
  useEffect(() => {
    const video = camera.videoRef.current;
    if (!video) return;

    const checkReadiness = () => {
      // Video is ready when it has dimensions and is playing
      const ready = video.videoWidth > 0 && video.videoHeight > 0 && !video.paused;
      setIsPreviewReady(ready);
    };

    // Listen for various readiness events
    const handleLoadedMetadata = () => {
      checkReadiness();
    };

    const handleCanPlay = () => {
      // Attempt to play the video
      video.play().catch((err) => {
        console.warn('Video autoplay failed:', err);
      });
      checkReadiness();
    };

    const handlePlaying = () => {
      checkReadiness();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);

    // Initial check
    checkReadiness();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [camera.videoRef, camera.isActive]);

  // Reset preview ready state when camera stops
  useEffect(() => {
    if (!camera.isActive) {
      setIsPreviewReady(false);
    }
  }, [camera.isActive]);

  // Wait for preview to be ready with timeout
  const waitForPreviewReady = useCallback(async (): Promise<boolean> => {
    const video = camera.videoRef.current;
    if (!video) return false;

    // If already ready, return immediately
    if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
      setIsPreviewReady(true);
      return true;
    }

    // Wait for video to be ready (with timeout)
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 5000); // 5 second timeout

      const checkAndResolve = () => {
        if (resolved) return;
        if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
          resolved = true;
          clearTimeout(timeout);
          setIsPreviewReady(true);
          resolve(true);
        }
      };

      const handleMetadata = () => checkAndResolve();
      const handleCanPlay = () => {
        video.play().catch(() => {});
        checkAndResolve();
      };
      const handlePlaying = () => checkAndResolve();

      video.addEventListener('loadedmetadata', handleMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('playing', handlePlaying);

      // Try to play immediately
      video.play().catch(() => {});

      // Initial check
      checkAndResolve();

      // Cleanup
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
      };

      // Store cleanup for timeout
      setTimeout(() => {
        cleanup();
      }, 5100);
    });
  }, [camera.videoRef]);

  // Enhanced stopCamera that properly cleans up stream
  const enhancedStopCamera = useCallback(async () => {
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

  // Enhanced capturePhoto that waits for valid dimensions
  const enhancedCapturePhoto = useCallback(async (): Promise<File | null> => {
    const video = camera.videoRef.current;
    
    // Ensure video has valid dimensions
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('Video not ready for capture');
      return null;
    }
    
    return camera.capturePhoto();
  }, [camera]);

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
