import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import tw from '../../../config/tailwind';
import { subscribeToNotifications } from '@/lib/firestoreServices';
import { Notification } from '@/lib/types';
import AdminPageHeader from '@/components/AdminPageHeader';
import { useTheme } from '@/components/ThemeWrapper';
import { useLanguage } from '@/hooks/useLanguage';
import FloatingActionButton from '@/components/FloatingActionButton';
import EmptyState from '@/components/EmptyState';
import { format } from 'date-fns';
import TextErrorBoundary from '@/components/TextErrorBoundary';

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor,
  } = themeStyles;
  
  // Subscribe to notifications
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setLoading(false);
    });
    
    // Clean up subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Format date for notifications
  const formatNotificationDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM dd, yyyy • h:mm a');
    } catch (error) {
      console.error("Error formatting date:", error);
      return t('common.invalidDate');
    }
  };
  
  // Navigate to send notification screen
  const handleSendNotification = () => {
    router.push('/(admin)/notifications/send');
  };
  
  // Render notification item
  const renderNotificationItem = (notification: Notification) => {
    return (
      <View key={notification.id} style={tw`${cardBgColor} p-4 rounded-lg mb-4 shadow-sm`}>
        <View style={tw`flex-row justify-between items-start mb-2`}>
          <Text style={tw`text-lg font-bold ${textColor} flex-1 mr-2`}>{notification.title}</Text>
          <View style={tw`${isDark ? 'bg-gray-700' : 'bg-gray-100'} px-2 py-1 rounded`}>
            <Text style={tw`text-xs ${subtextColor}`}>
              {formatNotificationDate(notification.sentAt)}
            </Text>
          </View>
        </View>
        <Text style={tw`${textColor} mb-2`}>{notification.message}</Text>
        <View style={tw`flex-row items-center mt-2`}>
          <Feather name="users" size={14} color={isDark ? "#9CA3AF" : "#6B7280"} style={tw`mr-1`} />
          <Text style={tw`text-xs ${subtextColor}`}>
            {notification.recipients === 'all' 
              ? t('admin.notifications.sentToAll') 
              : t('admin.notifications.sentToUsers', { count: Array.isArray(notification.recipients) ? notification.recipients.length : 0 })}
          </Text>
        </View>
      </View>
    );
  };
  
  return (
    <TextErrorBoundary>
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <AdminPageHeader 
          title={t('admin.notifications.title')}
          onBack={() => router.push('/(admin)/dashboard')}
        />
        
        {/* Content */}
        {loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={tw`mt-4 ${subtextColor}`}>{t('admin.notifications.loading')}</Text>
          </View>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="bell"
            title={t('admin.notifications.noNotifications')}
            description={t('admin.notifications.noNotificationsSent')}
            actionLabel={t('admin.notifications.sendNotification')}
            onAction={handleSendNotification}
          />
        ) : (
          <ScrollView 
            style={tw`flex-1 px-4 py-2`}
            showsVerticalScrollIndicator={false}
          >
            {notifications.map(renderNotificationItem)}
            <View style={tw`h-20`} />
          </ScrollView>
        )}
        
        {/* Floating Action Button */}
        <FloatingActionButton
          icon="plus"
          onPress={handleSendNotification}
          backgroundColor="bg-blue-500"
        />
      </SafeAreaView>
    </TextErrorBoundary>
  );
}