import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Switch, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import tw from '../../config/tailwind';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/components/ThemeWrapper';
import { logOut } from '@/lib/auth';
import { subscribeToNotifications, updateUser, getCategories } from '@/lib/firestoreServices';
import { Notification, Category } from '@/lib/types';
import { format } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import TextErrorBoundary from '@/components/TextErrorBoundary';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '@/lib/utils/cloudinary';
import OptimizedImage from '@/components/OptimizedImage';

export default function ProfileScreen() {
  const router = useRouter();
  const { userProfile, loading } = useUser();
  const { isDark, toggleColorScheme, themeStyles } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNotes, setShowNotes] = useState(false);

  // Subscribe to notifications
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setNotificationsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load categories for display (read-only)
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Format date for notifications
  const formatNotificationDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM dd, yyyy • h:mm a');
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  // Handle logout
  const handleLogout = () => {
    // On web, Alert with custom buttons is not supported the same way,
    // so log out directly without confirmation dialog.
    if (Platform.OS === 'web') {
      (async () => {
        const { error } = await logOut();
        if (!error) {
          router.replace('/auth/sign-in');
        } else {
          Alert.alert(t('common.error'), "Failed to logout. Please try again.");
        }
      })();
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: "cancel"
        },
        { 
          text: t('profile.logout'), 
          onPress: async () => {
            const { error } = await logOut();
            if (!error) {
              router.replace('/auth/sign-in');
            } else {
              Alert.alert(t('common.error'), "Failed to logout. Please try again.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // Toggle language
  const toggleLanguage = () => {
    if (language === 'en') {
      setLanguage('fr');
    } else if (language === 'fr') {
      setLanguage('ar');
    } else {
      setLanguage('en');
    }
  };

  // Handle profile image edit
  const handleEditProfileImage = async () => {
    console.log('Edit profile image button pressed');
    console.log('User profile:', userProfile ? JSON.stringify(userProfile) : 'null');
    
    if (!userProfile?.id) {
      console.error('User profile ID is missing');
      Alert.alert(t('common.error'), t('profile.loginRequired'));
      return;
    }

    try {
      // Request permission to access the photo library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('profile.permissionDenied'));
        return;
      }

      // Launch image picker
      console.log('Launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      console.log('Image picker result:', result.canceled ? 'Canceled' : 'Image selected');
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        try {
          // Show loading indicator
          setImageUploading(true);
          console.log('Starting image upload process');
          
          // Upload to Cloudinary
          const imageUri = result.assets[0].uri;
          console.log('Uploading image to Cloudinary:', imageUri.substring(0, 50) + '...');
          const imageUrl = await uploadImageToCloudinary(imageUri, 'users');
          
          if (imageUrl) {
            console.log('Image uploaded successfully, URL:', imageUrl.substring(0, 50) + '...');
            
            // Update user profile in Firestore
            console.log('Updating user profile in Firestore, user ID:', userProfile.id);
            const success = await updateUser(userProfile.id, { photoURL: imageUrl });
            
            if (success) {
              console.log('User profile updated successfully');
              Alert.alert(t('common.success'), t('profile.imageUpdated'));
            } else {
              console.error('Failed to update user profile in Firestore');
              throw new Error('Failed to update profile');
            }
          } else {
            console.error('Failed to upload image to Cloudinary, returned null');
            throw new Error('Failed to upload image');
          }
        } catch (error) {
          console.error('Error updating profile image:', error);
          // Log more details about the error
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          Alert.alert(t('common.error'), t('profile.imageUpdateFailed'));
        } finally {
          setImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Error in image picker:', error);
      setImageUploading(false);
      Alert.alert(t('common.error'), t('profile.imageUpdateFailed'));
    }
  };
  
  const { bgColor, textColor, borderColor, cardBgColor, iconBgColor, subtextColor } = themeStyles;

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
              ? 'Sent to all users' 
              : `Sent to ${Array.isArray(notification.recipients) ? notification.recipients.length : 0} users`}
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
        <View style={tw`flex-row items-center justify-between p-4 border-b ${borderColor}`}>
          <Text style={tw`text-xl font-bold ${textColor}`}>{t('profile.title')}</Text>
          <View style={tw`flex-row items-center gap-4`}>
            <TouchableOpacity onPress={() => setShowNotes(true)}>
              <Feather name="file-text" size={22} color={isDark ? "#fff" : "#000"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNotifications(true)}>
              <View style={tw`relative`}>
                <Feather name="bell" size={22} color={isDark ? "#fff" : "#000"} />
                {notifications.length > 0 && (
                  <View style={tw`absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center`}>
                    <Text style={tw`text-white text-xs font-bold`}>
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes modal (admin notes for this user) */}
        <Modal
          visible={showNotes}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNotes(false)}
        >
          <View style={tw`flex-1 justify-center items-center p-4 bg-black/50`}>
            <View style={tw`${cardBgColor} rounded-xl w-full max-h-[70%] shadow-lg`}>
              <View style={tw`flex-row justify-between items-center p-4 border-b ${borderColor}`}>
                <Text style={tw`text-lg font-bold ${textColor}`}>{t('profile.notesTitle')}</Text>
                <TouchableOpacity onPress={() => setShowNotes(false)}>
                  <Feather name="x" size={24} color={isDark ? "#fff" : "#000"} />
                </TouchableOpacity>
              </View>
              <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
                <Text style={tw`${textColor}`}>
                  {(userProfile?.notes && userProfile.notes.trim()) ? userProfile.notes : t('profile.noNotes')}
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Notifications Modal */}
        <Modal
          visible={showNotifications}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowNotifications(false)}
        >
          <View style={tw`flex-1 justify-center items-center p-4`}>
            <View style={tw`${cardBgColor} rounded-xl w-full max-h-[80%] shadow-lg`}>
              <View style={tw`flex-row justify-between items-center p-4 border-b ${borderColor}`}>
                <Text style={tw`text-lg font-bold ${textColor}`}>{t('profile.notifications')}</Text>
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Feather name="x" size={24} color={isDark ? "#fff" : "#000"} />
                </TouchableOpacity>
              </View>
              
              {notificationsLoading ? (
                <View style={tw`p-8 items-center`}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={tw`mt-4 ${subtextColor}`}>{t('common.loading')}</Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={tw`p-8 items-center`}>
                  <Feather name="bell-off" size={48} color={isDark ? "#4B5563" : "#9CA3AF"} />
                  <Text style={tw`mt-4 text-lg font-medium ${textColor} text-center`}>{t('profile.noNotifications')}</Text>
                  <Text style={tw`mt-2 ${subtextColor} text-center`}>{t('profile.noNotificationsDesc')}</Text>
                </View>
              ) : (
                <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
                  {notifications.map(renderNotificationItem)}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          {/* Profile Photo */}
          <View style={tw`items-center mt-6`}>
            <View style={tw`relative`}>
              {imageUploading ? (
                <View style={tw`w-24 h-24 rounded-full bg-gray-200 items-center justify-center`}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              ) : (
                <OptimizedImage
                  source={userProfile?.photoURL || 'https://randomuser.me/api/portraits/men/32.jpg'}
                  style={tw`w-24 h-24 rounded-full`}
                  contentFit="cover"
                />
              )}
              <TouchableOpacity 
                style={tw`absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full border-2 border-white items-center justify-center`}
                onPress={handleEditProfileImage}
                disabled={imageUploading}
              >
                <Feather name={imageUploading ? "loader" : "edit-2"} size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={tw`text-xl font-bold mt-3 ${textColor}`}>{userProfile?.displayName || 'User Name'}</Text>
            <Text style={tw`${subtextColor}`}>{userProfile?.email || 'user@example.com'}</Text>
          </View>

          {/* Profile Information */}
          <View style={tw`px-4 mt-8`}>
            {/* Full Name */}
            <View style={tw`flex-row items-center mb-4 ${cardBgColor} p-4 rounded-lg`}>
              <View style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}>
                <Feather name="user" size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={tw`${subtextColor} text-sm`}>{t('profile.fullName')}</Text>
                <Text style={tw`${textColor} font-medium text-lg`}>{userProfile?.displayName || 'User Name'}</Text>
              </View>
            </View>

            {/* Phone Number */}
            <View style={tw`flex-row items-center mb-4 ${cardBgColor} p-4 rounded-lg`}>
              <View style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}>
                <Feather name="phone" size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={tw`${subtextColor} text-sm`}>{t('profile.phoneNumber')}</Text>
                <Text style={tw`${textColor} font-medium text-lg`}>{userProfile?.phoneNumber || '+1 234 567 890'}</Text>
              </View>
            </View>

            {/* Email */}
            <View style={tw`flex-row items-center mb-4 ${cardBgColor} p-4 rounded-lg`}>
              <View style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}>
                <Feather name="mail" size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={tw`${subtextColor} text-sm`}>{t('profile.email')}</Text>
                <Text style={tw`${textColor} font-medium text-lg`}>{userProfile?.email || 'user@example.com'}</Text>
              </View>
            </View>

            {/* Categories (read-only) */}
            <View style={tw`${cardBgColor} p-4 rounded-lg mb-4`}>
              <View style={tw`flex-row items-center mb-2`}>
                <View style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}>
                  <Feather name="tag" size={16} color="#3B82F6" />
                </View>
                <Text style={tw`${subtextColor} text-sm`}>{t('profile.categories')}</Text>
              </View>
              {(() => {
                const ids = userProfile?.categoryIds ?? [];
                const names = ids
                  .map((id) => categories.find((c) => c.id === id)?.name)
                  .filter(Boolean) as string[];
                if (names.length === 0) {
                  return <Text style={tw`${textColor}`}>{t('profile.noCategories')}</Text>;
                }
                return (
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {names.map((name) => (
                      <View key={name} style={tw`${isDark ? 'bg-gray-700' : 'bg-gray-100'} px-3 py-1.5 rounded-full`}>
                        <Text style={tw`${textColor} font-medium`}>{name}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>

            {/* Membership Status */}
            <View style={tw`${cardBgColor} p-4 rounded-lg mb-4`}>
              <View style={tw`flex-row items-center mb-2`}>
                <View style={tw`w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-3`}>
                  <Feather name="award" size={16} color="#ffffff" />
                </View>
                <Text style={tw`${subtextColor} text-sm`}>{t('profile.membershipStatus')}</Text>
              </View>
              
              <View style={tw`flex-row justify-between items-center`}>
                <View style={tw`flex-row items-center`}>
                  <Text style={tw`${textColor} font-bold text-lg`}>
                    {userProfile?.membershipType || 'Premium'} Member
                  </Text>
                </View>
                <View style={tw`${isDark ? 'bg-gray-700' : 'bg-gray-100'} px-3 py-1 rounded-full`}>
                  <Text style={tw`text-blue-500 font-medium`}>
                    {t('profile.membershipDaysLeft')}: {userProfile?.membershipDaysLeft ?? 0}
                  </Text>
                </View>
              </View>
            </View>

            {/* Language Toggle */}
            <View style={tw`flex-row items-center justify-between mb-4 ${cardBgColor} p-4 rounded-lg`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}>
                  <Feather name="globe" size={16} color="#3B82F6" />
                </View>
                <View>
                  <Text style={tw`${textColor} font-medium`}>{t('profile.language')}</Text>
                  <Text style={tw`${subtextColor} text-xs`}>
                    {language === 'en'
                      ? t('profile.english')
                      : language === 'fr'
                      ? t('profile.french')
                      : t('profile.arabic')}
                  </Text>
                </View>
              </View>
              <View style={tw`flex-row`}>
                {(['en', 'fr', 'ar'] as const).map((lng) => (
                  <TouchableOpacity
                    key={lng}
                    style={tw`${language === lng ? 'bg-blue-500' : 'bg-gray-200'} px-3 py-2 rounded-md mx-1`}
                    onPress={() => setLanguage(lng)}
                  >
                    <Text style={tw`${language === lng ? 'text-white' : 'text-gray-700'} font-medium`}>
                      {lng === 'en' ? 'EN' : lng === 'fr' ? 'FR' : 'AR'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dark Mode Toggle */}
            <View style={tw`flex-row items-center justify-between mb-4 ${cardBgColor} p-4 rounded-lg`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}>
                  <Feather name={isDark ? "sun" : "moon"} size={16} color="#3B82F6" />
                </View>
                <View>
                  <Text style={tw`${textColor} font-medium`}>{isDark ? t('profile.lightMode') : t('profile.darkMode')}</Text>
                  <Text style={tw`${subtextColor} text-xs`}>{isDark ? t('profile.switchToLight') : t('profile.switchToDark')}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleColorScheme}
                trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              />
            </View>
          </View>

          {/* Logout Button - Make it more visible and add margin */}
          <View style={tw`px-4 mt-4 mb-8`}>
            <TouchableOpacity 
              style={tw`bg-blue-500 py-4 rounded-lg flex-row justify-center items-center`}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={20} color="#ffffff" style={tw`mr-2`} />
              <Text style={tw`text-white font-bold text-lg`}>{t('profile.logout')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TextErrorBoundary>
  );
} 
