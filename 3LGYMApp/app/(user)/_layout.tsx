import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/components/ThemeWrapper';
import TextErrorBoundary from '@/components/TextErrorBoundary';
import { useLanguage } from '@/hooks/useLanguage';

export default function UserLayout() {
  const { themeStyles, isDark } = useTheme();
  const { isAdmin, loading } = useUser();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  // Show loading state while checking user status
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10, color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading...</Text>
      </View>
    );
  }

  // If user is an admin, redirect to admin dashboard
  if (!loading && isAdmin) {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return (
    <SafeAreaProvider>
      <TextErrorBoundary>
        <Tabs
          screenOptions={({ route }) => ({
            tabBarActiveTintColor: '#3B82F6',
            tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#9CA3AF',
            headerShown: false,
            tabBarStyle: route.name === 'coaches/[id]' 
              ? { display: 'none' } 
              : { 
                  backgroundColor: themeStyles.tabBarBgColor,
                  height: 62 + (Platform.OS === 'android' ? insets.bottom : 0),
                  paddingBottom: Platform.OS === 'android' ? insets.bottom : 1,
                  paddingTop: 1,
                  borderTopWidth: 1,
                  borderTopColor: themeStyles.tabBarBorderColor,
                },
            tabBarButton: route.name === 'coaches/[id]' 
              ? () => null 
              : undefined,
            tabBarLabelStyle: {
              fontSize: 10,
              marginBottom: Platform.OS === 'ios' ? 0 : 3,
              width: '100%',
              textAlign: 'center',
              color: isDark ? '#FFFFFF' : undefined,
            },
            tabBarItemStyle: {
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: 45,
              maxWidth: '25%',
            },
          })}
          safeAreaInsets={{
            bottom: 0 // Let the tabBar handle its own safe area
          }}
        >
          {/* Hide any auto-generated index route from the tab bar (web shows it otherwise) */}
          <Tabs.Screen
            name="index"
            options={{
              href: null,
            }}
          />

          <Tabs.Screen
            name="home"
            options={{
              title: t('tabs.home'),
              tabBarIcon: ({ color, size }) => (
                <View style={{ alignItems: 'center', marginBottom: 3 }}>
                  <Feather name="home" size={size} color={color} />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="events/index"
            options={{
              title: t('tabs.events'),
              tabBarIcon: ({ color, size }) => (
                <View style={{ alignItems: 'center', marginBottom: 3 }}>
                  <Feather name="calendar" size={size} color={color} />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="coaches/index"
            options={{
              title: t('tabs.coaches'),
              tabBarIcon: ({ color, size }) => (
                <View style={{ alignItems: 'center', marginBottom: 3 }}>
                  <Feather name="users" size={size} color={color} />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t('tabs.profile'),
              tabBarIcon: ({ color, size }) => (
                <View style={{ alignItems: 'center', marginBottom: 3 }}>
                  <Feather name="user" size={size} color={color} />
                </View>
              ),
            }}
          />
        </Tabs>
      </TextErrorBoundary>
    </SafeAreaProvider>
  );
} 
