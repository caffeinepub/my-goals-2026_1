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
}

const DEFAULT_CELEBRATION_IMAGE = '/assets/generated/celebration-default-user-provided.dim_696x609.png';

export default function MonthlyCompletionCelebrationModal({
  open,
  onOpenChange,
  month,
  onMemorySaved,
  onUploadSaveSuccess,
}: MonthlyCompletionCelebrationModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSelfieCapture, setIsSelfieCapture] = useState(false);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef(false);

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

  // Clean up camera and reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Stop camera if active
      if (isActive) {
        stopCamera();
      }
      
      // Clear countdown timer
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }

      // Clean up image URL only if it's an object URL
      if (isObjectURL(selectedImage)) {
        URL.revokeObjectURL(selectedImage!);
      }
      setSelectedImage(null);

      // Reset states
      setIsCameraMode(false);
      setCountdown(null);
      setCameraError(null);
      setIsStartingCamera(false);
      setIsProcessing(false);
      setIsSelfieCapture(false);
      setShowSaveNotification(false);
      isCapturingRef.current = false;

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
    };
  }, []);

  const startCountdown = () => {
    const sequence = [5, 4, 3, 2, 1, 0];
    let index = 0;

    const runCountdown = () => {
      if (index < sequence.length) {
        setCountdown(sequence[index]);
        index++;
        
        // If we just showed 0, capture immediately after showing it briefly
        if (sequence[index - 1] === 0) {
          // Show 0 for 800ms, then capture
          countdownTimerRef.current = setTimeout(() => {
            // Clear countdown display and trigger capture
            setCountdown(null);
            handleCapture();
          }, 800);
        } else {
          countdownTimerRef.current = setTimeout(runCountdown, 1000);
        }
      }
    };

    runCountdown();
  };

  const handleCapture = async () => {
    // Prevent double capture
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    
    // Clear any pending countdown timers to prevent re-triggers
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    try {
      // Capture the photo first (while camera is still active)
      const photoFile = await capturePhoto();
      
      // Stop camera immediately after capture (1ms delay)
      setTimeout(async () => {
        try {
          await stopCamera();
        } catch (stopError) {
          console.error('Failed to stop camera:', stopError);
        }
      }, 1);
      
      // Now process the captured photo
      setIsProcessing(true);
      
      if (photoFile) {
        // Convert photo to data URL
        const selfieDataUrl = await fileToDataUrl(photoFile);
        
        // Create composited image with Polaroid frame and overlay
        const compositedDataUrl = await createCelebrationComposite({
          selfieDataUrl,
        });
        
        // Revoke previous URL if it's an object URL
        if (isObjectURL(selectedImage)) {
          URL.revokeObjectURL(selectedImage!);
        }
        
        // Set the composited image for display (but don't save yet)
        setSelectedImage(compositedDataUrl);
        setIsCameraMode(false);
        setIsSelfieCapture(true);
        setCountdown(null);
        setCameraError(null);

        // DO NOT auto-save - wait for user to click "Save to Memories"
      } else {
        // Capture failed but no exception thrown
        setCameraError('Failed to capture photo. Please try again.');
        setIsCameraMode(false);
      }
    } catch (error) {
      console.error('Failed to capture and composite photo:', error);
      setCameraError('Failed to process photo. Please try again.');
      setIsCameraMode(false);
      
      // Ensure camera is stopped on error
      try {
        await stopCamera();
      } catch (stopError) {
        console.error('Failed to stop camera:', stopError);
      }
    } finally {
      setIsProcessing(false);
      isCapturingRef.current = false;
    }
  };

  const handleSaveToMemories = () => {
    if (!selectedImage) return;

    // Save composited image to localStorage
    saveMonthlyMemory(month as Month, selectedImage);
    
    // Notify parent that memory was saved
    if (onMemorySaved) {
      onMemorySaved(month as Month);
    }

    // Show success notification
    setShowSaveNotification(true);
  };

  const handleRetake = async () => {
    // Clear the current preview
    if (isObjectURL(selectedImage)) {
      URL.revokeObjectURL(selectedImage!);
    }
    setSelectedImage(null);
    setIsSelfieCapture(false);
    setCameraError(null);

    // Restart the camera flow
    await handleTakeSelfie();
  };

  const handleTakeSelfie = async () => {
    // Clear any previous error
    setCameraError(null);
    setIsStartingCamera(true);
    isCapturingRef.current = false;

    // Switch to camera mode immediately (hide static image)
    setIsCameraMode(true);

    // Check if camera is supported
    if (isSupported === false) {
      setCameraError('Camera is not supported on this device or browser. Please use the "Upload Photo" button below to select a photo from your files.');
      setIsStartingCamera(false);
      setIsCameraMode(false);
      return;
    }

    // Try to start camera
    const success = await startCamera();
    
    if (success) {
      setCameraError(null);
      
      // Wait for preview to be ready before starting countdown
      const previewReady = await waitForPreviewReady();
      
      setIsStartingCamera(false);
      
      if (previewReady) {
        // Start countdown only after preview is ready
        startCountdown();
      } else {
        // Preview failed to become ready
        setCameraError('Camera preview failed to load. Please try again or use the "Upload Photo" button below.');
        setIsCameraMode(false);
        await stopCamera();
      }
    } else {
      // Camera failed - show error message based on error type
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
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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

        // Close modal and trigger upload success notification
        onOpenChange(false);
        if (onUploadSaveSuccess) {
          onUploadSaveSuccess();
        }
      } catch (error) {
        console.error('Failed to process uploaded photo:', error);
        setCameraError('Failed to process photo. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClose = () => {
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
                  {(isStartingCamera || !isPreviewReady) && countdown === null && (
                    <div className="camera-loading-overlay">
                      <div className="camera-loading-content">
                        <Loader2 className="h-12 w-12 animate-spin text-white mb-3" />
                        <p className="text-white text-lg font-lora-italic">
                          Preparing camera...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Processing overlay after capture */}
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
                  {countdown !== null && !isProcessing && (
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
                  disabled={isStartingCamera || (isCameraMode && isActive) || isProcessing}
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
                  onClick={handleClose}
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
        onDismiss={() => setShowSaveNotification(false)}
        duration={5000}
      />
    </>
  );
}
