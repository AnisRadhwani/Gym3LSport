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
import * as ImagePicker from 'expo-image-picker';
import tw from '../../../config/tailwind';
import { getCoachById, updateCoach } from '@/lib/firestoreServices';
import { Coach } from '@/lib/types';
import { useTheme } from '@/components/ThemeWrapper';
import AdminPageHeader from '@/components/AdminPageHeader';
import { uploadImageToCloudinary } from '@/lib/utils/cloudinary';
import OptimizedImage from '@/components/OptimizedImage';

export default function EditCoachScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;
  const { isDark, themeStyles } = useTheme();
  const { bgColor, textColor, borderColor, cardBgColor, subtextColor } = themeStyles;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [photoURL, setPhotoURL] = useState('');
  const [isNewImage, setIsNewImage] = useState(false);
  const [showDaySpecificHours, setShowDaySpecificHours] = useState(false);
  const [daySpecificHours, setDaySpecificHours] = useState({
    monday: { startTime: '09:00', endTime: '18:00' },
    tuesday: { startTime: '09:00', endTime: '18:00' },
    wednesday: { startTime: '09:00', endTime: '18:00' },
    thursday: { startTime: '09:00', endTime: '18:00' },
    friday: { startTime: '09:00', endTime: '18:00' },
    saturday: { startTime: '09:00', endTime: '18:00' },
    sunday: { startTime: '09:00', endTime: '18:00' },
  });
  const [daysAvailable, setDaysAvailable] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });

  // Load coach data when component mounts
  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'No coach ID provided');
      router.back();
      return;
    }

    const loadCoach = async () => {
      try {
        setLoading(true);
        const coach = await getCoachById(id as string);
        
        if (!coach) {
          Alert.alert('Error', 'Coach not found');
          router.back();
          return;
        }
        
        // Populate form with coach data
        setFullName(coach.fullName);
        setSpecialty(coach.specialty);
        setDescription(coach.description || '');
        setPhotoURL(coach.photoURL);
        setStartTime(coach.workingHours?.startTime || '09:00');
        setEndTime(coach.workingHours?.endTime || '18:00');
        setDaysAvailable(coach.daysAvailable || {
          monday: false,
          tuesday: false,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        });
        
        // Check if coach has day-specific hours
        if (coach.daySpecificHours && Object.keys(coach.daySpecificHours).length > 0) {
          setShowDaySpecificHours(true);
          
          // Create a new object with default values
          const updatedDaySpecificHours = {
            monday: { startTime: '09:00', endTime: '18:00' },
            tuesday: { startTime: '09:00', endTime: '18:00' },
            wednesday: { startTime: '09:00', endTime: '18:00' },
            thursday: { startTime: '09:00', endTime: '18:00' },
            friday: { startTime: '09:00', endTime: '18:00' },
            saturday: { startTime: '09:00', endTime: '18:00' },
            sunday: { startTime: '09:00', endTime: '18:00' },
          };
          
          // Update with coach's specific hours
          Object.entries(coach.daySpecificHours).forEach(([day, hours]) => {
            if (hours && day in updatedDaySpecificHours) {
              updatedDaySpecificHours[day as keyof typeof updatedDaySpecificHours] = hours;
            }
          });
          
          setDaySpecificHours(updatedDaySpecificHours);
        }
      } catch (error) {
        console.error('Error loading coach:', error);
        Alert.alert('Error', 'Failed to load coach details');
      } finally {
        setLoading(false);
      }
    };
    
    loadCoach();
  }, [id, router]);

  // Function to pick an image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoURL(result.assets[0].uri);
      setIsNewImage(true);
    }
  };

  const toggleDay = (day: keyof typeof daysAvailable) => {
    setDaysAvailable(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  // Handle navigation back to coaches list
  const handleBack = () => {
    // Always navigate to the coaches list
    router.push('/(admin)/coaches');
  };

  // Save coach changes
  const handleSaveChanges = async () => {
    if (!fullName) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    if (!specialty) {
      Alert.alert('Error', 'Specialty/Title is required');
      return;
    }

    setSaving(true);

    try {
      let updatedPhotoURL = photoURL;
      
      // Upload the image to Cloudinary if it's a new image (local URI)
      if (isNewImage && photoURL && !photoURL.startsWith('http')) {
        updatedPhotoURL = await uploadImageToCloudinary(photoURL, 'coaches') || '';
        console.log("✅ Coach image uploaded to Cloudinary:", updatedPhotoURL);
      }
      
      // Create day-specific hours object only for selected days
      const filteredDaySpecificHours = showDaySpecificHours ? 
        Object.fromEntries(
          Object.entries(daysAvailable)
            .filter(([day, isSelected]) => isSelected)
            .map(([day]) => [day, daySpecificHours[day as keyof typeof daySpecificHours]])
        ) : null; // Use null instead of undefined
      
      const updatedCoach: Partial<Coach> = {
        fullName,
        specialty,
        description,
        workingHours: {
          startTime,
          endTime
        },
        daySpecificHours: filteredDaySpecificHours,
        daysAvailable,
        photoURL: updatedPhotoURL
      };
      
      const success = await updateCoach(id as string, updatedCoach);
      
      if (success) {
        Alert.alert('Success', 'Coach information updated successfully');
        // Navigate back to coaches list
        router.push('/(admin)/coaches');
      } else {
        Alert.alert('Error', 'Failed to update coach information');
      }
    } catch (error) {
      console.error('Error updating coach:', error);
      Alert.alert('Error', 'An error occurred while updating the coach');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={isDark ? "#60A5FA" : "#3B82F6"} />
          <Text style={tw`mt-4 ${subtextColor}`}>Loading coach information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 ${bgColor}`}
    >
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Header */}
        <AdminPageHeader 
          title="Edit Coach" 
          onBack={handleBack}
        />
        
        <ScrollView 
          style={tw`flex-1`} 
          contentContainerStyle={tw`p-4`}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Photo */}
          <View style={tw`items-center mb-6`}>
            <TouchableOpacity onPress={pickImage}>
              <View style={tw`relative`}>
                <OptimizedImage
                  source={photoURL || 'https://via.placeholder.com/150?text=Coach'}
                  style={tw`w-28 h-28 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                  contentFit="cover"
                />
                <View style={tw`absolute bottom-0 right-0 ${isDark ? 'bg-blue-600' : 'bg-blue-500'} rounded-full p-2 border-2 ${isDark ? 'border-gray-800' : 'border-white'}`}>
                  <Feather name="camera" size={14} color="white" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={tw`${isDark ? 'text-blue-400' : 'text-blue-500'} mt-2 text-sm`}>Tap to upload or replace photo</Text>
          </View>
          
          {/* Full Name */}
          <View style={tw`mb-4`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Full Name</Text>
            <TextInput
              style={tw`border ${borderColor} rounded-lg px-4 py-3 bg-opacity-50 ${isDark ? 'bg-gray-800' : 'bg-white'} ${textColor}`}
              placeholder="Enter full name"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          
          {/* Specialty/Title */}
          <View style={tw`mb-4`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Specialty / Title</Text>
            <TextInput
              style={tw`border ${borderColor} rounded-lg px-4 py-3 bg-opacity-50 ${isDark ? 'bg-gray-800' : 'bg-white'} ${textColor}`}
              placeholder="e.g., CrossFit / Strength Coach"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={specialty}
              onChangeText={setSpecialty}
            />
          </View>
          
          {/* Working Hours */}
          <View style={tw`mb-4`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Default Working Hours</Text>
            <View style={tw`flex-row`}>
              <View style={tw`flex-1 mr-2`}>
                <Text style={tw`${subtextColor} mb-1 text-sm`}>Start Time</Text>
                <TextInput
                  style={tw`border ${borderColor} rounded-lg px-4 py-3 bg-opacity-50 ${isDark ? 'bg-gray-800' : 'bg-white'} ${textColor}`}
                  placeholder="09:00"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  value={startTime}
                  onChangeText={setStartTime}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              
              <View style={tw`flex-1`}>
                <Text style={tw`${subtextColor} mb-1 text-sm`}>End Time</Text>
                <TextInput
                  style={tw`border ${borderColor} rounded-lg px-4 py-3 bg-opacity-50 ${isDark ? 'bg-gray-800' : 'bg-white'} ${textColor}`}
                  placeholder="18:00"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  value={endTime}
                  onChangeText={setEndTime}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>
          
          {/* Day-Specific Hours Toggle */}
          <View style={tw`mb-4 flex-row items-center justify-between`}>
            <Text style={tw`font-medium ${textColor}`}>Set Different Hours Per Day</Text>
            <TouchableOpacity 
              style={tw`flex-row items-center`} 
              onPress={() => setShowDaySpecificHours(!showDaySpecificHours)}
            >
              <View style={tw`w-12 h-6 ${showDaySpecificHours ? 'bg-blue-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'} rounded-full relative`}>
                <View style={tw`w-5 h-5 bg-white rounded-full absolute top-0.5 ${showDaySpecificHours ? 'right-0.5' : 'left-0.5'}`} />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Day-Specific Hours */}
          {showDaySpecificHours && (
            <View style={tw`mb-6`}>
              {Object.entries(daysAvailable).map(([day, isSelected]) => (
                isSelected && (
                  <View key={day} style={tw`mb-4`}>
                    <Text style={tw`font-medium mb-2 ${textColor} capitalize`}>{day}</Text>
                    <View style={tw`flex-row`}>
                      <View style={tw`flex-1 mr-2`}>
                        <Text style={tw`${subtextColor} mb-1 text-sm`}>Start Time</Text>
                        <TextInput
                          style={tw`border ${borderColor} rounded-lg px-4 py-3 bg-opacity-50 ${isDark ? 'bg-gray-800' : 'bg-white'} ${textColor}`}
                          placeholder="09:00"
                          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                          value={daySpecificHours[day as keyof typeof daySpecificHours].startTime}
                          onChangeText={(text) => {
                            setDaySpecificHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], startTime: text }
                            }));
                          }}
                          keyboardType="numbers-and-punctuation"
                        />
                      </View>
                      
                      <View style={tw`flex-1`}>
                        <Text style={tw`${subtextColor} mb-1 text-sm`}>End Time</Text>
                        <TextInput
                          style={tw`border ${borderColor} rounded-lg px-4 py-3 bg-opacity-50 ${isDark ? 'bg-gray-800' : 'bg-white'} ${textColor}`}
                          placeholder="18:00"
                          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                          value={daySpecificHours[day as keyof typeof daySpecificHours].endTime}
                          onChangeText={(text) => {
                            setDaySpecificHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], endTime: text }
                            }));
                          }}
                          keyboardType="numbers-and-punctuation"
                        />
                      </View>
                    </View>
                  </View>
                )
              ))}
            </View>
          )}
          
          {/* Days Available */}
          <View style={tw`mb-6`}>
            <Text style={tw`font-medium mb-3 ${textColor}`}>Days Available</Text>
            <View style={tw`flex-row flex-wrap`}>
              {Object.entries(daysAvailable).map(([day, isSelected]) => (
                <TouchableOpacity
                  key={day}
                  style={tw`mr-2 mb-2 px-3 py-2 rounded-full ${
                    isSelected 
                      ? isDark ? 'bg-blue-600' : 'bg-blue-500' 
                      : isDark ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                  onPress={() => toggleDay(day as keyof typeof daysAvailable)}
                >
                  <Text 
                    style={tw`${
                      isSelected 
                        ? 'text-white' 
                        : isDark ? 'text-gray-300' : 'text-gray-700'
                    } capitalize`}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Description */}
          <View style={tw`mb-8`}>
            <Text style={tw`font-medium mb-2 ${textColor}`}>Coach Description (Optional)</Text>
            <TextInput
              style={tw`border ${borderColor} rounded-lg px-4 py-3 bg-opacity-50 ${isDark ? 'bg-gray-800' : 'bg-white'} ${textColor} min-h-[120px]`}
              placeholder="Over 10 years of experience in functional training and CrossFit coaching. Specializes in strength building and injury prevention."
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={tw`${isDark ? 'bg-blue-600 active:bg-blue-700' : 'bg-blue-500 active:bg-blue-600'} py-4 rounded-xl shadow-sm mb-6`}
            onPress={handleSaveChanges}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={tw`text-white text-center font-semibold text-lg`}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
} 