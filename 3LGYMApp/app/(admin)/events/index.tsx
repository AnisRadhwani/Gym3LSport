import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import tw from '@/config/tailwind';
import { deleteEvent, toggleEventRecurring } from '@/lib/firestoreServices';
import { Event } from '@/lib/types';
import EventCard from '@/components/EventCard';
import AdminPageHeader from '@/components/AdminPageHeader';
import { getCurrentWeekDays } from '@/lib/dateUtils';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import { useTheme } from '@/components/ThemeWrapper';
import { useLanguage } from '@/hooks/useLanguage';
import TextErrorBoundary from '@/components/TextErrorBoundary';

interface DayWithEvents {
  dayName: string;
  shortDate: string;
  isToday: boolean;
  fullDate: Date;
  events: Event[];
}

export default function EventsScreen() {
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [weekSchedule, setWeekSchedule] = useState<DayWithEvents[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor
  } = themeStyles;

  useEffect(() => {
    // Get current week days from utility with correct locale
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    const weekDays = getCurrentWeekDays(locale);
    
    // Calculate date range for the week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Calculate the start of the current week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to get Monday
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Set up the real-time listener for this week's events
    const eventsRef = collection(db, 'events');
    
    // Query for current week's events (both recurring and non-recurring)
    const currentWeekQuery = query(
      eventsRef,
      where('date', '>=', Timestamp.fromDate(startOfWeek)),
      where('date', '<', Timestamp.fromDate(nextWeek))
    );
    
    // Create a subscription to the events collection
    const unsubscribe = onSnapshot(
      currentWeekQuery,
      (snapshot) => {
        processEvents(snapshot.docs);
      },
      (error) => {
        console.error('Error listening to events collection:', error);
        Alert.alert(t('common.error'), t('admin.events.errorLoading'));
        setLoading(false);
      }
    );
    
    // Process events from snapshots
    const processEvents = (docs: any[]) => {
      // Parse events from the snapshot
      const events: Event[] = docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as Event));
      
      // Group events by date (toDateString)
      const eventsMap = new Map();
      
      // Process each weekday
      weekDays.forEach(day => {
        // Reset time to start of day for comparison
        const startOfDay = new Date(day.fullDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        // End of day for comparison
        const endOfDay = new Date(day.fullDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Filter events that occur on this specific day by exact date
        const dayEvents = events.filter(event => {
          try {
            const eventDate = event.date instanceof Date ? event.date : event.date.toDate();
            return eventDate >= startOfDay && eventDate <= endOfDay;
          } catch (error) {
            console.error(`Error comparing event date for event ${event.id}:`, error);
            return false;
          }
        });
        
        // Sort events by time
        dayEvents.sort((a, b) => {
          const timeA = a.startTime.split(':').map(Number);
          const timeB = b.startTime.split(':').map(Number);
          
          if (timeA[0] !== timeB[0]) {
            return timeA[0] - timeB[0]; // Sort by hour
          }
          return timeA[1] - timeB[1]; // Sort by minute if hours are equal
        });
        
        // Store events for this day
        eventsMap.set(day.dayName, dayEvents);
      });
      
      // Combine each day with its events
      const combinedSchedule = weekDays.map(day => ({
        ...day,
        events: eventsMap.get(day.dayName) || []
      }));
      
      setWeekSchedule(combinedSchedule);
      
      // By default, expand today or first day with events
      const todayIndex = combinedSchedule.findIndex(day => day.isToday);
      
      if (todayIndex !== -1) {
        if (combinedSchedule[todayIndex].events.length > 0) {
          setExpandedDay(combinedSchedule[todayIndex].dayName);
        } else {
          // Find the first day with events
          const firstDayWithEvents = combinedSchedule.find(day => day.events.length > 0);
          if (firstDayWithEvents) {
            setExpandedDay(firstDayWithEvents.dayName);
          }
        }
      }
      
      setLoading(false);
    };
    
    // Clean up the listener when the component unmounts
    return () => {
      unsubscribe();
    };
  }, [t, language]);
  
  const handleEditEvent = (eventId: string) => {
    router.push(`/(admin)/events/edit?id=${eventId}`);
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      t('admin.events.deleteEvent'),
      t('admin.events.deleteConfirm'),
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
              // Delete the event from Firestore
              const success = await deleteEvent(eventId);
              
              if (success) {
                // No need to manually update local state as onSnapshot will handle it
                Alert.alert(t('common.success'), t('admin.events.deleteSuccess'));
              } else {
                throw new Error('Failed to delete event');
              }
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert(t('common.error'), t('admin.events.deleteError'));
            }
          },
        },
      ]
    );
  };
  
  const handleToggleRecurring = async (eventId: string, currentStatus: boolean) => {
    try {
      const success = await toggleEventRecurring(eventId, currentStatus);
      
      if (success) {
        // No alert needed as the UI will update automatically with onSnapshot
        console.log(`Event ${eventId} recurring status toggled to ${!currentStatus}`);
      } else {
        throw new Error('Failed to toggle recurring status');
      }
    } catch (error) {
      console.error('Error toggling recurring status:', error);
      Alert.alert(t('common.error'), t('admin.events.recurringToggleError'));
    }
  };

  return (
    <TextErrorBoundary>
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <AdminPageHeader 
          title={t('admin.events.title')}
          onBack={() => router.back()}
          actions={[
            {
              icon: "plus",
              onPress: () => router.push('/(admin)/events/add')
            }
          ]}
        />
        
        {loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={tw`mt-4 ${subtextColor}`}>{t('admin.events.loading')}</Text>
          </View>
        ) : (
          <ScrollView 
            style={tw`flex-1`} 
            contentContainerStyle={tw`p-4`}
            showsVerticalScrollIndicator={false}
          >
            {weekSchedule.map((day) => (
              <View key={day.dayName} style={tw`mb-4`}>
                <TouchableOpacity
                  style={tw`flex-row items-center ${cardBgColor} rounded-xl shadow-sm p-4 ${day.isToday ? (isDark ? 'bg-blue-900' : 'bg-blue-50') : ''}`}
                  onPress={() => setExpandedDay(expandedDay === day.dayName ? null : day.dayName)}
                >
                  <View 
                    style={tw`w-3 h-3 rounded-full ${day.dayName === 'Monday' ? 'bg-blue-500' : day.dayName === 'Sunday' ? 'bg-red-500' : (isDark ? 'bg-gray-500' : 'bg-gray-400')} mr-3`}
                  />
                  <Text style={tw`text-lg font-medium flex-1 ${textColor}`}>{day.dayName}</Text>
                  <Text style={tw`text-sm ${subtextColor} mr-2`}>
                    {day.isToday ? t('admin.events.today') : day.shortDate}
                  </Text>
                  <Text style={tw`${subtextColor} mr-2`}>
                    {day.events.length > 0 
                      ? t(day.events.length === 1 ? 'admin.events.eventCount' : 'admin.events.eventCountPlural', { count: day.events.length }) 
                      : t('admin.events.noEvents')}
                  </Text>
                  <Feather 
                    name={expandedDay === day.dayName ? 'chevron-down' : 'chevron-right'} 
                    size={20} 
                    color={isDark ? "#A1A1AA" : "#4B5563"} 
                  />
                </TouchableOpacity>
                
                {expandedDay === day.dayName && (
                  <View style={tw`mt-2`}>
                    {day.events.length === 0 ? (
                      <View style={tw`${cardBgColor} rounded-xl p-6 items-center`}>
                        <Feather name="calendar" size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <Text style={tw`${subtextColor} mt-2`}>{t('admin.events.noEventsScheduled')}</Text>
                        <TouchableOpacity
                          style={tw`mt-4 bg-blue-500 px-4 py-2 rounded-lg`}
                          onPress={() => router.push('/(admin)/events/add')}
                        >
                          <Text style={tw`text-white font-medium`}>{t('admin.events.addEvent')}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      day.events.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEdit={() => handleEditEvent(event.id)}
                          onDelete={() => handleDeleteEvent(event.id)}
                          onToggleRecurring={() => handleToggleRecurring(event.id, event.isRecurring || false)}
                          isAdminView={true}
                          isDark={isDark}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </TextErrorBoundary>
  );
} 
