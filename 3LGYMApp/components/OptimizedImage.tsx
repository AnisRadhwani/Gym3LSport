import React from 'react';
import { StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';

interface OptimizedImageProps {
  source: string | null | undefined;
  style: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: string;
  transition?: number;
  contentPosition?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * OptimizedImage component that uses expo-image with disk caching
 * and automatically optimizes Cloudinary URLs
 */
export default function OptimizedImage({
  source,
  style,
  contentFit = 'cover',
  placeholder = 'https://res.cloudinary.com/dofxydghg/image/upload/f_auto,q_auto/v1/3lgym/placeholder-image',
  transition = 300,
  contentPosition,
  containerStyle,
}: OptimizedImageProps) {
  // Get optimized URL if it's a Cloudinary URL
  const optimizedSource = getOptimizedImageUrl(source) || placeholder;
  
  return (
    <Image
      source={optimizedSource}
      style={style}
      contentFit={contentFit}
      placeholder={placeholder}
      transition={transition}
      contentPosition={contentPosition}
      cachePolicy="disk"
      recyclingKey={optimizedSource}
      containerStyle={containerStyle}
    />
  );
} 