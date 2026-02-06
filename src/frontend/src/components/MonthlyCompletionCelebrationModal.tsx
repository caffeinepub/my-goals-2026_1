import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Upload, Loader2 } from 'lucide-react';
import { useCelebrationCamera } from '@/hooks/useCelebrationCamera';
import { saveMonthlyMemory } from '@/lib/monthlyMemoryStorage';
import { createCelebrationComposite, fileToDataUrl, OVERLAY_IMAGE_PATH } from '@/lib/celebrationImageComposite';
import { type Month } from '@/lib/months';
import CenteredNotification from '@/components/CenteredNotification';

interface MonthlyCompletionCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  onMemorySaved?: (month: Month) => void;
  onUploadSaveSuccess?: () => void;
  onMaybeLater?: (month: Month) => void;
}

const DEFAULT_CELEBRATION_IMAGE = '/assets/generated/celebration-default-user-provided.dim_696x609.png';
const CAPTURE_TIMEOUT_MS = 10000; // 10 seconds max for capture attempts

export default function MonthlyCompletionCelebrationModal({
  open,
  onOpenChange,
  month,
  onMemorySaved,
  onUploadSaveSuccess,
  onMaybeLater,
}: MonthlyCompletionCelebrationModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSelfieCapture, setIsSelfieCapture] = useState(false);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef(false);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCloseRef = useRef(false); // Track if modal should close after notification
  
  // Refs that stay in sync with state for async guards
  const openRef = useRef(open);
  const isCameraModeRef = useRef(isCameraMode);
  const flowRunIdRef = useRef(0); // Monotonically increasing token for each capture flow
  const activeFlowIdRef = useRef<number | null>(null); // Current active flow ID

  const {
    isActive,
    isSupported,
    error,
    isLoading,
    isPreviewReady,
    startCamera,
    stopCamera,
    capturePhoto,
    waitForPreviewReady,
    videoRef,
    canvasRef,
  } = useCelebrationCamera({
    facingMode: 'user',
    quality: 0.95,
  });

  // Keep refs in sync with state
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    isCameraModeRef.current = isCameraMode;
  }, [isCameraMode]);

  // Clear pending close flag when modal is manually closed
  useEffect(() => {
    if (!open) {
      pendingCloseRef.current = false;
    }
  }, [open]);

  // Helper to check if a URL is an object URL (blob:)
  const isObjectURL = (url: string | null): boolean => {
    return url !== null && url.startsWith('blob:');
  };

  // Clean up object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (isObjectURL(selectedImage)) {
        URL.revokeObjectURL(selectedImage!);
      }
    };
  }, [selectedImage]);

  // Centralized teardown function for camera flow
  const teardownCaptureFlow = async () => {
    console.log('[Modal] Tearing down capture flow, activeFlowId was:', activeFlowIdRef.current);
    
    // Clear all timers
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }

    // Reset capture flags and state
    isCapturingRef.current = false;
    setIsCapturingPhoto(false);
    setCountdown(null);
    setIsStartingCamera(false);
    setIsProcessing(false);

    // Stop camera if active
    if (isActive) {
      try {
        await stopCamera();
        console.log('[Modal] Camera stopped during teardown');
      } catch (err) {
        console.error('[Modal] Error stopping camera during teardown:', err);
      }
    }
    
    // Deactivate flow AFTER teardown completes
    activeFlowIdRef.current = null;
    console.log('[Modal] Teardown complete, activeFlowId now:', activeFlowIdRef.current);
  };

  // Clean up camera and reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Teardown capture flow
      teardownCaptureFlow();

      // Clean up image URL only if it's an object URL
      if (isObjectURL(selectedImage)) {
        URL.revokeObjectURL(selectedImage!);
      }
      setSelectedImage(null);

      // Reset states
      setIsCameraMode(false);
      setCameraError(null);
      setIsStartingCamera(false);
      setIsProcessing(false);
      setIsSelfieCapture(false);
      setShowSaveNotification(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open, isActive, selectedImage, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, []);

  const startCountdown = () => {
    console.log('[Modal] Starting countdown');
    const sequence = [5, 4, 3, 2, 1, 0];
    let index = 0;

    const runCountdown = () => {
      if (index < sequence.length) {
        setCountdown(sequence[index]);
        console.log('[Modal] Countdown:', sequence[index]);
        index++;
        
        // If we just showed 0, wait briefly then clear countdown and trigger capture
        if (sequence[index - 1] === 0) {
          // Show 0 for 300ms, then add a small delay before capture
          countdownTimerRef.current = setTimeout(() => {
            // Clear countdown display
            setCountdown(null);
            console.log('[Modal] Countdown complete, triggering capture');
            
            // Add a small delay (150ms) before first capture attempt
            setTimeout(() => {
              handleCapture();
            }, 150);
          }, 300);
        } else {
          countdownTimerRef.current = setTimeout(runCountdown, 1000);
        }
      }
    };

    runCountdown();
  };

  const handleCapture = async () => {
    // Prevent double capture
    if (isCapturingRef.current) {
      console.warn('[Modal] Capture already in progress, skipping');
      return;
    }
    
    // Clear any pending countdown timers to prevent re-triggers
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // Generate a new flow run ID for this capture attempt
    const currentFlowId = ++flowRunIdRef.current;
    
    // CRITICAL FIX: Set this as the active flow immediately
    activeFlowIdRef.current = currentFlowId;
    console.log('[Modal] Starting capture flow #', currentFlowId, ', set as active flow');

    // Mark capture as in progress
    isCapturingRef.current = true;

    // Show capturing state
    setIsCapturingPhoto(true);

    // Set capture timeout - guard with flow ID
    captureTimeoutRef.current = setTimeout(async () => {
      // Guard: only execute if this is still the active flow
      if (activeFlowIdRef.current !== currentFlowId) {
        console.log('[Modal] Timeout fired for flow #', currentFlowId, 'but active flow is #', activeFlowIdRef.current, ', ignoring');
        return;
      }
      
      // Guard: check refs for current state
      if (!openRef.current || !isCameraModeRef.current) {
        console.log('[Modal] Timeout fired but modal closed or camera mode exited, ignoring');
        return;
      }
      
      console.log('[Modal] Capture timeout reached after', CAPTURE_TIMEOUT_MS, 'ms for flow #', currentFlowId, ', stopping flow');
      
      // Clear retry interval
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }

      // Stop camera and exit camera mode
      await teardownCaptureFlow();
      setIsCameraMode(false);
      
      // Show error message
      setCameraError('Photo capture timed out. Please try again or use the "Upload Photo" button below.');
    }, CAPTURE_TIMEOUT_MS);

    // Start silent retry loop
    const attemptCapture = async (): Promise<boolean> => {
      // Guard: check if this flow is still active
      if (activeFlowIdRef.current !== currentFlowId) {
        console.log('[Modal] Capture attempt for flow #', currentFlowId, 'but active flow is #', activeFlowIdRef.current, ', stopping');
        return false;
      }

      // Guard: check refs for current state
      if (!isCameraModeRef.current || !openRef.current) {
        console.log('[Modal] Capture flow cancelled (isCameraModeRef:', isCameraModeRef.current, 'openRef:', openRef.current, '), stopping retries');
        return false;
      }

      const video = videoRef.current;
      if (!video) {
        console.warn('[Modal] Video element not available, will retry...');
        return false;
      }

      // Check if video has dimensions (hard requirement)
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn('[Modal] Video dimensions not ready (', video.videoWidth, 'x', video.videoHeight, '), will retry...');
        return false;
      }

      console.log('[Modal] Attempting capture for flow #', currentFlowId, '(video dimensions:', video.videoWidth, 'x', video.videoHeight, ')...');
      
      try {
        const photoFile = await capturePhoto();
        
        if (!photoFile) {
          console.warn('[Modal] Capture returned null (transient), will retry...');
          return false;
        }

        console.log('[Modal] Capture successful for flow #', currentFlowId, '! File:', {
          size: photoFile.size,
          type: photoFile.type,
          name: photoFile.name,
        });

        // Success! Clear all timers immediately
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
        if (captureTimeoutRef.current) {
          clearTimeout(captureTimeoutRef.current);
          captureTimeoutRef.current = null;
          console.log('[Modal] Cleared timeout timer on successful capture');
        }
        
        // Hide capturing state immediately
        setIsCapturingPhoto(false);
        isCapturingRef.current = false;
        
        // Stop camera immediately after successful capture
        setTimeout(async () => {
          try {
            await stopCamera();
            console.log('[Modal] Camera stopped successfully');
          } catch (stopError) {
            console.error('[Modal] Failed to stop camera:', stopError);
          }
        }, 1);
        
        // Now process the captured photo
        setIsProcessing(true);
        console.log('[Modal] Processing captured photo...');
        
        try {
          // Convert photo to data URL
          const selfieDataUrl = await fileToDataUrl(photoFile);
          console.log('[Modal] Converted photo to data URL, length:', selfieDataUrl.length);
          
          // Attempt to create composited image with Polaroid frame and overlay
          let finalImageUrl: string;
          try {
            console.log('[Modal] Attempting to create celebration composite...');
            finalImageUrl = await createCelebrationComposite({
              selfieDataUrl,
            });
            console.log('[Modal] Composite created successfully, length:', finalImageUrl.length);
          } catch (compositeError) {
            // Compositing failed - fall back to raw selfie
            console.error('[Modal] Compositing failed, falling back to raw selfie:', compositeError);
            finalImageUrl = selfieDataUrl;
          }
          
          // Revoke previous URL if it's an object URL
          if (isObjectURL(selectedImage)) {
            URL.revokeObjectURL(selectedImage!);
          }
          
          // Set the final image for display (composited or raw)
          setSelectedImage(finalImageUrl);
          setIsCameraMode(false);
          setIsSelfieCapture(true);
          setCameraError(null);

          console.log('[Modal] Capture flow #', currentFlowId, 'completed successfully, showing preview');
        } catch (processingError) {
          console.error('[Modal] Failed to process photo:', processingError);
          // Even if processing fails, we stop retrying
          setIsCameraMode(false);
          setCameraError('Failed to process photo. Please try again.');
        } finally {
          setIsProcessing(false);
          activeFlowIdRef.current = null;
          console.log('[Modal] Deactivated capture flow #', currentFlowId, 'after processing');
        }

        return true;
      } catch (error) {
        // Fatal error thrown by capturePhoto - stop retrying
        console.error('[Modal] Fatal capture error (non-transient) for flow #', currentFlowId, ':', error);
        
        // Clear all timers
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
        if (captureTimeoutRef.current) {
          clearTimeout(captureTimeoutRef.current);
          captureTimeoutRef.current = null;
        }
        
        // Teardown and show error
        await teardownCaptureFlow();
        setIsCameraMode(false);
        
        setCameraError(`Failed to capture photo: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or use the "Upload Photo" button below.`);
        
        return false;
      }
    };

    // Try first capture immediately
    const success = await attemptCapture();
    
    if (!success && activeFlowIdRef.current === currentFlowId) {
      // Start retry loop (500ms intervals) - only if flow is still active
      console.log('[Modal] First capture attempt failed for flow #', currentFlowId, ', starting retry loop');
      retryIntervalRef.current = setInterval(async () => {
        // Guard: check if this flow is still active
        if (activeFlowIdRef.current !== currentFlowId) {
          console.log('[Modal] Retry interval for flow #', currentFlowId, 'but active flow is #', activeFlowIdRef.current, ', stopping');
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
          }
          return;
        }

        const retrySuccess = await attemptCapture();
        if (retrySuccess) {
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
          }
        }
      }, 500);
    } else if (success) {
      // Clear timeout if first attempt succeeded
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = null;
        console.log('[Modal] Cleared timeout timer after immediate success');
      }
    }
  };

  const handleSaveToMemories = () => {
    if (!selectedImage) return;

    console.log('[Modal] Saving to memories');
    
    // Save composited image to localStorage
    saveMonthlyMemory(month as Month, selectedImage);
    
    // Notify parent that memory was saved
    if (onMemorySaved) {
      onMemorySaved(month as Month);
    }

    // Show success notification and mark modal for pending close
    setShowSaveNotification(true);
    pendingCloseRef.current = true;
  };

  const handleNotificationDismiss = () => {
    setShowSaveNotification(false);
    
    // Close modal if it was pending close and still open
    if (pendingCloseRef.current && openRef.current) {
      console.log('[Modal] Notification dismissed, closing modal');
      pendingCloseRef.current = false;
      onOpenChange(false);
    }
  };

  const handleRetake = async () => {
    // Prevent starting new flow if one is active
    if (activeFlowIdRef.current !== null || isCapturingRef.current) {
      console.warn('[Modal] Capture flow already active, skipping retake');
      return;
    }

    console.log('[Modal] Retaking photo');

    // Clear the current preview
    if (isObjectURL(selectedImage)) {
      URL.revokeObjectURL(selectedImage!);
    }
    setSelectedImage(null);
    setIsSelfieCapture(false);
    setCameraError(null);
    
    // Teardown any existing flow first
    await teardownCaptureFlow();

    // Restart the camera flow
    await handleTakeSelfie();
  };

  const handleTakeSelfie = async () => {
    // Prevent overlapping flows
    if (activeFlowIdRef.current !== null || isCapturingRef.current) {
      console.warn('[Modal] Capture flow already active, skipping');
      return;
    }

    console.log('[Modal] === Starting new selfie capture flow ===');

    // Clear any previous error and teardown first
    setCameraError(null);
    await teardownCaptureFlow();
    
    // Note: We do NOT set activeFlowIdRef here anymore.
    // It will be set in handleCapture when the countdown completes.
    
    setIsStartingCamera(true);
    isCapturingRef.current = false;

    // Switch to camera mode immediately (hide static image)
    setIsCameraMode(true);

    console.log('[Modal] Starting camera...');

    // Check if camera is supported
    if (isSupported === false) {
      console.error('[Modal] Camera not supported');
      setCameraError('Camera is not supported on this device or browser. Please use the "Upload Photo" button below to select a photo from your files.');
      setIsStartingCamera(false);
      setIsCameraMode(false);
      console.log('[Modal] Camera not supported, exiting');
      return;
    }

    // Try to start camera
    const success = await startCamera();
    console.log('[Modal] Camera start result:', success);
    
    if (success) {
      setCameraError(null);
      
      console.log('[Modal] Camera started, waiting for preview readiness...');
      
      // Wait for preview to be fully ready before starting countdown
      const previewReady = await waitForPreviewReady();
      
      setIsStartingCamera(false);
      
      console.log('[Modal] Preview ready result:', previewReady);
      
      if (previewReady) {
        // Verify video element has non-zero dimensions
        const video = videoRef.current;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('[Modal] Preview confirmed ready with dimensions:', video.videoWidth, 'x', video.videoHeight);
          // Start countdown only after preview is confirmed ready
          startCountdown();
        } else {
          // Preview dimensions not ready
          console.error('[Modal] Preview dimensions not ready:', video?.videoWidth, 'x', video?.videoHeight);
          setCameraError('Camera preview failed to load. Please try again or use the "Upload Photo" button below.');
          setIsCameraMode(false);
          await teardownCaptureFlow();
        }
      } else {
        // Preview failed to become ready
        console.error('[Modal] Preview failed to become ready');
        setCameraError('Camera preview failed to load. Please try again or use the "Upload Photo" button below.');
        setIsCameraMode(false);
        await teardownCaptureFlow();
      }
    } else {
      // Camera failed - show error message based on error type
      console.error('[Modal] Camera start failed, error:', error);
      if (error?.type === 'permission') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings, or use the "Upload Photo" button below to select a photo from your files.');
      } else if (error?.type === 'not-found') {
        setCameraError('No camera found on this device. Please use the "Upload Photo" button below to select a photo from your files.');
      } else if (error?.type === 'not-supported') {
        setCameraError('Camera is not supported on this device or browser. Please use the "Upload Photo" button below to select a photo from your files.');
      } else {
        setCameraError('Unable to start camera. Please use the "Upload Photo" button below to select a photo from your files.');
      }
      setIsCameraMode(false);
      setIsStartingCamera(false);
      console.log('[Modal] Camera start failed, exiting');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('[Modal] Processing uploaded file:', file.name, file.size);
      setIsProcessing(true);
      
      try {
        // Convert uploaded file to data URL
        const selfieDataUrl = await fileToDataUrl(file);
        
        // Create composited image with Polaroid frame and overlay
        const compositedDataUrl = await createCelebrationComposite({
          selfieDataUrl,
        });
        
        // Revoke previous URL if it's an object URL
        if (isObjectURL(selectedImage)) {
          URL.revokeObjectURL(selectedImage!);
        }
        
        // Set the composited image for display
        setSelectedImage(compositedDataUrl);
        setIsSelfieCapture(true);
        setCameraError(null);

        // Save composited image to localStorage
        saveMonthlyMemory(month as Month, compositedDataUrl);
        
        // Notify parent that memory was saved
        if (onMemorySaved) {
          onMemorySaved(month as Month);
        }

        console.log('[Modal] Upload processed and saved successfully');

        // Close modal and trigger upload success notification
        onOpenChange(false);
        if (onUploadSaveSuccess) {
          onUploadSaveSuccess();
        }
      } catch (error) {
        console.error('[Modal] Failed to process uploaded photo:', error);
        setCameraError('Failed to process photo. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClose = async () => {
    console.log('[Modal] Closing modal');
    // Clear pending close flag
    pendingCloseRef.current = false;
    
    // Clean up any active flows
    await teardownCaptureFlow();
    
    onOpenChange(false);
  };

  const handleMaybeLater = async () => {
    console.log('[Modal] Maybe later clicked');
    // Clear pending close flag
    pendingCloseRef.current = false;
    
    // Clean up any active flows
    await teardownCaptureFlow();
    
    // Notify parent that "Maybe Later" was clicked
    if (onMaybeLater) {
      onMaybeLater(month as Month);
    }
    
    // Close the modal
    onOpenChange(false);
  };

  // Determine which image to display
  const displayImage = selectedImage || DEFAULT_CELEBRATION_IMAGE;
  
  // Only show badge overlay on the default image (not on user-captured/uploaded images)
  const showBadgeOverlay = !isCameraMode && !selectedImage;

  // Determine if we're in selfie preview mode (after capture, before save)
  const isInSelfiePreview = isSelfieCapture && selectedImage && !isCameraMode;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] bg-background p-0 overflow-hidden celebration-modal">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Confetti overlay */}
          <div className="confetti-overlay-container">
            <img
              src="/assets/generated/confetti-overlay.dim_1024x1024.png"
              alt=""
              className="confetti-overlay-image"
              aria-hidden="true"
            />
          </div>

          <DialogHeader className="pt-8 px-6 pb-4 relative z-10">
            <DialogTitle className="text-center text-2xl font-lora-italic leading-relaxed">
              Congrats!!....😍
            </DialogTitle>
            <DialogDescription className="text-center text-lg font-lora-italic pt-2 text-foreground">
              You reached 100% of your goals this month! 🎉 Want to celebrate with a selfie?
            </DialogDescription>
          </DialogHeader>

          {/* Media area */}
          <div className="relative px-6 pb-6">
            <div className="media-preview-container">
              {isCameraMode ? (
                <>
                  {/* Live camera preview */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-preview-video"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Loading overlay while camera is starting or preview is not ready */}
                  {(isStartingCamera || !isPreviewReady) && countdown === null && !isCapturingPhoto && (
                    <div className="camera-loading-overlay">
                      <div className="camera-loading-content">
                        <Loader2 className="h-12 w-12 animate-spin text-white mb-3" />
                        <p className="text-white text-lg font-lora-italic">
                          Preparing camera...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Capturing overlay during retry attempts */}
                  {isCapturingPhoto && !isProcessing && (
                    <div className="camera-loading-overlay">
                      <div className="camera-loading-content">
                        <Loader2 className="h-12 w-12 animate-spin text-white mb-3" />
                        <p className="text-white text-lg font-lora-italic">
                          Capturing photo...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Processing overlay after successful capture */}
                  {isProcessing && (
                    <div className="camera-loading-overlay">
                      <div className="camera-loading-content">
                        <Loader2 className="h-12 w-12 animate-spin text-white mb-3" />
                        <p className="text-white text-lg font-lora-italic">
                          Creating your memory...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Countdown overlay - show immediately after camera starts */}
                  {countdown !== null && !isProcessing && !isCapturingPhoto && (
                    <div className="countdown-overlay">
                      <div className="countdown-text">
                        {countdown}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Static image preview - show composited user photo or default image with badge */
                <div className="celebration-polaroid-wrapper">
                  {/* Caption for selfie captures */}
                  {isSelfieCapture && (
                    <div className="celebration-caption">
                      I crushed my monthly goals!
                    </div>
                  )}
                  
                  <div className="celebration-polaroid-frame">
                    <img
                      src={displayImage}
                      alt="Your celebration selfie"
                      className="celebration-polaroid-image"
                    />
                    
                    {/* Badge overlay - only show on default image, using same overlay as compositing */}
                    {showBadgeOverlay && (
                      <div className="celebration-badge-overlay">
                        <img
                          src={OVERLAY_IMAGE_PATH}
                          alt="I crushed my monthly goals!"
                          className="celebration-badge-image"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Camera error message */}
            {cameraError && (
              <div className="mt-3 p-3 text-sm bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                {cameraError}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 px-6 pb-6 relative z-10">
            {isInSelfiePreview ? (
              /* Show "Save to Memories" and "Retake" buttons after selfie capture */
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="default"
                  onClick={handleSaveToMemories}
                  disabled={isProcessing}
                  className="flex-1 h-12 text-base font-lora-italic bg-[oklch(0.577_0.245_27.325)] hover:bg-[oklch(0.52_0.23_27.325)] text-white disabled:opacity-50"
                >
                  Save to Memories
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="flex-1 h-12 text-base font-lora-italic"
                >
                  Retake
                </Button>
              </div>
            ) : (
              /* Show original buttons before selfie capture */
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="default"
                  onClick={handleTakeSelfie}
                  disabled={isStartingCamera || activeFlowIdRef.current !== null || isProcessing || countdown !== null || isCapturingPhoto}
                  className="flex-1 h-12 text-base font-lora-italic bg-[oklch(0.577_0.245_27.325)] hover:bg-[oklch(0.52_0.23_27.325)] text-white disabled:opacity-50"
                >
                  {isStartingCamera ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Camera...
                    </>
                  ) : (
                    'Take Selfie & Share'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMaybeLater}
                  disabled={isProcessing}
                  className="flex-1 h-12 text-base font-lora-italic"
                >
                  Maybe Later
                </Button>
              </div>
            )}
            
            {/* Upload button - only show when not in selfie preview mode */}
            {!isInSelfiePreview && (
              <Button
                variant="secondary"
                onClick={handleUploadClick}
                disabled={isProcessing}
                className="w-full h-12 text-base font-lora-italic"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo Instead
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        </DialogContent>
      </Dialog>

      {/* Centered notification for save success */}
      <CenteredNotification
        message="Successfully saved! 📸"
        visible={showSaveNotification}
        onDismiss={handleNotificationDismiss}
        duration={5000}
      />
    </>
  );
}
