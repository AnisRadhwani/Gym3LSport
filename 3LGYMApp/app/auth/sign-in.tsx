import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import tw from '../../config/tailwind';
import { signIn } from '@/lib/auth';
import { useLanguage } from '@/hooks/useLanguage';

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    // Reset error state
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    // Show loading indicator
    setIsLoading(true);

    try {
      // Attempt to sign in with Firebase
      const { user, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        setError(signInError);
        setIsLoading(false);
        return;
      }
      
      if (user) {
        // Removed the createUserDocument call to preserve admin status
        
        // Navigate to user home screen on successful login
        // The AuthProvider in _layout.tsx will redirect to the appropriate screen
        // based on the user's isAdmin status
        router.replace('/(user)/home');
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
        {/* Logo and Title */}
        <View style={tw`items-center mb-8`}>
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={tw`w-35 h-35 mb-4`}
            resizeMode="contain"
          />
          <Text style={tw`text-3xl font-bold text-gray-800`}>
            {t('auth.signInWelcomeTitle')}
          </Text>
          <Text style={tw`text-gray-500 text-center mt-2`}>
            {t('auth.signInSubtitle')}
          </Text>
        </View>
        
        {/* Error message */}
        {error ? (
          <View style={tw`bg-red-50 p-3 rounded-lg mb-4`}>
            <Text style={tw`text-red-500`}>{error}</Text>
          </View>
        ) : null}
        
        {/* Email Input */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-700 mb-2 font-medium`}>{t('auth.email')}</Text>
          <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="mail" size={20} color="#9CA3AF" style={tw`mr-2`} />
            <TextInput
              style={tw`flex-1 text-gray-800`}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
        
        {/* Password Input */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-gray-700 mb-2 font-medium`}>{t('auth.password')}</Text>
          <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="lock" size={20} color="#9CA3AF" style={tw`mr-2`} />
            <TextInput
              style={tw`flex-1 text-gray-800`}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Forgot Password */}
        <TouchableOpacity 
          style={tw`items-end mb-8`}
          onPress={() => router.push('/auth/reset-password')}
        >
          <Text style={tw`text-blue-500`}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>
        
        {/* Sign In Button */}
        <TouchableOpacity 
          style={tw`bg-blue-500 py-4 rounded-lg items-center ${isLoading ? 'opacity-70' : ''}`}
          onPress={handleSignIn}
          disabled={isLoading}
        >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={tw`text-white font-bold text-lg`}>{t('auth.signin')}</Text>
            )}
        </TouchableOpacity>
        
        {/* Sign Up Link */}
        <View style={tw`flex-row justify-center mt-6`}>
          <Text style={tw`text-gray-600`}>{"Don't have an account? "}</Text>
          <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
            <Text style={tw`text-blue-500 font-medium`}>{t('auth.signup')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 
