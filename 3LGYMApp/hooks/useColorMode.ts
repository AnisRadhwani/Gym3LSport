import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';

const COLOR_SCHEME_KEY = '@color_scheme';

export function useColorMode() {
  const systemColorScheme = useSystemColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved color scheme from AsyncStorage
  useEffect(() => {
    const loadColorScheme = async () => {
      try {
        const savedColorScheme = await AsyncStorage.getItem(COLOR_SCHEME_KEY);
        if (savedColorScheme) {
          setColorScheme(savedColorScheme as ColorScheme);
        } else {
          // If no saved preference, use system preference
          setColorScheme(systemColorScheme as ColorScheme || 'light');
        }
      } catch (error) {
        console.error('Failed to load color scheme', error);
        setColorScheme(systemColorScheme as ColorScheme || 'light');
      } finally {
        setIsLoading(false);
      }
    };

    loadColorScheme();
  }, [systemColorScheme]);

  // Save color scheme to AsyncStorage whenever it changes
  const setColorSchemeWithStorage = async (newColorScheme: ColorScheme) => {
    try {
      await AsyncStorage.setItem(COLOR_SCHEME_KEY, newColorScheme);
      setColorScheme(newColorScheme);
    } catch (error) {
      console.error('Failed to save color scheme', error);
    }
  };

  // Toggle between light and dark mode
  const toggleColorScheme = () => {
    const newColorScheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorSchemeWithStorage(newColorScheme);
  };

  return {
    colorScheme: colorScheme || 'light',
    isDark: colorScheme === 'dark',
    isLight: colorScheme === 'light',
    toggleColorScheme,
    setColorScheme: setColorSchemeWithStorage,
    isLoading,
  };
} 