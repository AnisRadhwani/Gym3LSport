# Push Notifications Setup Guide for 3lgym App

This guide explains how to set up and use push notifications in the 3lgym app.

## Prerequisites

- An Expo account
- Firebase project (for FCM on Android)
- Apple Developer account (for APNs on iOS)

## Setup Steps

### 1. Configure app.json

The app.json file has been configured with the necessary settings for push notifications:

```json
{
  "expo": {
    // ... other settings
    "ios": {
      "bundleIdentifier": "com.yourcompany.gymlaunchapp"
    },
    "android": {
      "package": "com.yourcompany.gymlaunchapp",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      // ... other plugins
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#3B82F6",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### 2. Update with Your Project Details

1. Replace `"your-eas-project-id"` with your actual EAS project ID
2. Replace `"your-expo-username"` with your Expo username
3. Replace `"com.yourcompany.gymlaunchapp"` with your app's bundle ID

### 3. Create Notification Assets

1. Create a notification icon: `./assets/images/notification-icon.png`
2. (Optional) Add notification sounds: `./assets/sounds/notification.wav`

### 4. Android Setup (FCM)

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Add an Android app with your package name (`com.yourcompany.gymlaunchapp`)
3. Download the `google-services.json` file and place it in the root of your project
4. Enable Cloud Messaging in the Firebase console

### 5. iOS Setup (APNs)

1. Register your app in the Apple Developer portal
2. Create an APNs key or certificate
3. During EAS build, configure the credentials

## Building for Production

To build for production with push notifications:

```bash
eas build --platform all
```

## How Push Notifications Work in the App

### Registration Process

When a user logs in, the app:

1. Requests notification permissions
2. Registers the device with Expo's push service
3. Gets an Expo Push Token
4. Saves the token to Firestore in the user's document

### Notification Handling

The app handles notifications in these ways:

1. **Foreground notifications**: Displayed as an alert when the app is open
2. **Background notifications**: Appear in the system tray
3. **Notification taps**: Can navigate to specific screens based on payload data

## Sending Notifications

### From the Admin Panel

Admins can send notifications to users from the admin panel. The notifications are sent through Firebase Cloud Functions.

### From Firebase Cloud Functions

Example of sending a notification from a Cloud Function:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

exports.sendNotificationToUser = functions.https.onCall(async (data, context) => {
  // Get user's push token from Firestore
  const userDoc = await admin.firestore().collection('users').doc(data.userId).get();
  const pushToken = userDoc.data().pushToken;
  
  if (!pushToken) return { success: false, error: 'User has no push token' };
  
  // Send notification via Expo's push service
  const message = {
    to: pushToken,
    sound: 'default',
    title: data.title,
    body: data.body,
    data: data.data || {},
  };
  
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
  return { success: true, response: responseData };
});
```

## Troubleshooting

### Common Issues

1. **Permissions not granted**: Ensure you're requesting permissions correctly and handling denials
2. **Token not saved**: Check Firestore rules to ensure users can update their own documents
3. **Notifications not received**: Verify the token is correct and the device is online

### Testing Push Notifications

You can test push notifications using the Expo CLI:

```bash
expo push:send --to "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" --title "Test Notification" --body "This is a test notification"
```

Or use the testing function in the app:

```javascript
import { sendPushNotification } from '@/lib/utils/notificationsHelper';

// In a component or function
const testNotification = async () => {
  await sendPushNotification(
    'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    'Test Notification',
    'This is a test notification',
    { screen: 'home' }
  );
};
```

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)