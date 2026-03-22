import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import tw from '../../../config/tailwind';
import { addCoach } from '@/lib/firestoreServices';
import { Coach } from '@/lib/types';
import { useTheme } from '@/components/ThemeWrapper';
import AdminPageHeader from '@/components/AdminPageHeader';
import KeyboardAvoidingContainer from '@/components/KeyboardAvoidingContainer';
import { uploadImageToCloudinary } from '@/lib/utils/cloudinary';

export default function AddCoachScreen() {
  const router = useRouter();
  const { isDark, themeStyles } = useTheme();
  const { bgColor, textColor, borderColor, cardBgColor, subtextColor } = themeStyles;
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [photoURL, setPhotoURL] = useState('');
  const [daysAvailable, setDaysAvailable] = useState({
    monday: false,
    tuesday: false,
    wednesday: true, // Default to Wednesday selected as shown in screenshot
    thursday: true,  // Default to Thursday selected as shown in screenshot
    friday: true,    // Default to Friday selected as shown in screenshot
    saturday: false,
    sunday: false,
  });
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
  const handleSaveCoach = async () => {
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
      // Upload the image to Cloudinary if available
      let cloudinaryUrl = null;
      if (photoURL) {
        cloudinaryUrl = await uploadImageToCloudinary(photoURL, 'coaches') || '';
        console.log("✅ Coach image uploaded to Cloudinary:", cloudinaryUrl);
      }
      
      // Create day-specific hours object only for selected days
      const filteredDaySpecificHours = showDaySpecificHours ? 
        Object.fromEntries(
          Object.entries(daysAvailable)
            .filter(([day, isSelected]) => isSelected)
            .map(([day]) => [day, daySpecificHours[day as keyof typeof daySpecificHours]])
        ) : null; // Use null instead of undefined
      
      const newCoach: Omit<Coach, 'id'> = {
        fullName,
        specialty,
        description: description || '',
        workingHours: {
          startTime,
          endTime
        },
        daySpecificHours: filteredDaySpecificHours,
        daysAvailable,
        photoURL: cloudinaryUrl || ''
      };
      
      const coachId = await addCoach(newCoach);
      
      if (coachId) {
        // Reset form fields after successful submission
        setFullName('');
        setSpecialty('');
        setDescription('');
        setStartTime('09:00');
        setEndTime('18:00');
        setPhotoURL('');
        setDaysAvailable({
          monday: false,
          tuesday: false,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        });
        
        // Show success alert with options
        Alert.alert(
          'Success',
          'Coach added successfully',
          [
            {
              text: 'Add Another',
              style: 'default',
            },
            {
              text: 'Go to Coach List',
              onPress: () => router.push('/(admin)/coaches'),
              style: 'default',
            },
          ],
          { cancelable: true }
        );
      } else {
        Alert.alert('Error', 'Failed to add coach');
      }
    } catch (error) {
      console.error('Error adding coach:', error);
      Alert.alert('Error', 'An error occurred while adding the coach');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 ${bgColor}`} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <AdminPageHeader 
        title="Add Coach" 
        onBack={handleBack}
      />
      
      <KeyboardAvoidingContainer
        withScrollView={true}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        contentContainerStyle={tw`p-4`}
      >
        {/* Profile Photo */}
        <View style={tw`items-center mb-6`}>
          <TouchableOpacity onPress={pickImage}>
            <View style={tw`relative`}>
              <Image
                source={{ uri: photoURL || 'https://via.placeholder.com/150?text=Coach' }}
                style={tw`w-28 h-28 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
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
        
        {/* Description */}
        <View style={tw`mb-6`}>
          <Text style={tw`font-medium mb-2 ${textColor}`}>Description</Text>
          <TextInput
            style={tw`border ${borderColor} rounded-lg px-4 py-3 bg-opacity-50 ${isDark ? 'bg-gray-800' : 'bg-white'} ${textColor} min-h-[100px]`}
            placeholder="Enter coach description and experience"
            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            value={description}
            onChangeText={setDescription}
            multiline={true}
            textAlignVertical="top"
          />
        </View>
        
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
        
        {/* Save Button */}
        <TouchableOpacity
          style={tw`bg-blue-500 py-4 rounded-lg items-center mb-6 ${saving ? 'opacity-70' : ''}`}
          onPress={handleSaveCoach}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={tw`text-white font-bold text-lg`}>Save Coach</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
} 