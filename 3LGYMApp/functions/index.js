const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function that triggers when an event's interestedUsers array changes
 * It schedules or cancels notifications based on user interest
 */
exports.handleEventInterest = functions.firestore
  .document('events/{eventId}')
  .onUpdate(async (change, context) => {
    const eventId = context.params.eventId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Skip processing if sendNotification is false
    if (!afterData.sendNotification) {
      console.log(`Event ${eventId} has notifications disabled. Skipping.`);
      return null;
    }
    
    // Get the event date and time
    const eventDate = afterData.date.toDate();
    const [eventHours, eventMinutes] = afterData.startTime.split(':').map(Number);
    
    // Set the event time on the event date
    eventDate.setHours(eventHours, eventMinutes, 0, 0);
    
    // Calculate notification time (2 hours before event)
    const notificationTime = new Date(eventDate);
    notificationTime.setHours(notificationTime.getHours() - 2);
    
    // Get current time
    const now = new Date();
    
    // Skip if the notification time has already passed
    if (notificationTime <= now) {
      console.log(`Notification time for event ${eventId} has already passed. Skipping.`);
      return null;
    }
    
    // Find users who were added to interestedUsers (newly interested)
    const beforeInterested = beforeData.interestedUsers || [];
    const afterInterested = afterData.interestedUsers || [];
    
    // Users who became interested (added to the array)
    const newlyInterested = afterInterested.filter(uid => !beforeInterested.includes(uid));
    
    // Users who are no longer interested (removed from the array)
    const noLongerInterested = beforeInterested.filter(uid => !afterInterested.includes(uid));
    
    // Process newly interested users
    for (const userId of newlyInterested) {
      try {
        // Get user data to find their push token
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          console.log(`User ${userId} not found. Skipping notification.`);
          continue;
        }
        
        const userData = userDoc.data();
        const pushToken = userData.pushToken;
        const tokenType = userData.tokenType || 'expo'; // Default to expo if not specified
        
        if (!pushToken) {
          console.log(`User ${userId} has no push token. Skipping notification.`);
          continue;
        }
        
        // Calculate delay in milliseconds
        const delayMs = notificationTime.getTime() - now.getTime();
        
        // Store scheduled notification in a separate collection for tracking
        await db.collection('scheduledNotifications').add({
          userId,
          eventId,
          eventTitle: afterData.title,
          scheduledFor: admin.firestore.Timestamp.fromDate(notificationTime),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          pushToken,
          tokenType,
          sent: false
        });
        
        console.log(`Scheduled notification for user ${userId} for event ${eventId} at ${notificationTime}`);
      } catch (error) {
        console.error(`Error scheduling notification for user ${userId}:`, error);
      }
    }
    
    // Process users who are no longer interested
    for (const userId of noLongerInterested) {
      try {
        // Find and delete any scheduled notifications for this user and event
        const scheduledNotificationsQuery = await db.collection('scheduledNotifications')
          .where('userId', '==', userId)
          .where('eventId', '==', eventId)
          .where('sent', '==', false)
          .get();
        
        const batch = db.batch();
        scheduledNotificationsQuery.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Cancelled notifications for user ${userId} for event ${eventId}`);
      } catch (error) {
        console.error(`Error cancelling notifications for user ${userId}:`, error);
      }
    }
    
    return null;
  });

/**
 * Cloud Function that runs every minute to check for notifications that need to be sent
 */
exports.sendScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = new Date();
    
    try {
      // Find notifications that are due to be sent (scheduled time <= now and not sent yet)
      const notificationsQuery = await db.collection('scheduledNotifications')
        .where('scheduledFor', '<=', admin.firestore.Timestamp.fromDate(now))
        .where('sent', '==', false)
        .get();
      
      if (notificationsQuery.empty) {
        console.log('No notifications to send at this time');
        return null;
      }
      
      console.log(`Found ${notificationsQuery.size} notifications to send`);
      
      const batch = db.batch();
      const sendPromises = [];
      
      notificationsQuery.forEach(doc => {
        const notification = doc.data();
        
        // Check if user is still interested in the event
        sendPromises.push(
          (async () => {
            try {
              // Get the event to verify user is still interested
              const eventDoc = await db.collection('events').doc(notification.eventId).get();
              
              if (!eventDoc.exists) {
                console.log(`Event ${notification.eventId} no longer exists. Skipping notification.`);
                batch.delete(doc.ref);
                return;
              }
              
              const eventData = eventDoc.data();
              const interestedUsers = eventData.interestedUsers || [];
              
              // If user is no longer interested, delete the notification and skip sending
              if (!interestedUsers.includes(notification.userId)) {
                console.log(`User ${notification.userId} is no longer interested in event ${notification.eventId}. Skipping notification.`);
                batch.delete(doc.ref);
                return;
              }
              
              // Format the message
              const message = {
                to: notification.pushToken,
                title: `Upcoming: ${notification.eventTitle}`,
                body: `Your event starts in 2 hours!`,
                data: {
                  eventId: notification.eventId,
                  screen: 'events'
                },
              };
              
              // Send via Expo Push Service
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Accept-encoding': 'gzip, deflate',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
              });
              
              console.log(`Sent notification to user ${notification.userId} for event ${notification.eventId}`);
              
              // Mark as sent
              batch.update(doc.ref, { 
                sent: true,
                sentAt: admin.firestore.FieldValue.serverTimestamp()
              });
            } catch (error) {
              console.error(`Error sending notification ${doc.id}:`, error);
              // If there's an error sending, we'll retry next time
            }
          })()
        );
      });
      
      // Wait for all send operations to complete
      await Promise.all(sendPromises);
      
      // Commit the batch to update/delete documents
      await batch.commit();
      
      return null;
    } catch (error) {
      console.error('Error in sendScheduledNotifications:', error);
      return null;
    }
  }); 

/**
 * Cloud Function to send notifications to all users with valid Expo push tokens
 * This function doesn't require FCM and uses Expo's Push API directly
 */
exports.sendBulkNotifications = functions.https.onCall(async (data, context) => {
  // Check if the request is made by an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send notifications');
  }

  // Optional: Check if the user is an admin (you can implement your own admin check)
  try {
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || !userData.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can send bulk notifications');
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify admin status');
  }

  // Validate the notification data
  if (!data.title || !data.body) {
    throw new functions.https.HttpsError('invalid-argument', 'Notification must include title and body');
  }

  try {
    // Get all users with push tokens
    const usersSnapshot = await db.collection('users')
      .where('pushToken', '!=', null)
      .get();
    
    if (usersSnapshot.empty) {
      return { success: true, sent: 0, message: 'No users with push tokens found' };
    }

    console.log(`Found ${usersSnapshot.size} users with push tokens`);
    
    // Prepare the messages
    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.pushToken && userData.pushToken.startsWith('ExponentPushToken[')) {
        users.push({
          userId: doc.id,
          pushToken: userData.pushToken
        });
      }
    });
    
    console.log(`Found ${users.length} users with valid Expo push tokens`);
    
    // Track results
    const results = {
      total: users.length,
      sent: 0,
      failed: 0,
      errors: []
    };
    
    // Send notifications in batches of 100 (Expo's recommended batch size)
    for (let i = 0; i < users.length; i += 100) {
      const batch = users.slice(i, i + 100);
      const messages = batch.map(user => ({
        to: user.pushToken,
        title: data.title,
        body: data.body,
        sound: 'default',
        data: data.data || {},
      }));
      
      try {
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
        
        const responseData = await response.json();
        console.log(`Batch ${Math.floor(i/100) + 1} response:`, responseData);
        
        // Process the response
        if (Array.isArray(responseData)) {
          responseData.forEach((item, index) => {
            if (item.status === 'ok') {
              results.sent++;
            } else {
              results.failed++;
              results.errors.push({
                userId: batch[index].userId,
                error: item.message || 'Unknown error',
              });
            }
          });
        } else if (responseData.data) {
          // Handle case where response format is different
          const ticketData = responseData.data;
          results.sent += ticketData.filter(t => t.status === 'ok').length;
          results.failed += ticketData.filter(t => t.status !== 'ok').length;
        }
      } catch (error) {
        console.error(`Error sending batch ${Math.floor(i/100) + 1}:`, error);
        results.failed += batch.length;
        results.errors.push({
          batch: Math.floor(i/100) + 1,
          error: error.message || 'Network error',
        });
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i + 100 < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Store the notification in Firestore for record-keeping
    await db.collection('notifications').add({
      title: data.title,
      message: data.body,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: context.auth.uid,
      recipients: 'all',
      results: {
        total: results.total,
        sent: results.sent,
        failed: results.failed
      }
    });
    
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notifications: ' + error.message);
  }
}); 

// Add a new Cloud Function to process recurring events
exports.processRecurringEvents = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      console.log('Processing recurring events...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate the start of the current week (Monday)
      const startOfWeek = new Date(today);
      const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to get Monday
      startOfWeek.setDate(startOfWeek.getDate() - diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Get all recurring events that are in the past or need to be processed for this week
      const eventsSnapshot = await db.collection('events')
        .where('isRecurring', '==', true)
        .where('date', '<', today)
        .get();
      
      if (eventsSnapshot.empty) {
        console.log('No recurring events to process');
        return null;
      }
      
      console.log(`Found ${eventsSnapshot.size} recurring events to process`);
      
      const batch = db.batch();
      const processPromises = [];
      
      // Process each event
      eventsSnapshot.forEach(doc => {
        const event = doc.data();
        const eventId = doc.id;
        
        processPromises.push(
          (async () => {
            try {
              const eventDate = event.date.toDate();
              
              // Find the next occurrence that is in the current week or future
              // Keep adding 7 days until we reach a date >= today
              let nextDate = new Date(eventDate);
              while (nextDate < today) {
                nextDate.setDate(nextDate.getDate() + 7);
              }
              
              // Check if an event already exists for this date and this recurring event
              const nextWeek = new Date(nextDate);
              nextWeek.setDate(nextWeek.getDate() + 7);
              
              const existingEventsSnapshot = await db.collection('events')
                .where('title', '==', event.title)
                .where('startTime', '==', event.startTime)
                .where('endTime', '==', event.endTime)
                .where('date', '>=', nextDate)
                .where('date', '<', nextWeek)
                .get();
              
              // Only create a new event if one doesn't already exist for this time slot
              if (existingEventsSnapshot.empty) {
                // Create a new event for next week
                const { id, ...eventWithoutId } = event;
                const newEvent = {
                  ...eventWithoutId,
                  date: admin.firestore.Timestamp.fromDate(nextDate),
                  isRecurringProcessed: false
                };
                
                // Add the new event
                const newEventRef = db.collection('events').doc();
                batch.set(newEventRef, newEvent);
                console.log(`Created new recurring event for date ${nextDate.toDateString()}`);
              } else {
                console.log(`Event already exists for ${nextDate.toDateString()}, skipping creation`);
              }
              
              // If the event is from before the current week, delete it to avoid duplication
              // But ONLY if it's already passed (before today)
              if (eventDate < startOfWeek && eventDate < today) {
                batch.delete(doc.ref);
                console.log(`Deleted old recurring event ${eventId} from ${eventDate.toDateString()}`);
              } else {
                // Mark the event as processed
                batch.update(doc.ref, { isRecurringProcessed: true });
                console.log(`Marked recurring event ${eventId} as processed`);
              }
            } catch (error) {
              console.error(`Error processing recurring event ${eventId}:`, error);
            }
          })()
        );
      });
      
      // Wait for all processing to complete
      await Promise.all(processPromises);
      
      // Commit the batch to update/delete documents
      await batch.commit();
      
      console.log('✅ Recurring events processing completed');
      return null;
    } catch (error) {
      console.error('Error processing recurring events:', error);
      return null;
    }
  }); 

// Add a callable function to manually trigger recurring events processing
exports.manualProcessRecurringEvents = functions.https.onCall(async (data, context) => {
  // Check if the request is made by an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to process events');
  }

  try {
    // Check if the user is an admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || !userData.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can process events');
    }

    console.log('Manually processing recurring events...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the start of the current week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to get Monday
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Get all recurring events
    const eventsSnapshot = await db.collection('events')
      .where('isRecurring', '==', true)
      .get();
    
    if (eventsSnapshot.empty) {
      return { success: true, message: 'No recurring events found', processed: 0 };
    }
    
    console.log(`Found ${eventsSnapshot.size} recurring events to process`);
    
    const batch = db.batch();
    const processPromises = [];
    let processedCount = 0;
    
    // Process each event
    eventsSnapshot.forEach(doc => {
      const event = doc.data();
      const eventId = doc.id;
      
      processPromises.push(
        (async () => {
          try {
            const eventDate = event.date.toDate();
            
            // Find the next occurrence that is in the current week or future
            // Keep adding 7 days until we reach a date >= today
            let nextDate = new Date(eventDate);
            while (nextDate < today) {
              nextDate.setDate(nextDate.getDate() + 7);
            }
            
            // Check if an event already exists for this date and this recurring event
            const nextWeek = new Date(nextDate);
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            const existingEventsSnapshot = await db.collection('events')
              .where('title', '==', event.title)
              .where('startTime', '==', event.startTime)
              .where('endTime', '==', event.endTime)
              .where('date', '>=', nextDate)
              .where('date', '<', nextWeek)
              .get();
            
            // Only create a new event if one doesn't already exist for this time slot
            if (existingEventsSnapshot.empty) {
              // Create a new event for next week
              const { id, ...eventWithoutId } = event;
              const newEvent = {
                ...eventWithoutId,
                date: admin.firestore.Timestamp.fromDate(nextDate),
                isRecurringProcessed: false
              };
              
              // Add the new event
              const newEventRef = db.collection('events').doc();
              batch.set(newEventRef, newEvent);
              processedCount++;
              console.log(`Created new recurring event for date ${nextDate.toDateString()}`);
            } else {
              console.log(`Event already exists for ${nextDate.toDateString()}, skipping creation`);
            }
          } catch (error) {
            console.error(`Error processing recurring event ${eventId}:`, error);
          }
        })()
      );
    });
    
    // Wait for all processing to complete
    await Promise.all(processPromises);
    
    // Commit the batch to update/delete documents
    await batch.commit();
    
    console.log('✅ Manual recurring events processing completed');
    return { 
      success: true, 
      message: 'Recurring events processed successfully', 
      processed: processedCount 
    };
  } catch (error) {
    console.error('Error processing recurring events:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process recurring events: ' + error.message);
  }
}); 