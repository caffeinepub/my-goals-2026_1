/**
 * Utility functions for sharing Monthly Memory images via Web Share API
 * with fallback to download and social media share links.
 */

export interface ShareData {
  imageDataUrl: string;
  month: string;
  title?: string;
  text?: string;
}

export interface ShareResult {
  success: boolean;
  method: 'web-share' | 'download' | 'link' | 'error';
  error?: string;
}

/**
 * Convert data URL to Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Convert Blob to File
 */
function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: new Date().getTime(),
  });
}

/**
 * Check if Web Share API with files is supported
 */
export function isWebShareSupported(): boolean {
  return 'canShare' in navigator && 'share' in navigator;
}

/**
 * Attempt to share image using Web Share API
 */
export async function shareViaWebShare(data: ShareData): Promise<ShareResult> {
  try {
    if (!isWebShareSupported()) {
      return {
        success: false,
        method: 'error',
        error: 'Web Share API not supported',
      };
    }

    const blob = await dataUrlToBlob(data.imageDataUrl);
    const file = blobToFile(blob, `${data.month}-memory.jpg`);

    const shareData = {
      files: [file],
      title: data.title || `${data.month} Monthly Memory`,
      text: data.text || `Check out my ${data.month} achievement! 🎉`,
    };

    // Check if the data can be shared
    if (!navigator.canShare(shareData)) {
      return {
        success: false,
        method: 'error',
        error: 'Cannot share this data',
      };
    }

    await navigator.share(shareData);

    return {
      success: true,
      method: 'web-share',
    };
  } catch (error) {
    // User cancelled or error occurred
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        method: 'error',
        error: 'Share cancelled',
      };
    }

    return {
      success: false,
      method: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download image as fallback
 */
export async function downloadImage(data: ShareData): Promise<ShareResult> {
  try {
    const blob = await dataUrlToBlob(data.imageDataUrl);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.month}-memory.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      method: 'download',
    };
  } catch (error) {
    return {
      success: false,
      method: 'error',
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Generate Twitter share URL
 */
export function getTwitterShareUrl(data: ShareData): string {
  const text = encodeURIComponent(
    data.text || `Check out my ${data.month} achievement! 🎉`
  );
  return `https://twitter.com/intent/tweet?text=${text}`;
}

/**
 * Generate Facebook share URL
 */
export function getFacebookShareUrl(): string {
  const url = encodeURIComponent(window.location.href);
  return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
}

/**
 * Copy share text to clipboard
 */
export async function copyShareText(data: ShareData): Promise<boolean> {
  try {
    const text = data.text || `Check out my ${data.month} achievement! 🎉`;
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}
