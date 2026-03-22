import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from '../config/tailwind';
import { Feather } from '@expo/vector-icons';
import { Coach } from '@/lib/types';
import CoachAvatar from './CoachAvatar';

interface CoachCardProps {
  coach: Coach;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  isDark?: boolean;
}

export default function CoachCard({ coach, onEdit, onDelete, isDark = false }: CoachCardProps) {
  
  const getIsAvailable = () => {
    if (!coach.daysAvailable || !coach.workingHours) return false;
    
    const now = new Date();
    const dayNames: (keyof Coach['daysAvailable'])[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    const currentDay = dayNames[now.getDay()];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const isDayAvailable = coach.daysAvailable[currentDay];
    if (!isDayAvailable) return false;

    // Check if coach has day-specific hours for today
    if (coach.daySpecificHours && coach.daySpecificHours[currentDay]) {
      const { startTime, endTime } = coach.daySpecificHours[currentDay];
      return currentTime >= startTime && currentTime < endTime;
    }
    
    // Fall back to default working hours
    const { startTime, endTime } = coach.workingHours;
    return currentTime >= startTime && currentTime < endTime;
  }

  const isAvailable = getIsAvailable();
  
  // Calculate active days count
  const activeDaysCount = Object.values(coach.daysAvailable || {}).filter(Boolean).length;
  
  return (
    <View style={tw`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md mb-4 overflow-hidden`}>
      {/* Card Header */}
      <View style={tw`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <View style={tw`flex-row items-center`}>
          <CoachAvatar 
            name={coach.fullName}
            photoURL={coach.photoURL}
            size="medium"
            showStatus={true}
            isAvailable={isAvailable}
            isDark={isDark}
          />
          
          <View style={tw`flex-1 ml-4`}>
            <Text style={tw`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{coach.fullName}</Text>
            <Text style={tw`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{coach.specialty}</Text>
            
            {isAvailable && (
              <View style={tw`flex-row items-center mt-1`}>
                <View style={tw`w-2 h-2 bg-green-500 rounded-full mr-1.5`} />
                <Text style={tw`text-green-600 text-xs font-medium`}>Available Now</Text>
              </View>
            )}
          </View>
          
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              style={tw`rounded-full p-2 ${isDark ? 'bg-blue-900' : 'bg-blue-50'} mr-2`}
              onPress={() => onEdit(coach.id)}
            >
              <Feather name="edit-2" size={18} color="#3B82F6" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={tw`rounded-full p-2 ${isDark ? 'bg-red-900' : 'bg-red-50'}`}
              onPress={() => onDelete(coach.id, coach.fullName)}
            >
              <Feather name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Card Footer */}
      <View style={tw`${isDark ? 'bg-gray-700' : 'bg-gray-50'} px-4 py-3 flex-row justify-between items-center`}>
        <View style={tw`flex-row items-center`}>
          <Feather name="clock" size={14} color={isDark ? "#A1A1AA" : "#6B7280"} style={tw`mr-1.5`} />
          <Text style={tw`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs`}>
            {coach.workingHours?.startTime || '08:00'} - {coach.workingHours?.endTime || '16:00'}
          </Text>
        </View>
        
        <View style={tw`flex-row items-center`}>
          <Feather name="calendar" size={14} color={isDark ? "#A1A1AA" : "#6B7280"} style={tw`mr-1.5`} />
          <Text style={tw`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs`}>
            {activeDaysCount} {activeDaysCount === 1 ? 'day' : 'days'}/week
          </Text>
        </View>
      </View>
    </View>
  );
} 
