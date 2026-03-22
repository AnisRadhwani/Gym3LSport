import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import tw from '../config/tailwind';
import { useTheme } from './ThemeWrapper';

interface ActionButton {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
}

interface AdminPageHeaderProps {
  title: string;
  onBack?: () => void;
  actions?: ActionButton[];
}

export default function AdminPageHeader({ 
  title, 
  onBack, 
  actions = []
}: AdminPageHeaderProps) {
  const { isDark, themeStyles } = useTheme();
  const { bgColor, textColor, borderColor } = themeStyles;

  return (
    <View style={tw`${isDark ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'} px-4 py-5 border-b shadow-sm`}>
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          {onBack && (
            <TouchableOpacity 
              style={tw`mr-3 rounded-full p-2 ${isDark ? 'bg-gray-700 active:bg-gray-600' : 'bg-gray-100 active:bg-gray-200'}`}
              onPress={onBack}
            >
              <Feather name="arrow-left" size={20} color={isDark ? "#fff" : "#000"} />
            </TouchableOpacity>
          )}
          <Text style={tw`text-xl font-bold ${textColor}`}>{title}</Text>
        </View>
        
        {actions && actions.length > 0 && (
          <View style={tw`flex-row items-center`}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={`${action.icon}-${index}`}
                style={tw`ml-3 rounded-full p-2 ${action.backgroundColor || (isDark ? 'bg-blue-600 active:bg-blue-700' : 'bg-blue-500 active:bg-blue-600')}`}
                onPress={action.onPress}
              >
                <Feather 
                  name={action.icon} 
                  size={18} 
                  color={action.color || 'white'}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
} 
