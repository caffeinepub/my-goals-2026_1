import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Share2, Download } from 'lucide-react';
import { SiInstagram, SiX, SiFacebook } from 'react-icons/si';
import {
  shareViaWebShare,
  downloadImage,
  getTwitterShareUrl,
  getFacebookShareUrl,
  copyShareText,
  isWebShareSupported,
  type ShareData,
} from '@/lib/monthlyMemoryShare';
import { toast } from 'sonner';

interface MonthlyMemoryShareActionsProps {
  imageDataUrl: string;
  month: string;
}

export default function MonthlyMemoryShareActions({
  imageDataUrl,
  month,
}: MonthlyMemoryShareActionsProps) {
  const [isSharing, setIsSharing] = useState(false);
  const webShareSupported = isWebShareSupported();

  const shareData: ShareData = {
    imageDataUrl,
    month,
    title: `${month} Monthly Memory`,
    text: `I crushed my monthly goals in ${month}! 🎉`,
  };

  const handleWebShare = async () => {
    setIsSharing(true);
    try {
      const result = await shareViaWebShare(shareData);
      if (result.success) {
        toast.success('Shared successfully!');
      } else if (result.error !== 'Share cancelled') {
        toast.error(result.error || 'Failed to share');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    setIsSharing(true);
    try {
      const result = await downloadImage(shareData);
      if (result.success) {
        toast.success('Image downloaded! You can now share it manually.');
      } else {
        toast.error(result.error || 'Failed to download');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleInstagram = async () => {
    // Instagram doesn't support direct web sharing, so download + copy text
    setIsSharing(true);
    try {
      const downloadResult = await downloadImage(shareData);
      if (downloadResult.success) {
        const copied = await copyShareText(shareData);
        if (copied) {
          toast.success(
            'Image downloaded and caption copied! Open Instagram to share.'
          );
        } else {
          toast.success('Image downloaded! Open Instagram to share.');
        }
      } else {
        toast.error('Failed to download image');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleTwitter = () => {
    const url = getTwitterShareUrl(shareData);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.info('Download the image first, then attach it to your tweet!');
  };

  const handleFacebook = () => {
    const url = getFacebookShareUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.info('Download the image first, then attach it to your post!');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          disabled={isSharing}
          className="gap-2"
          aria-label="Share to Social Media"
        >
          <Share2 className="h-4 w-4" />
          Share to Social Media
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {webShareSupported && (
          <>
            <DropdownMenuItem
              onClick={handleWebShare}
              disabled={isSharing}
              className="gap-2 cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              Share via System
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem
          onClick={handleInstagram}
          disabled={isSharing}
          className="gap-2 cursor-pointer"
        >
          <SiInstagram className="h-4 w-4" />
          Instagram
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleTwitter}
          disabled={isSharing}
          className="gap-2 cursor-pointer"
        >
          <SiX className="h-4 w-4" />
          Twitter
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleFacebook}
          disabled={isSharing}
          className="gap-2 cursor-pointer"
        >
          <SiFacebook className="h-4 w-4" />
          Facebook
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleDownload}
          disabled={isSharing}
          className="gap-2 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Download Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
