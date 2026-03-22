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
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import tw from '../../config/tailwind';
import { useLanguage } from '@/hooks/useLanguage';
import { signUp, subscribeToAuthChanges } from '@/lib/auth';
import { createUserDocument } from '@/lib/firestoreServices';
import { uploadImageToCloudinary } from '@/lib/utils/cloudinary';
import OptimizedImage from '@/components/OptimizedImage';

// Check if email should have admin privileges
const isAdminEmail = (email: string): boolean => {
  return email.includes('admin@') || email.endsWith('@admin.com');
};

export default function SignUpScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Function to pick an image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSignUp = async () => {
    // Reset error state
    setError('');

    // Basic validation
    if (!name || !email || !password || !confirmPassword || !phoneNumber) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check if this is an admin email
    const isAdmin = isAdminEmail(email);

    // Show loading indicator
    setIsLoading(true);

    try {
      // Attempt to sign up with Firebase
      const { user, error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        setError(signUpError);
        setIsLoading(false);
        return;
      }
      
      if (user) {
        // Set up auth state listener to ensure user is fully authenticated
        const unsubscribe = subscribeToAuthChanges((authUser) => {
          if (authUser) {
            console.log("🧪 Creating user document for:", authUser.uid);
            
            // Upload profile image to Cloudinary if available
            (async () => {
              let photoURL = null;
              
              if (profileImage) {
                try {
                  photoURL = await uploadImageToCloudinary(profileImage, 'users');
                  console.log("✅ Profile image uploaded to Cloudinary:", photoURL);
                } catch (uploadError) {
                  console.error("❌ Error uploading profile image:", uploadError);
                }
              }
              
              // Create user profile in Firestore with all required fields
              createUserDocument({
                uid: authUser.uid,
                email: authUser.email,
                displayName: name,
                fullName: name,
                phoneNumber: phoneNumber,
                membershipType: 'In Progress',
                membershipDaysLeft: 0,
                isAdmin: isAdmin, // Set admin status based on email
                createdAt: new Date(),
                photoURL: photoURL
              }).then(() => {
                console.log("✅ User document created successfully");
                
                // Navigate to appropriate screen based on admin status
                if (isAdmin) {
                  router.replace('/(admin)/dashboard');
                  console.log("✅ Admin user created successfully");
                } else {
                  router.replace('/(user)/home');
                }
                // Clean up subscription
                unsubscribe();
              }).catch(err => {
                console.error("❌ Error creating user document:", err);
                setError("Failed to create user profile. Please try again.");
                setIsLoading(false);
                unsubscribe();
              });
            })();
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            paddingBottom: 180,
          }}
        >
          <View>
            {/* Header */}
            <View style={tw`p-4`}>
              <TouchableOpacity onPress={() => router.push('/auth/sign-in')} style={tw`mb-0`}>
                <Feather name="arrow-left" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={tw`px-2`}>
              
              {/* Logo and Title */}
              <View style={tw`items-center mb-8`}>
                <Image 
                  source={require('../../assets/images/icon.png')} 
                  style={tw`w-35 h-35 mb-4`}
                  resizeMode="contain"
                />
                <Text style={tw`text-3xl font-bold text-gray-800`}>{t('auth.signUpTitle')}</Text>
                <Text style={tw`text-gray-500 text-center mt-2`}>
                  {t('auth.signUpSubtitle')}
                </Text>
              </View>
              
              {/* Error message */}
              {error ? (
                <View style={tw`bg-red-50 p-3 rounded-lg mb-4`}>
                  <Text style={tw`text-red-500`}>{error}</Text>
                </View>
              ) : null}
              
              {/* Profile Image Picker */}
              <View style={tw`items-center mb-6`}>
                <TouchableOpacity onPress={pickImage}>
                  <View style={tw`relative`}>
                    {profileImage ? (
                      <OptimizedImage
                        source={profileImage}
                        style={tw`w-24 h-24 rounded-full bg-gray-200`}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={tw`w-24 h-24 rounded-full bg-gray-200 items-center justify-center`}>
                        <Feather name="user" size={40} color="#9CA3AF" />
                      </View>
                    )}
                    <View style={tw`absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 border-2 border-white`}>
                      <Feather name="camera" size={14} color="white" />
                    </View>
                  </View>
                </TouchableOpacity>
                <Text style={tw`text-blue-500 mt-2 text-sm`}>Add profile photo</Text>
              </View>
              
              {/* Full Name Input */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 mb-2 font-medium`}>{t('profile.fullName')}</Text>
                <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-4 py-3`}>
                  <Feather name="user" size={20} color="#9CA3AF" style={tw`mr-2`} />
                  <TextInput
                    style={tw`flex-1 text-gray-800`}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              
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
              
              {/* Phone Number Input */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 mb-2 font-medium`}>{t('profile.phoneNumber')}</Text>
                <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-4 py-3`}>
                  <Feather name="phone" size={20} color="#9CA3AF" style={tw`mr-2`} />
                  <TextInput
                    style={tw`flex-1 text-gray-800`}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#9CA3AF"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              
              {/* Password Input */}
              <View style={tw`mb-4`}>
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
              
              {/* Confirm Password Input */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-gray-700 mb-2 font-medium`}>Confirm Password</Text>
                <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-4 py-3`}>
                  <Feather name="lock" size={20} color="#9CA3AF" style={tw`mr-2`} />
                  <TextInput
                    style={tw`flex-1 text-gray-800`}
                    placeholder="Confirm your password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>
              
              {/* Sign Up Button */}
              <TouchableOpacity 
                style={tw`bg-blue-500 py-4 rounded-lg items-center ${isLoading ? 'opacity-70' : ''}`}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={tw`text-white font-bold text-lg`}>{t('auth.signup')}</Text>
                )}
              </TouchableOpacity>
              
              {/* Sign In Link */}
              <View style={tw`flex-row justify-center mt-6`}>
                <Text style={tw`text-gray-600`}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/auth/sign-in')}>
                  <Text style={tw`text-blue-500 font-medium`}>{t('auth.signin')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
} 
