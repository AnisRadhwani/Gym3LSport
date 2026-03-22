import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import tw from '../../../config/tailwind';
import { getUserById, updateUser, resetMembershipDays, getCategories } from '@/lib/firestoreServices';
import { User, Category } from '@/lib/types';
import AdminPageHeader from '@/components/AdminPageHeader';
import { useTheme } from '@/components/ThemeWrapper';
import { useLanguage } from '@/hooks/useLanguage';

export default function EditUserScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, themeStyles } = useTheme();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [membershipDays, setMembershipDays] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor,
    inputBgColor,
    inputTextColor
  } = themeStyles;
  
  // Fetch user data and categories
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        const [userData, categoriesData] = await Promise.all([
          getUserById(id as string),
          getCategories(),
        ]);
        if (userData) {
          setUser(userData);
          setMembershipDays(userData.membershipDaysLeft.toString());
          setSelectedCategoryIds(userData.categoryIds ?? []);
          setNotes(userData.notes ?? '');
        } else {
          Alert.alert('Error', 'User not found');
          router.back();
        }
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Handle save
  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const days = parseInt(membershipDays, 10);
      if (isNaN(days)) {
        Alert.alert('Invalid Input', 'Please enter a valid number (negative allowed for testing)');
        setSaving(false);
        return;
      }
      
      const membershipOk = await resetMembershipDays(user.id, days);
      const categoriesAndNotesOk = await updateUser(user.id, { categoryIds: selectedCategoryIds, notes: notes.trim() });
      
      if (membershipOk && categoriesAndNotesOk) {
        Alert.alert('Success', 'User updated successfully');
        router.back();
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };
  
  // Reset to 30 days
  const handleReset = () => {
    setMembershipDays('30');
  };
  
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AdminPageHeader title="Edit User" onBack={() => router.back()} />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={tw`mt-4 ${subtextColor}`}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <AdminPageHeader 
        title="Edit User" 
        onBack={() => router.back()}
        actions={[
          {
            icon: "save",
            onPress: handleSave,
            backgroundColor: isDark ? "bg-blue-600" : "bg-blue-500",
            color: "#fff",
            disabled: saving
          }
        ]}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={tw`flex-1`}
          contentContainerStyle={tw`p-4 pb-80`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {user && (
            <View style={tw`${cardBgColor} p-4 rounded-xl shadow-sm`}>
              <View style={tw`flex-row items-center mb-6`}>
                <View style={tw`w-12 h-12 rounded-full bg-blue-500 justify-center items-center mr-3`}>
                  <Text style={tw`text-white text-lg font-bold`}>
                    {(user.displayName || user.fullName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={tw`font-bold text-lg ${textColor}`}>
                    {user.displayName || user.fullName}
                  </Text>
                  <Text style={tw`${subtextColor}`}>{user.email}</Text>
                </View>
              </View>
              
              <View style={tw`mb-6`}>
                <Text style={tw`font-medium mb-2 ${textColor}`}>Current Membership Status</Text>
                <View style={tw`flex-row items-center`}>
                  {(() => {
                    const isInProgress = user.membershipType === 'In Progress' && user.membershipDaysLeft === 0;
                    const isExpiredNegative = user.membershipDaysLeft < 0;
                    const badgeBg = isInProgress
                      ? 'bg-blue-100'
                      : user.membershipDaysLeft > 0
                        ? 'bg-green-100'
                        : 'bg-red-100';
                    const badgeText = isInProgress
                      ? 'In Progress'
                      : isExpiredNegative
                        ? `Expired - ${Math.abs(user.membershipDaysLeft)}`
                        : user.membershipDaysLeft === 0
                          ? 'Expired'
                          : `${user.membershipDaysLeft} days left`;
                    const textColorClass = isInProgress
                      ? 'text-blue-600'
                      : user.membershipDaysLeft > 0
                        ? 'text-green-600'
                        : 'text-red-600';
                    return (
                      <View style={tw`${badgeBg} px-3 py-1 rounded-full`}>
                        <Text style={tw`${textColorClass} font-medium`}>{badgeText}</Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
              
              <View style={tw`mb-6`}>
                <Text style={tw`font-medium mb-2 ${textColor}`}>Membership Days</Text>
                <TextInput
                  style={[tw`${inputBgColor} ${inputTextColor} p-3 rounded-lg border ${borderColor}`, isDark && { color: '#fff' }]}
                  value={membershipDays}
                  onChangeText={setMembershipDays}
                  keyboardType="number-pad"
                  placeholder="Enter days"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                />
              </View>
              
              <TouchableOpacity
                style={tw`bg-blue-500 p-3 rounded-lg mb-4 items-center`}
                onPress={handleReset}
              >
                <Text style={tw`text-white font-medium`}>Reset to 30 Days</Text>
              </TouchableOpacity>

              {/* Notes (admin-only, visible to user on profile) */}
              <View style={tw`mb-6`}>
                <Text style={tw`font-medium mb-2 ${textColor}`}>{t('admin.users.notes')}</Text>
                <Text style={tw`${subtextColor} text-sm mb-2`}>{t('admin.users.notesHint')}</Text>
                <TextInput
                  style={[tw`${inputBgColor} ${inputTextColor} p-3 rounded-lg border ${borderColor} min-h-[80px]`, isDark && { color: '#fff' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('admin.users.notesPlaceholder')}
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => {
                    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
                  }}
                />
              </View>

              {/* Categories */}
              <View style={tw`mb-6`}>
                <Text style={tw`font-medium mb-2 ${textColor}`}>{t('admin.categories.assignToUser')}</Text>
                <Text style={tw`${subtextColor} text-sm mb-2`}>{t('admin.categories.selectCategories')}</Text>
                {categories.length === 0 ? (
                  <Text style={tw`${subtextColor} text-sm`}>{t('admin.categories.none')}</Text>
                ) : (
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={tw`px-3 py-2 rounded-full ${isSelected ? 'bg-blue-500' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                          onPress={() => toggleCategory(cat.id)}
                        >
                          <Text style={tw`font-medium ${isSelected ? 'text-white' : textColor}`}>{cat.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
              
              <TouchableOpacity
                style={tw`${saving ? 'bg-gray-400' : 'bg-blue-600'} p-3 rounded-lg items-center`}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={tw`text-white font-medium`}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 