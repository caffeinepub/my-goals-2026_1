import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface MonthlyCompletionCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
}

export default function MonthlyCompletionCelebrationModal({
  open,
  onOpenChange,
  month,
}: MonthlyCompletionCelebrationModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  // Reset image when modal closes or opens
  useEffect(() => {
    if (!open) {
      // Clean up when closing
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open, selectedImage]);

  const handleTakeSelfie = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Revoke previous URL if exists
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
      
      // Create new blob URL
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

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
            <img
              src={selectedImage || '/assets/generated/celebration-default-photo.dim_900x700.png'}
              alt={selectedImage ? 'Your celebration selfie' : 'Celebration photo'}
              className="media-preview-image"
            />
            
            {/* Badge overlay */}
            <div className="badge-overlay">
              <img
                src="/assets/generated/monthly-goals-badge.dim_900x260.png"
                alt="I crushed my monthly goals!"
                className="badge-image"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 px-6 pb-6 relative z-10">
          <Button
            variant="default"
            onClick={handleTakeSelfie}
            className="flex-1 h-12 text-base font-lora-italic bg-[oklch(0.577_0.245_27.325)] hover:bg-[oklch(0.52_0.23_27.325)] text-white"
          >
            Take Selfie & Share
          </Button>
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-12 text-base font-lora-italic"
          >
            Maybe Later
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      </DialogContent>
    </Dialog>
  );
}
