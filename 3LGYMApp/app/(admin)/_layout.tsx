import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/components/ThemeWrapper';
import TextErrorBoundary from '@/components/TextErrorBoundary';

export default function AdminLayout() {
  const { isAdmin, loading } = useUser();
  const { themeStyles, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10, color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading...</Text>
      </View>
    );
  }

  if (!loading && !isAdmin) {
    return <Redirect href="/(user)/home" />;
  }

  return (
    <SafeAreaProvider>
      <TextErrorBoundary>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#3B82F6',
            tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#9CA3AF',
            headerShown: false,
            tabBarStyle: {
              backgroundColor: themeStyles.tabBarBgColor,
              height: 62 + (Platform.OS === 'android' ? insets.bottom : 0),
              paddingBottom: Platform.OS === 'android' ? insets.bottom : 1,
              paddingTop: 1,
              borderTopWidth: 1,
              borderTopColor: themeStyles.tabBarBorderColor,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              marginBottom: Platform.OS === 'ios' ? 0 : 3,
              color: isDark ? '#FFFFFF' : undefined,
            },
            tabBarItemStyle: {
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: 30,
              maxWidth: '25%',
            },
          }}
          safeAreaInsets={{
            bottom: 0 // Let the tabBar handle its own safe area
          }}
        >
          {/* Hide auto-generated index route and inner screens from appearing as tabs, especially on web */}
          <Tabs.Screen
            name="index"
            options={{ href: null }}
          />

          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="events/index"
            options={{
              title: 'Events',
              tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="coaches/index"
            options={{
              title: 'Coaches',
              tabBarIcon: ({ color, size }) => <Feather name="user-check" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="users/index"
            options={{
              title: 'Users',
              tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="categories/index"
            options={{ href: null }}
          />

          {/* Hide add/edit admin routes from the tab bar */}
          <Tabs.Screen
            name="events/add"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="events/edit"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="users/edit"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="coaches/add"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="coaches/edit"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="notifications/send"
            options={{ href: null }}
          />

          <Tabs.Screen
            name="notifications/index"
            options={{
              title: 'Notifications',
              tabBarIcon: ({ color, size }) => <Feather name="bell" size={size} color={color} />,
            }}
          />
          {/* Old profile screen hidden – admins use admin-profile instead */}
          <Tabs.Screen
            name="profile"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="admin-profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
            }}
          />
        </Tabs>
      </TextErrorBoundary>
    </SafeAreaProvider>
  );
}
