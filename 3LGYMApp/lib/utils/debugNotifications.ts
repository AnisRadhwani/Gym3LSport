import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Debug function to check push notification setup
 * This will log all relevant information to help diagnose push notification issues
 */
export async function debugPushNotifications() {
  console.log('======= PUSH NOTIFICATION DEBUG INFO =======');
  
  // Check device
  console.log('Device Information:');
  console.log(`- Is Physical Device: ${Device.isDevice}`);
  console.log(`- Device Type: ${Device.deviceType}`);
  console.log(`- Platform: ${Platform.OS}`);
  console.log(`- OS Version: ${Platform.Version}`);
  
  // Check permissions
  console.log('\nNotification Permissions:');
  try {
    const { status } = await Notifications.getPermissionsAsync();
    console.log(`- Permission Status: ${status}`);
  } catch (error) {
    console.log(`- Error getting permissions: ${error}`);
  }
  
  // Check Expo configuration
  console.log('\nExpo Configuration:');
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log(`- Project ID from Constants: ${projectId || 'Not found'}`);
    console.log(`- Hardcoded Project ID: 8cfd5e53-bbcc-4b79-a98d-08c26f56da95`);
    console.log(`- App Name: ${Constants.expoConfig?.name || 'Not found'}`);
    console.log(`- App Slug: ${Constants.expoConfig?.slug || 'Not found'}`);
  } catch (error) {
    console.log(`- Error getting Expo config: ${error}`);
  }
  
  // Try to get push token
  console.log('\nPush Token Attempt:');
  try {
    if (Device.isDevice) {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '8cfd5e53-bbcc-4b79-a98d-08c26f56da95',
      });
      console.log(`- Token obtained: ${token.data}`);
    } else {
      console.log('- Not a physical device, skipping token request');
    }
  } catch (error) {
    console.log(`- Error getting push token: ${error}`);
  }
  
  console.log('\n======= END DEBUG INFO =======');
}

/**
 * Test function to send a push notification to a specific token
 * This will log the response to help diagnose push notification issues
 */
export async function testPushNotification(token: string) {
  if (!token) {
    console.log('No token provided for testing');
    return;
  }
  
  console.log(`Testing push notification to token: ${token}`);
  
  const message = {
    to: token,
    sound: 'default',
    title: 'Debug Test',
    body: 'This is a test notification from debug function',
    data: { debug: true, time: new Date().toISOString() },
  };
  
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    const responseData = await response.json();
    console.log('Push notification test response:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error sending test push notification:', error);
    return { error: error.message };
  }
} 