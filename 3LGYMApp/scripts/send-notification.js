#!/usr/bin/env node

/**
 * Script to send push notifications using Expo's Push API
 * 
 * Usage:
 * node send-notification.js --token=ExponentPushToken[xxxxxx] --title="Test Title" --body="Test message"
 */

const fetch = require('node-fetch');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value;
  }
  return acc;
}, {});

// Check required arguments
if (!args.token) {
  console.error('Error: --token argument is required');
  console.log('Usage: node send-notification.js --token=ExponentPushToken[xxxxxx] --title="Test Title" --body="Test message"');
  process.exit(1);
}

// Set defaults
const title = args.title || 'Test Notification';
const body = args.body || 'This is a test notification from 3lgym';
const data = args.data ? JSON.parse(args.data) : { screen: 'home' };

// Function to send a push notification
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    console.log(`Sending notification to ${expoPushToken}...`);
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);
    console.log(`Data: ${JSON.stringify(data)}`);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    if (responseData.data && responseData.data.status === 'ok') {
      console.log('✅ Notification sent successfully!');
    } else {
      console.log('⚠️ There might be an issue with the notification.');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Send the notification
sendPushNotification(args.token, title, body, data); 