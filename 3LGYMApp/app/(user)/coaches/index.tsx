import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from '@/config/tailwind';
import { useTheme } from '@/components/ThemeWrapper';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import { Coach } from '@/lib/types';
import useAuth from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import TextErrorBoundary from '@/components/TextErrorBoundary';

interface CoachWithAvailability extends Coach {
  available: boolean;
  availableTime?: string;
}

// Sample coaches for unauthenticated users
const sampleCoaches: CoachWithAvailability[] = [
  {
    id: '1',
    fullName: 'Leila Hachemi',
    specialty: 'Yoga Instructor',
    available: true,
    availableTime: '12:00 to 16:00',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    daysAvailable: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    workingHours: {
      startTime: '12:00',
      endTime: '16:00'
    }
  },
  {
    id: '2',
    fullName: 'Marcus Johnson',
    specialty: 'Personal Trainer',
    available: false,
    photoURL: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    daysAvailable: {
      monday: true,
      tuesday: false,
      wednesday: true,
      thursday: false,
      friday: true,
      saturday: true,
      sunday: false
    },
    workingHours: {
      startTime: '09:00',
      endTime: '17:00'
    }
  },
  {
    id: '3',
    fullName: 'Sarah Chen',
    specialty: 'Pilates Instructor',
    available: true,
    availableTime: '09:00 to 15:00',
    photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    daysAvailable: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    workingHours: {
      startTime: '09:00',
      endTime: '15:00'
    }
  },
  {
    id: '4',
    fullName: 'David Rodriguez',
    specialty: 'Strength Training',
    available: true,
    availableTime: '14:00 to 20:00',
    photoURL: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    daysAvailable: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    workingHours: {
      startTime: '14:00',
      endTime: '20:00'
    }
  },
  {
    id: '5',
    fullName: 'Emma Thompson',
    specialty: 'Cardio Specialist',
    available: false,
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    daysAvailable: {
      monday: false,
      tuesday: true,
      wednesday: false,
      thursday: true,
      friday: false,
      saturday: true,
      sunday: false
    },
    workingHours: {
      startTime: '10:00',
      endTime: '18:00'
    }
  }
];

export default function CoachesScreen() {
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [coaches, setCoaches] = useState<CoachWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor
  } = themeStyles;
  
  // Fetch coaches from Firestore
  useEffect(() => {
    // If user is not authenticated, use sample data
    if (!user) {
      setCoaches(sampleCoaches);
      setLoading(false);
      return;
    }

    const coachesRef = collection(db, 'coaches');
    const coachesQuery = query(coachesRef);
    
    const unsubscribe = onSnapshot(
      coachesQuery,
      (snapshot) => {
        const coachesData: CoachWithAvailability[] = snapshot.docs.map((doc) => {
          const coachData = doc.data() as Coach;
          
          // Check if coach is available today
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const todayName = dayNames[dayOfWeek];
          
          // Check if coach works today
          const isWorkingToday = coachData.daysAvailable?.[todayName];
          
          // Format available time if working today
          let availableTime = undefined;
          let isAvailableNow = false;
          
          if (isWorkingToday) {
            // Check if coach has day-specific hours for today
            let workingHoursToday = { startTime: "00:00", endTime: "00:00" };
            
            if (coachData.daySpecificHours && coachData.daySpecificHours[todayName as keyof typeof coachData.daySpecificHours]) {
              const dayHours = coachData.daySpecificHours[todayName as keyof typeof coachData.daySpecificHours];
              if (dayHours) {
                workingHoursToday = dayHours;
              }
            } else if (coachData.workingHours) {
              workingHoursToday = coachData.workingHours;
            }
            
            // Format available time
            availableTime = `${workingHoursToday.startTime} to ${workingHoursToday.endTime}`;
            
            // Check if current time is within working hours
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTimeInMinutes = currentHour * 60 + currentMinutes;
            
            // Parse working hours
            const [startHour, startMinute] = (workingHoursToday.startTime || "00:00").split(':').map(Number);
            const [endHour, endMinute] = (workingHoursToday.endTime || "00:00").split(':').map(Number);
            
            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;
            
            isAvailableNow = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
          }
          
          return {
            id: doc.id,
            ...coachData,
            available: isAvailableNow,
            availableTime
          };
        });
        
        // Sort coaches: available first, then by name
        const sortedCoaches = coachesData.sort((a, b) => {
          if (a.available === b.available) {
            return a.fullName.localeCompare(b.fullName);
          }
          return a.available ? -1 : 1;
        });
        
        setCoaches(sortedCoaches);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching coaches:', error);
        setError('Failed to load coaches data');
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [user]);

  // Filter coaches based on search query
  const filteredCoaches = coaches.filter(coach => 
    coach.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    coach.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Navigate to coach detail screen
  const navigateToCoachDetail = (coachId: string) => {
    router.push(`/(user)/coaches/${coachId}`);
  };

  // Render coach item
  const renderCoachItem = ({ item }: { item: CoachWithAvailability }) => (
    <TouchableOpacity 
      style={tw`${cardBgColor} border-b ${borderColor} py-4 px-4`}
      onPress={() => navigateToCoachDetail(item.id)}
    >
      <View style={tw`flex-row items-center`}>
        {item.photoURL ? (
          <Image 
            source={{ uri: item.photoURL }} 
            style={tw`w-12 h-12 rounded-full mr-4`}
          />
        ) : (
          <View style={tw`w-12 h-12 rounded-full mr-4 bg-gray-300 items-center justify-center`}>
            <Feather name="user" size={20} color={isDark ? "#1F2937" : "#6B7280"} />
          </View>
        )}
        <View style={tw`flex-1`}>
          <Text style={tw`font-bold text-base ${textColor}`}>{item.fullName}</Text>
          <Text style={tw`${subtextColor} text-sm`}>{item.specialty}</Text>
          {item.available ? (
            <Text style={tw`text-blue-500 text-sm mt-1`}>{t('coaches.available')}: {item.availableTime}</Text>
          ) : (
            <Text style={tw`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm mt-1`}>{t('coaches.notAvailable')}</Text>
          )}
        </View>
        <Feather name="chevron-right" size={20} color={isDark ? "#A1A1AA" : "#9CA3AF"} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 ${bgColor} justify-center items-center`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`mt-4 ${subtextColor}`}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={tw`flex-1 ${bgColor} justify-center items-center`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Feather name="alert-circle" size={40} color="#EF4444" />
        <Text style={tw`mt-4 ${textColor} text-center`}>{error}</Text>
        <TouchableOpacity 
          style={tw`mt-6 bg-blue-500 px-6 py-3 rounded-full`}
          onPress={() => setLoading(true)}
        >
          <Text style={tw`text-white font-medium`}>{t('common.tryAgain')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <TextErrorBoundary>
      <SafeAreaView style={tw`flex-1 ${cardBgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <View style={tw`px-4 py-3 border-b ${borderColor} flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-4`}>
            <Feather name="arrow-left" size={24} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold ${textColor}`}>{t('coaches.title')}</Text>
        </View>
        
        {!user && (
          <View style={tw`mx-4 my-2 p-3 bg-yellow-100 rounded-lg flex-row items-center`}>
            <Feather name="info" size={18} color="#F59E0B" style={tw`mr-2`} />
            <Text style={tw`text-yellow-800 flex-1`}>
              {t('home.signInPrompt')}
            </Text>
          </View>
        )}
        
        {/* Search Input */}
        <View style={tw`px-4 py-2 border-b ${borderColor}`}>
          <View style={tw`flex-row items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg px-3 py-2`}>
            <Feather name="search" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} style={tw`mr-2`} />
            <TextInput
              placeholder={t('coaches.search')}
              placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={tw`flex-1 ${textColor}`}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <FlatList
          data={filteredCoaches}
          renderItem={renderCoachItem}
          keyExtractor={item => item.id}
          contentContainerStyle={tw`pb-4`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={tw`items-center justify-center py-10`}>
              <Feather name="user-x" size={40} color={isDark ? "#4B5563" : "#D1D5DB"} />
              <Text style={tw`${subtextColor} mt-4 text-center`}>{t('coaches.noCoaches')}</Text>
            </View>
          }
        />
      </SafeAreaView>
    </TextErrorBoundary>
  );
} 
