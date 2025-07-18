import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import tw from '../../config/tailwind';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type SignInScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

const SignInScreen = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = () => {
    // Authentication logic will be implemented later
    console.log('Sign in pressed');
  };

  const navigateToSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white p-5`}>
      <View style={tw`items-center mb-6 mt-10`}>
        {/* App Logo */}
        <View style={tw`bg-blue-500 w-16 h-16 rounded-2xl items-center justify-center mb-3`}>
          <Feather name="activity" size={28} color="white" />
        </View>
        <Text style={tw`text-gray-500`}>GymFit</Text>
      </View>
      
      {/* Welcome Text */}
      <Text style={tw`text-3xl font-bold text-center mb-2`}>Welcome Back</Text>
      <Text style={tw`text-gray-500 text-center mb-8`}>Please log in to continue</Text>
      
      {/* Input Fields */}
      <View style={tw`space-y-4`}>
        <View>
          <Text style={tw`text-gray-700 mb-1`}>Phone Number or Email</Text>
          <TextInput
            style={tw`border border-gray-300 p-3 rounded-lg text-base`}
            placeholder="Enter your phone or email"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View>
          <Text style={tw`text-gray-700 mb-1`}>Password</Text>
          <View style={tw`flex-row border border-gray-300 rounded-lg`}>
            <TextInput
              style={tw`flex-1 p-3 text-base`}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={tw`p-3 justify-center`}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="gray" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Sign In Button */}
      <TouchableOpacity
        style={tw`bg-blue-500 p-4 rounded-lg mt-8 items-center`}
        onPress={handleSignIn}
      >
        <Text style={tw`text-white font-bold text-base`}>Sign In</Text>
      </TouchableOpacity>
      
      {/* Forgot Password */}
      <TouchableOpacity style={tw`items-center mt-4`}>
        <Text style={tw`text-blue-500`}>Forgot password?</Text>
      </TouchableOpacity>
      
      {/* Sign Up Link */}
      <View style={tw`flex-row justify-center mt-8`}>
        <Text style={tw`text-gray-600`}>Don't have an account? </Text>
        <TouchableOpacity onPress={navigateToSignUp}>
          <Text style={tw`text-blue-500 font-medium`}>Sign up</Text>
        </TouchableOpacity>
      </View>
      
      {/* Version */}
      <View style={tw`flex-1 justify-end items-center mb-4`}>
        <Text style={tw`text-gray-400 text-sm`}>Version 1.0</Text>
      </View>
    </SafeAreaView>
  );
};

export default SignInScreen; 