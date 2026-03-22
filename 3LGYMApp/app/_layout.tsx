import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React, { useEffect, useState as useReactState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeToAuthChanges } from '@/lib/auth';
import { useColorMode } from '@/hooks/useColorMode';
import { View, Text, LogBox } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { useUser } from '@/hooks/useUser';
import { getDocumentById } from '@/lib/firestore';
import ThemeWrapper from '@/components/ThemeWrapper';
import { ErrorBoundary } from 'react-error-boundary';
import TextErrorBoundary from '@/components/TextErrorBoundary';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import { LanguageProvider } from '@/hooks/useLanguage';
import { processRecurringEvents, checkUpcomingEventNotifications } from '@/lib/firestoreServices';
import { 
  initializeNotifications, 
  setupNotificationListeners 
} from '@/lib/utils/notificationsHelper';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Warning: Text strings must be rendered within a <Text> component',
  'The action \'REPLACE\' with payload',
  'expo-notifications'
]);

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  // Check if it's a text rendering error
  const isTextRenderingError = error.message && error.message.includes('Text strings must be rendered within a <Text>');
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong:</Text>
      <Text style={{ marginBottom: 20, color: 'red' }}>
        {isTextRenderingError 
          ? "Text rendering error. Text must be wrapped in a <Text> component." 
          : error.message}
      </Text>
      <View style={{ backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }} onPress={resetErrorBoundary}>Try again</Text>
      </View>
    </View>
  );
}

const ONBOARDING_KEY = 'onboarding_completed';
const ONBOARDING_PERMANENT_KEY = 'onboarding_permanent_done';

export default function RootLayout() {
  const { colorScheme, isLoading: themeLoading } = useColorMode();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded || themeLoading) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AppErrorBoundary>
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {}}>
        <SafeAreaProvider>
          <ThemeWrapper>
            <LanguageProvider>
              <TextErrorBoundary>
                <AuthProvider>
                  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <RootLayoutNavigation />
                    <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                  </ThemeProvider>
                </AuthProvider>
              </TextErrorBoundary>
            </LanguageProvider>
          </ThemeWrapper>
        </SafeAreaProvider>
      </ErrorBoundary>
    </AppErrorBoundary>
  );
}

// Simple auth context to manage authentication state
import { createContext, useContext, useState } from 'react';

type AuthContextType = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  userId: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isAdmin: false,
  userId: null,
  loading: true,
});

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setLoading(true);
      if (user) {
        setIsLoggedIn(true);
        setUserId(user.uid);
        // Once a user is logged in at least once, ensure onboarding is marked as completed permanently
        try {
          await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
          await AsyncStorage.setItem(ONBOARDING_PERMANENT_KEY, 'true');
        } catch (e) {
          // ignore storage errors
        }
        
        // Fetch user data from Firestore to check admin status
        try {
          const userData = await getDocumentById('users', user.uid);
          // Set admin status based on Firestore data
          setIsAdmin(userData?.isAdmin || false);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setIsAdmin(false);
        }
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUserId(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Process recurring events when the app loads
  useEffect(() => {
    const handleAppStartup = async () => {
      try {
        console.log('Running startup tasks...');
        // Process recurring events
        await processRecurringEvents();
        // Check for upcoming event notifications
        await checkUpcomingEventNotifications();
      } catch (error) {
        console.error('Error during app startup:', error);
      }
    };

    // Set up a periodic task to process recurring events once per day
    const setupPeriodicProcessing = () => {
      // Process immediately on startup
      handleAppStartup();
      
      // Then set up interval to process once per day at midnight
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      // Calculate milliseconds until midnight
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      // First run at midnight
      const midnightTimeout = setTimeout(() => {
        console.log('Running scheduled tasks at midnight...');
        handleAppStartup();
        
        // Then set up daily interval
        const dailyInterval = setInterval(() => {
          console.log('Running daily scheduled tasks...');
          handleAppStartup();
        }, 24 * 60 * 60 * 1000); // 24 hours
        
      }, msUntilMidnight);
      
      // Return cleanup function
      return () => {
        clearTimeout(midnightTimeout);
      };
    };

    // Only process recurring events after authentication is determined
    if (!loading) {
      return setupPeriodicProcessing();
    }
  }, [loading]);

  useEffect(() => {
    if (userId) {
      // Initialize notifications when user is logged in
      const setupUserNotifications = async () => {
        try {
          // Use Expo notifications
          const token = await initializeNotifications(userId);
          if (token) {
            console.log('Successfully initialized notifications with token:', token);
          } else {
            console.warn('Failed to initialize notifications');
          }
        } catch (error) {
          console.error('Error setting up notifications:', error);
        }
      };
      
      setupUserNotifications();

      // Set up notification listeners with handlers
      const cleanupListeners = setupNotificationListeners(
        // Handler for when notification is received while app is in foreground
        (notification) => {
          console.log('Notification received in foreground:', notification);
          // You can update UI, show an alert, or handle the notification data here
        },
        // Handler for when user taps on a notification
        (response) => {
          console.log('User tapped on notification:', response);
          
          // Extract notification data
          const data = response.notification.request.content.data;
          
          // Handle navigation based on notification data
          if (data && data.screen) {
            // Example: Navigate to a specific screen based on notification data
            // router.navigate(data.screen as string, data.params as Record<string, string>);
            console.log('Should navigate to:', data.screen, 'with params:', data.params);
          }
        }
      );

      // Return cleanup function
      return cleanupListeners;
    }
  }, [userId]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, userId, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected route hook
function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { isLoggedIn, isAdmin, loading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useReactState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const [value, permanent] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(ONBOARDING_PERMANENT_KEY),
        ]);
        // Consider onboarding done if either key is true
        setOnboardingCompleted(value === 'true' || permanent === 'true');
      } catch (e) {
        setOnboardingCompleted(false);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    // Only run after navigation is ready and auth state is determined
    if (!navigationState?.key || loading || onboardingCompleted === null) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === 'auth';
    const inAdminGroup = firstSegment === '(admin)';
    const inUserGroup = firstSegment === '(user)';
    const inOnboardingGroup = firstSegment === 'onboarding';
    
    // If onboarding is not completed AND user is not logged in,
    // force them to onboarding (but allow auth routes)
    if (!onboardingCompleted && !isLoggedIn && !inOnboardingGroup && !inAuthGroup) {
      router.replace('/onboarding' as any);
      return;
    }

    if (!isLoggedIn && onboardingCompleted && !inAuthGroup && !inOnboardingGroup) {
      // Redirect to the sign-in page if not logged in and not already in auth group
      router.replace('/auth/sign-in');
    } else if (isLoggedIn && inAuthGroup) {
      // Redirect to the appropriate home page based on user role
      if (isAdmin) {
        router.replace('/(admin)/dashboard');
      } else {
        // Fix: Navigate to the correct user home route
        router.replace('/(user)/home');
      }
    } else if (isLoggedIn && inAdminGroup && !isAdmin) {
      // Redirect non-admin users away from admin routes
      // Fix: Navigate to the correct user home route
      router.replace('/(user)/home');
    }
  }, [isLoggedIn, isAdmin, onboardingCompleted, segments[0], navigationState?.key, loading, router]);

  // Show loading screen while checking auth state
  if (loading || onboardingCompleted === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading...</Text>
      </View>
    );
  }

  return null;
}

function RootLayoutNavigation() {
  // Use our custom hook to handle protected routes
  const loadingScreen = useProtectedRoute();
  if (loadingScreen) return loadingScreen;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      <Stack.Screen name="(user)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
    </Stack>
  );
}
