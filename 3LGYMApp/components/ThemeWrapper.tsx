import React, { createContext, useContext } from 'react';
import { useColorMode } from '@/hooks/useColorMode';

// Create a context for theme values
type ThemeContextType = {
  isDark: boolean;
  toggleColorScheme: () => void;
  themeStyles: {
    bgColor: string;
    textColor: string;
    borderColor: string;
    cardBgColor: string;
    iconBgColor: string;
    subtextColor: string;
    tabBarBgColor: string;
    tabBarBorderColor: string;
    inputBgColor: string;
    inputTextColor: string;
  };
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { isDark, toggleColorScheme } = useColorMode();

  // Define theme styles that can be used across the app
  const themeStyles = {
    bgColor: isDark ? 'bg-gray-900' : 'bg-white',
    textColor: isDark ? 'text-white' : 'text-gray-800',
    borderColor: isDark ? 'border-gray-700' : 'border-gray-200',
    cardBgColor: isDark ? 'bg-gray-800' : 'bg-gray-50',
    iconBgColor: isDark ? 'bg-blue-900' : 'bg-blue-100',
    subtextColor: isDark ? 'text-gray-300' : 'text-gray-500',
    tabBarBgColor: isDark ? '#1F2937' : 'white', // For non-tailwind styles
    tabBarBorderColor: isDark ? '#374151' : '#E5E7EB', // For non-tailwind styles
    inputBgColor: isDark ? 'bg-gray-800' : 'bg-white',
    inputTextColor: isDark ? 'text-white' : 'text-gray-800',
  };

  const value = {
    isDark,
    toggleColorScheme,
    themeStyles,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
} 