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
import { toast } from 'sonner';
import { useCelebrationCamera } from '@/hooks/useCelebrationCamera';
import { saveMonthlyMemory } from '@/lib/monthlyMemoryStorage';
import { createCelebrationComposite, fileToDataUrl, OVERLAY_IMAGE_PATH } from '@/lib/celebrationImageComposite';
import { type Month } from '@/lib/months';

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
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef(false);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

    // Close the modal immediately
    onOpenChange(false);

    // Show toast notification for 3 seconds
    toast.success('Memory saved successfully!', {
      duration: 3000,
    });
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

    // Start camera
    try {
      const success = await startCamera();
      
      if (!success) {
        console.error('[Modal] Failed to start camera');
        setIsStartingCamera(false);
        setCameraError('Failed to start camera. Please check permissions and try again.');
        return;
      }

      console.log('[Modal] Camera started, waiting for preview to be ready...');
      
      // Wait for preview to be ready (no timeout parameter - uses internal 5s timeout)
      const previewReady = await waitForPreviewReady();
      
      if (!previewReady) {
        console.error('[Modal] Camera preview not ready after timeout');
        setIsStartingCamera(false);
        await stopCamera();
        setCameraError('Camera preview timed out. Please try again.');
        return;
      }

      console.log('[Modal] Camera preview ready, entering camera mode');
      setIsStartingCamera(false);
      setIsCameraMode(true);
      
      // Start countdown after a brief delay to ensure UI is stable
      setTimeout(() => {
        startCountdown();
      }, 500);
      
    } catch (err) {
      console.error('[Modal] Error starting camera:', err);
      setIsStartingCamera(false);
      setCameraError(`Failed to start camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('[Modal] File selected for upload:', file.name);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setCameraError('Please select a valid image file.');
      return;
    }

    setIsProcessing(true);
    setCameraError(null);

    try {
      // Convert uploaded file to data URL
      const uploadedDataUrl = await fileToDataUrl(file);
      console.log('[Modal] Converted uploaded file to data URL');

      // Attempt to create composited image with Polaroid frame and overlay
      let finalImageUrl: string;
      try {
        console.log('[Modal] Attempting to create celebration composite from upload...');
        finalImageUrl = await createCelebrationComposite({
          selfieDataUrl: uploadedDataUrl,
        });
        console.log('[Modal] Composite created successfully from upload');
      } catch (compositeError) {
        // Compositing failed - fall back to raw upload
        console.error('[Modal] Compositing failed for upload, falling back to raw image:', compositeError);
        finalImageUrl = uploadedDataUrl;
      }

      // Revoke previous URL if it's an object URL
      if (isObjectURL(selectedImage)) {
        URL.revokeObjectURL(selectedImage!);
      }

      // Set the final image for display
      setSelectedImage(finalImageUrl);
      setIsSelfieCapture(false); // Mark as uploaded, not selfie
      
      // Notify parent if callback provided
      if (onUploadSaveSuccess) {
        onUploadSaveSuccess();
      }

      console.log('[Modal] Upload processed successfully');
    } catch (err) {
      console.error('[Modal] Error processing uploaded file:', err);
      setCameraError(`Failed to process image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaybeLater = () => {
    console.log('[Modal] Maybe Later clicked');
    
    // Close the modal
    onOpenChange(false);
    
    // Notify parent if callback provided
    if (onMaybeLater) {
      onMaybeLater(month as Month);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="celebration-modal max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center mb-2">
            🎉 Congratulations! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            You've completed all your goals for {month}!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Camera Error Display */}
          {cameraError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
              {cameraError}
            </div>
          )}

          {/* Camera Mode - Active Capture */}
          {isCameraMode && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                {/* Video Preview */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* Countdown Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="celebration-countdown text-white text-9xl font-bold">
                      {countdown === 0 ? '📸' : countdown}
                    </div>
                  </div>
                )}

                {/* Capturing Overlay */}
                {isCapturingPhoto && countdown === null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="text-white text-2xl font-semibold flex items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      Capturing...
                    </div>
                  </div>
                )}

                {/* Canvas for capture (hidden) */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {countdown !== null ? 'Get ready!' : isCapturingPhoto ? 'Hold still...' : 'Smile!'}
              </div>
            </div>
          )}

          {/* Starting Camera State */}
          {isStartingCamera && !isCameraMode && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">Starting camera...</p>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && !isCameraMode && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">Processing your photo...</p>
            </div>
          )}

          {/* Image Preview (after capture or upload) */}
          {selectedImage && !isCameraMode && !isProcessing && (
            <div className="space-y-4">
              <div className="celebration-polaroid-frame mx-auto">
                <img
                  src={selectedImage}
                  alt="Monthly completion memory"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex gap-3 justify-center">
                {isSelfieCapture && (
                  <Button
                    variant="outline"
                    onClick={handleRetake}
                    disabled={isStartingCamera || isProcessing}
                  >
                    Retake Photo
                  </Button>
                )}
                <Button
                  onClick={handleSaveToMemories}
                  disabled={isProcessing}
                  className="min-w-[160px]"
                >
                  Save to Memories
                </Button>
              </div>
            </div>
          )}

          {/* Initial State - No Image Selected */}
          {!selectedImage && !isCameraMode && !isStartingCamera && !isProcessing && (
            <div className="space-y-6">
              {/* Hero Image */}
              <div className="relative aspect-[3/2] rounded-lg overflow-hidden">
                <img
                  src="/assets/generated/celebration-hero.dim_900x600.png"
                  alt="Celebration"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleTakeSelfie}
                  disabled={isSupported === false || isStartingCamera}
                  className="w-full"
                  size="lg"
                >
                  {isStartingCamera ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Starting Camera...
                    </>
                  ) : (
                    'Take a Selfie'
                  )}
                </Button>

                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Photo
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={handleMaybeLater}
                  className="w-full"
                  size="lg"
                >
                  Maybe Later
                </Button>
              </div>

              {isSupported === false && (
                <p className="text-sm text-destructive text-center">
                  Camera is not supported on this device. Please use the upload option.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
