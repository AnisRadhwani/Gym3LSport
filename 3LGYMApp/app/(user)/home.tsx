import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import tw from '../../config/tailwind';
import { useRouter } from 'expo-router';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/components/ThemeWrapper';
import { collection, onSnapshot, query, where, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import { Coach, Event } from '@/lib/types';
import useAuth from '@/hooks/useAuth';
import { updateMembershipDaysLeft } from '@/lib/firestoreServices';
import TextErrorBoundary from '@/components/TextErrorBoundary';
import { useLanguage } from '@/hooks/useLanguage';

interface CoachWithAvailability extends Coach {
  available: boolean;
}

interface EventWithInterest extends Event {
  interested: boolean;
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

// Default gym hours in case settings aren't available
const DEFAULT_GYM_HOURS: GymHours = {
  monday: { open: '08:00', close: '22:00' },
  tuesday: { open: '08:00', close: '22:00' },
  wednesday: { open: '08:00', close: '22:00' },
  thursday: { open: '08:00', close: '22:00' },
  friday: { open: '08:00', close: '22:00' },
  saturday: { open: '09:00', close: '20:00' },
  sunday: { open: '10:00', close: '18:00' },
};

// Sample coaches for unauthenticated users
const sampleCoaches = [
  {
    id: '1',
    fullName: 'Mike Johnson',
    specialty: 'Strength',
    photoURL: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    available: true,
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
      endTime: '17:00'
    }
  },
  {
    id: '2',
    fullName: 'Sarah Lee',
    specialty: 'Yoga',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    available: true,
    daysAvailable: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false
    },
    workingHours: {
      startTime: '10:00',
      endTime: '18:00'
    }
  },
  {
    id: '3',
    fullName: 'Alex Kim',
    specialty: 'Cardio',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    available: true,
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
      startTime: '12:00',
      endTime: '20:00'
    }
  },
  {
    id: '4',
    fullName: 'Emma Wilson',
    specialty: 'Pilates',
    photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    available: true,
    daysAvailable: {
      monday: false,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    workingHours: {
      startTime: '08:00',
      endTime: '16:00'
    }
  }
];

// Sample events for unauthenticated users
const sampleEvents = [
  {
    id: '1',
    title: 'Morning Strength Training',
    startTime: '10:00',
    endTime: '11:00',
    date: new Date(),
    coachId: '1',
    coachName: 'Mike Johnson',
    coachPhoto: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    interested: false,
    sendNotification: true,
    interestedUsers: []
  },
  {
    id: '2',
    title: 'Yoga Flow Session',
    startTime: '14:00',
    endTime: '15:00',
    date: new Date(),
    coachId: '2',
    coachName: 'Sarah Lee',
    coachPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    interested: false,
    sendNotification: true,
    interestedUsers: []
  },
  {
    id: '3',
    title: 'HIIT Cardio Blast',
    startTime: '18:00',
    endTime: '19:00',
    date: new Date(),
    coachId: '3',
    coachName: 'Alex Kim',
    coachPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    interested: false,
    sendNotification: true,
    interestedUsers: []
  }
];

export default function HomeScreen() {
  const { userProfile, loading: userLoading } = useUser();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { t } = useLanguage();
  const [availableCoaches, setAvailableCoaches] = useState<CoachWithAvailability[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<EventWithInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachesLoaded, setCoachesLoaded] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [gymHours, setGymHours] = useState<GymHours>(DEFAULT_GYM_HOURS);
  const [updatingMembership, setUpdatingMembership] = useState(false);
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor
  } = themeStyles;

  // Update membership days for current user
  useEffect(() => {
    // Only run if user is authenticated and profile is loaded
    if (!user?.uid || !userProfile || userLoading || authLoading) return;

    const updateUserMembership = async () => {
      setUpdatingMembership(true);
      try {
        // Update membership days for current user
        await updateMembershipDaysLeft(userProfile);
        console.log('✅ Updated membership days for current user');
      } catch (error) {
        console.error('Error updating membership days:', error);
      } finally {
        setUpdatingMembership(false);
      }
    };

    updateUserMembership();
  }, [user, userProfile, userLoading, authLoading]);

  // Fetch gym hours
  useEffect(() => {
    const fetchGymHours = async () => {
      try {
        const gymHoursDoc = await getDoc(doc(db, 'settings', 'gymHours'));
        
        if (gymHoursDoc.exists()) {
          setGymHours(gymHoursDoc.data() as GymHours);
        }
      } catch (error) {
        console.error('Error fetching gym hours:', error);
      }
    };
    
    fetchGymHours();
  }, []);

  // Get today's gym hours
  const getTodayGymHours = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[dayOfWeek] as keyof GymHours;
    
    return gymHours[todayName];
  };

  // Check if gym is currently open
  const isGymOpen = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;
    
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[dayOfWeek] as keyof GymHours;
    
    const todayHours = gymHours[todayName];
    
    // Parse opening hours
    const [openHour, openMinute] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
    
    const openTimeInMinutes = openHour * 60 + openMinute;
    const closeTimeInMinutes = closeHour * 60 + closeMinute;
    
    return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes <= closeTimeInMinutes;
  };

  // Fetch coaches and check availability
  useEffect(() => {
    // Wait until auth is determined
    if (authLoading) return;
    
    // If user is not authenticated, use sample data
    if (!user) {
      setAvailableCoaches(sampleCoaches);
      setCoachesLoaded(true);
      return;
    }

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
          const isWorkingToday = coachData.daysAvailable?.[todayName];
          
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
            id: doc.id,
            ...coachData,
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
        setCoachesLoaded(true);
      },
      (error) => {
        console.error('Error fetching coaches:', error);
        setError('Failed to load coaches data');
        setCoachesLoaded(true);
      }
    );
    
    return () => unsubscribe();
  }, [user, authLoading]);

  // Fetch today's events
  useEffect(() => {
    // Wait until auth is determined
    if (authLoading) return;
    
    // If user is not authenticated, use sample data
    if (!user) {
      setTodaysEvents(sampleEvents);
      setEventsLoaded(true);
      return;
    }

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
            id: doc.id,
            ...eventData,
            interested: eventData.interestedUsers?.includes(user?.uid || '') || false
          };
        });
        
        setTodaysEvents(events);
        setError(null);
        setEventsLoaded(true);
      },
      (error) => {
        console.error('Error fetching events:', error);
        setError('Failed to load events data');
        setEventsLoaded(true);
      }
    );
    
    return () => unsubscribe();
  }, [user, authLoading]);

  // Set loading to false when data is loaded
  useEffect(() => {
    if (!authLoading && (coachesLoaded && eventsLoaded)) {
      setLoading(false);
    }
  }, [coachesLoaded, eventsLoaded, authLoading]);

  const navigateToCoach = (coachId) => {
    router.push(`/(user)/coaches/${coachId}`);
  };

  // Toggle interest for today's events
  const toggleInterest = async (eventId: string) => {
    if (!user?.uid) {
      // If user is not authenticated, prompt to sign in
      alert('Please sign in to save your interests');
      return;
    }
    
    try {
      const eventRef = doc(db, 'events', eventId);
      const event = todaysEvents.find(event => event.id === eventId);
      
      if (event) {
        // Update locally first for immediate UI feedback
        setTodaysEvents(prev =>
          prev.map(event =>
            event.id === eventId ? { ...event, interested: !event.interested } : event
          )
        );
        
        // Then update in Firestore
        if (event.interested) {
          await updateDoc(eventRef, {
            interestedUsers: arrayRemove(user.uid)
          });
          
          // No need to show a message when removing interest
        } else {
          await updateDoc(eventRef, {
            interestedUsers: arrayUnion(user.uid)
          });
          
          // Show a toast or alert that a notification will be sent
          const eventDate = event.date instanceof Date ? event.date : event.date.toDate();
          const [hours, minutes] = event.startTime.split(':').map(Number);
          const eventDateTime = new Date(eventDate);
          eventDateTime.setHours(hours, minutes, 0, 0);
          
          // Only show notification message if the event is in the future
          const now = new Date();
          const twoHoursBefore = new Date(eventDateTime);
          twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);
          
          if (twoHoursBefore > now) {
            // Show toast or alert
            Alert.alert(
              t('home.notificationScheduled'),
              t('home.notificationScheduledMessage', { 
                eventTitle: event.title,
                time: twoHoursBefore.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              })
            );
          }
        }
      }
    } catch (error) {
      console.error('Error updating interest:', error);
      // Revert the local change if the update fails
      setTodaysEvents(prev =>
        prev.map(event =>
          event.id === eventId ? { ...event, interested: !event.interested } : event
        )
      );
    }
  };

  if (loading || authLoading) {
    return (
      <SafeAreaView style={tw`flex-1 ${bgColor} justify-center items-center`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`mt-4 ${subtextColor}`}>{t('home.loading')}</Text>
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
          onPress={() => {
            setLoading(true);
            setCoachesLoaded(false);
            setEventsLoaded(false);
          }}
        >
          <Text style={tw`text-white font-medium`}>{t('home.tryAgain')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <TextErrorBoundary>
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      
        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          {/* Welcome Card */}
          <View style={tw`mx-4 mt-4 ${cardBgColor} rounded-xl shadow-sm overflow-hidden`}>
            <Image
              source={require('../../assets/images/1.jpeg')}
              style={tw`w-full h-32`}
              resizeMode="cover"
            />
            <View style={tw`p-4`}>
              <Text style={tw`text-xl font-bold ${textColor}`}>{t('home.welcome')}, {userProfile?.displayName || userProfile?.fullName || 'Member'}</Text>
              <Text style={tw`${subtextColor} mt-1`}>{t('home.readyWorkout')}</Text>
              
              <View style={tw`flex-row justify-between items-center mt-3`}>
                <View style={tw`flex-row items-center`}>
                  <View style={tw`w-2 h-2 rounded-full ${isGymOpen() ? 'bg-green-500' : 'bg-red-500'} mr-2`} />
                  <Text style={tw`${subtextColor}`}>{t('home.openFrom')} {getTodayGymHours().open}–{getTodayGymHours().close}</Text>
                </View>
                <TouchableOpacity style={tw`${isGymOpen() ? 'bg-blue-500' : 'bg-gray-500'} px-4 py-2 rounded-full`}>
                  <Text style={tw`text-white font-medium`}>{isGymOpen() ? t('home.openNow') : t('home.closedNow')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {!user && (
            <View style={tw`mx-4 mt-4 p-3 bg-yellow-100 rounded-lg flex-row items-center`}>
              <Feather name="info" size={18} color="#F59E0B" style={tw`mr-2`} />
              <Text style={tw`text-yellow-800 flex-1`}>
                Sign in to see real-time data and save your interests
              </Text>
            </View>
          )}
          
          {/* Available Coaches */}
          <View style={tw`mt-6 px-4`}>
            <Text style={tw`text-lg font-bold mb-4 ${textColor}`}>{t('home.availableCoaches')}</Text>
            
            {availableCoaches.length > 0 ? (
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
              <View style={tw`items-center py-4 ${cardBgColor} rounded-lg`}>
                <Text style={tw`${subtextColor}`}>{t('home.noCoaches')}</Text>
              </View>
            )}

            {availableCoaches.filter(coach => coach.available).length === 0 && availableCoaches.length > 0 && (
              <View style={tw`items-center py-4 ${cardBgColor} rounded-lg`}>
                <Text style={tw`${subtextColor}`}>{t('home.noCoaches')}</Text>
              </View>
            )}
          </View>
          
          {/* Today's Events */}
          <View style={tw`mt-6 px-4 mb-8`}>
            <Text style={tw`text-lg font-bold mb-4 ${textColor}`}>{t('home.todayEvents')}</Text>
            
            {todaysEvents.length > 0 ? (
              todaysEvents.map((event) => (
                <TouchableOpacity 
                  key={event.id} 
                  style={tw`flex-row items-center ${cardBgColor} rounded-xl mb-4 p-3 shadow-sm`}
                  onPress={() => event.coachId && navigateToCoach(event.coachId)}
                  activeOpacity={0.8}
                >
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
                  <TouchableOpacity onPress={() => toggleInterest(event.id)}>
                    <Feather 
                      name="heart" 
                      size={20} 
                      color={event.interested ? "#3B82F6" : (isDark ? "#4B5563" : "#D1D5DB")} 
                      solid={event.interested}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={tw`items-center py-6 ${cardBgColor} rounded-lg`}>
                <Text style={tw`${subtextColor}`}>{t('home.noEvents')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
        
        {/* Bottom Navigation is handled by the (user)/_layout.tsx */}
      </SafeAreaView>
    </TextErrorBoundary>
  );
} 
