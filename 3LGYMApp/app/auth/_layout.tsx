import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeWrapper';

export default function AuthLayout() {
  const { isDark, themeStyles } = useTheme();
  
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? '#1F2937' : 'white' },
        }}
      />
    </SafeAreaProvider>
  );
} 
