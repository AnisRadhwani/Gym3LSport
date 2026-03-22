import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import tw from '../../../config/tailwind';
import { useTheme } from '@/components/ThemeWrapper';
import { collection, onSnapshot, query, where, doc, getDoc, Timestamp, orderBy, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import { Coach, Event } from '@/lib/types';
import useAuth from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import OptimizedImage from '@/components/OptimizedImage';

interface EventWithInterest extends Event {
  interested: boolean;
  formattedDate?: string;
}

// Sample coaches for unauthenticated users
const sampleCoaches: Record<string, Coach> = {
  '1': {
    id: '1',
    fullName: 'Mike Johnson',
    specialty: 'Strength Coach',
    photoURL: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    description: 'Certified strength and conditioning specialist with over 8 years of experience. I focus on helping members build functional strength and achieve their fitness goals through personalized training programs and proper form guidance.',
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
  '2': {
    id: '2',
    fullName: 'Sarah Lee',
    specialty: 'Yoga Instructor',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    description: 'Experienced yoga instructor specializing in vinyasa and restorative yoga. My classes focus on mindfulness, proper alignment, and creating a peaceful environment for all skill levels.',
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
  '3': {
    id: '3',
    fullName: 'Alex Kim',
    specialty: 'Cardio Specialist',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    description: 'Passionate about helping clients achieve their cardiovascular fitness goals. My high-energy classes combine HIIT, dance cardio, and endurance training to create fun and effective workouts for all fitness levels.',
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
  '4': {
    id: '4',
    fullName: 'Emma Wilson',
    specialty: 'Pilates Instructor',
    photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    description: 'Certified Pilates instructor with 5+ years of experience. I specialize in mat and reformer Pilates, focusing on core strength, flexibility, and proper alignment to help clients build a strong foundation for all physical activities.',
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
  },
  '5': {
    id: '5',
    fullName: 'Leila Hachemi',
    specialty: 'Yoga Instructor',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    description: 'Experienced yoga instructor specializing in hatha and ashtanga yoga. My teaching philosophy emphasizes the connection between breath, movement, and mindfulness for a holistic approach to wellness.',
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
  }
};

// Sample events for unauthenticated users
const sampleEvents: Record<string, EventWithInterest[]> = {
  '1': [
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
      interestedUsers: [],
      formattedDate: 'Today'
    },
    {
      id: '2',
      title: 'Advanced Weight Training',
      startTime: '15:30',
      endTime: '16:30',
      date: (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      })(),
      coachId: '1',
      coachName: 'Mike Johnson',
      coachPhoto: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      interested: false,
      sendNotification: true,
      interestedUsers: [],
      formattedDate: 'Tomorrow'
    }
  ],
  '2': [
    {
      id: '3',
      title: 'Vinyasa Flow',
      startTime: '14:00',
      endTime: '15:00',
      date: new Date(),
      coachId: '2',
      coachName: 'Sarah Lee',
      coachPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      interested: false,
      sendNotification: true,
      interestedUsers: [],
      formattedDate: 'Today'
    },
    {
      id: '4',
      title: 'Restorative Yoga',
      startTime: '18:00',
      endTime: '19:00',
      date: (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      })(),
      coachId: '2',
      coachName: 'Sarah Lee',
      coachPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      interested: false,
      sendNotification: true,
      interestedUsers: [],
      formattedDate: 'Tomorrow'
    }
  ],
  '3': [
    {
      id: '5',
      title: 'HIIT Cardio Blast',
      startTime: '18:00',
      endTime: '19:00',
      date: new Date(),
      coachId: '3',
      coachName: 'Alex Kim',
      coachPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      interested: false,
      sendNotification: true,
      interestedUsers: [],
      formattedDate: 'Today'
    }
  ],
  '4': [
    {
      id: '6',
      title: 'Core Pilates',
      startTime: '09:00',
      endTime: '10:00',
      date: (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      })(),
      coachId: '4',
      coachName: 'Emma Wilson',
      coachPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      interested: false,
      sendNotification: true,
      interestedUsers: [],
      formattedDate: 'Tomorrow'
    }
  ],
  '5': [
    {
      id: '7',
      title: 'Hatha Yoga',
      startTime: '12:00',
      endTime: '13:00',
      date: new Date(),
      coachId: '5',
      coachName: 'Leila Hachemi',
      coachPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      interested: false,
      sendNotification: true,
      interestedUsers: [],
      formattedDate: 'Today'
    }
  ]
};

export default function CoachDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isDark, themeStyles } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachLoaded, setCoachLoaded] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const { t } = useTranslation();
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor
  } = themeStyles;
  
  // Fetch coach data
  useEffect(() => {
    if (!id) return;
    
    // Wait until auth is determined
    if (authLoading) return;
    
    // If user is not authenticated, use sample data
    if (!user) {
      const coachId = id as string;
      const sampleCoach = sampleCoaches[coachId];
      
      if (sampleCoach) {
        setCoach(sampleCoach);
        setUpcomingEvents(sampleEvents[coachId] || []);
      } else {
        setError('Coach not found');
      }
      
      setCoachLoaded(true);
      setEventsLoaded(true);
      return;
    }
    
    console.log(`Fetching coach with ID: ${id} from Firestore`);
    const coachRef = doc(db, 'coaches', id as string);
    
    const fetchCoach = async () => {
      try {
        const docSnap = await getDoc(coachRef);
        
        if (docSnap.exists()) {
          console.log('Coach found in Firestore');
          const coachData = {
            id: docSnap.id,
            ...docSnap.data()
          } as Coach;
          
          setCoach(coachData);
          setError(null);
        } else {
          console.log('No coach found with this ID');
          setError('Coach not found');
        }
      } catch (error) {
        console.error('Error fetching coach:', error);
        setError('Failed to load coach data');
      } finally {
        setCoachLoaded(true);
      }
    };
    
    fetchCoach();
  }, [id, user, authLoading]);
  
  // Fetch upcoming events for this coach
  useEffect(() => {
    if (!id || authLoading) return;
    
    if (!user) return;
    
    console.log(`Fetching events for coach ID: ${id} from Firestore`);
    // Get current date
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Get date 7 days from now
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Query events for this coach in the next 7 days
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(
      eventsRef,
      where('coachId', '==', id)
    );
    
    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        console.log(`Received ${snapshot.docs.length} events for coach from Firestore`);
        const eventsData = snapshot.docs.map((doc) => {
          const eventData = doc.data() as Event;
          return {
            id: doc.id,
            ...eventData
          };
        });
        
        // Filter and format events
        const filteredEvents: EventWithInterest[] = [];
        
        for (const eventData of eventsData) {
          try {
            // Safely convert date
            let eventDate: Date;
            if (eventData.date instanceof Date) {
              eventDate = eventData.date;
            } else if (eventData.date && typeof eventData.date.toDate === 'function') {
              eventDate = eventData.date.toDate();
            } else {
              console.warn(`Skipping event ${eventData.id} due to invalid date`);
              continue;
            }
            
            // Check if event is within the next 7 days
            if (eventDate < now || eventDate > nextWeek) {
              continue;
            }
            
            // Format date string
            let dateString = '';
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            if (eventDate.toDateString() === today.toDateString()) {
              dateString = 'Today';
            } else if (eventDate.toDateString() === tomorrow.toDateString()) {
              dateString = 'Tomorrow';
            } else {
              // Format as day name
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              dateString = days[eventDate.getDay()];
            }
            
            filteredEvents.push({
              ...eventData,
              interested: eventData.interestedUsers?.includes(user?.uid || '') || false,
              formattedDate: dateString
            });
          } catch (error) {
            console.error(`Error processing event ${eventData.id}:`, error);
          }
        }
        
        // Sort events by date and time
        filteredEvents.sort((a, b) => {
          let dateA: Date, dateB: Date;
          
          try {
            dateA = a.date instanceof Date ? a.date : a.date.toDate();
          } catch (e) {
            dateA = new Date();
          }
          
          try {
            dateB = b.date instanceof Date ? b.date : b.date.toDate();
          } catch (e) {
            dateB = new Date();
          }
          
          if (dateA.toDateString() === dateB.toDateString()) {
            // Same day, sort by time
            return a.startTime.localeCompare(b.startTime);
          }
          
          // Different days, sort by date
          return dateA.getTime() - dateB.getTime();
        });
        
        setUpcomingEvents(filteredEvents);
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
  }, [id, user?.uid, user, authLoading]);

  // Set loading to false when both coach and events are loaded
  useEffect(() => {
    if (coachLoaded && eventsLoaded) {
      setLoading(false);
    }
  }, [coachLoaded, eventsLoaded]);

  // Toggle interest in a class
  const toggleInterest = async (eventId: string) => {
    if (!user?.uid) {
      // If user is not authenticated, prompt to sign in
      alert('Please sign in to save your interests');
      return;
    }
    
    try {
      const eventRef = doc(db, 'events', eventId);
      const event = upcomingEvents.find(event => event.id === eventId);
      
      if (event) {
        // Update locally first for immediate UI feedback
        setUpcomingEvents(prev =>
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
              t('coach.notificationScheduled'),
              t('coach.notificationScheduledMessage', { 
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
      setUpcomingEvents(prev =>
        prev.map(event =>
          event.id === eventId ? { ...event, interested: !event.interested } : event
        )
      );
    }
  };

  // Format working hours for display
  const getWorkingHoursDisplay = () => {
    if (!coach) return '';
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[dayOfWeek];
    
    // Check if coach works today
    const isWorkingToday = coach.daysAvailable?.[todayName];
    
    if (isWorkingToday) {
      // Check if coach has day-specific hours for today
      if (coach.daySpecificHours && coach.daySpecificHours[todayName]) {
        const todayHours = coach.daySpecificHours[todayName];
        return `Today: ${todayHours.startTime} to ${todayHours.endTime}`;
      }
      return `Today: ${coach.workingHours?.startTime} to ${coach.workingHours?.endTime}`;
    } else {
      // Find next working day
      let nextWorkingDay = '';
      let daysToAdd = 1;
      
      while (!nextWorkingDay && daysToAdd <= 7) {
        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + daysToAdd);
        const nextDayName = dayNames[nextDay.getDay()];
        
        if (coach.daysAvailable?.[nextDayName]) {
          nextWorkingDay = nextDayName;
          break;
        }
        
        daysToAdd++;
      }
      
      if (nextWorkingDay) {
        const capitalizedDay = nextWorkingDay.charAt(0).toUpperCase() + nextWorkingDay.slice(1);
        // Check if coach has day-specific hours for next working day
        if (coach.daySpecificHours && coach.daySpecificHours[nextWorkingDay]) {
          const nextDayHours = coach.daySpecificHours[nextWorkingDay];
          return `${capitalizedDay}: ${nextDayHours.startTime} to ${nextDayHours.endTime}`;
        }
        return `${capitalizedDay}: ${coach.workingHours?.startTime} to ${coach.workingHours?.endTime}`;
      } else {
        return 'Not available this week';
      }
    }
  };

  // Get all working hours for each day
  const getAllWorkingHours = () => {
    if (!coach) return [];
    
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return dayNames.map(day => {
      const isAvailable = coach.daysAvailable?.[day] || false;
      let hours = { startTime: '', endTime: '' };
      
      if (isAvailable) {
        // Check if coach has day-specific hours for this day
        if (coach.daySpecificHours && coach.daySpecificHours[day]) {
          hours = coach.daySpecificHours[day];
        } else {
          hours = coach.workingHours;
        }
      }
      
      return {
        day,
        isAvailable,
        hours
      };
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#1F2937" : "#f9fafb"} />
      
      {/* Header */}
      <View style={tw`flex-row items-center p-4`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
          <Feather name="arrow-left" size={24} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>
      
      {!user && (
        <View style={tw`mx-4 mb-2 p-3 bg-yellow-100 rounded-lg flex-row items-center`}>
          <Feather name="info" size={18} color="#F59E0B" style={tw`mr-2`} />
          <Text style={tw`text-yellow-800 flex-1`}>
            Sign in to see real-time events and save your interests
          </Text>
        </View>
      )}
      
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View style={tw`flex-1 justify-center items-center px-4`}>
          <Text style={tw`${textColor} text-lg text-center mb-4`}>{error}</Text>
          <TouchableOpacity 
            style={tw`bg-blue-500 px-4 py-2 rounded-lg`}
            onPress={() => router.back()}
          >
            <Text style={tw`text-white font-medium`}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : coach ? (
        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          {/* Coach Profile Header */}
          <View style={tw`items-center px-4 mb-6`}>
            {coach.photoURL ? (
              <OptimizedImage
                source={coach.photoURL}
                style={tw`w-24 h-24 rounded-full mb-3`}
                contentFit="cover"
              />
            ) : (
              <View style={tw`w-24 h-24 rounded-full mb-3 bg-gray-300 items-center justify-center`}>
                <Feather name="user" size={32} color={isDark ? "#1F2937" : "#6B7280"} />
              </View>
            )}
            <Text style={tw`text-2xl font-bold ${textColor}`}>{coach.fullName}</Text>
            <Text style={tw`text-blue-500 mt-1`}>{coach.specialty}</Text>
            <View style={tw`flex-row items-center mt-2 ${isDark ? 'bg-blue-900' : 'bg-blue-100'} px-3 py-1 rounded-full`}>
              <Feather name="clock" size={14} color="#3B82F6" style={tw`mr-1`} />
              <Text style={tw`text-blue-500`}>{getWorkingHoursDisplay()}</Text>
            </View>
          </View>
          
          {/* Bio */}
          <View style={tw`px-4 mb-6`}>
            <Text style={tw`${textColor} leading-6`}>{coach.description || 'No bio available.'}</Text>
          </View>
          
          {/* Working Hours */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-xl font-bold px-4 mb-3 ${textColor}`}>Working Hours</Text>
            <View style={tw`mx-4 ${cardBgColor} rounded-lg overflow-hidden`}>
              {getAllWorkingHours().map(({ day, isAvailable, hours }) => (
                <View 
                  key={day}
                  style={tw`flex-row justify-between items-center px-4 py-3 border-b ${borderColor}`}
                >
                  <Text style={tw`${textColor} capitalize font-medium`}>{day}</Text>
                  {isAvailable ? (
                    <Text style={tw`${textColor}`}>{hours.startTime} - {hours.endTime}</Text>
                  ) : (
                    <Text style={tw`${subtextColor}`}>Not Available</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
          
          {/* Upcoming Events */}
          <View style={tw`px-4 mb-6`}>
            <Text style={tw`text-xl font-bold mb-3 ${textColor}`}>Upcoming Events</Text>
            {upcomingEvents.length === 0 ? (
              <Text style={tw`${subtextColor} text-center`}>No upcoming events found.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {upcomingEvents.map((event) => (
                  <View key={event.id} style={tw`${cardBgColor} rounded-lg mb-3 p-4`}>
                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`${textColor} font-bold`}>{event.title}</Text>
                      <Text style={tw`${subtextColor}`}>{event.formattedDate}</Text>
                    </View>
                    <View style={tw`flex-row items-center mb-2`}>
                      <Feather name="calendar" size={14} color="#6B7280" style={tw`mr-1`} />
                      <Text style={tw`${subtextColor}`}>
                        {event.date ? 
                          (event.date instanceof Date 
                            ? event.date.toLocaleDateString() 
                            : event.date.toDate().toLocaleDateString())
                          : 'Date not available'}
                      </Text>
                    </View>
                    <View style={tw`flex-row items-center mb-2`}>
                      <Feather name="clock" size={14} color="#6B7280" style={tw`mr-1`} />
                      <Text style={tw`${subtextColor}`}>
                        {event.startTime} - {event.endTime}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={tw`mt-3 bg-blue-500 px-4 py-2 rounded-full`}
                      onPress={() => toggleInterest(event.id)}
                    >
                      <Text style={tw`text-white font-medium`}>
                        {event.interested ? 'Remove Interest' : 'Show Interest'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={tw`${textColor} text-lg`}>Coach not found</Text>
        </View>
      )}
    </SafeAreaView>
  );
}