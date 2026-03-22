import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import tw from '@/config/tailwind';
import { useAuth } from '../_layout';
import { useTheme } from '@/components/ThemeWrapper';
import { useLanguage } from '@/hooks/useLanguage';
import AdminPageHeader from '@/components/AdminPageHeader';
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import { Coach, Event } from '@/lib/types';
import { Image } from 'react-native';
import { updateAllUsersMembershipDays, cleanupAllDuplicateEvents, resetAllRecurringEvents } from '@/lib/firestoreServices';
import TextErrorBoundary from '@/components/TextErrorBoundary';

interface StatCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  subtextColor: string;
}

interface CoachWithAvailability extends Coach {
  available: boolean;
}

// Update the EventWithInterest interface to include description and attendees properties
interface EventWithInterest extends Event {
  interested: boolean;
  description?: string;
  attendees?: string[];
}

interface GymHours {
  monday: { open: string; close: string };
  tuesday: { open: string; close: string };
  wednesday: { open: string; close: string };
  thursday: { open: string; close: string };
  friday: { open: string; close: string };
  saturday: { open: string; close: string };
  sunday: { open: string; close: string };
}

const DEFAULT_GYM_HOURS: GymHours = {
  monday: { open: '08:00', close: '22:00' },
  tuesday: { open: '08:00', close: '22:00' },
  wednesday: { open: '08:00', close: '22:00' },
  thursday: { open: '08:00', close: '22:00' },
  friday: { open: '08:00', close: '22:00' },
  saturday: { open: '09:00', close: '20:00' },
  sunday: { open: '10:00', close: '18:00' },
};

const StatCard = ({ title, count, icon, bgColor, textColor, subtextColor }: StatCardProps) => (
  <View style={tw`${bgColor} rounded-2xl p-4 shadow-md mb-4 flex-row items-center`}>
    <View style={tw`bg-blue-50 p-3 rounded-xl mr-4`}>
      {icon}
    </View>
    <View>
      <Text style={tw`${subtextColor} text-base mb-1`}>{title}</Text>
      <Text style={tw`text-2xl font-bold ${textColor}`}>{count}</Text>
    </View>
  </View>
);

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { isDark, themeStyles } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    members: 0,
    coaches: 0,
    activeEvents: 0,
  });
  const [availableCoaches, setAvailableCoaches] = useState<CoachWithAvailability[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<EventWithInterest[]>([]);
  const [gymHours, setGymHours] = useState<GymHours>(DEFAULT_GYM_HOURS);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [selectedDay, setSelectedDay] = useState<keyof GymHours | null>(null);
  const [tempOpenHour, setTempOpenHour] = useState('');
  const [tempCloseHour, setTempCloseHour] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [updatingMemberships, setUpdatingMemberships] = useState(false);
  const [cleaningUpEvents, setCleaningUpEvents] = useState(false);
  const [resetingRecurringEvents, setResetingRecurringEvents] = useState(false);
  
  const { 
    bgColor, 
    textColor, 
    borderColor, 
    cardBgColor, 
    subtextColor 
  } = themeStyles;

  // Update membership days left for all users
  const updateMembershipDays = async () => {
    try {
      setUpdatingMemberships(true);
      await updateAllUsersMembershipDays();
      Alert.alert('Success', 'All membership days have been updated successfully.');
    } catch (error) {
      console.error('Error updating membership days:', error);
      Alert.alert('Error', 'Failed to update membership days. Please try again.');
    } finally {
      setUpdatingMemberships(false);
    }
  };
  
  // Run updateMembershipDays on component mount
  useEffect(() => {
    const runUpdateMembershipDays = async () => {
      try {
        await updateAllUsersMembershipDays();
        console.log('✅ Updated membership days for all users from dashboard');
      } catch (error) {
        console.error('Error updating membership days:', error);
      }
    };
    
    runUpdateMembershipDays();
  }, []);
  
  // Clean up duplicate events
  const handleCleanupEvents = async () => {
    try {
      // Confirm with the user
      Alert.alert(
        'Clean Up Duplicate Events',
        'This will remove all duplicate events from the database. Are you sure you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Clean Up',
            onPress: async () => {
              try {
                setCleaningUpEvents(true);
                const result = await cleanupAllDuplicateEvents();
                Alert.alert(
                  'Cleanup Complete',
                  `Total events: ${result.totalEvents}\nUnique events: ${result.uniqueEvents}\nDuplicates removed: ${result.duplicatesRemoved}`
                );
              } catch (error) {
                console.error('Error cleaning up events:', error);
                Alert.alert('Error', 'Failed to clean up duplicate events. Please try again.');
              } finally {
                setCleaningUpEvents(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error handling cleanup:', error);
    }
  };
  
  // Reset recurring events
  const handleResetRecurringEvents = async () => {
    try {
      // Confirm with the user
      Alert.alert(
        'Reset Recurring Events',
        'This will reset the processing flag for all recurring events, allowing them to be processed again. Are you sure you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Reset',
            onPress: async () => {
              try {
                setResetingRecurringEvents(true);
                const count = await resetAllRecurringEvents();
                Alert.alert(
                  'Reset Complete',
                  `${count} recurring events have been reset.`
                );
              } catch (error) {
                console.error('Error resetting recurring events:', error);
                Alert.alert('Error', 'Failed to reset recurring events. Please try again.');
              } finally {
                setResetingRecurringEvents(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error handling reset:', error);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count members (users)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const membersCount = usersSnapshot.size;
        
        // Count coaches
        const coachesSnapshot = await getDocs(collection(db, 'coaches'));
        const coachesCount = coachesSnapshot.size;
        
        // Count today's events
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const eventsQuery = query(
          collection(db, 'events'),
          where('date', '>=', Timestamp.fromDate(today)),
          where('date', '<', Timestamp.fromDate(tomorrow))
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsCount = eventsSnapshot.size;
        
        setStats({
          members: membersCount,
          coaches: coachesCount,
          activeEvents: eventsCount,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();
  }, []);

  // Fetch gym hours
  useEffect(() => {
    const fetchGymHours = async () => {
      try {
        const gymHoursDoc = await getDoc(doc(db, 'settings', 'gymHours'));
        
        if (gymHoursDoc.exists()) {
          setGymHours(gymHoursDoc.data() as GymHours);
        } else {
          // If no document exists, create one with default hours
          await setDoc(doc(db, 'settings', 'gymHours'), DEFAULT_GYM_HOURS);
        }
      } catch (error) {
        console.error('Error fetching gym hours:', error);
      }
    };
    
    fetchGymHours();
  }, []);

  // Fetch coaches and check availability
  useEffect(() => {
    console.log('Fetching coaches from Firestore');
    const coachesRef = collection(db, 'coaches');
    const coachesQuery = query(coachesRef);
    
    const unsubscribe = onSnapshot(
      coachesQuery,
      (snapshot) => {
        console.log(`Received ${snapshot.docs.length} coaches from Firestore`);
        const coaches: CoachWithAvailability[] = snapshot.docs.map((doc) => {
          const coachData = doc.data() as Coach;
          
          // Check if coach is available today
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const todayName = dayNames[dayOfWeek];
          
          // Check if coach works today
          const isWorkingToday = coachData.daysAvailable?.[todayName as keyof typeof coachData.daysAvailable];
          
          // Check if current time is within working hours
          let isWithinHours = false;
          if (isWorkingToday) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTimeInMinutes = currentHour * 60 + currentMinutes;
            
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
            
            // Parse working hours
            const [startHour, startMinute] = (workingHoursToday.startTime || "00:00").split(':').map(Number);
            const [endHour, endMinute] = (workingHoursToday.endTime || "00:00").split(':').map(Number);
            
            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;
            
            isWithinHours = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
          }
          
          // Coach is available if working today and within hours
          const available = isWorkingToday && isWithinHours;
          
          return {
            ...coachData,
            id: doc.id,
            available
          };
        });
        
        // Sort coaches: available first, then by name
        const sortedCoaches = coaches.sort((a, b) => {
          if (a.available === b.available) {
            return a.fullName.localeCompare(b.fullName);
          }
          return a.available ? -1 : 1;
        });
        
        setAvailableCoaches(sortedCoaches);
      },
      (error) => {
        console.error('Error fetching coaches:', error);
      }
    );
    
    return () => unsubscribe();
  }, []);

  // Fetch today's events
  useEffect(() => {
    console.log('Fetching events from Firestore');
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Query events for today
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(
      eventsRef,
      where('date', '>=', Timestamp.fromDate(today)),
      where('date', '<', Timestamp.fromDate(tomorrow))
    );
    
    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        console.log(`Received ${snapshot.docs.length} events from Firestore`);
        const events: EventWithInterest[] = snapshot.docs.map((doc) => {
          const eventData = doc.data() as Event;
          return {
            ...eventData,
            id: doc.id,
            interested: false // Admin view doesn't need interest state
          };
        });
        
        setTodaysEvents(events);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching events:', error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, []);

  const getTodayGymHours = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[dayOfWeek] as keyof GymHours;
    
    return gymHours[todayName];
  };

  const openEditHoursModal = (day: keyof GymHours) => {
    setSelectedDay(day);
    setTempOpenHour(gymHours[day].open);
    setTempCloseHour(gymHours[day].close);
    setIsEditingHours(true);
  };

  const saveGymHours = async () => {
    if (!selectedDay) return;
    
    setIsSaving(true);
    
    try {
      // Create a new object with updated hours
      const updatedHours = {
        ...gymHours,
        [selectedDay]: {
          open: tempOpenHour,
          close: tempCloseHour
        }
      };
      
      // Update in Firestore
      await updateDoc(doc(db, 'settings', 'gymHours'), updatedHours);
      
      // Update local state
      setGymHours(updatedHours);
      setIsEditingHours(false);
    } catch (error) {
      console.error('Error saving gym hours:', error);
      Alert.alert('Error', 'Failed to save gym hours');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const navigateToCoach = (coachId: string) => {
    router.push(`/(admin)/coaches/edit?id=${coachId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 ${bgColor} justify-center items-center`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`mt-4 ${subtextColor}`}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <TextErrorBoundary>
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <AdminPageHeader 
          title={t('admin.dashboard.title')}
          actions={[
            {
              icon: "bell",
              onPress: () => router.push("/(admin)/notifications"),
              backgroundColor: isDark ? "bg-gray-700" : "bg-gray-100",
              color: isDark ? "#fff" : "#000"
            }
          ]}
        />
        
        <ScrollView 
          style={tw`flex-1`}
          contentContainerStyle={tw`p-4`}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-3xl font-bold ${textColor}`}>{t('admin.dashboard.welcome')}</Text>
            <Text style={tw`${subtextColor} mt-1`}>
              {t('admin.dashboard.overview')}
            </Text>
          </View>

          {/* Gym Hours Card */}
          <View style={tw`${cardBgColor} rounded-2xl p-4 shadow-md mb-6`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={tw`text-lg font-bold ${textColor}`}>{t('admin.dashboard.gymHours')}</Text>
              <TouchableOpacity 
                style={tw`bg-blue-500 px-3 py-1 rounded-lg`}
                onPress={() => setIsEditingHours(true)}
              >
                <Text style={tw`text-white`}>{t('common.configure')}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={tw`flex-row items-center mt-2`}>
              <View style={tw`w-3 h-3 rounded-full bg-green-500 mr-2`} />
              <Text style={tw`${textColor}`}>
                {t('admin.dashboard.openFromTo', { 
                  open: getTodayGymHours().open, 
                  close: getTodayGymHours().close 
                })}
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={tw`mb-6`}>
            <StatCard
              title={t('admin.dashboard.totalMembers')}
              count={stats.members}
              icon={<Feather name="users" size={24} color="#3B82F6" />}
              bgColor={cardBgColor}
              textColor={textColor}
              subtextColor={subtextColor}
            />
            
            <StatCard
              title={t('admin.dashboard.totalCoaches')}
              count={stats.coaches}
              icon={<Feather name="user-check" size={24} color="#3B82F6" />}
              bgColor={cardBgColor}
              textColor={textColor}
              subtextColor={subtextColor}
            />
            
            <StatCard
              title={t('admin.dashboard.activeEventsToday')}
              count={stats.activeEvents}
              icon={<Feather name="calendar" size={24} color="#3B82F6" />}
              bgColor={cardBgColor}
              textColor={textColor}
              subtextColor={subtextColor}
            />
          </View>

          {/* Currently Available Coaches */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-xl font-semibold ${textColor} mb-4`}>
              {t('admin.dashboard.availableCoaches')}
            </Text>
            
            {availableCoaches.filter(coach => coach.available).length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-2`}>
                {availableCoaches
                  .filter(coach => coach.available)
                  .map((coach) => (
                    <TouchableOpacity
                      key={coach.id}
                      style={tw`items-center mr-6`}
                      onPress={() => navigateToCoach(coach.id)}
                    >
                      <View style={tw`relative`}>
                        {coach.photoURL ? (
                          <Image 
                            source={{ uri: coach.photoURL }} 
                            style={tw`w-16 h-16 rounded-full`}
                          />
                        ) : (
                          <View style={tw`w-16 h-16 rounded-full bg-gray-300 items-center justify-center`}>
                            <Feather name="user" size={24} color={isDark ? "#1F2937" : "#6B7280"} />
                          </View>
                        )}
                        <View style={tw`absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 ${isDark ? 'border-gray-800' : 'border-white'}`} />
                      </View>
                      <Text style={tw`font-medium mt-2 ${textColor}`}>{coach.fullName.split(' ')[0]}</Text>
                      <Text style={tw`${subtextColor} text-xs`}>{coach.specialty}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            ) : (
              <View style={tw`${cardBgColor} rounded-lg p-4 items-center`}>
                <Text style={tw`${subtextColor}`}>{t('admin.dashboard.noCoachesAvailable')}</Text>
              </View>
            )}
          </View>

          {/* Today's Events */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-xl font-semibold ${textColor} mb-4`}>
              {t('admin.dashboard.todayEvents')}
            </Text>
            
            {todaysEvents.length > 0 ? (
              todaysEvents.map((event) => (
                <View key={event.id} style={tw`flex-row items-center ${cardBgColor} rounded-xl mb-4 p-3 shadow-sm`}>
                  {event.coachPhoto ? (
                    <Image 
                      source={{ uri: event.coachPhoto }} 
                      style={tw`w-12 h-12 rounded-full mr-3`}
                    />
                  ) : (
                    <View style={tw`w-12 h-12 rounded-full mr-3 bg-gray-300 items-center justify-center`}>
                      <Feather name="user" size={20} color={isDark ? "#1F2937" : "#6B7280"} />
                    </View>
                  )}
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-bold ${textColor}`}>{event.title}</Text>
                    <Text style={tw`${subtextColor} text-xs mt-1`}>{event.startTime} - {event.endTime}</Text>
                    <Text style={tw`text-blue-500 text-xs mt-1`}>{event.coachName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push(`/(admin)/events/edit?id=${event.id}`)}>
                    <Feather name="edit" size={18} color={isDark ? "#A1A1AA" : "#6B7280"} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={tw`${cardBgColor} rounded-lg p-4 items-center`}>
                <Text style={tw`${subtextColor}`}>{t('admin.dashboard.noEventsToday')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
        
        {/* Gym Hours Modal */}
        <Modal
          visible={isEditingHours}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsEditingHours(false)}
        >
          <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
            <View style={tw`${cardBgColor} rounded-xl p-5 w-11/12 max-w-md`}>
              <Text style={tw`text-xl font-bold ${textColor} mb-4`}>{t('admin.dashboard.configureHours')}</Text>
              
              {selectedDay ? (
                <View style={tw`mb-4`}>
                  <Text style={tw`text-lg font-medium ${textColor} mb-2`}>
                    {t(`admin.dashboard.days.${selectedDay}`)}
                  </Text>
                  <View style={tw`flex-row justify-between items-center mb-2`}>
                    <Text style={tw`${subtextColor}`}>{t('admin.dashboard.openingTime')}:</Text>
                    <TextInput
                      style={tw`border ${borderColor} ${textColor} px-3 py-2 rounded-lg w-24 text-center`}
                      value={tempOpenHour}
                      onChangeText={setTempOpenHour}
                      placeholder="HH:MM"
                      placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    />
                  </View>
                  <View style={tw`flex-row justify-between items-center`}>
                    <Text style={tw`${subtextColor}`}>{t('admin.dashboard.closingTime')}:</Text>
                    <TextInput
                      style={tw`border ${borderColor} ${textColor} px-3 py-2 rounded-lg w-24 text-center`}
                      value={tempCloseHour}
                      onChangeText={setTempCloseHour}
                      placeholder="HH:MM"
                      placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    />
                  </View>
                  
                  <View style={tw`flex-row justify-end mt-4`}>
                    <TouchableOpacity 
                      style={tw`bg-gray-500 px-4 py-2 rounded-lg mr-2`}
                      onPress={() => setSelectedDay(null)}
                    >
                      <Text style={tw`text-white`}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={tw`bg-blue-500 px-4 py-2 rounded-lg`}
                      onPress={saveGymHours}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={tw`text-white`}>{t('common.save')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <TouchableOpacity 
                      key={day}
                      style={tw`flex-row justify-between items-center p-3 border-b ${borderColor}`}
                      onPress={() => openEditHoursModal(day as keyof GymHours)}
                    >
                      <Text style={tw`${textColor} font-medium`}>
                        {t(`admin.dashboard.days.${day}`)}
                      </Text>
                      <View style={tw`flex-row items-center`}>
                        <Text style={tw`${subtextColor}`}>
                          {gymHours[day as keyof GymHours].open} - {gymHours[day as keyof GymHours].close}
                        </Text>
                        <Feather name="chevron-right" size={18} color={isDark ? "#A1A1AA" : "#6B7280"} style={tw`ml-2`} />
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity 
                    style={tw`bg-gray-500 px-4 py-2 rounded-lg mt-4 self-end`}
                    onPress={() => setIsEditingHours(false)}
                  >
                    <Text style={tw`text-white`}>{t('common.close')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TextErrorBoundary>
  );
} 
