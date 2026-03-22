import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import tw from '../config/tailwind';

interface FloatingActionButtonProps {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
  position?: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft';
}

export default function FloatingActionButton({
  icon,
  onPress,
  color = 'white',
  backgroundColor = 'bg-blue-500',
  size = 'medium',
  position = 'bottomRight'
}: FloatingActionButtonProps) {
  // Define sizes
  const sizes = {
    small: {
      container: 'w-12 h-12',
      iconSize: 20,
    },
    medium: {
      container: 'w-14 h-14',
      iconSize: 24,
    },
    large: {
      container: 'w-16 h-16',
      iconSize: 28,
    }
  };
  
  // Define positions
  const positions = {
    bottomRight: 'bottom-6 right-6',
    bottomLeft: 'bottom-6 left-6',
    topRight: 'top-6 right-6',
    topLeft: 'top-6 left-6',
  };

  return (
    <TouchableOpacity
      style={tw`absolute ${positions[position]} ${sizes[size].container} rounded-full ${backgroundColor} items-center justify-center shadow-lg elevation-5`}
      onPress={onPress}
    >
      <Feather name={icon} size={sizes[size].iconSize} color={color} />
    </TouchableOpacity>
  );
} 
