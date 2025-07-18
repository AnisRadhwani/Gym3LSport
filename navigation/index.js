import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Create navigation stacks
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// We'll define placeholder screens for now
const HomeScreen = () => <></>;
const ProfileScreen = () => <></>;
const AuthScreen = () => <></>;

// Auth Navigator
const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={AuthScreen} />
    </Stack.Navigator>
  );
};

// Tab Navigator (Main App)
const TabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  // We'll assume user is not logged in for now
  const isLoggedIn = false;

  return (
    <NavigationContainer>
      {isLoggedIn ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator; 