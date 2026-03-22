import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import tw from '../../../config/tailwind';
import { sendNotification, getUsers, getCategories } from '@/lib/firestoreServices';
import { User, Category } from '@/lib/types';
import AdminPageHeader from '@/components/AdminPageHeader';
import { useTheme } from '@/components/ThemeWrapper';
import { useLanguage } from '@/hooks/useLanguage';
import { sendBulkPushNotifications } from '@/lib/utils/notificationsHelper';

export default function SendNotificationScreen() {
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [targetAll, setTargetAll] = useState(true);
  const [targetExpiring, setTargetExpiring] = useState(false);
  const [targetExpired, setTargetExpired] = useState(false);
  const [targetByCategory, setTargetByCategory] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor,
    inputBgColor
  } = themeStyles;
  
  const characterLimit = 240;
  const remainingCharacters = characterLimit - message.length;
  
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [usersData, categoriesData] = await Promise.all([getUsers(), getCategories()]);
        setUsers(usersData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading data:', error);
        Alert.alert(t('common.error'), t('admin.notifications.loadUsersError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const usersInSelectedCategories = () => {
    if (selectedCategoryIds.length === 0) return [];
    const set = new Set<string>();
    users.forEach((user) => {
      const ids = user.categoryIds ?? [];
      if (selectedCategoryIds.some((id) => ids.includes(id))) set.add(user.id);
    });
    return Array.from(set);
  };
  
  const getRecipientCount = () => {
    if (targetByCategory && selectedCategoryIds.length > 0) {
      return usersInSelectedCategories().length;
    }
    if (targetAll) {
      return users.length;
    }
    let count = 0;
    if (targetExpiring) {
      count += users.filter(user => user.membershipDaysLeft > 0 && user.membershipDaysLeft <= 7).length;
    }
    if (targetExpired) {
      count += users.filter(user => user.membershipDaysLeft <= 0).length;
    }
    return count;
  };
  
  const getRecipientIds = (): string[] | 'all' => {
    if (targetByCategory && selectedCategoryIds.length > 0) {
      return usersInSelectedCategories();
    }
    if (targetAll) {
      return 'all';
    }
    let recipientIds: string[] = [];
    if (targetExpiring) {
      recipientIds = [
        ...recipientIds,
        ...users.filter(user => user.membershipDaysLeft > 0 && user.membershipDaysLeft <= 7).map(user => user.id)
      ];
    }
    if (targetExpired) {
      recipientIds = [
        ...recipientIds,
        ...users.filter(user => user.membershipDaysLeft <= 0).map(user => user.id)
      ];
    }
    return recipientIds;
  };

  const handleSendNotification = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('admin.notifications.enterTitle'));
      return;
    }

    if (!message.trim()) {
      Alert.alert(t('common.error'), t('admin.notifications.enterMessage'));
      return;
    }
    
    const recipientCount = getRecipientCount();
    if (recipientCount === 0) {
      Alert.alert(t('common.error'), t('admin.notifications.noRecipients'));
      return;
    }

    try {
      setSending(true);
      
      const count = getRecipientCount();
      if (count > 20) {
        Alert.alert(
          t('admin.notifications.confirmSend'),
          t('admin.notifications.confirmSendMessage', { count: String(count) }),
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => setSending(false) },
            { text: t('admin.notifications.sendNotification'), onPress: async () => { await sendNotificationToUsers(); } },
          ]
        );
      } else {
        await sendNotificationToUsers();
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert(t('common.error'), t('admin.notifications.sendError'));
      setSending(false);
    }
  };
  
  const sendNotificationToUsers = async () => {
    try {
      const recipients = getRecipientIds();
      
      console.log('Starting notification send process...');
      console.log('Recipients:', recipients);
      console.log('Total users:', users.length);
      
      // Send notification to Firestore for record-keeping
      await sendNotification({
        title: title.trim(),
        message: message.trim(),
        sentBy: 'admin', // This would be the actual admin's ID in a real app
        recipients: recipients
      });

      console.log('Notification saved to Firestore successfully');

      // Get all user tokens based on targeting
      let userTokens: string[] = [];
      
      if (recipients === 'all') {
        // If targeting all users, get tokens for all users
        userTokens = users
          .filter(user => user.pushToken)
          .map(user => user.pushToken as string);
      } else {
        // If targeting specific users, get their tokens
        userTokens = users
          .filter(user => recipients.includes(user.id) && user.pushToken)
          .map(user => user.pushToken as string);
      }
      
      console.log(`📱 Found ${userTokens.length} users with push tokens`);
      console.log('📱 Sample tokens:', userTokens.slice(0, 3).map(t => t.substring(0, 30) + '...'));
      
      if (userTokens.length === 0) {
        Alert.alert(t('admin.notifications.warning'), t('admin.notifications.noPushTokens'));
        setSending(false);
        return;
      }

      // Send push notifications using our helper function
      console.log('Sending push notifications...');
      const result = await sendBulkPushNotifications(
        userTokens,
        title.trim(),
        message.trim(),
        { type: 'admin_notification' }
      );
          
      console.log('Push notification result:', result);

      if (result.success) {
        const message = result.failed > 0
          ? t('admin.notifications.sendSuccessSomeFailed', { sent: String(result.sent), failed: String(result.failed) })
          : t('admin.notifications.sendSuccess', { sent: String(result.sent) });
        Alert.alert(
          t('common.success'),
          message,
          [{ text: t('common.ok'), onPress: () => router.push('/(admin)/notifications') }]
        );
      } else {
        console.error('Push notification failed:', result);
        const errorMessage = result.message || result.errors?.map(e => e.error).join(', ') || 'Unknown error';
        throw new Error(`Failed to send notifications: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert(t('common.error'), t('admin.notifications.sendError'));
    } finally {
      setSending(false);
    }
  };

  // Toggle targeting options
  const toggleCategoryForNotification = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleToggleAll = (value: boolean) => {
    setTargetAll(value);
    if (value) {
      setTargetExpiring(false);
      setTargetExpired(false);
      setTargetByCategory(false);
      setSelectedCategoryIds([]);
    }
  };
  
  const handleToggleExpiring = (value: boolean) => {
    setTargetExpiring(value);
    if (value) setTargetAll(false);
    if (!value && !targetExpired && !targetByCategory) setTargetAll(true);
  };
  
  const handleToggleExpired = (value: boolean) => {
    setTargetExpired(value);
    if (value) setTargetAll(false);
    if (!value && !targetExpiring && !targetByCategory) setTargetAll(true);
  };

  const handleToggleByCategory = (value: boolean) => {
    setTargetByCategory(value);
    if (value) {
      setTargetAll(false);
    } else {
      setSelectedCategoryIds([]);
      if (!targetExpiring && !targetExpired) setTargetAll(true);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 ${bgColor}`}
    >
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <AdminPageHeader 
          title={t('admin.notifications.sendNotification')} 
          onBack={() => router.push('/(admin)/notifications')}
        />
        
        <ScrollView 
          style={tw`flex-1`} 
          contentContainerStyle={tw`p-5 pb-10`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Card Container */}
          <View style={tw`${cardBgColor} p-5 rounded-xl shadow-sm mb-6`}>
            <View style={tw`mb-5`}>
              <Text style={tw`text-base mb-2 font-medium ${textColor}`}>{t('admin.notifications.notificationTitle')}</Text>
              <TextInput
                style={tw`border ${borderColor} rounded-lg px-4 py-3.5 ${inputBgColor} ${textColor} text-base`}
                placeholder={t('admin.notifications.notificationTitlePlaceholder')}
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-base mb-2 font-medium ${textColor}`}>{t('admin.notifications.message')}</Text>
              <TextInput
                style={tw`border ${borderColor} rounded-lg px-4 py-3.5 ${inputBgColor} ${textColor} text-base min-h-[120px]`}
                placeholder={t('admin.notifications.messagePlaceholder')}
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={characterLimit}
                textAlignVertical="top"
              />
              <Text style={tw`text-sm mt-2 ${subtextColor}`}>
                {t('admin.notifications.charactersRemaining', { count: String(remainingCharacters) })}
              </Text>
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-base mb-3 font-medium ${textColor}`}>{t('admin.notifications.sendTo')}</Text>
              
              <View style={tw`mb-3`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Text style={tw`${textColor}`}>{t('admin.notifications.allMembers')}</Text>
                  <Switch
                    value={targetAll}
                    onValueChange={handleToggleAll}
                    trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#3B82F6' }}
                    thumbColor={isDark ? '#fff' : '#fff'}
                  />
                </View>
              </View>
              
              <View style={tw`mb-3`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Text style={tw`${textColor}`}>{t('admin.notifications.expiringMemberships')}</Text>
                  <Switch
                    value={targetExpiring}
                    onValueChange={handleToggleExpiring}
                    trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#3B82F6' }}
                    thumbColor={isDark ? '#fff' : '#fff'}
                  />
                </View>
              </View>
              
              <View style={tw`mb-3`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Text style={tw`${textColor}`}>{t('admin.notifications.expiredMemberships')}</Text>
                  <Switch
                    value={targetExpired}
                    onValueChange={handleToggleExpired}
                    trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#3B82F6' }}
                    thumbColor={isDark ? '#fff' : '#fff'}
                  />
                </View>
              </View>

              <View style={tw`mb-3`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Text style={tw`${textColor}`}>{t('admin.notifications.byCategory')}</Text>
                  <Switch
                    value={targetByCategory}
                    onValueChange={handleToggleByCategory}
                    trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#3B82F6' }}
                    thumbColor={isDark ? '#fff' : '#fff'}
                  />
                </View>
                {targetByCategory && (
                  <View style={tw`flex-row flex-wrap gap-2 mt-2`}>
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={tw`px-3 py-2 rounded-full ${isSelected ? 'bg-blue-500' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                          onPress={() => toggleCategoryForNotification(cat.id)}
                        >
                          <Text style={tw`font-medium ${isSelected ? 'text-white' : textColor}`}>{cat.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {categories.length === 0 && (
                      <Text style={tw`${subtextColor} text-sm`}>{t('admin.categories.noCategories')}</Text>
                    )}
                  </View>
                )}
              </View>
              
              <View style={tw`mt-4 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <Text style={tw`${subtextColor} text-sm`}>
                  {loading ? t('admin.notifications.calculatingRecipients') : t('admin.notifications.willBeSentTo', { count: String(getRecipientCount()) })}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={tw`${isDark ? 'bg-blue-600 active:bg-blue-700' : 'bg-blue-500 active:bg-blue-600'} py-4 rounded-xl shadow-sm`}
            onPress={handleSendNotification}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={tw`text-white text-center font-semibold text-lg`}>
                {t('admin.notifications.sendNotification')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
} 