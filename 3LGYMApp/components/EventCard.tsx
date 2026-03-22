import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import tw from '../config/tailwind';
import CoachAvatar from './CoachAvatar';
import OptimizedImage from './OptimizedImage';
import { Event } from '@/lib/types';

interface EventCardProps {
  event: Event;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleRecurring?: () => void;
  variant?: 'default' | 'compact';
  isAdminView?: boolean;
  isDark?: boolean;
}

export default function EventCard({
  event,
  onEdit,
  onDelete,
  onToggleRecurring,
  variant = 'default',
  isAdminView = false,
  isDark = false
}: EventCardProps) {
  
  // Format time to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return '';
    
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return time;
    }
  };
  
  // Compact variant for event lists
  if (variant === 'compact') {
    return (
      <View style={tw`flex-row items-center p-3 border-b border-gray-200`}>
        <View style={tw`flex-1`}>
          <Text style={tw`font-bold text-base`}>{event.title}</Text>
          <Text style={tw`text-gray-500 text-xs`}>
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </Text>
        </View>
        
        {event.coachName && (
          <View style={tw`flex-row mt-2 items-center`}>
            <CoachAvatar 
              name={event.coachName}
              photoURL={event.coachPhoto}
              size="small"
            />
            <Text style={tw`text-xs text-gray-600 ml-2`}>{event.coachName}</Text>
          </View>
        )}
      </View>
    );
  }
  
  return (
    <View style={tw`bg-white rounded-xl mb-4 shadow-sm overflow-hidden`}>
      {event.imageURL && (
        <OptimizedImage 
          source={event.imageURL}
          style={tw`w-full h-40`}
          contentFit="cover"
        />
      )}
      <View style={tw`p-4`}>
        <View style={tw`flex-row justify-between items-center mb-2`}>
          <Text style={tw`font-bold text-lg`}>{event.title}</Text>
          
          <View style={tw`flex-row`}>
            {isAdminView && onToggleRecurring && (
              <TouchableOpacity 
                onPress={onToggleRecurring}
                style={tw`p-2`}
              >
                <Feather 
                  name="repeat" 
                  size={18} 
                  color={event.isRecurring ? "#10B981" : "#9CA3AF"} 
                />
              </TouchableOpacity>
            )}
            
            {onEdit && (
              <TouchableOpacity 
                onPress={onEdit}
                style={tw`p-2`}
              >
                <Feather name="edit" size={18} color="#3B82F6" />
              </TouchableOpacity>
            )}
            
            {onDelete && (
              <TouchableOpacity 
                onPress={onDelete}
                style={tw`p-2`}
              >
                <Feather name="trash-2" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={tw`flex-row mb-3 items-center`}>
          <View style={tw`w-5 h-5 rounded-full bg-blue-100 items-center justify-center mr-2`}>
            <Feather name="clock" size={12} color="#3B82F6" />
          </View>
          <Text style={tw`text-gray-600`}>
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </Text>
        </View>
        
        {event.location && (
          <View style={tw`flex-row mb-3 items-center`}>
            <View style={tw`w-5 h-5 rounded-full bg-blue-100 items-center justify-center mr-2`}>
              <Feather name="map-pin" size={12} color="#3B82F6" />
            </View>
            <Text style={tw`text-gray-600`}>{event.location}</Text>
          </View>
        )}
        
        {event.coachName && (
          <View style={tw`flex-row items-center`}>
            <CoachAvatar 
              name={event.coachName}
              photoURL={event.coachPhoto}
              size="small"
            />
            <Text style={tw`text-gray-600 ml-2`}>{event.coachName}</Text>
          </View>
        )}
        
        {event.isRecurring && (
          <View style={tw`mt-3 bg-green-50 p-2 rounded-lg`}>
            <Text style={tw`text-green-600 text-xs flex-row items-center`}>
              <Feather name="repeat" size={12} color="#10B981" style={tw`mr-1`} /> Weekly recurring event
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}