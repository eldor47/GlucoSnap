import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size: number; // in bytes
}

/**
 * Compresses an image to reduce file size while maintaining quality for AI analysis
 * @param imageUri - The URI of the image to compress
 * @param options - Compression options
 * @returns Compressed image information
 */
export async function compressImage(
  imageUri: string,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  try {
    // First, get the original image dimensions
    const originalImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    // Calculate new dimensions while maintaining aspect ratio
    const { width: originalWidth, height: originalHeight } = originalImage;
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const aspectRatio = originalWidth / originalHeight;
      
      if (originalWidth > originalHeight) {
        newWidth = maxWidth;
        newHeight = Math.round(maxWidth / aspectRatio);
      } else {
        newHeight = maxHeight;
        newWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    // Compress the image
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: newWidth,
            height: newHeight,
          },
        },
      ],
      {
        compress: quality,
        format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : 
                format === 'png' ? ImageManipulator.SaveFormat.PNG :
                ImageManipulator.SaveFormat.WEBP,
      }
    );

    // Get file size (approximate)
    const response = await fetch(result.uri);
    const blob = await response.blob();
    const size = blob.size;

    return {
      uri: result.uri,
      width: newWidth,
      height: newHeight,
      size,
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    // Fallback to original image if compression fails
    throw new Error('Failed to compress image');
  }
}

/**
 * Gets optimal compression settings based on image type and size
 * @param originalSize - Original file size in bytes
 * @param imageType - Type of image (food, document, etc.)
 * @returns Optimal compression options
 */
export function getOptimalCompressionSettings(
  originalSize: number,
  imageType: 'food' | 'document' | 'general' = 'food'
): CompressionOptions {
  const sizeMB = originalSize / (1024 * 1024);
  
  // For food images, we can be more aggressive with compression
  if (imageType === 'food') {
    if (sizeMB > 5) {
      return { maxWidth: 800, maxHeight: 800, quality: 0.7, format: 'jpeg' };
    } else if (sizeMB > 2) {
      return { maxWidth: 1024, maxHeight: 1024, quality: 0.8, format: 'jpeg' };
    } else {
      return { maxWidth: 1024, maxHeight: 1024, quality: 0.9, format: 'jpeg' };
    }
  }
  
  // For general images, be more conservative
  return { maxWidth: 1024, maxHeight: 1024, quality: 0.8, format: 'jpeg' };
}

/**
 * Estimates cost savings from compression
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Cost savings information
 */
export function estimateCostSavings(originalSize: number, compressedSize: number) {
  const originalMB = originalSize / (1024 * 1024);
  const compressedMB = compressedSize / (1024 * 1024);
  const savingsPercent = ((originalSize - compressedSize) / originalSize) * 100;
  
  return {
    originalMB: originalMB.toFixed(2),
    compressedMB: compressedMB.toFixed(2),
    savingsPercent: savingsPercent.toFixed(1),
    savingsMB: (originalMB - compressedMB).toFixed(2),
  };
}
