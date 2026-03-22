import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import tw from '../../config/tailwind';
import { sendPasswordReset } from '@/lib/auth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    // Reset states
    setError('');
    setSuccess(false);

    // Basic validation
    if (!email) {
      setError('Email is required');
      return;
    }

    // Show loading indicator
    setIsLoading(true);

    try {
      // Send password reset email
      const { success: resetSuccess, error: resetError } = await sendPasswordReset(email);
      
      if (resetError) {
        setError(resetError);
        return;
      }
      
      if (resetSuccess) {
        setSuccess(true);
        Alert.alert(
          'Reset Link Sent',
          'Check your email for a password reset link. Click the link to set a new password.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={tw`px-6 flex-1 pt-6`}>
        {/* Header */}
        <View style={tw`flex-row items-center mb-8`}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-gray-800 ml-4`}>Reset Password</Text>
        </View>

        {/* Logo and Title */}
        <View style={tw`items-center mb-8`}>
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={tw`w-24 h-24 mb-4`}
            resizeMode="contain"
          />
          <Text style={tw`text-2xl font-bold text-gray-800 text-center`}>Forgot Your Password?</Text>
          <Text style={tw`text-gray-500 text-center mt-2`}>
            Enter your email address and we'll send you a link to reset your password
          </Text>
        </View>
        
        {/* Error message */}
        {error ? (
          <View style={tw`bg-red-50 p-3 rounded-lg mb-4`}>
            <Text style={tw`text-red-500`}>{error}</Text>
          </View>
        ) : null}

        {/* Success message */}
        {success ? (
          <View style={tw`bg-green-50 p-3 rounded-lg mb-4`}>
            <Text style={tw`text-green-600`}>Password reset link sent successfully!</Text>
          </View>
        ) : null}
        
        {/* Email Input */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-gray-700 mb-2 font-medium`}>Email Address</Text>
          <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="mail" size={20} color="#9CA3AF" style={tw`mr-2`} />
            <TextInput
              style={tw`flex-1 text-gray-800`}
              placeholder="Enter your email address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
        </View>
        
        {/* Reset Password Button */}
        <TouchableOpacity 
          style={tw`bg-blue-500 py-4 rounded-lg items-center ${isLoading ? 'opacity-70' : ''}`}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={tw`text-white font-bold text-lg`}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
        
        {/* Back to Sign In */}
        <View style={tw`flex-row justify-center mt-6`}>
          <Text style={tw`text-gray-600`}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={tw`text-blue-500 font-medium`}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
