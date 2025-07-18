import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import tw from '../../config/tailwind';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type SignUpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = () => {
    // Registration logic will be implemented later
    console.log('Sign up pressed');
  };

  const navigateToSignIn = () => {
    navigation.navigate('SignIn');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <ScrollView contentContainerStyle={tw`p-5`}>
        <View style={tw`items-center mb-6 mt-6`}>
          {/* App Logo */}
          <View style={tw`bg-blue-500 w-16 h-16 rounded-2xl items-center justify-center mb-3`}>
            <Feather name="activity" size={28} color="white" />
          </View>
          <Text style={tw`text-gray-500`}>GymFit</Text>
        </View>
        
        {/* Welcome Text */}
        <Text style={tw`text-3xl font-bold text-center mb-2`}>Create Account</Text>
        <Text style={tw`text-gray-500 text-center mb-8`}>Please fill in the details below</Text>
        
        {/* Input Fields */}
        <View style={tw`space-y-4`}>
          <View>
            <Text style={tw`text-gray-700 mb-1`}>Full Name</Text>
            <TextInput
              style={tw`border border-gray-300 p-3 rounded-lg text-base`}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
          
          <View>
            <Text style={tw`text-gray-700 mb-1`}>Email</Text>
            <TextInput
              style={tw`border border-gray-300 p-3 rounded-lg text-base`}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View>
            <Text style={tw`text-gray-700 mb-1`}>Phone Number</Text>
            <TextInput
              style={tw`border border-gray-300 p-3 rounded-lg text-base`}
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          
          <View>
            <Text style={tw`text-gray-700 mb-1`}>Password</Text>
            <View style={tw`flex-row border border-gray-300 rounded-lg`}>
              <TextInput
                style={tw`flex-1 p-3 text-base`}
                placeholder="Create a password"
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
          
          <View>
            <Text style={tw`text-gray-700 mb-1`}>Confirm Password</Text>
            <View style={tw`flex-row border border-gray-300 rounded-lg`}>
              <TextInput
                style={tw`flex-1 p-3 text-base`}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={tw`p-3 justify-center`}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="gray" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Sign Up Button */}
        <TouchableOpacity
          style={tw`bg-blue-500 p-4 rounded-lg mt-8 items-center`}
          onPress={handleSignUp}
        >
          <Text style={tw`text-white font-bold text-base`}>Sign Up</Text>
        </TouchableOpacity>
        
        {/* Sign In Link */}
        <View style={tw`flex-row justify-center mt-6 mb-8`}>
          <Text style={tw`text-gray-600`}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToSignIn}>
            <Text style={tw`text-blue-500 font-medium`}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUpScreen; 