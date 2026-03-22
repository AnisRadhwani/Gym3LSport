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
import { getCoaches } from '@/lib/firestoreServices';
import { addEvent } from '@/lib/firestoreServices';
import { Coach } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import CoachAvatar from '@/components/CoachAvatar';
import { useTheme } from '@/components/ThemeWrapper';
import { uploadImageToCloudinary } from '@/lib/utils/cloudinary';

export default function AddEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDark, themeStyles } = useTheme();

  const {
    bgColor,
    textColor,
    borderColor,
    cardBgColor,
    subtextColor
  } = themeStyles;

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  // Load coaches when component mounts
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        setLoadingCoaches(true);
        const coachesData = await getCoaches();
        setCoaches(coachesData);
      } catch (error) {
        console.error('Error loading coaches:', error);
      } finally {
        setLoadingCoaches(false);
      }
    };
    
    loadCoaches();
  }, []);

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

  // Save event
  const handleSaveEvent = async () => {
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
      // Upload the image to Cloudinary if available
      let imageURL = '';
      if (image) {
        imageURL = await uploadImageToCloudinary(image, 'events') || '';
        console.log("✅ Event image uploaded to Cloudinary:", imageURL);
      }
      
      const newEvent = {
        title,
        date: Timestamp.fromDate(date),
        startTime,
        endTime,
        coachId: selectedCoach.id,
        coachName: selectedCoach.fullName,
        coachPhoto: selectedCoach.photoURL || '',
        location: location || '',
        imageURL,
        sendNotification,
        interestedUsers: []
      };
      
      const eventId = await addEvent(newEvent);
      
      if (eventId) {
        // Reset form fields
        setTitle('');
        setDate(new Date());
        setStartTime('08:00');
        setEndTime('09:30');
        setSelectedCoach(null);
        setLocation('');
        setImage(null);
        setSendNotification(true);
        
        // Show success alert with options
        Alert.alert(
          'Success',
          'Event created successfully',
          [
            {
              text: 'Add Another',
              style: 'default',
            },
            {
              text: 'Go to Events List',
              onPress: () => router.push('/(admin)/events'),
              style: 'default',
            },
          ],
          { cancelable: true }
        );
      } else {
        Alert.alert('Error', 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'An error occurred while creating the event');
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation back to events list
  const handleBack = () => {
    // Always navigate to the events list
    router.push('/(admin)/events');
  };

  // Parse time string (HH:MM) to Date object for time picker
  const parseTimeToDate = (timeString: string) => {
    const now = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    now.setHours(hours, minutes, 0, 0);
    return now;
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1`}
    >
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <View style={tw`flex-row items-center justify-between p-4 border-b ${borderColor}`}>
          <TouchableOpacity onPress={handleBack}>
            <Feather name="arrow-left" size={24} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold ${textColor}`}>Add New Event</Text>
          <View style={tw`w-6`} />
        </View>
        
        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          {/* Event Title */}
          <View style={tw`p-4 mb-6 ${cardBgColor} rounded-xl shadow-sm mx-4 mt-4`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Event Title</Text>
            <TextInput
              style={tw`border ${borderColor} rounded-lg p-3 ${textColor}`}
              placeholder="Enter event title"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={title}
              onChangeText={setTitle}
            />
          </View>
          
          {/* Event Date */}
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm mx-4`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Event Date</Text>
            
            <TouchableOpacity 
              style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center`}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={tw`${textColor}`}>{date.toDateString()}</Text>
              <Feather name="calendar" size={18} color={isDark ? "#A1A1AA" : "#666"} />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
          
          {/* Event Time */}
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm mx-4`}>
            <Text style={tw`font-medium mb-3 ${textColor}`}>Event Time</Text>
            
            <View style={tw`flex-row gap-4`}>
              <View style={tw`flex-1`}>
                <Text style={tw`${subtextColor} mb-1`}>Start Time</Text>
                <TouchableOpacity 
                  style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center`}
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
                  />
                )}
              </View>
              
              <View style={tw`flex-1`}>
                <Text style={tw`${subtextColor} mb-1`}>End Time</Text>
                <TouchableOpacity 
                  style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center`}
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
                  />
                )}
              </View>
            </View>
          </View>
          
          {/* Select Coach */}
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm mx-4`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Select Coach</Text>
            
            <TouchableOpacity 
              style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center`}
              onPress={() => setShowCoachPicker(!showCoachPicker)}
            >
              {selectedCoach ? (
                <View style={tw`flex-row items-center`}>
                  <CoachAvatar 
                    name={selectedCoach.fullName} 
                    photoURL={selectedCoach.photoURL}
                    size="small"
                    isDark={isDark}
                  />
                  <Text style={tw`ml-2 ${textColor}`}>{selectedCoach.fullName}</Text>
                </View>
              ) : (
                <Text style={tw`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Choose a coach</Text>
              )}
              <Feather name={showCoachPicker ? "chevron-up" : "chevron-down"} size={18} color={isDark ? "#A1A1AA" : "#666"} />
            </TouchableOpacity>
            
            {showCoachPicker && (
              <View style={tw`mt-2 border ${borderColor} rounded-lg max-h-64 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                {loadingCoaches ? (
                  <View style={tw`p-4 items-center`}>
                    <ActivityIndicator size="small" color="#3B82F6" />
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
                          isDark={isDark}
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
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm mx-4`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Gym Area / Room</Text>
            
            <TouchableOpacity 
              style={tw`border ${borderColor} rounded-lg p-3 flex-row justify-between items-center`}
              onPress={() => setShowLocationPicker(!showLocationPicker)}
            >
              {location ? (
                <Text style={tw`${textColor}`}>{location}</Text>
              ) : (
                <Text style={tw`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Select area (optional)</Text>
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
          <View style={tw`mb-6 ${cardBgColor} p-4 rounded-xl shadow-sm mx-4`}>
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
                  <Feather name="camera" size={28} color="#3B82F6" />
                  <Text style={tw`mt-2 ${subtextColor} text-center`}>Tap to upload image{"\n"}JPG, PNG up to 5MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Send Notification */}
          <View style={tw`mb-8 ${cardBgColor} p-4 rounded-xl shadow-sm mx-4 flex-row items-center justify-between`}>
            <View>
              <Text style={tw`font-medium ${textColor}`}>Send Notification</Text>
              <Text style={tw`text-xs ${subtextColor}`}>Notify interested users about this event</Text>
            </View>
            <Switch
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={sendNotification ? '#3B82F6' : '#f4f3f4'}
              ios_backgroundColor="#D1D5DB"
              onValueChange={setSendNotification}
              value={sendNotification}
            />
          </View>
          
          {/* Action Buttons */}
          <View style={tw`flex-row px-4 py-4 border-t ${borderColor}`}>
            <TouchableOpacity 
              style={tw`flex-1 mr-2 py-3 rounded-lg border ${borderColor} items-center justify-center`}
              onPress={handleBack}
            >
              <Text style={tw`font-medium ${textColor}`}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={tw`flex-1 ml-2 py-3 rounded-lg bg-blue-500 items-center justify-center ${loading ? 'opacity-70' : ''}`}
              onPress={handleSaveEvent}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw`font-medium text-white`}>Create Event</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}