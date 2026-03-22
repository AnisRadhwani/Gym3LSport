import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import tw from '../config/tailwind';
import { useTheme } from './ThemeWrapper';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  containerStyle?: string;
}

export default function SearchInput({ 
  value, 
  onChangeText, 
  placeholder = 'Search...', 
  containerStyle = ''
}: SearchInputProps) {
  const { isDark, themeStyles } = useTheme();
  const { bgColor, textColor, borderColor, cardBgColor, subtextColor } = themeStyles;

  return (
    <View style={tw`${containerStyle}`}>
      <View style={tw`flex-row ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg px-3 py-2.5 items-center border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
        <Feather name="search" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
        <TextInput
          style={tw`flex-1 ml-2 text-base ${textColor}`}
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
          value={value}
          onChangeText={onChangeText}
        />
        {value ? (
          <TouchableOpacity 
            style={tw`${isDark ? 'bg-gray-600 active:bg-gray-500' : 'bg-gray-200 active:bg-gray-300'} rounded-full p-1`}
            onPress={() => onChangeText('')}
          >
            <Feather name="x" size={16} color={isDark ? "#D1D5DB" : "#4B5563"} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
} 
