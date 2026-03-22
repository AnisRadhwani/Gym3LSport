import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import tw from '../../config/tailwind';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/components/ThemeWrapper';
import { logOut } from '@/lib/auth';
import { useLanguage } from '@/hooks/useLanguage';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '@/lib/utils/cloudinary';
import { updateUser } from '@/lib/firestoreServices';

// Safe translation helper so we never crash if i18n is not ready
const safeT = (t: ((key: string) => string) | undefined, key: string, fallback: string) => {
  try {
    if (typeof t === 'function') {
      const res = t(key);
      return typeof res === 'string' ? res : fallback;
    }
  } catch {
    // ignore and use fallback
  }
  return fallback;
};

/**
 * Admin-only profile screen. Separate from user profile to avoid
 * production APK issues (no i18n, no OptimizedImage - plain RN only).
 */
export default function AdminProfileScreen() {
  const router = useRouter();
  const { userProfile, loading } = useUser();
  const { isDark, toggleColorScheme, themeStyles } = useTheme();
  const { language, setLanguage, t } = useLanguage() as any;
  const [imageUploading, setImageUploading] = useState(false);

  const { bgColor, textColor, borderColor, cardBgColor, iconBgColor, subtextColor } = themeStyles;

  if (loading || !userProfile) {
    return (
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={tw`mt-3 ${subtextColor}`}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName =
    (userProfile.displayName && String(userProfile.displayName).trim()) || 'Admin User';
  const email =
    (userProfile.email && String(userProfile.email).trim()) || 'admin@example.com';
  const phoneDisplay =
    userProfile.phoneNumber != null && String(userProfile.phoneNumber).trim()
      ? String(userProfile.phoneNumber)
      : '+1 234 567 890';
  const photoURL =
    userProfile.photoURL && String(userProfile.photoURL).trim()
      ? userProfile.photoURL
      : 'https://randomuser.me/api/portraits/men/32.jpg';

  const handleEditProfileImage = async () => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Missing admin profile id.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Permission to access photos was denied.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        try {
          setImageUploading(true);
          const imageUri = result.assets[0].uri;
          const imageUrl = await uploadImageToCloudinary(imageUri, 'users');

          if (imageUrl) {
            const success = await updateUser(userProfile.id, { photoURL: imageUrl });
            if (!success) {
              throw new Error('Failed to update admin profile');
            }
          } else {
            throw new Error('Failed to upload image');
          }
        } catch (error) {
          console.error('Error updating admin profile image:', error);
          Alert.alert('Error', 'Could not update profile image. Please try again.');
        } finally {
          setImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking admin image:', error);
      setImageUploading(false);
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      (async () => {
        const { error } = await logOut();
        if (!error) router.replace('/auth/sign-in');
        else Alert.alert(safeT(t, 'common.error', 'Error'), safeT(t, 'profile.logoutFailed', 'Failed to logout. Please try again.'));
      })();
      return;
    }
    Alert.alert(
      safeT(t, 'profile.logout', 'Logout'),
      safeT(t, 'profile.logoutConfirm', 'Are you sure you want to logout?'),
      [
        { text: safeT(t, 'common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: safeT(t, 'profile.logout', 'Logout'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await logOut();
            if (!error) router.replace('/auth/sign-in');
            else Alert.alert(safeT(t, 'common.error', 'Error'), safeT(t, 'profile.logoutFailed', 'Failed to logout. Please try again.'));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={tw`flex-row items-center justify-between p-4 border-b ${borderColor}`}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold ${textColor}`}>
          {safeT(t, 'profile.adminTitle', 'Admin Profile')}
        </Text>
        <View style={tw`w-6`} />
      </View>

      <ScrollView style={tw`flex-1`}>
        <View style={tw`items-center mt-6`}>
          <View style={tw`relative`}>
            {imageUploading ? (
              <View style={tw`w-24 h-24 rounded-full bg-gray-200 items-center justify-center`}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            ) : (
              <Image
                source={{ uri: photoURL }}
                style={tw`w-24 h-24 rounded-full`}
                resizeMode="cover"
              />
            )}
            <View
              style={tw`absolute bottom-0 right-0 bg-blue-500 px-2 py-1 rounded-full border-2 border-white`}
            >
              <Text style={tw`text-xs text-white font-bold`}>ADMIN</Text>
            </View>
            <TouchableOpacity
              style={tw`absolute -bottom-2 -left-2 w-8 h-8 bg-blue-500 rounded-full border-2 border-white items-center justify-center`}
              onPress={handleEditProfileImage}
              disabled={imageUploading}
            >
              <Feather
                name={imageUploading ? 'loader' : 'edit-2'}
                size={14}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>
          <Text style={tw`text-xl font-bold mt-3 ${textColor}`}>{displayName}</Text>
          <Text style={tw`${subtextColor}`}>{email}</Text>
        </View>

        <View style={tw`mt-8 px-4`}>
          <Text style={tw`text-lg font-bold mb-4 ${textColor}`}>
            {safeT(t, 'profile.fullName', 'Full Name')}
          </Text>

          <View style={tw`flex-row items-center mb-4 ${cardBgColor} p-4 rounded-lg`}>
            <View
              style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}
            >
              <Feather name="user" size={16} color="#3B82F6" />
            </View>
            <View>
              <Text style={tw`${subtextColor} text-sm`}>
                {safeT(t, 'profile.fullName', 'Full Name')}
              </Text>
              <Text style={tw`${textColor} font-medium text-lg`}>{displayName}</Text>
            </View>
          </View>

          <View style={tw`flex-row items-center mb-4 ${cardBgColor} p-4 rounded-lg`}>
            <View
              style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}
            >
              <Feather name="phone" size={16} color="#3B82F6" />
            </View>
            <View>
              <Text style={tw`${subtextColor} text-sm`}>
                {safeT(t, 'profile.phoneNumber', 'Phone Number')}
              </Text>
              <Text style={tw`${textColor} font-medium text-lg`}>{phoneDisplay}</Text>
            </View>
          </View>

          <View style={tw`flex-row items-center mb-4 ${cardBgColor} p-4 rounded-lg`}>
            <View
              style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}
            >
              <Feather name="mail" size={16} color="#3B82F6" />
            </View>
            <View>
              <Text style={tw`${subtextColor} text-sm`}>
                {safeT(t, 'profile.email', 'Email')}
              </Text>
              <Text style={tw`${textColor} font-medium text-lg`}>{email}</Text>
            </View>
          </View>
        </View>

        <View style={tw`mt-6 px-4`}>
          <Text style={tw`text-lg font-bold mb-4 ${textColor}`}>
            {safeT(t, 'profile.settings', 'Settings')}
          </Text>

          <View
            style={tw`flex-row items-center justify-between mb-4 ${cardBgColor} p-4 rounded-lg`}
          >
            <View style={tw`flex-row items-center`}>
              <View
                style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}
              >
                <Feather name="globe" size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={tw`${textColor} font-medium`}>
                  {safeT(t, 'profile.language', 'Language')}
                </Text>
                <Text style={tw`${subtextColor} text-xs`}>
                  {language === 'en'
                    ? safeT(t, 'profile.english', 'English')
                    : language === 'fr'
                    ? safeT(t, 'profile.french', 'French')
                    : safeT(t, 'profile.arabic', 'Arabic')}
                </Text>
              </View>
            </View>
            <View style={tw`flex-row`}>
              {(['en', 'fr', 'ar'] as const).map((lng) => (
                <TouchableOpacity
                  key={lng}
                  style={tw`px-3 py-2 rounded-md mx-1 ${
                    language === lng ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                  onPress={() => setLanguage(lng)}
                >
                  <Text
                    style={tw`font-medium ${
                      language === lng ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {lng === 'en' ? 'EN' : lng === 'fr' ? 'FR' : 'AR'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View
            style={tw`flex-row items-center justify-between mb-4 ${cardBgColor} p-4 rounded-lg`}
          >
            <View style={tw`flex-row items-center`}>
              <View
                style={tw`w-8 h-8 rounded-full ${iconBgColor} items-center justify-center mr-3`}
              >
                <Feather name={isDark ? 'sun' : 'moon'} size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={tw`${textColor} font-medium`}>
                  {isDark
                    ? safeT(t, 'profile.lightMode', 'Light Mode')
                    : safeT(t, 'profile.darkMode', 'Dark Mode')}
                </Text>
                <Text style={tw`${subtextColor} text-xs`}>
                  {isDark
                    ? safeT(t, 'profile.switchToLight', 'Switch to light theme')
                    : safeT(t, 'profile.switchToDark', 'Switch to dark theme')}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleColorScheme}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          </View>
        </View>
      </ScrollView>

      <View style={tw`px-4 py-4 border-t ${borderColor}`}>
        <TouchableOpacity
          style={tw`bg-blue-500 py-4 rounded-lg flex-row justify-center items-center`}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={20} color="#ffffff" style={tw`mr-2`} />
          <Text style={tw`text-white font-bold text-lg`}>
            {safeT(t, 'profile.logout', 'Logout')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
