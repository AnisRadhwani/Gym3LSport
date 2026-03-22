import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from '../../../config/tailwind';
import { useTheme } from '@/components/ThemeWrapper';
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import { Event } from '@/lib/types';
import useAuth from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import TextErrorBoundary from '@/components/TextErrorBoundary';
import { useLanguage } from '@/hooks/useLanguage';

// Simple collapsible component
const Collapsible = memo(({ collapsed, children }) => {
  if (collapsed) return null;
  return <>{children}</>;
});

// Event card component to reduce re-renders
const EventCard = memo(({ event, isDark, textColor, subtextColor, borderColor, toggleInterest }) => {
  return (
    <View 
      key={event.id} 
      style={tw`p-4 border-b ${borderColor}`}
    >
      {event.imageURL && (
        <Image 
          source={{ uri: event.imageURL }} 
          style={tw`w-full h-40 rounded-lg mb-3`}
          resizeMode="cover"
        />
      )}
      
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <Text style={tw`font-bold text-base ${textColor}`}>{event.title}</Text>
        <TouchableOpacity onPress={() => toggleInterest(event.id)}>
          <Feather 
            name="heart" 
            size={20} 
            color={event.interested ? "#3B82F6" : (isDark ? "#6B7280" : "#D1D5DB")} 
          />
        </TouchableOpacity>
      </View>
      
      <Text style={tw`${subtextColor} mb-3`}>
        {event.startTime} - {event.endTime}
      </Text>
      
      <View style={tw`flex-row items-center`}>
        {event.coachPhoto ? (
          <Image 
            source={{ uri: event.coachPhoto }} 
            style={tw`w-8 h-8 rounded-full mr-2`}
          />
        ) : (
          <View style={tw`w-8 h-8 rounded-full mr-2 bg-gray-300 items-center justify-center`}>
            <Feather name="user" size={16} color={isDark ? "#1F2937" : "#6B7280"} />
          </View>
        )}
        <Text style={tw`${textColor} font-medium`}>
          {event.coachName}
        </Text>
      </View>
      
      {event.interested && (
        <View style={tw`mt-3 ${isDark ? 'bg-blue-900' : 'bg-blue-50'} p-2 rounded-lg`}>
          <Text style={tw`text-blue-500 text-xs`}>
            You're interested in this event
          </Text>
        </View>
      )}
    </View>
  );
});

// Day header component
const DayHeader = memo(({ day, isDark, textColor, subtextColor, cardBgColor, isExpanded, toggleDayExpansion, t }) => {
  // Create a formatted event count message
  const getEventCountText = (count) => {
    if (count === 0) return 'No events';
    return count === 1 ? `${count} event` : `${count} events`;
  };

  return (
    <TouchableOpacity 
      style={tw`flex-row justify-between items-center ${cardBgColor} p-4 rounded-lg ${day.isToday ? (isDark ? 'bg-blue-900' : 'bg-blue-50') : ''} ${isExpanded && day.events.length > 0 ? 'rounded-b-none' : ''}`}
      onPress={() => toggleDayExpansion(day.dayName)}
    >
      <View style={tw`flex-row items-center`}>
        <Text style={tw`font-bold text-base ${day.isToday ? 'text-blue-500' : textColor}`}>
          {day.isToday ? 'Today' : day.dayName}
        </Text>
        <Text style={tw`text-sm ${subtextColor} ml-2`}>
          {day.date}
        </Text>
      </View>
      <View style={tw`flex-row items-center`}>
        <Text style={tw`${subtextColor} mr-2`}>
          {getEventCountText(day.events.length)}
        </Text>
        <Feather 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={day.isToday ? '#3B82F6' : (isDark ? '#9CA3AF' : '#6B7280')} 
        />
      </View>
    </TouchableOpacity>
  );
});

// Day schedule component
const DaySchedule = memo(({ day, isExpanded, isDark, textColor, subtextColor, cardBgColor, borderColor, toggleInterest, t }) => {
  if (!isExpanded) return null;
  
  return (
    <>
      {day.events.length > 0 ? (
        <View style={tw`${cardBgColor} border-t ${borderColor} rounded-b-lg overflow-hidden`}>
          {day.events.map((event) => (
            <EventCard 
              key={event.id}
              event={event}
              isDark={isDark}
              textColor={textColor}
              subtextColor={subtextColor}
              borderColor={borderColor}
              toggleInterest={toggleInterest}
            />
          ))}
        </View>
      ) : (
        <View style={tw`${cardBgColor} p-4 rounded-b-lg items-center`}>
          <Text style={tw`${subtextColor}`}>No events</Text>
        </View>
      )}
    </>
  );
});

interface ClassEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: Date;
  coachId: string;
  coachName: string;
  coachPhoto?: string;
  imageURL?: string;
  interested: boolean;
  isRecurring?: boolean;
}

interface DayScheduleType {
  date: string;
  dayName: string;
  isToday: boolean;
  events: ClassEvent[];
}

export default function EventsScreen() {
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [weekSchedule, setWeekSchedule] = useState<DayScheduleType[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor
  } = themeStyles;

  // Get the current week days with correct locale
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  
  // Get current date and week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate the start of the current week (Monday)
  const startOfWeek = new Date(today);
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to get Monday
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  
  // Create array of dates for the week
  const currentWeek = Array(7).fill(0).map((_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    return {
      fullDate: date,
      dayName: date.toLocaleDateString(locale, { weekday: 'long' }),
      isToday: date.toDateString() === today.toDateString()
    };
  });
  
  // Format week days for UI
  const formattedWeek = currentWeek.map(day => {
    return {
      date: day.fullDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      dayName: day.dayName,
      isToday: day.isToday,
      events: []
    };
  });

  // Toggle day expansion - memoized to prevent re-renders
  const toggleDayExpansion = useCallback((day: string) => {
    setExpandedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  }, []);

  // Toggle interest in a class - memoized to prevent re-renders
  const toggleInterest = useCallback(async (eventId: string) => {
    if (!user?.uid) {
      Alert.alert('Sign In Required', 'Please sign in to save your interests');
      return;
    }
    
    try {
      const eventRef = doc(db, 'events', eventId);
      const event = weekSchedule
        .flatMap(day => day.events)
        .find(event => event.id === eventId);
      
      if (event) {
        // Update locally first for immediate UI feedback
        setWeekSchedule(prev =>
          prev.map(day => ({
            ...day,
            events: day.events.map(event =>
              event.id === eventId
                ? { ...event, interested: !event.interested }
                : event
            ),
          }))
        );
        
        // Then update in Firestore
        if (event.interested) {
          await updateDoc(eventRef, {
            interestedUsers: arrayRemove(user.uid)
          });
        } else {
          await updateDoc(eventRef, {
            interestedUsers: arrayUnion(user.uid)
          });
          
          try {
            // Show notification alert
            Alert.alert(
              'Notification Scheduled',
              `You'll receive a notification before "${event.title}" starts.`
            );
          } catch (error) {
            console.error('Error showing notification alert:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error updating interest:', error);
      // No need to revert the UI state here as it will be updated by the listener
    }
  }, [user?.uid, weekSchedule]);

  // Fetch events from Firestore
  useEffect(() => {
    if (authLoading) return;
    
    let unsubscribe = () => {};
    
    if (user) {
      setLoading(true);
      
      // Calculate start and end of week
      const startOfWeekDate = new Date(currentWeek[0].fullDate);
      startOfWeekDate.setHours(0, 0, 0, 0);
      
      const endOfWeekDate = new Date(currentWeek[6].fullDate);
      endOfWeekDate.setHours(23, 59, 59, 999);
      
      console.log(`Fetching events for week: ${startOfWeekDate.toDateString()} to ${endOfWeekDate.toDateString()}`);
      
      // Query events for this week
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(
        eventsRef,
        where('date', '>=', Timestamp.fromDate(startOfWeekDate)),
        where('date', '<=', Timestamp.fromDate(endOfWeekDate))
      );
      
      unsubscribe = onSnapshot(
        eventsQuery,
        (snapshot) => {
          try {
            // Parse events from the snapshot
            const events = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            }));
            
            console.log(`Processing ${events.length} events for weekly view`);
            
            // Format events for our UI
            const formattedEvents = [];
            
            for (const event of events) {
              try {
                // Safely convert date
                let eventDate;
                if (event.date instanceof Date) {
                  eventDate = event.date;
                } else if (event.date && typeof event.date.toDate === 'function') {
                  eventDate = event.date.toDate();
                } else {
                  console.warn(`Skipping event ${event.id} due to invalid date`);
                  continue;
                }
                
                formattedEvents.push({
                  id: event.id,
                  title: event.title,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  date: eventDate,
                  coachId: event.coachId,
                  coachName: event.coachName,
                  coachPhoto: event.coachPhoto || '',
                  imageURL: event.imageURL || '',
                  isRecurring: event.isRecurring || false,
                  interested: event.interestedUsers?.includes(user?.uid || '') || false
                });
              } catch (error) {
                console.error(`Error processing event ${event.id}:`, error);
              }
            }
            
            // Group events by day
            const updatedWeek = formattedWeek.map(day => {
              try {
                // Get the full date for this day
                const dayDate = day.isToday 
                  ? new Date() 
                  : new Date(currentWeek.find(d => d.dayName === day.dayName)?.fullDate || new Date());
                
                // Reset time to start of day for comparison
                const startOfDay = new Date(dayDate);
                startOfDay.setHours(0, 0, 0, 0);
                
                // End of day for comparison
                const endOfDay = new Date(dayDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                // Filter events that occur on this specific day
                const dayEvents = formattedEvents.filter(event => {
                  try {
                    const eventDate = new Date(event.date);
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
                
                return {
                  ...day,
                  events: dayEvents
                };
              } catch (error) {
                console.error(`Error processing day ${day.dayName}:`, error);
                return {
                  ...day,
                  events: []
                };
              }
            });
            
            setWeekSchedule(updatedWeek);
            
            // By default, expand today or first day with events
            const todayIndex = updatedWeek.findIndex(day => day.isToday);
            
            if (todayIndex !== -1 && expandedDays.length === 0) {
              if (updatedWeek[todayIndex].events.length > 0) {
                setExpandedDays([updatedWeek[todayIndex].dayName]);
              } else {
                // Find the first day with events
                const firstDayWithEvents = updatedWeek.find(day => day.events.length > 0);
                if (firstDayWithEvents) {
                  setExpandedDays([firstDayWithEvents.dayName]);
                }
              }
            }
            
            setError(null);
          } catch (error) {
            console.error('Error processing events:', error);
            setError('Failed to process events data');
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching events:', error);
          setError('Failed to load events');
          setLoading(false);
        }
      );
    } else {
      // Use sample data for unauthenticated users
      const sampleSchedule = formattedWeek.map(day => {
        // For demo purposes, assign sample events to today and tomorrow
        let dayEvents = [];
        
        if (day.isToday) {
          dayEvents = [
            {
              id: '1',
              title: 'Morning Workout',
              startTime: '08:00',
              endTime: '09:00',
              date: new Date(),
              coachId: '1',
              coachName: 'Sample Coach',
              interested: false
            }
          ];
        }
        
        return {
          ...day,
          events: dayEvents
        };
      });
      
      setWeekSchedule(sampleSchedule);
      setLoading(false);
    }
    
    return unsubscribe;
  }, [user, authLoading, language]);

  if (loading || authLoading) {
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
          onPress={() => router.replace('/(user)/home')}
        >
          <Text style={tw`text-white font-medium`}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <TextErrorBoundary>
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <View style={tw`flex-row items-center justify-between px-4 py-3`}>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity onPress={() => router.back()} style={tw`mr-4`}>
              <Feather name="arrow-left" size={24} color={isDark ? "#FFFFFF" : "#000000"} />
            </TouchableOpacity>
            <Text style={tw`text-xl font-bold ${textColor}`}>Weekly Schedule</Text>
          </View>
          <TouchableOpacity>
            <Feather name="calendar" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        
        {!user && (
          <View style={tw`mx-4 my-2 p-3 bg-yellow-100 rounded-lg flex-row items-center`}>
            <Feather name="info" size={18} color="#F59E0B" style={tw`mr-2`} />
            <Text style={tw`text-yellow-800 flex-1`}>
              {t('home.signInPrompt')}
            </Text>
          </View>
        )}
        
        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          <View style={tw`p-4`}>
            {weekSchedule.map((day) => (
              <View key={day.dayName} style={tw`mb-4`}>
                <DayHeader
                  day={day}
                  isDark={isDark}
                  textColor={textColor}
                  subtextColor={subtextColor}
                  cardBgColor={cardBgColor}
                  isExpanded={expandedDays.includes(day.dayName)}
                  toggleDayExpansion={toggleDayExpansion}
                  t={t}
                />
                
                <DaySchedule
                  day={day}
                  isExpanded={expandedDays.includes(day.dayName)}
                  isDark={isDark}
                  textColor={textColor}
                  subtextColor={subtextColor}
                  cardBgColor={cardBgColor}
                  borderColor={borderColor}
                  toggleInterest={toggleInterest}
                  t={t}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </TextErrorBoundary>
  );
}