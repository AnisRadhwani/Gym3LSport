import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from '../firestore';
import { doc, updateDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

// Configuration for how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Add background notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Handle notifications when app is in background or closed
Notifications.addNotificationResponseReceivedListener((response) => {
  console.log('Background notification tapped:', response);
  // Handle navigation or other actions when user taps notification
});

// The Expo project ID - replace with your actual project ID from app.json
const EXPO_PROJECT_ID = '8cfd5e53-bbcc-4b79-a98d-08c26f56da95';

/**
 * Register for push notifications and return the token
 * This should be called when the app starts or when a user logs in
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // Check if the device is a physical device (not a simulator/emulator)
  if (!Device.isDevice) {
    console.log('Push notifications are not available on simulators/emulators');
    return undefined;
  }

  // For Android, we need to set up a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  // Check and request Expo notifications permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return undefined;
  }

  try {
    // Get the Expo push token
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    })).data;
    
    console.log('Push Notification Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return undefined;
  }
}

/**
 * Save the push token to Firestore for a specific user
 */
export async function savePushTokenToFirestore(userId: string, token: string): Promise<boolean> {
  if (!userId || !token) {
    console.log('Cannot save push token: missing userId or token');
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      pushToken: token,
      lastTokenUpdate: new Date(),
      tokenType: 'expo'
    });
    console.log(`Push token saved for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error saving push token to Firestore:', error);
    return false;
  }
}

/**
 * Set up notification listeners and return cleanup function
 * This should be called in a useEffect hook
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Listener for when a notification is received while the app is in the foreground
  const notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received in foreground:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // Listener for when a user taps on a notification
  const responseReceivedSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('User tapped on notification:', response);
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    }
  );

  // Return a cleanup function to remove the listeners
  return () => {
    Notifications.removeNotificationSubscription(notificationReceivedSubscription);
    Notifications.removeNotificationSubscription(responseReceivedSubscription);
  };
}

/**
 * Get all notification permissions
 */
export async function getNotificationPermissionsAsync() {
  return await Notifications.getPermissionsAsync();
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  trigger: Notifications.NotificationTriggerInput = null
) {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger,
  });
}

/**
 * Send a push notification to a specific token
 * Note: This is for development/testing only
 * In production, you should send notifications from your server
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
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
    console.log('Push notification sent:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Initialize notifications for a logged-in user
 * This combines registration and saving the token
 */
export async function initializeNotifications(userId: string): Promise<string | undefined> {
  if (!userId) {
    console.log('Cannot initialize notifications: missing userId');
    return undefined;
  }

  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await savePushTokenToFirestore(userId, token);
      return token;
    }
    return undefined;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return undefined;
  }
}

/**
 * Get the badge count and set it
 */
export async function getBadgeCountAsync() {
  return await Notifications.getBadgeCountAsync();
}

export async function setBadgeCountAsync(count: number) {
  return await Notifications.setBadgeCountAsync(count);
}

/**
 * Dismiss all notifications
 */
export async function dismissAllNotificationsAsync() {
  return await Notifications.dismissAllNotificationsAsync();
}

/**
 * Send push notifications to multiple users in batches
 * This uses Expo's Push API directly without requiring FCM
 * @param tokens Array of Expo push tokens
 * @param title Notification title
 * @param body Notification body
 * @param data Additional data to send with the notification
 * @returns Results of the send operation
 */
export async function sendBulkPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  console.log('📱 Starting bulk push notification send...');
  console.log('📱 Tokens count:', tokens?.length || 0);
  console.log('📱 Title:', title);
  console.log('📱 Body:', body);
  
  if (!tokens || tokens.length === 0) {
    console.log('❌ No tokens provided for push notifications');
    return { success: false, sent: 0, failed: 0, message: 'No tokens provided' };
  }

  // Filter out invalid tokens
  const validTokens = tokens.filter(token => 
    token && token.startsWith('ExponentPushToken[')
  );

  console.log('📱 Valid tokens count:', validTokens.length);
  console.log('📱 Sample valid token:', validTokens[0]?.substring(0, 30) + '...');

  if (validTokens.length === 0) {
    console.log('❌ No valid Expo push tokens found');
    return { success: false, sent: 0, failed: 0, message: 'No valid tokens found' };
  }

  console.log(`📱 Sending push notifications to ${validTokens.length} recipients`);
  console.log('📱 Notification details:', { title, body, data });
  
  // Track results
  const results = {
    total: validTokens.length,
    sent: 0,
    failed: 0,
    errors: [] as Array<{ token: string, error: string }>
  };

  // Send notifications in batches of 100 (Expo's recommended batch size)
  for (let i = 0; i < validTokens.length; i += 100) {
    const batch = validTokens.slice(i, i + 100);
    const messages = batch.map(token => ({
      to: token,
      title,
      body,
      sound: 'default',
      data,
      priority: 'high', // Add high priority for better delivery
      channelId: 'default', // Specify channel for Android
    }));

    try {
      console.log(`Sending batch ${Math.floor(i/100) + 1} with ${batch.length} messages`);
      
      // Send the batch to Expo's Push API
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Push API error response:', errorText);
        throw new Error(`Push API returned ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log(`Batch ${Math.floor(i/100) + 1} response:`, responseData);

      // Process the response
      if (Array.isArray(responseData)) {
        responseData.forEach((item, index) => {
          if (item.status === 'ok') {
            results.sent++;
            console.log(`✅ Notification sent successfully to token: ${batch[index].substring(0, 20)}...`);
          } else {
            results.failed++;
            const error = item.message || 'Unknown error';
            console.error(`❌ Failed to send to token ${batch[index].substring(0, 20)}...: ${error}`);
            results.errors.push({
              token: batch[index],
              error: error,
            });
          }
        });
      } else if (responseData.data) {
        // Handle case where response format is different
        const ticketData = responseData.data;
        results.sent += ticketData.filter(t => t.status === 'ok').length;
        results.failed += ticketData.filter(t => t.status !== 'ok').length;
      } else {
        console.error('Unexpected response format:', responseData);
        results.failed += batch.length;
      }
    } catch (error) {
      console.error(`Error sending batch ${Math.floor(i/100) + 1}:`, error);
      results.failed += batch.length;
      results.errors.push({
        token: 'batch',
        error: error instanceof Error ? error.message : 'Network error',
      });
    }

    // Add a small delay between batches to avoid rate limiting
    if (i + 100 < validTokens.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`📱 Push notification summary: ${results.sent} sent, ${results.failed} failed`);
  
  const result = {
    success: results.sent > 0,
    sent: results.sent,
    failed: results.failed,
    total: results.total,
    errors: results.errors,
    message: results.sent > 0 
      ? `Successfully sent ${results.sent} notifications${results.failed > 0 ? `, ${results.failed} failed` : ''}`
      : `Failed to send notifications. ${results.errors.length > 0 ? results.errors[0].error : 'Unknown error'}`
  };
  
  console.log('📱 Final result:', result);
  return result;
}

/**
 * Test function to send a single push notification for debugging
 * @param token The Expo push token to test
 * @param title Notification title
 * @param body Notification body
 * @returns Test result
 */
export async function testSinglePushNotification(
  token: string,
  title: string = 'Test Notification',
  body: string = 'This is a test notification'
) {
  console.log('🧪 Testing push notification...');
  console.log('Token:', token);
  console.log('Title:', title);
  console.log('Body:', body);

  const message = {
    to: token,
    title,
    body,
    sound: 'default',
    data: { test: true, timestamp: new Date().toISOString() },
    priority: 'high',
    channelId: 'default',
  };

  try {
    console.log('Sending test notification to Expo Push API...');
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([message]),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Push API error:', errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const responseData = await response.json();
    console.log('✅ Push API response:', responseData);

    if (Array.isArray(responseData) && responseData.length > 0) {
      const result = responseData[0];
      if (result.status === 'ok') {
        console.log('✅ Test notification sent successfully!');
        return { success: true, message: 'Notification sent successfully' };
      } else {
        console.error('❌ Test notification failed:', result.message);
        return { success: false, error: result.message };
      }
    } else {
      console.error('❌ Unexpected response format:', responseData);
      return { success: false, error: 'Unexpected response format' };
    }
  } catch (error) {
    console.error('❌ Test notification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}