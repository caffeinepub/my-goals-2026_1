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

interface MonthlyCompletionCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
}

const DEFAULT_CELEBRATION_IMAGE = '/assets/generated/celebration-default-selfieGirl.dim_696x609.png';

export default function MonthlyCompletionCelebrationModal({
  open,
  onOpenChange,
  month,
}: MonthlyCompletionCelebrationModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
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
    const sequence = [5, 4, 3, 2, 1];
    let index = 0;

    const runCountdown = () => {
      if (index < sequence.length) {
        setCountdown(sequence[index]);
        index++;
        countdownTimerRef.current = setTimeout(runCountdown, 1000);
      } else {
        // Countdown finished, capture photo immediately
        setCountdown(null);
        handleCapture();
      }
    };

    runCountdown();
  };

  const handleCapture = async () => {
    // Prevent double capture
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;

    const photoFile = await capturePhoto();
    
    if (photoFile) {
      // Stop camera immediately after capture
      await stopCamera();
      
      // Revoke previous URL if it's an object URL
      if (isObjectURL(selectedImage)) {
        URL.revokeObjectURL(selectedImage!);
      }
      
      // Create new blob URL
      const imageUrl = URL.createObjectURL(photoFile);
      setSelectedImage(imageUrl);
      setIsCameraMode(false);
      setCountdown(null);
      setCameraError(null);
    }
    
    isCapturingRef.current = false;
  };

  const handleTakeSelfie = async () => {
    // Clear any previous error
    setCameraError(null);
    setIsStartingCamera(true);
    isCapturingRef.current = false;

    // Check if camera is supported
    if (isSupported === false) {
      setCameraError('Camera is not supported on this device or browser. Please use the "Upload Photo" button below to select a photo from your files.');
      setIsStartingCamera(false);
      return;
    }

    // Try to start camera
    const success = await startCamera();
    
    if (success) {
      setIsCameraMode(true);
      setCameraError(null);
      
      // Wait for preview to be ready before starting countdown
      const previewReady = await waitForPreviewReady();
      
      if (previewReady) {
        // Start countdown after preview is confirmed ready
        setTimeout(() => {
          startCountdown();
        }, 300);
      } else {
        // Preview didn't become ready in time
        setCameraError('Camera preview failed to load. Please try again or use the "Upload Photo" button below.');
        await stopCamera();
        setIsCameraMode(false);
      }
      
      setIsStartingCamera(false);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Revoke previous URL if it's an object URL
      if (isObjectURL(selectedImage)) {
        URL.revokeObjectURL(selectedImage!);
      }
      
      // Create new blob URL
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setCameraError(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Determine which image to display
  const displayImage = selectedImage || DEFAULT_CELEBRATION_IMAGE;

  return (
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
            {isCameraMode && isActive ? (
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
                
                {/* Loading overlay while preview is not ready */}
                {!isPreviewReady && (
                  <div className="camera-loading-overlay">
                    <div className="camera-loading-content">
                      <Loader2 className="h-12 w-12 animate-spin text-white mb-3" />
                      <p className="text-white text-lg font-lora-italic">
                        Preparing camera...
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Countdown overlay - only show when preview is ready */}
                {isPreviewReady && countdown !== null && (
                  <div className="countdown-overlay">
                    <div className="countdown-text">
                      {countdown}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Static image preview - show user photo or default image */
              <img
                src={displayImage}
                alt="Your celebration selfie"
                className="media-preview-image"
              />
            )}
            
            {/* Badge overlay - always visible */}
            <div className="badge-overlay">
              <img
                src="/assets/generated/monthly-goals-badge.dim_900x260.png"
                alt="I crushed my monthly goals!"
                className="badge-image"
              />
            </div>
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              onClick={handleTakeSelfie}
              disabled={isStartingCamera || (isCameraMode && isActive)}
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
              className="flex-1 h-12 text-base font-lora-italic"
            >
              Maybe Later
            </Button>
          </div>
          
          {/* Upload button */}
          <Button
            variant="secondary"
            onClick={handleUploadClick}
            className="w-full h-12 text-base font-lora-italic"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Photo Instead
          </Button>
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
  );
}
