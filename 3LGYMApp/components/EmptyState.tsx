import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import tw from '../config/tailwind';

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  iconColor = '#CBD5E1'
}: EmptyStateProps) {
  return (
    <View style={tw`flex-1 justify-center items-center p-6 bg-white rounded-xl shadow-sm mx-4 my-6`}>
      <View style={tw`w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4`}>
        <Feather name={icon} size={32} color={iconColor} />
      </View>
      
      <Text style={tw`text-xl font-bold text-center text-gray-800 mb-2`}>{title}</Text>
      
      {description && (
        <Text style={tw`text-gray-500 text-center mb-6`}>{description}</Text>
      )}
      
      {actionLabel && onAction && (
        <TouchableOpacity
          style={tw`bg-blue-500 py-3 px-6 rounded-lg`}
          onPress={onAction}
        >
          <Text style={tw`text-white font-medium`}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
} 
