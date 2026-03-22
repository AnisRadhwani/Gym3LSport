import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import tw from '../../../config/tailwind';
import { getUsers, deleteUser, subscribeToUsers, updateAllUsersMembershipDays, getCategories, addCategory, deleteCategory } from '@/lib/firestoreServices';
import { User, Category } from '@/lib/types';
import AdminPageHeader from '@/components/AdminPageHeader';
import SearchInput from '@/components/SearchInput';
import EmptyState from '@/components/EmptyState';
import FloatingActionButton from '@/components/FloatingActionButton';
import { useTheme } from '@/components/ThemeWrapper';
import { useLanguage } from '@/hooks/useLanguage';
import TextErrorBoundary from '@/components/TextErrorBoundary';
import OptimizedImage from '@/components/OptimizedImage';

export default function UsersScreen() {
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [filterOption, setFilterOption] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [updatingMemberships, setUpdatingMemberships] = useState(false);
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  
  const unsubscribeRef = useRef<() => void | null>();

  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor
  } = themeStyles;

  useEffect(() => {
    // Update all users' membership days when component mounts
    const updateMembershipDays = async () => {
      setUpdatingMemberships(true);
      try {
        await updateAllUsersMembershipDays();
      } catch (error) {
        console.error('Error updating membership days:', error);
      } finally {
        setUpdatingMemberships(false);
      }
    };

    updateMembershipDays();

    getCategories().then(setCategories);

    // Set up real-time listener for users collection
    unsubscribeRef.current = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
      setLoading(false);
    });
    
    // Clean up listener when component unmounts
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Filter users based on search query and filter options
  const filteredUsers = users.filter(user => {
    const searchText = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      user.displayName?.toLowerCase().includes(searchText) || 
      user.fullName?.toLowerCase().includes(searchText) ||
      user.phoneNumber?.toLowerCase().includes(searchText) ||
      user.email?.toLowerCase().includes(searchText);
    
    // Apply membership filter if active
    if (filterActive && filterOption) {
      if (filterOption === 'active' && user.membershipDaysLeft <= 0) {
        return false;
      }
      if (filterOption === 'expiring' && (user.membershipDaysLeft > 7 || user.membershipDaysLeft <= 0)) {
        return false;
      }
      if (filterOption === 'expired' && user.membershipDaysLeft > 0) {
        return false;
      }
      if (filterOption === 'category' && filterCategoryId) {
        const userCategoryIds = user.categoryIds ?? [];
        if (!userCategoryIds.includes(filterCategoryId)) return false;
      }
    }
    
    return matchesSearch;
  });

  const handleEditUser = (userId: string) => {
    router.push(`/(admin)/users/edit?id=${userId}`);
  };

  const handleDeleteUser = (userId: string, name: string) => {
    Alert.alert(
      t('admin.users.deleteUser'),
      t('admin.users.deleteConfirm', { name: name || t('admin.users.thisUser') }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteUser(userId);
              
              if (success) {
                // The real-time listener will automatically update the UI
                Alert.alert(t('common.success'), t('admin.users.deleteSuccess'));
              } else {
                throw new Error('Failed to delete user');
              }
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert(t('common.error'), t('admin.users.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleFilter = () => {
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' }[] = [
      {
        text: t('admin.users.filterAll'),
        onPress: () => {
          setFilterOption(null);
          setFilterCategoryId(null);
          setFilterActive(false);
        },
      },
      {
        text: t('admin.users.filterActive'),
        onPress: () => {
          setFilterOption('active');
          setFilterCategoryId(null);
          setFilterActive(true);
        },
      },
      {
        text: t('admin.users.filterExpiring'),
        onPress: () => {
          setFilterOption('expiring');
          setFilterCategoryId(null);
          setFilterActive(true);
        },
      },
      {
        text: t('admin.users.filterExpired'),
        onPress: () => {
          setFilterOption('expired');
          setFilterCategoryId(null);
          setFilterActive(true);
        },
      },
      ...categories.map((cat) => ({
        text: `${t('admin.users.filterByCategory')}: ${cat.name}`,
        onPress: () => {
          setFilterOption('category');
          setFilterCategoryId(cat.id);
          setFilterActive(true);
        },
      })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ];
    Alert.alert(t('admin.users.filterUsers'), t('admin.users.selectFilter'), buttons);
  };

  // Get membership status badge
  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert(t('common.error'), t('admin.categories.enterName'));
      return;
    }
    try {
      setAddingCategory(true);
      const id = await addCategory(name);
      if (id) {
        setNewCategoryName('');
        const updated = await getCategories();
        setCategories(updated);
      } else {
        throw new Error('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert(t('common.error'), t('admin.categories.addError'));
    } finally {
      setAddingCategory(false);
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
              if (success) {
                const updated = await getCategories();
                setCategories(updated);
              } else throw new Error('Failed to delete');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert(t('common.error'), t('admin.categories.deleteError'));
            }
          },
        },
      ]
    );
  };

  const getMembershipBadge = (user: User) => {
    const daysLeft = user.membershipDaysLeft ?? 0;
    const membershipType = (user as any).membershipType as string | undefined;

    // Admins: always show Admin badge, ignore membership fields
    if (user.isAdmin) {
      return (
        <View
          style={[
            tw`px-2 py-1 rounded-full`,
            { backgroundColor: isDark ? '#7C2D12' : '#FFEDD5' }, // dark / light orange
          ]}
        >
          <Text
            style={[
              tw`text-xs font-medium`,
              { color: '#EA580C' }, // orange text
            ]}
          >
            Admin
          </Text>
        </View>
      );
    }

    // Only show "In Progress" for new accounts that have never been assigned membership days
    if (membershipType === 'In Progress' && daysLeft === 0) {
      return (
        <View style={tw`${isDark ? 'bg-blue-900' : 'bg-blue-100'} px-2 py-1 rounded-full`}>
          <Text style={tw`text-blue-600 text-xs font-medium`}>In Progress</Text>
        </View>
      );
    }

    // Negative days -> show Expired - X
    if (daysLeft < 0) {
      const abs = Math.abs(daysLeft);
      return (
        <View style={tw`${isDark ? 'bg-red-900' : 'bg-red-100'} px-2 py-1 rounded-full`}>
          <Text style={tw`text-red-600 text-xs font-medium`}>{`Expired - ${abs}`}</Text>
        </View>
      );
    }
    
    // For all other cases, show "Expired" when days are 0 (existing accounts that ran out)
    if (daysLeft === 0) {
      return (
        <View style={tw`${isDark ? 'bg-red-900' : 'bg-red-100'} px-2 py-1 rounded-full`}>
          <Text style={tw`text-red-600 text-xs font-medium`}>{t('admin.users.expired')}</Text>
        </View>
      );
    } else if (daysLeft <= 7) {
      return (
        <View style={tw`${isDark ? 'bg-orange-900' : 'bg-orange-100'} px-2 py-1 rounded-full`}>
          <Text style={tw`text-orange-600 text-xs font-medium`}>{t('admin.users.daysLeft', { days: daysLeft })}</Text>
        </View>
      );
    } else {
      return (
        <View style={tw`${isDark ? 'bg-green-900' : 'bg-green-100'} px-2 py-1 rounded-full`}>
          <Text style={tw`text-green-600 text-xs font-medium`}>{t('admin.users.daysLeft', { days: daysLeft })}</Text>
        </View>
      );
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={tw`mt-4 ${subtextColor}`}>{t('admin.users.loading')}</Text>
        </View>
      );
    }
    
    if (users.length === 0) {
      return (
        <EmptyState 
          icon="users" 
          title={t('admin.users.noUsers')}
          description={t('No users found in the system')}
        />
      );
    }
    
    if (filteredUsers.length === 0 && searchQuery) {
      return (
        <EmptyState 
          icon="search" 
          title={t('admin.users.noResults')}
          description={t('admin.users.noMatchingUsers', { query: searchQuery })}
          actionLabel={t('admin.users.clearSearch')}
          onAction={() => setSearchQuery('')}
        />
      );
    }

    return (
      <View style={tw`flex-1 px-4`}>
        {/* Filter Indicator */}
        {filterActive && (
          <View style={tw`flex-row items-center justify-between mb-4 ${isDark ? 'bg-blue-900' : 'bg-blue-50'} p-2 rounded-lg`}>
            <Text style={tw`${textColor} font-medium`}>
              {filterOption === 'active' && t('admin.users.filteringActive')}
              {filterOption === 'expiring' && t('admin.users.filteringExpiring')}
              {filterOption === 'expired' && t('admin.users.filteringExpired')}
              {filterOption === 'category' && filterCategoryId && t('admin.users.filteringCategory', { name: categories.find((c) => c.id === filterCategoryId)?.name ?? '' })}
            </Text>
            <TouchableOpacity 
              style={tw`bg-blue-500 px-2 py-1 rounded-full`}
              onPress={() => {
                setFilterActive(false);
                setFilterOption(null);
                setFilterCategoryId(null);
              }}
            >
              <Text style={tw`text-white text-xs`}>{t('admin.users.clearFilter')}</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* User Cards */}
        {filteredUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={tw`${cardBgColor} rounded-xl p-4 mb-4 shadow-sm`}
            onPress={() => handleEditUser(user.id)}
          >
            <View style={tw`flex-row items-center`}>
              {user.photoURL ? (
                <OptimizedImage 
                  source={user.photoURL} 
                  style={tw`w-14 h-14 rounded-full mr-3`}
                  contentFit="cover"
                />
              ) : (
                <View style={tw`w-14 h-14 rounded-full bg-gray-300 items-center justify-center mr-3`}>
                  <Feather name="user" size={24} color={isDark ? "#1F2937" : "#6B7280"} />
                </View>
              )}
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <Text style={tw`font-bold text-lg ${textColor}`}>
                    {user.displayName || user.fullName || t('admin.users.unnamed')}
                  </Text>
                  {getMembershipBadge(user)}
                </View>
                <Text style={tw`${subtextColor}`}>{user.email}</Text>
                <Text style={tw`${subtextColor} text-sm`}>{user.phoneNumber || t('admin.users.noPhone')}</Text>
              </View>
              <TouchableOpacity 
                style={tw`p-2`}
                onPress={() => handleDeleteUser(user.id, user.displayName || user.fullName || '')}
              >
                <Feather name="trash-2" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        <View style={tw`h-20`} />
      </View>
    );
  };

  return (
    <TextErrorBoundary>
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <AdminPageHeader 
          title={t('admin.users.title')}
          actions={[
            {
              icon: showSearch ? "x" : "search",
              onPress: () => setShowSearch(!showSearch)
            },
            {
              icon: "filter",
              onPress: handleFilter
            },
            {
              icon: "tag",
              onPress: () => setCategoriesModalVisible(true)
            }
          ]}
          onBack={() => router.push('/(admin)/dashboard')}
        />
        
        {/* Search Bar */}
        {showSearch && (
          <View style={tw`px-4 py-2`}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('admin.users.searchPlaceholder')}
              isDark={isDark}
            />
          </View>
        )}
        
        {/* Content */}
        <ScrollView 
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-4`}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>

        {/* Categories modal: add/manage categories from Users page */}
        <Modal
          visible={categoriesModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCategoriesModalVisible(false)}
        >
          <View style={tw`flex-1 justify-center items-center p-4 bg-black/50`}>
            <View style={tw`${cardBgColor} rounded-xl w-full max-w-md max-h-[80%] shadow-lg`}>
              <View style={tw`flex-row justify-between items-center p-4 border-b ${borderColor}`}>
                <Text style={tw`text-lg font-bold ${textColor}`}>{t('admin.categories.title')}</Text>
                <TouchableOpacity onPress={() => setCategoriesModalVisible(false)}>
                  <Feather name="x" size={24} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>
              <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
                <Text style={tw`text-sm mb-2 ${subtextColor}`}>{t('admin.categories.addFirst')}</Text>
                <View style={tw`flex-row gap-2 mb-4`}>
                  <TextInput
                    style={tw`flex-1 border ${borderColor} rounded-lg px-3 py-2.5 ${themeStyles.inputBgColor} ${themeStyles.inputTextColor}`}
                    placeholder={t('admin.categories.namePlaceholder')}
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                  />
                  <TouchableOpacity
                    style={tw`bg-blue-500 px-4 py-2.5 rounded-lg justify-center`}
                    onPress={handleAddCategory}
                    disabled={addingCategory}
                  >
                    {addingCategory ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={tw`text-white font-medium`}>{t('admin.categories.addCategory')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {categories.length === 0 ? (
                  <Text style={tw`${subtextColor} text-sm`}>{t('admin.categories.noCategories')}</Text>
                ) : (
                  categories.map((cat) => (
                    <View
                      key={cat.id}
                      style={tw`flex-row items-center justify-between py-3 border-b ${borderColor}`}
                    >
                      <Text style={tw`font-medium ${textColor}`}>{cat.name}</Text>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={tw`p-2`}>
                        <Feather name="trash-2" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TextErrorBoundary>
  );
} 