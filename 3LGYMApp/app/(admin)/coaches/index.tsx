import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Text,
  Platform,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { deleteCoach } from '@/lib/firestoreServices';
import { Coach } from '@/lib/types';
import tw from '../../../config/tailwind';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import { useTheme } from '@/components/ThemeWrapper';
import { useLanguage } from '@/hooks/useLanguage';
import TextErrorBoundary from '@/components/TextErrorBoundary';

// Import our custom components
import AdminPageHeader from '@/components/AdminPageHeader';
import SearchInput from '@/components/SearchInput';
import CoachCard from '@/components/CoachCard';
import EmptyState from '@/components/EmptyState';
import FloatingActionButton from '@/components/FloatingActionButton';

export default function CoachesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { isDark, themeStyles } = useTheme();
  const { t } = useLanguage();
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor
  } = themeStyles;

  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Stats for admin dashboard
  const [stats, setStats] = useState({
    totalCoaches: 0,
    availableNow: 0,
    specialties: new Set<string>(),
  });

  useEffect(() => {
    // Set up the real-time listener
    const coachesRef = collection(db, 'coaches');
    const coachesQuery = query(coachesRef);
    
    // Create a subscription to the coaches collection
    const unsubscribe = onSnapshot(
      coachesQuery,
      (snapshot) => {
        const coachesData: Coach[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        } as Coach));
        
        setCoaches(coachesData);
        
        // Calculate stats
        const specialties = new Set<string>();
        let availableCount = 0;
        
        const now = new Date();
        const dayNames: (keyof Coach['daysAvailable'])[] = [
          'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
        ];
        const currentDay = dayNames[now.getDay()];
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        coachesData.forEach(coach => {
          if (coach.specialty) specialties.add(coach.specialty);
          
          let isAvailable = false;
          if (coach.daysAvailable && coach.workingHours) {
            const isDayAvailable = coach.daysAvailable[currentDay];
            
            if (isDayAvailable) {
              // Check if coach has day-specific hours for today
              let workingHoursToday = { startTime: "00:00", endTime: "00:00" };
              
              if (coach.daySpecificHours && coach.daySpecificHours[currentDay as keyof typeof coach.daySpecificHours]) {
                const dayHours = coach.daySpecificHours[currentDay as keyof typeof coach.daySpecificHours];
                if (dayHours) {
                  workingHoursToday = dayHours;
                }
              } else if (coach.workingHours) {
                workingHoursToday = coach.workingHours;
              }
              
              const { startTime, endTime } = workingHoursToday;
              if (startTime && endTime && currentTime >= startTime && currentTime < endTime) {
                isAvailable = true;
              }
            }
          }
          
          if (isAvailable) {
            availableCount++;
          }
        });
        
        setStats({
          totalCoaches: coachesData.length,
          availableNow: availableCount,
          specialties
        });
        
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to coaches collection:', error);
        Alert.alert(t('common.error'), t('admin.coaches.errorLoading'));
        setLoading(false);
      }
    );
    
    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [t]);

  const handleEditCoach = (id: string) => {
    router.push(`/(admin)/coaches/edit?id=${id}`);
  };

  const handleDeleteCoach = (id: string, name: string) => {
    Alert.alert(
      t('admin.coaches.deleteCoach'),
      t('admin.coaches.deleteConfirm', { name }),
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
              await deleteCoach(id);
              // No need to manually update state here as onSnapshot will handle it
              Alert.alert(t('common.success'), t('admin.coaches.deleteSuccess', { name }));
            } catch (error) {
              console.error('Error deleting coach:', error);
              Alert.alert(t('common.error'), t('admin.coaches.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleAddCoach = () => {
    router.push('/(admin)/coaches/add');
  };

  // Filter coaches based on search query
  const filteredCoaches = coaches.filter(coach => 
    coach.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    coach.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={tw`mt-4 ${subtextColor}`}>{t('admin.coaches.loading')}</Text>
        </View>
      );
    }
    
    if (coaches.length === 0) {
      return (
        <EmptyState 
          icon="user-x" 
          title={t('admin.coaches.noCoaches')}
          description={t('admin.coaches.addFirst')}
          actionLabel={t('admin.coaches.addCoach')}
          onAction={handleAddCoach}
        />
      );
    }
    
    if (filteredCoaches.length === 0 && searchQuery) {
      return (
        <EmptyState 
          icon="search" 
          title={t('admin.coaches.noResults')}
          description={t('admin.coaches.noMatchingCoaches', { query: searchQuery })}
          actionLabel={t('admin.coaches.clearSearch')}
          onAction={() => setSearchQuery('')}
        />
      );
    }

    return (
      <View style={tw`flex-1`}>
        {/* Dashboard Stats */}
        <View style={tw`p-4 ${cardBgColor} shadow-sm mb-4 mx-4 mt-4 rounded-xl`}>
          <Text style={tw`text-lg font-bold mb-3 ${textColor}`}>{t('admin.coaches.overview')}</Text>
          <View style={tw`flex-row justify-between`}>
            <View style={tw`items-center`}>
              <Text style={tw`text-2xl font-bold ${textColor}`}>{stats.totalCoaches}</Text>
              <Text style={tw`${subtextColor} text-xs`}>{t('admin.coaches.totalCoaches')}</Text>
            </View>
            <View style={tw`items-center`}>
              <Text style={tw`text-2xl font-bold ${textColor}`}>{stats.availableNow}</Text>
              <Text style={tw`${subtextColor} text-xs`}>{t('admin.coaches.availableNow')}</Text>
            </View>
            <View style={tw`items-center`}>
              <Text style={tw`text-2xl font-bold ${textColor}`}>{stats.specialties.size}</Text>
              <Text style={tw`${subtextColor} text-xs`}>{t('admin.coaches.specialties')}</Text>
            </View>
          </View>
        </View>
        
        {/* Coaches List */}
        <View style={tw`flex-1 px-4`}>
          {filteredCoaches.map((coach) => (
            <CoachCard
              key={coach.id}
              coach={coach}
              onEdit={() => handleEditCoach(coach.id)}
              onDelete={() => handleDeleteCoach(coach.id, coach.fullName)}
              isAdminView={true}
              isDark={isDark}
            />
          ))}
          <View style={tw`h-20`} />
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
          title={t('admin.coaches.title')}
          actions={[
            {
              icon: showSearch ? "x" : "search",
              onPress: () => setShowSearch(!showSearch)
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
              placeholder={t('admin.coaches.searchPlaceholder')}
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
        
        {/* Floating Action Button */}
        <FloatingActionButton
          icon="plus"
          onPress={handleAddCoach}
          backgroundColor="bg-blue-500"
        />
      </SafeAreaView>
    </TextErrorBoundary>
  );
} 