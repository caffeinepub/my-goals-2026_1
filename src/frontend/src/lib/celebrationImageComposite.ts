/**
 * Client-side image compositing utility for celebration selfies.
 * Combines the captured selfie with a Polaroid frame and overlay badge.
 */

export const OVERLAY_IMAGE_PATH = '/assets/generated/monthly-goals-crushed-overlay.dim_900x260.png';

interface CompositeOptions {
  selfieDataUrl: string;
  polaroidPadding?: number;
  polaroidBottomPadding?: number;
  overlayScale?: number;
}

/**
 * Load an image from a URL and return it as an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Create a composited image with Polaroid frame and overlay badge
 * @param options - Configuration for the composite
 * @returns Promise that resolves to a data URL of the composited image
 */
export async function createCelebrationComposite(
  options: CompositeOptions
): Promise<string> {
  const {
    selfieDataUrl,
    polaroidPadding = 20,
    polaroidBottomPadding = 80,
    overlayScale = 0.85,
  } = options;

  // Load the selfie and overlay images
  const [selfieImg, overlayImg] = await Promise.all([
    loadImage(selfieDataUrl),
    loadImage(OVERLAY_IMAGE_PATH),
  ]);

  // Calculate Polaroid frame dimensions
  const photoWidth = selfieImg.width;
  const photoHeight = selfieImg.height;
  const frameWidth = photoWidth + polaroidPadding * 2;
  const frameHeight = photoHeight + polaroidPadding + polaroidBottomPadding;

  // Create canvas for compositing
  const canvas = document.createElement('canvas');
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw white Polaroid background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, frameWidth, frameHeight);

  // Draw the selfie image
  ctx.drawImage(
    selfieImg,
    polaroidPadding,
    polaroidPadding,
    photoWidth,
    photoHeight
  );

  // Draw the overlay badge
  // Position it at the bottom center, slightly angled
  const overlayWidth = frameWidth * overlayScale;
  const overlayHeight = (overlayImg.height / overlayImg.width) * overlayWidth;
  const overlayX = (frameWidth - overlayWidth) / 2;
  const overlayY = frameHeight - overlayHeight - 15; // 15px from bottom

  // Save context state
  ctx.save();

  // Translate to overlay center for rotation
  const centerX = overlayX + overlayWidth / 2;
  const centerY = overlayY + overlayHeight / 2;
  ctx.translate(centerX, centerY);
  
  // Slight rotation for dynamic look (-2 degrees)
  ctx.rotate(-0.035); // ~-2 degrees in radians
  
  // Draw overlay centered at origin
  ctx.drawImage(
    overlayImg,
    -overlayWidth / 2,
    -overlayHeight / 2,
    overlayWidth,
    overlayHeight
  );

  // Restore context state
  ctx.restore();

  // Convert canvas to data URL
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Convert a File to a data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
