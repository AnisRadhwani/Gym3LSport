import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import tw from '../../../config/tailwind';
import { getCoaches, getEventById, updateEvent } from '@/lib/firestoreServices';
import { Coach, Event } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import CoachAvatar from '@/components/CoachAvatar';
import { useTheme } from '@/components/ThemeWrapper';
import { uploadImageToCloudinary } from '@/lib/utils/cloudinary';

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const eventId = typeof id === 'string' ? id : '';
  const { isDark, themeStyles } = useTheme();
  const { bgColor, textColor, borderColor, cardBgColor, subtextColor } = themeStyles;
  const inputBgColor = isDark ? 'bg-gray-800' : 'bg-white';

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [location, setLocation] = useState('');
  const [showCoachPicker, setShowCoachPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [isNewImage, setIsNewImage] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  // Load event data when component mounts
  useEffect(() => {
    if (!eventId) {
      Alert.alert('Error', 'No event ID provided');
      router.back();
      return;
    }

    const loadEvent = async () => {
      try {
        setLoadingEvent(true);
        const event = await getEventById(eventId);
        
        if (!event) {
          Alert.alert('Error', 'Event not found');
          router.back();
          return;
        }
        
        // Populate form with event data
        setTitle(event.title);
        setDate(event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date));
        setStartTime(event.startTime);
        setEndTime(event.endTime);
        setLocation(event.location || '');
        setSendNotification(event.sendNotification);
        setImage(event.imageURL || null);
        
        // Set selected coach with minimal data, will be replaced with full data when coaches load
        if (event.coachId) {
          setSelectedCoach({
            id: event.coachId,
            fullName: event.coachName,
            photoURL: event.coachPhoto || '',
            specialty: '',
            workingHours: { startTime: '', endTime: '' },
            daysAvailable: {
              monday: false,
              tuesday: false,
              wednesday: false,
              thursday: false,
              friday: false,
              saturday: false,
              sunday: false
            }
          });
        }
      } catch (error) {
        console.error('Error loading event:', error);
        Alert.alert('Error', 'Failed to load event details');
      } finally {
        setLoadingEvent(false);
      }
    };
    
    loadEvent();
  }, [eventId, router]);

  // Load coaches when component mounts
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        setLoadingCoaches(true);
        const coachesData = await getCoaches();
        setCoaches(coachesData);
        
        // If we have a selected coach and coaches are loaded, find the full coach object
        if (selectedCoach && coachesData.length > 0) {
          const fullCoach = coachesData.find(coach => coach.id === selectedCoach.id);
          if (fullCoach) {
            setSelectedCoach(fullCoach);
          }
        }
      } catch (error) {
        console.error('Error loading coaches:', error);
      } finally {
        setLoadingCoaches(false);
      }
    };
    
    loadCoaches();
  }, [selectedCoach?.id]);

  // Function to pick an image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setIsNewImage(true);
    }
  };

  // Format time from Date to 24hr string format (HH:MM)
  const formatTimeString = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle date change with validation
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set today's time to 00:00 to compare only dates

      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);

      if (selected < today) {
        Alert.alert('Invalid Date', 'You cannot select a date in the past.');
        return;
      }

      setDate(selectedDate);
    }
  };

  // Handle start time change
  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    
    if (selectedTime) {
      setStartTime(formatTimeString(selectedTime));
    }
  };

  // Handle end time change
  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    
    if (selectedTime) {
      setEndTime(formatTimeString(selectedTime));
    }
  };

  // Format date to string
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  // Save event changes
  const handleSaveChanges = async () => {
    if (!title) {
      Alert.alert('Error', 'Event title is required');
      return;
    }

    if (!selectedCoach) {
      Alert.alert('Error', 'Please select a coach for the event');
      return;
    }

    setLoading(true);

    try {
      let updatedImageURL = image;
      
      // Upload the image to Cloudinary if it's a new image (local URI)
      if (isNewImage && image && !image.startsWith('http')) {
        updatedImageURL = await uploadImageToCloudinary(image, 'events') || '';
        console.log("✅ Event image uploaded to Cloudinary:", updatedImageURL);
      }
      
      const updatedEvent: Partial<Event> = {
        title,
        date: Timestamp.fromDate(date),
        startTime,
        endTime,
        coachId: selectedCoach.id,
        coachName: selectedCoach.fullName,
        coachPhoto: selectedCoach.photoURL || '',
        location: location || '',
        imageURL: updatedImageURL || '',
        sendNotification
      };
      
      const success = await updateEvent(eventId, updatedEvent);
      
      if (success) {
        Alert.alert('Success', 'Event updated successfully');
        router.push('/(admin)/events');
      } else {
        Alert.alert('Error', 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'An error occurred while updating the event');
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation back to events list
  const handleBack = () => {
    router.push('/(admin)/events');
  };

  // Parse time string (HH:MM) to Date object for time picker
  const parseTimeToDate = (timeString: string) => {
    const now = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    now.setHours(hours, minutes, 0, 0);
    return now;
  };

  if (loadingEvent) {
    return (
      <SafeAreaView style={tw`flex-1 ${bgColor} justify-center items-center`} edges={['top']}>
        <ActivityIndicator size="large" color={isDark ? "#60A5FA" : "#3B82F6"} />
        <Text style={tw`mt-4 ${subtextColor}`}>Loading event...</Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1`}
    >
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <View style={tw`flex-row items-center justify-between p-4 ${cardBgColor} border-b ${borderColor}`}>
          <TouchableOpacity onPress={handleBack}>
            <Feather name="arrow-left" size={24} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold ${textColor}`}>Edit Event</Text>
          <View style={tw`w-6`} />
        </View>
        
        <ScrollView 
          style={tw`flex-1`} 
          contentContainerStyle={tw`p-4`}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Title */}
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Event Title</Text>
            <TextInput
              style={tw`border ${borderColor} rounded-lg p-3 ${inputBgColor} ${textColor}`}
              placeholder="Morning Yoga Class"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={title}
              onChangeText={setTitle}
            />
          </View>
          
          {/* Date & Time */}
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm`}>
            <Text style={tw`font-medium mb-4 ${textColor}`}>Date & Time</Text>
            
            {/* Date Picker */}
            <View style={tw`mb-4`}>
              <Text style={tw`${subtextColor} mb-1`}>Date</Text>
              <TouchableOpacity 
                style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center ${inputBgColor}`}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={tw`${textColor}`}>{formatDate(date)}</Text>
                <Feather name="calendar" size={18} color={isDark ? "#A1A1AA" : "#666"} />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              )}
            </View>
            
            {/* Time Pickers */}
            <View style={tw`flex-row justify-between`}>
              <View style={tw`flex-1 mr-2`}>
                <Text style={tw`${subtextColor} mb-1`}>Start Time</Text>
                <TouchableOpacity 
                  style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center ${inputBgColor}`}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={tw`${textColor}`}>{startTime}</Text>
                  <Feather name="clock" size={18} color={isDark ? "#A1A1AA" : "#666"} />
                </TouchableOpacity>
                
                {showStartTimePicker && (
                  <DateTimePicker
                    value={parseTimeToDate(startTime)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onStartTimeChange}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                )}
              </View>
              
              <View style={tw`flex-1`}>
                <Text style={tw`${subtextColor} mb-1`}>End Time</Text>
                <TouchableOpacity 
                  style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center ${inputBgColor}`}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={tw`${textColor}`}>{endTime}</Text>
                  <Feather name="clock" size={18} color={isDark ? "#A1A1AA" : "#666"} />
                </TouchableOpacity>
                
                {showEndTimePicker && (
                  <DateTimePicker
                    value={parseTimeToDate(endTime)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onEndTimeChange}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                )}
              </View>
            </View>
          </View>
          
          {/* Select Coach */}
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Select Coach</Text>
            
            <TouchableOpacity 
              style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center ${inputBgColor}`}
              onPress={() => setShowCoachPicker(!showCoachPicker)}
            >
              {selectedCoach ? (
                <View style={tw`flex-row items-center`}>
                  <CoachAvatar 
                    name={selectedCoach.fullName} 
                    photoURL={selectedCoach.photoURL}
                    size="small"
                  />
                  <Text style={tw`ml-2 ${textColor}`}>{selectedCoach.fullName}</Text>
                </View>
              ) : (
                <Text style={tw`${subtextColor}`}>Choose a coach</Text>
              )}
              <Feather name={showCoachPicker ? "chevron-up" : "chevron-down"} size={18} color={isDark ? "#A1A1AA" : "#666"} />
            </TouchableOpacity>
            
            {showCoachPicker && (
              <View style={tw`mt-2 border ${borderColor} rounded-lg max-h-64 ${inputBgColor}`}>
                {loadingCoaches ? (
                  <View style={tw`p-4 items-center`}>
                    <ActivityIndicator size="small" color={isDark ? "#60A5FA" : "#3B82F6"} />
                  </View>
                ) : coaches.length > 0 ? (
                  <ScrollView style={tw`max-h-60`} nestedScrollEnabled>
                    {coaches.map(coach => (
                      <TouchableOpacity
                        key={coach.id}
                        style={tw`p-3 border-b ${borderColor} flex-row items-center`}
                        onPress={() => {
                          setSelectedCoach(coach);
                          setShowCoachPicker(false);
                        }}
                      >
                        <CoachAvatar 
                          name={coach.fullName} 
                          photoURL={coach.photoURL}
                          size="small"
                        />
                        <View style={tw`ml-3`}>
                          <Text style={tw`font-medium ${textColor}`}>{coach.fullName}</Text>
                          <Text style={tw`text-xs ${subtextColor}`}>{coach.specialty}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={tw`p-4 items-center`}>
                    <Text style={tw`${subtextColor}`}>No coaches available</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {/* Gym Area / Room */}
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Gym Area / Room</Text>
            <TouchableOpacity 
              style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center`}
              onPress={() => setShowLocationPicker(!showLocationPicker)}
            >
              {location ? (
                <Text style={tw`${textColor}`}>{location}</Text>
              ) : (
                <Text style={tw`${subtextColor}`}>Select area (optional)</Text>
              )}
              <Feather name={showLocationPicker ? "chevron-up" : "chevron-down"} size={18} color={isDark ? "#A1A1AA" : "#666"} />
            </TouchableOpacity>
            {showLocationPicker && (
              <View style={tw`mt-2 border ${borderColor} rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                {['Floor 1', 'Floor 2'].map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={tw`p-3 border-b ${borderColor}`}
                    onPress={() => {
                      setLocation(area);
                      setShowLocationPicker(false);
                    }}
                  >
                    <Text style={tw`${textColor}`}>{area}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* Event Image */}
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Event Image (Optional)</Text>
            
            <TouchableOpacity 
              style={tw`border ${borderColor} rounded-lg p-6 items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
              onPress={pickImage}
            >
              {image ? (
                <Image 
                  source={{ uri: image }} 
                  style={tw`w-full h-40 rounded-lg`}
                  resizeMode="cover"
                />
              ) : (
                <View style={tw`items-center`}>
                  <Feather name="camera" size={28} color={isDark ? "#60A5FA" : "#3B82F6"} />
                  <Text style={tw`mt-2 ${subtextColor} text-center`}>Tap to upload image{"\n"}JPG, PNG up to 5MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Send Notification */}
          <View style={tw`mb-8 ${cardBgColor} p-4 rounded-xl shadow-sm flex-row items-center justify-between`}>
            <View>
              <Text style={tw`font-medium ${textColor}`}>Send Notification</Text>
              <Text style={tw`text-xs ${subtextColor}`}>Notify interested users about this event</Text>
            </View>
            <Switch
              trackColor={{ false: isDark ? '#4B5563' : '#D1D5DB', true: isDark ? '#1E40AF' : '#93C5FD' }}
              thumbColor={sendNotification ? isDark ? '#60A5FA' : '#3B82F6' : isDark ? '#9CA3AF' : '#f4f3f4'}
              ios_backgroundColor={isDark ? "#4B5563" : "#D1D5DB"}
              onValueChange={setSendNotification}
              value={sendNotification}
            />
          </View>
          
          {/* Action Buttons */}
          <View style={tw`flex-row px-4 py-4 border-t ${borderColor}`}>
            <TouchableOpacity 
              style={tw`flex-1 mr-2 py-3 rounded-lg border ${borderColor} items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              onPress={handleBack}
            >
              <Text style={tw`font-medium ${textColor}`}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={tw`flex-1 ml-2 py-3 rounded-lg ${isDark ? 'bg-blue-600' : 'bg-blue-500'} items-center justify-center ${loading ? 'opacity-70' : ''}`}
              onPress={handleSaveChanges}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw`font-medium text-white`}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
} 