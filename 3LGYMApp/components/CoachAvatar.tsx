import React from 'react';
import { View, Text } from 'react-native';
import tw from '../config/tailwind';
import OptimizedImage from './OptimizedImage';

interface CoachAvatarProps {
  name: string;
  photoURL?: string;
  specialty?: string;
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
  isAvailable?: boolean;
  isDark?: boolean;
}

export default function CoachAvatar({
  name,
  photoURL,
  specialty,
  size = 'medium',
  showStatus = false,
  isAvailable = false,
  isDark = false
}: CoachAvatarProps) {
  // Determine avatar size
  const sizes = {
    small: {
      container: 'w-10 h-10',
      statusDot: 'w-2.5 h-2.5',
    },
    medium: {
      container: 'w-14 h-14',
      statusDot: 'w-3 h-3',
    },
    large: {
      container: 'w-20 h-20',
      statusDot: 'w-4 h-4',
    }
  };

  // Default placeholder image if photoURL is not available
  const defaultImage = 'https://via.placeholder.com/150?text=' + name.substring(0, 1);

  return (
    <View style={tw`items-center`}>
      <View style={tw`relative`}>
        <OptimizedImage
          source={photoURL || defaultImage}
          style={tw`${sizes[size].container} rounded-full bg-gray-200`}
          contentFit="cover"
        />
        
        {showStatus && (
          <View 
            style={tw`absolute bottom-0 right-0 ${sizes[size].statusDot} rounded-full border-2 ${isDark ? 'border-gray-800' : 'border-white'} ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}
          />
        )}
      </View>
      
      {specialty && (
        <View style={tw`mt-1`}>
          <Text style={tw`text-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{specialty}</Text>
        </View>
      )}
    </View>
  );
} 
