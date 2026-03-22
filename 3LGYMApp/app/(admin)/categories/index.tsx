import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import tw from '../../../config/tailwind';
import {
  subscribeToCategories,
  addCategory,
  deleteCategory,
} from '@/lib/firestoreServices';
import { Category } from '@/lib/types';
import AdminPageHeader from '@/components/AdminPageHeader';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/components/ThemeWrapper';
import { useLanguage } from '@/hooks/useLanguage';
import TextErrorBoundary from '@/components/TextErrorBoundary';

export default function CategoriesScreen() {
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const unsubscribeRef = useRef<() => void | null>();

  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor,
    inputBgColor,
    inputTextColor,
  } = themeStyles;

  useEffect(() => {
    unsubscribeRef.current = subscribeToCategories((updated) => {
      setCategories(updated);
      setLoading(false);
    });
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert(t('common.error'), t('admin.categories.enterName'));
      return;
    }
    try {
      setSaving(true);
      const id = await addCategory(name);
      if (id) {
        setNewCategoryName('');
        setModalVisible(false);
      } else {
        throw new Error('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert(t('common.error'), t('admin.categories.addError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert(
      t('admin.categories.deleteCategory'),
      t('admin.categories.deleteConfirm', { name: cat.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteCategory(cat.id);
              if (!success) throw new Error('Failed to delete');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert(t('common.error'), t('admin.categories.deleteError'));
            }
          },
        },
      ]
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={tw`mt-4 ${subtextColor}`}>{t('admin.categories.loading')}</Text>
        </View>
      );
    }
    if (categories.length === 0) {
      return (
        <EmptyState
          icon="tag"
          title={t('admin.categories.noCategories')}
          description={t('admin.categories.addFirst')}
          actionLabel={t('admin.categories.addCategory')}
          onAction={() => setModalVisible(true)}
        />
      );
    }
    return (
      <View style={tw`flex-1 px-4`}>
        {categories.map((cat) => (
          <View
            key={cat.id}
            style={tw`${cardBgColor} rounded-xl p-4 mb-4 flex-row items-center justify-between shadow-sm`}
          >
            <Text style={tw`font-medium text-lg ${textColor}`}>{cat.name}</Text>
            <TouchableOpacity
              style={tw`p-2`}
              onPress={() => handleDeleteCategory(cat)}
            >
              <Feather name="trash-2" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={tw`${cardBgColor} rounded-xl p-4 mb-4 border-2 border-dashed ${borderColor} flex-row items-center justify-center`}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="plus" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} style={tw`mr-2`} />
          <Text style={tw`${subtextColor} font-medium`}>{t('admin.categories.addCategory')}</Text>
        </TouchableOpacity>
        <View style={tw`h-8`} />
      </View>
    );
  };

  return (
    <TextErrorBoundary>
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AdminPageHeader
          title={t('admin.categories.title')}
          onBack={() => router.push('/(admin)/dashboard')}
          actions={[
            {
              icon: 'plus',
              onPress: () => setModalVisible(true),
            },
          ]}
        />
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-4`}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={tw`flex-1 justify-center items-center p-4 bg-black/50`}>
            <View style={tw`${cardBgColor} rounded-xl w-full max-w-md p-5 shadow-lg`}>
              <Text style={tw`text-lg font-bold mb-3 ${textColor}`}>
                {t('admin.categories.addCategory')}
              </Text>
              <TextInput
                style={tw`border ${borderColor} rounded-lg px-4 py-3 ${inputBgColor} ${inputTextColor} text-base mb-4`}
                placeholder={t('admin.categories.namePlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
              />
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={tw`flex-1 py-3 rounded-lg border ${borderColor} items-center`}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={tw`${textColor} font-medium`}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`flex-1 py-3 rounded-lg bg-blue-500 items-center`}
                  onPress={handleAddCategory}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={tw`text-white font-medium`}>{t('common.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TextErrorBoundary>
  );
}
