import { 
  addDocument, 
  updateDocument, 
  deleteDocument, 
  getDocumentById, 
  getCollection,
  setDocument,
  db,
  subscribeToCollection
} from './firestore';
import { Coach, Event, User, Notification, Category } from './types';
import { Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './auth';
import { sendPushNotification } from './utils/notificationsHelper';

// Coach services
export const getCoaches = async (): Promise<Coach[]> => {
  return await getCollection<Coach>('coaches');
};

export const getCoachById = async (id: string): Promise<Coach | null> => {
  return await getDocumentById<Coach>('coaches', id);
};

export const addCoach = async (coach: Omit<Coach, 'id'>): Promise<string | null> => {
  return await addDocument<Omit<Coach, 'id'>>('coaches', coach);
};

export const updateCoach = async (id: string, data: Partial<Coach>): Promise<boolean> => {
  return await updateDocument<Coach>('coaches', id, data);
};

export const deleteCoach = async (id: string): Promise<boolean> => {
  return await deleteDocument('coaches', id);
};

// Event services
export const getEvents = async (): Promise<Event[]> => {
  return await getCollection<Event>('events');
};

export const getTodayEvents = async (): Promise<Event[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await getCollection<Event>('events', [
    ['date', '>=', Timestamp.fromDate(today)],
    ['date', '<', Timestamp.fromDate(tomorrow)]
  ]);
};

export const getWeekEvents = async (): Promise<Event[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  return await getCollection<Event>('events', [
    ['date', '>=', Timestamp.fromDate(today)],
    ['date', '<', Timestamp.fromDate(nextWeek)]
  ]);
};

export const getEventById = async (id: string): Promise<Event | null> => {
  return await getDocumentById<Event>('events', id);
};

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** When a coach is assigned to an event, mark them as present during that time (merge into daySpecificHours + daysAvailable). */
export const syncCoachAvailabilityForEvent = async (
  coachId: string,
  date: Timestamp | Date,
  startTime: string,
  endTime: string
): Promise<void> => {
  try {
    const coach = await getCoachById(coachId);
    if (!coach) return;

    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    const dayKey = DAY_KEYS[d.getDay()];

    const current = coach.daySpecificHours?.[dayKey];
    const newStart = !current || startTime < current.startTime ? startTime : current.startTime;
    const newEnd = !current || endTime > current.endTime ? endTime : current.endTime;

    const daySpecificHours = {
      ...(coach.daySpecificHours || {}),
      [dayKey]: { startTime: newStart, endTime: newEnd },
    };
    const daysAvailable = { ...coach.daysAvailable, [dayKey]: true };

    await updateCoach(coachId, { daySpecificHours, daysAvailable });
  } catch (error) {
    console.error('Error syncing coach availability:', error);
  }
};

export const addEvent = async (event: Omit<Event, 'id'>): Promise<string | null> => {
  const id = await addDocument<Omit<Event, 'id'>>('events', event);
  if (id) {
    await syncCoachAvailabilityForEvent(event.coachId, event.date, event.startTime, event.endTime);
  }
  return id;
};

export const updateEvent = async (id: string, data: Partial<Event>): Promise<boolean> => {
  try {
    const event = await getEventById(id);
    if (!event) return false;

    const finalStart = data.startTime ?? event.startTime;
    const finalEnd = data.endTime ?? event.endTime;
    const finalCoachId = data.coachId ?? event.coachId;

    // If not recurring, just update this one event then sync coach presence
    if (!event.isRecurring) {
      const ok = await updateDocument<Event>('events', id, data);
      if (ok) {
        const eventDate = data.date ?? event.date;
        await syncCoachAvailabilityForEvent(finalCoachId, eventDate, finalStart, finalEnd);
      }
      return ok;
    }

    // Recurring: apply the same changes to ALL copies in the series
    const allRecurring = await getCollection<Event>('events', [
      ['isRecurring', '==', true],
    ]);

    const seriesEvents = allRecurring.filter(
      (e) =>
        e.title === event.title &&
        e.coachId === event.coachId &&
        e.startTime === event.startTime &&
        e.endTime === event.endTime
    );

    // For other events in the series, don't change their date (each has its own week)
    const { date: _date, ...dataWithoutDate } = data as Partial<Event> & { date?: unknown };

    for (const e of seriesEvents) {
      if (e.id === id) {
        await updateDocument<Event>('events', e.id, data);
      } else {
        await updateDocument<Event>('events', e.id, dataWithoutDate);
      }
    }

    // Mark coach as present for each occurrence's date
    for (const e of seriesEvents) {
      await syncCoachAvailabilityForEvent(finalCoachId, e.date, finalStart, finalEnd);
    }

    return true;
  } catch (error) {
    console.error('Error updating event:', error);
    return false;
  }
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  try {
    const event = await getEventById(id);
    if (!event) return false;

    // If not recurring, just delete this one event
    if (!event.isRecurring) {
      return await deleteDocument('events', id);
    }

    // Recurring event: stop the entire series - no more copies will ever appear
    const allRecurring = await getCollection<Event>('events', [
      ['isRecurring', '==', true],
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const seriesEvents = allRecurring.filter(
      (e) =>
        e.title === event.title &&
        e.coachId === event.coachId &&
        e.startTime === event.startTime &&
        e.endTime === event.endTime
    );

    for (const e of seriesEvents) {
      const eventDate = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date);
      const eventDateOnly = new Date(eventDate);
      eventDateOnly.setHours(0, 0, 0, 0);

      if (e.id === id || eventDateOnly >= today) {
        // Always delete the one user clicked, and all future events
        await deleteDocument('events', e.id);
      } else {
        // Past events (not the one clicked): set isRecurring = false so they never spawn new copies
        await updateDocument<Event>('events', e.id, { isRecurring: false });
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    return false;
  }
};

// Toggle the recurring status of an event
export const toggleEventRecurring = async (id: string, currentStatus: boolean): Promise<boolean> => {
  return await updateDocument<Event>('events', id, { isRecurring: !currentStatus });
};

// User services
export const getUsers = async (): Promise<User[]> => {
  return await getCollection<User>('users');
};

// Subscribe to real-time user updates
export const subscribeToUsers = (callback: (users: User[]) => void) => {
  return subscribeToCollection<User>('users', callback);
};

// Get user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  return await getDocumentById<User>('users', id);
};

// Update user
export const updateUser = async (id: string, data: Partial<User>): Promise<boolean> => {
  return await updateDocument<User>('users', id, data);
};

// Delete user
export const deleteUser = async (id: string): Promise<boolean> => {
  return await deleteDocument('users', id);
};

// Category services
export const getCategories = async (): Promise<Category[]> => {
  return await getCollection<Category>('categories', undefined, 'name');
};

export const subscribeToCategories = (callback: (categories: Category[]) => void) => {
  return subscribeToCollection<Category>('categories', callback, undefined, 'name');
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  return await getDocumentById<Category>('categories', id);
};

export const addCategory = async (name: string): Promise<string | null> => {
  return await addDocument<Omit<Category, 'id'>>('categories', { name: name.trim() });
};

export const updateCategory = async (id: string, name: string): Promise<boolean> => {
  return await updateDocument<Category>('categories', id, { name: name.trim() });
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  return await deleteDocument('categories', id);
};

// Calculate and update membership days left
export const updateMembershipDaysLeft = async (user: User): Promise<boolean> => {
  try {
    // If lastUpdated doesn't exist, set it to today and don't deduct days
    if (!user.lastUpdated) {
      return await updateUser(user.id, {
        lastUpdated: Timestamp.now()
      });
    }

    // Convert Timestamp to Date if needed
    const lastUpdated = user.lastUpdated instanceof Timestamp 
      ? user.lastUpdated.toDate() 
      : user.lastUpdated;

    // Get today's date (reset time to midnight for accurate day calculation)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Reset time part of lastUpdated to midnight for accurate day calculation
    const lastUpdatedDate = new Date(lastUpdated);
    lastUpdatedDate.setHours(0, 0, 0, 0);
    
    // Calculate days passed
    const daysPassed = Math.floor((today.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If no days have passed, no need to update
    if (daysPassed <= 0) {
      return true;
    }
    
    // Calculate new membershipDaysLeft
    let newDaysLeft = user.membershipDaysLeft;

    if (user.membershipType === 'In Progress') {
      // Do not decrement below 0 for users who haven't been assigned days yet
      newDaysLeft = 0;
    } else {
      // Allow negative values to reflect how many days since expiry
      newDaysLeft = user.membershipDaysLeft - daysPassed;
    }
    
    // Update user document
    return await updateUser(user.id, {
      membershipDaysLeft: newDaysLeft,
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating membership days left:', error);
    return false;
  }
};

// Update membership days for all users
export const updateAllUsersMembershipDays = async (): Promise<void> => {
  try {
    const users = await getUsers();
    
    // Process each user
    const updatePromises = users.map(user => updateMembershipDaysLeft(user));
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    console.log('✅ Updated membership days for all users');
  } catch (error) {
    console.error('Error updating all users membership days:', error);
  }
};

// Reset membership days for a user
export const resetMembershipDays = async (userId: string, days: number = 30): Promise<boolean> => {
  try {
    // Get the current user data to preserve the existing membership type
    const currentUser = await getUserById(userId);
    const currentMembershipType = currentUser?.membershipType;
    
    // Only change membership type to 'Basic' if it's currently 'In Progress' and we're adding days
    // If it's already 'Basic' or another type, keep it that way even when days = 0
    let newMembershipType = currentMembershipType;
    if (currentMembershipType === 'In Progress' && days > 0) {
      newMembershipType = 'Basic';
    }
    
    return await updateUser(userId, {
      membershipDaysLeft: days,
      membershipType: newMembershipType,
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error('Error resetting membership days:', error);
    return false;
  }
};

export const createUserDocument = async (user: { 
  uid: string, 
  email?: string | null, 
  fullName?: string | null,
  displayName?: string | null,
  phoneNumber?: string | null,
  membershipType?: string,
  membershipDaysLeft?: number,
  isAdmin?: boolean,
  createdAt?: Date | null,
  photoURL?: string | null
}): Promise<boolean> => {
  const { 
    uid, 
    email, 
    fullName, 
    displayName, 
    phoneNumber, 
    membershipType = 'In Progress', 
    membershipDaysLeft = 0, 
    isAdmin = false,
    createdAt,
    photoURL
  } = user;
  
  console.log("📝 Creating/updating user document for:", uid);
  console.log("📊 User data:", { email, fullName, displayName, isAdmin });
  
  // Check if the user document already exists to preserve admin status
  let existingUserData = null;
  try {
    existingUserData = await getUserById(uid);
  } catch (error) {
    console.log("No existing user document found, creating new one");
  }
  
  const userData = {
    email: email || '',
    fullName: fullName || displayName || '',
    displayName: displayName || fullName || '',
    phoneNumber: phoneNumber || '',
    membershipType,
    membershipDaysLeft,
    // Preserve admin status if it exists in the database
    isAdmin: existingUserData?.isAdmin || isAdmin,
    createdAt: createdAt ? Timestamp.fromDate(new Date(createdAt)) : Timestamp.now(),
    lastUpdated: Timestamp.now(),
    photoURL: photoURL || '',
    pushToken: existingUserData?.pushToken || null,
    categoryIds: existingUserData?.categoryIds ?? [],
    notes: existingUserData?.notes ?? '',
  };

  try {
    const result = await setDocument('users', uid, userData, true);
    console.log("✅ User document created/updated successfully");
    return result;
  } catch (error) {
    console.error("❌ Error creating/updating user document:", error);
    return false;
  }
};

// Notification services
export const sendNotification = async (notification: Omit<Notification, 'id' | 'sentAt'>): Promise<string | null> => {
  try {
  const notificationWithTimestamp = {
    ...notification,
    sentAt: Timestamp.now()
  };
  
    // Add the new notification
    const newNotificationId = await addDocument<Omit<Notification, 'id'>>('notifications', notificationWithTimestamp);
    
    // Get all notifications sorted by date (newest first)
    const allNotifications = await getCollection<Notification>('notifications');
    
    // Sort notifications by sentAt in descending order (newest first)
    const sortedNotifications = allNotifications.sort((a, b) => {
      const dateA = a.sentAt instanceof Timestamp ? a.sentAt.toDate() : new Date(a.sentAt);
      const dateB = b.sentAt instanceof Timestamp ? b.sentAt.toDate() : new Date(b.sentAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    // If we have more than 10 notifications, delete the oldest ones
    if (sortedNotifications.length > 10) {
      // Get the notifications to delete (everything after the 10th one)
      const notificationsToDelete = sortedNotifications.slice(10);
      
      console.log(`Deleting ${notificationsToDelete.length} old notifications`);
      
      // Delete each old notification
      const deletePromises = notificationsToDelete.map(notification => 
        deleteDocument('notifications', notification.id)
      );
      
      // Wait for all deletions to complete
      await Promise.all(deletePromises);
    }
    
    return newNotificationId;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
}; 

// Function to clean up duplicate events
export const cleanupDuplicateEvents = async (): Promise<void> => {
  try {
    console.log('Cleaning up duplicate events...');
    
    // Get all events
    const allEvents = await getCollection<Event>('events');
    
    // Group events by date, title, startTime, endTime, and coachId
    const eventGroups = new Map();
    
    allEvents.forEach(event => {
      const eventDate = event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date);
      const dateStr = eventDate.toDateString();
      
      // Create a unique key for each event based on its properties
      const key = `${dateStr}_${event.title}_${event.startTime}_${event.endTime}_${event.coachId}`;
      
      if (!eventGroups.has(key)) {
        eventGroups.set(key, []);
      }
      
      eventGroups.get(key).push(event);
    });
    
    // Find groups with more than one event (duplicates)
    let duplicatesRemoved = 0;
    
    for (const [key, events] of eventGroups.entries()) {
      if (events.length > 1) {
        console.log(`Found ${events.length} duplicates for event: ${key}`);
        
        // Sort by creation date if available, or just keep the first one
        // Keep the one with interested users if any
        events.sort((a: Event, b: Event) => {
          // If one has interested users and the other doesn't, keep the one with interested users
          if ((a.interestedUsers?.length || 0) > 0 && (!b.interestedUsers || b.interestedUsers.length === 0)) {
            return -1;
          }
          if ((b.interestedUsers?.length || 0) > 0 && (!a.interestedUsers || a.interestedUsers.length === 0)) {
            return 1;
          }
          return 0;
        });
        
        // Keep the first one (either with interested users or just the first one)
        const keepEvent = events[0];
        
        // Delete the rest
        for (let i = 1; i < events.length; i++) {
          await deleteDocument('events', events[i].id);
          duplicatesRemoved++;
        }
      }
    }
    
    console.log(`Removed ${duplicatesRemoved} duplicate events`);
    
  } catch (error) {
    console.error('Error cleaning up duplicate events:', error);
  }
};

// Function to process recurring events
export const processRecurringEvents = async (): Promise<void> => {
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
    
    // Calculate the end of the current week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    console.log(`Week range: ${startOfWeek.toDateString()} to ${endOfWeek.toDateString()}`);
    
    // Get all recurring events
    const recurringEvents = await getCollection<Event>('events', [
      ['isRecurring', '==', true]
    ]);
    
    console.log(`Found ${recurringEvents.length} total recurring events`);
    
    // First, clean up any duplicate events for the current week
    // This is a more targeted cleanup than the general cleanupDuplicateEvents function
    const weekEvents = await getCollection<Event>('events', [
      ['date', '>=', Timestamp.fromDate(startOfWeek)],
      ['date', '<=', Timestamp.fromDate(endOfWeek)]
    ]);
    
    console.log(`Found ${weekEvents.length} events in current week`);
    
    // Group events by date, title, startTime, endTime, and coachId
    const eventGroups = new Map();
    
    weekEvents.forEach(event => {
      const eventDate = event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date);
      const dateStr = eventDate.toDateString();
      
      // Create a unique key for each event based on its properties
      const key = `${dateStr}_${event.title}_${event.startTime}_${event.endTime}_${event.coachId}`;
      
      if (!eventGroups.has(key)) {
        eventGroups.set(key, []);
      }
      
      eventGroups.get(key).push(event);
    });
    
    // Find and remove duplicates
    let duplicatesRemoved = 0;
    
    for (const [key, events] of eventGroups.entries()) {
      if (events.length > 1) {
        console.log(`Found ${events.length} duplicates for event: ${key}`);
        
        // Sort by creation date if available, or just keep the one with interested users
        events.sort((a: Event, b: Event) => {
          // If one has interested users and the other doesn't, keep the one with interested users
          if ((a.interestedUsers?.length || 0) > 0 && (!b.interestedUsers || b.interestedUsers.length === 0)) {
            return -1;
          }
          if ((b.interestedUsers?.length || 0) > 0 && (!a.interestedUsers || a.interestedUsers.length === 0)) {
            return 1;
          }
          return 0;
        });
        
        // Keep the first one (either with interested users or just the first one)
        const keepEvent = events[0];
        
        // Delete the rest
        for (let i = 1; i < events.length; i++) {
          await deleteDocument('events', events[i].id);
          duplicatesRemoved++;
          console.log(`Deleted duplicate event: ${events[i].id}`);
        }
      }
    }
    
    if (duplicatesRemoved > 0) {
      console.log(`Removed ${duplicatesRemoved} duplicate events from current week`);
    }
    
    // Process each recurring event to create future occurrences
    let createdCount = 0;
    let skippedCount = 0;
    
    // For each recurring event, ensure it has an instance in the next week
    const nextWeekStart = new Date(endOfWeek);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    nextWeekStart.setHours(0, 0, 0, 0);
    
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    nextWeekEnd.setHours(23, 59, 59, 999);
    
    console.log(`Next week range: ${nextWeekStart.toDateString()} to ${nextWeekEnd.toDateString()}`);
    
    // Get all events for next week to check for duplicates
    const nextWeekEvents = await getCollection<Event>('events', [
      ['date', '>=', Timestamp.fromDate(nextWeekStart)],
      ['date', '<=', Timestamp.fromDate(nextWeekEnd)]
    ]);
    
    // Create a map of existing events for the next week
    const existingNextWeekEvents = new Map();
    
    nextWeekEvents.forEach(event => {
      const eventDate = event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date);
      const dateStr = eventDate.toDateString();
      const key = `${dateStr}_${event.title}_${event.startTime}_${event.endTime}_${event.coachId}`;
      
      if (!existingNextWeekEvents.has(key)) {
        existingNextWeekEvents.set(key, []);
      }
      
      existingNextWeekEvents.get(key).push(event);
    });
    
    // Process each recurring event
    for (const event of recurringEvents) {
      try {
        const eventDate = event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date);
        
        // Calculate the day of week for this recurring event
        const eventDayOfWeek = eventDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Find the corresponding day in the next week
        const nextWeekDay = new Date(nextWeekStart);
        nextWeekDay.setDate(nextWeekStart.getDate() + ((eventDayOfWeek + 7 - nextWeekStart.getDay()) % 7));
        
        // Set the time from the original event
        const [hours, minutes] = event.startTime.split(':').map(Number);
        nextWeekDay.setHours(hours, minutes, 0, 0);
        
        console.log(`For event "${event.title}" on ${eventDate.toDateString()}, next occurrence should be on ${nextWeekDay.toDateString()} at ${event.startTime}`);
        
        // Check if an event already exists for this date, time, and title using our map
        const nextWeekKey = `${nextWeekDay.toDateString()}_${event.title}_${event.startTime}_${event.endTime}_${event.coachId}`;
        const existingEvents = existingNextWeekEvents.get(nextWeekKey) || [];
        
        // Only create a new event if one doesn't already exist for this time slot
        if (existingEvents.length === 0) {
          // Create a new event for the next week
          const { id, ...eventWithoutId } = event;
          const newEvent = {
            ...eventWithoutId,
            date: Timestamp.fromDate(nextWeekDay),
            isRecurringProcessed: false
          };
          
          // Add the new event
          const newId = await addDocument<Omit<Event, 'id'>>('events', newEvent);
          if (newId) {
            await syncCoachAvailabilityForEvent(event.coachId, Timestamp.fromDate(nextWeekDay), event.startTime, event.endTime);
          }
          console.log(`Created new recurring event with ID: ${newId} for date ${nextWeekDay.toDateString()}`);
          createdCount++;
        } else {
          console.log(`Event already exists for ${nextWeekDay.toDateString()}, skipping creation`);
          skippedCount++;
        }
        
        // Delete old recurring events (more than 2 weeks in the past)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        twoWeeksAgo.setHours(0, 0, 0, 0);
        
        if (eventDate < twoWeeksAgo && !event.isRecurringProcessed) {
          await deleteDocument('events', event.id);
          console.log(`Deleted old recurring event ${event.id} from ${eventDate.toDateString()}`);
        }
      } catch (error) {
        console.error(`Error processing recurring event ${event.id}:`, error);
      }
    }
    
    console.log(`Recurring events processing completed:`);
    console.log(`- Created: ${createdCount}`);
    console.log(`- Skipped (already exist): ${skippedCount}`);
    console.log(`- Duplicates removed: ${duplicatesRemoved}`);
  } catch (error) {
    console.error('Error processing recurring events:', error);
  }
};

// Get all notifications
export const getNotifications = async (): Promise<Notification[]> => {
  const notifications = await getCollection<Notification>('notifications');
  
  // Sort notifications by sentAt in descending order (newest first)
  return notifications.sort((a, b) => {
    const dateA = a.sentAt instanceof Timestamp ? a.sentAt.toDate() : new Date(a.sentAt);
    const dateB = b.sentAt instanceof Timestamp ? b.sentAt.toDate() : new Date(b.sentAt);
    return dateB.getTime() - dateA.getTime();
  });
}; 

// Subscribe to real-time notification updates
export const subscribeToNotifications = (callback: (notifications: Notification[]) => void) => {
  return subscribeToCollection<Notification>('notifications', (notifications) => {
    // Sort notifications by sentAt in descending order (newest first)
    const sortedNotifications = notifications.sort((a, b) => {
      const dateA = a.sentAt instanceof Timestamp ? a.sentAt.toDate() : new Date(a.sentAt);
      const dateB = b.sentAt instanceof Timestamp ? b.sentAt.toDate() : new Date(b.sentAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    callback(sortedNotifications);
  });
};

// Promote user to admin
export const promoteUserToAdmin = async (userId: string): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      isAdmin: true
    });
    console.log(`✅ User ${userId} promoted to admin successfully`);
    return true;
  } catch (error) {
    console.error("Error promoting user to admin:", error);
    return false;
  }
}; 

// Check for upcoming events and send notifications
export const checkUpcomingEventNotifications = async (): Promise<void> => {
  try {
    console.log('🔄 Checking for upcoming events...');

    // Get the current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('❌ No user logged in, skipping check');
      return;
    }

    // Check if we queried recently (cache)
    const CACHE_KEY = 'lastEventNotificationCheck';
    const CACHE_EXPIRATION_MINUTES = 30; // only query Firestore every 30 min
    
    try {
      const lastCheckRaw = await AsyncStorage.getItem(CACHE_KEY);
      if (lastCheckRaw) {
        const lastCheck = new Date(parseInt(lastCheckRaw, 10));
        const now = new Date();
        const diffMinutes = (now.getTime() - lastCheck.getTime()) / (1000 * 60);

        if (diffMinutes < CACHE_EXPIRATION_MINUTES) {
          console.log(`⏳ Skipping query (last check ${Math.floor(diffMinutes)} min ago)`);
          return; // avoid extra reads
        }
      }
    } catch (error) {
      // If there's an error with AsyncStorage, continue with the check
      console.warn('Error checking notification cache:', error);
    }

    // Time windows
    const now = new Date();
    const twoHoursLater = new Date(now);
    twoHoursLater.setHours(twoHoursLater.getHours() + 2);
    
    // Calculate notification time window (events that start in ~2 hours)
    const notificationWindowStart = new Date(now);
    notificationWindowStart.setHours(notificationWindowStart.getHours() + 1, notificationWindowStart.getMinutes() + 55);
    
    const notificationWindowEnd = new Date(now);
    notificationWindowEnd.setHours(notificationWindowEnd.getHours() + 2, notificationWindowEnd.getMinutes() + 5);

    // Query only events the user is interested in
    const events = await getCollection<Event>('events', [
      ['interestedUsers', 'array-contains', currentUser.uid],
      ['sendNotification', '==', true]
    ]);
    
    // Filter events that start in approximately 2 hours
    const upcomingEvents = events.filter(event => {
      // Calculate event time
      const eventDate = event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date);
      const [eventHours, eventMinutes] = event.startTime.split(':').map(Number);
      eventDate.setHours(eventHours, eventMinutes, 0, 0);
      
      // Calculate notification time (2 hours before event)
      const notificationTime = new Date(eventDate);
      notificationTime.setHours(notificationTime.getHours() - 2);
      
      // Check if notification time is in our window
      return notificationTime >= now && notificationTime <= notificationWindowEnd;
    });
    
    console.log(`📥 Found ${upcomingEvents.length} upcoming events for this user`);

    if (upcomingEvents.length === 0) {
      console.log('✅ No upcoming events needing notification');
      await AsyncStorage.setItem(CACHE_KEY, now.getTime().toString());
      return;
    }

    // Get user's push token
    const userData = await getUserById(currentUser.uid);
    const userPushToken = userData?.pushToken;
    
    if (!userPushToken) {
      console.log('❌ No push token for this user');
      return;
    }

    // Check for already notified events
    const NOTIFIED_EVENTS_KEY = 'alreadyNotifiedEvents';
    let alreadyNotifiedEvents: string[] = [];
    
    try {
      const notifiedEventsRaw = await AsyncStorage.getItem(NOTIFIED_EVENTS_KEY);
      if (notifiedEventsRaw) {
        alreadyNotifiedEvents = JSON.parse(notifiedEventsRaw);
      }
    } catch (error) {
      console.warn('Error reading already notified events:', error);
    }

    // For each event, send notification if not already sent
    const newlyNotifiedEvents: string[] = [];
    
    for (const event of upcomingEvents) {
      // Skip if already notified
      if (alreadyNotifiedEvents.includes(event.id)) {
        console.log(`⏭️ Already notified for event ${event.id}, skipping`);
        continue;
      }
      
      try {
        // Construct event time
        const eventDate = event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date);
        const formattedTime = event.startTime;
        
        // Notification text
        const title = `Upcoming: ${event.title}`;
        const body = `Your event starts in 2 hours at ${formattedTime}`;
        
        await sendPushNotification(userPushToken, title, body, {
          eventId: event.id,
          screen: 'events',
        });
        
        console.log(`📩 Sent notification for event ${event.id}`);
        
        // Add to list of notified events
        newlyNotifiedEvents.push(event.id);
        
        // Record this notification in the notifications collection (optional)
        await sendNotification({
          title: title,
          message: body,
          sentBy: 'system',
          recipients: [currentUser.uid]
        });
      } catch (error) {
        console.error(`🔥 Error sending notification for event ${event.id}:`, error);
      }
    }
    
    // Update the list of notified events
    if (newlyNotifiedEvents.length > 0) {
      try {
        const updatedNotifiedEvents = [...alreadyNotifiedEvents, ...newlyNotifiedEvents];
        // Keep only the last 100 events to prevent the list from growing too large
        const trimmedNotifiedEvents = updatedNotifiedEvents.slice(-100);
        await AsyncStorage.setItem(NOTIFIED_EVENTS_KEY, JSON.stringify(trimmedNotifiedEvents));
      } catch (error) {
        console.error('Error updating notified events:', error);
      }
    }
    
    // Update cache after successful query
    await AsyncStorage.setItem(CACHE_KEY, now.getTime().toString());

  } catch (error) {
    console.error('🔥 Error checking upcoming events:', error);
  }
}; 

// Function to clean up duplicate events - can be called from admin panel
export const cleanupAllDuplicateEvents = async (): Promise<{
  totalEvents: number;
  uniqueEvents: number;
  duplicatesRemoved: number;
}> => {
  try {
    console.log('Starting cleanup of all duplicate events...');
    
    // Get all events
    const allEvents = await getCollection<Event>('events');
    
    console.log(`Found ${allEvents.length} total events`);
    
    // Group events by date, title, startTime, endTime, and coachId
    const eventGroups = new Map();
    
    allEvents.forEach(event => {
      const eventDate = event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date);
      const dateStr = eventDate.toDateString();
      
      // Create a unique key for each event based on its properties
      const key = `${dateStr}_${event.title}_${event.startTime}_${event.endTime}_${event.coachId}`;
      
      if (!eventGroups.has(key)) {
        eventGroups.set(key, []);
      }
      
      eventGroups.get(key).push(event);
    });
    
    // Find groups with more than one event (duplicates)
    let duplicatesRemoved = 0;
    let uniqueEvents = 0;
    
    for (const [key, events] of eventGroups.entries()) {
      if (events.length > 1) {
        console.log(`Found ${events.length} duplicates for event: ${key}`);
        
        // Sort by creation date if available, or just keep the first one
        // Keep the one with interested users if any
        events.sort((a: Event, b: Event) => {
          // If one has interested users and the other doesn't, keep the one with interested users
          if ((a.interestedUsers?.length || 0) > 0 && (!b.interestedUsers || b.interestedUsers.length === 0)) {
            return -1;
          }
          if ((b.interestedUsers?.length || 0) > 0 && (!a.interestedUsers || a.interestedUsers.length === 0)) {
            return 1;
          }
          return 0;
        });
        
        // Keep the first one (either with interested users or just the first one)
        const keepEvent = events[0];
        uniqueEvents++;
        
        // Delete the rest
        for (let i = 1; i < events.length; i++) {
          await deleteDocument('events', events[i].id);
          duplicatesRemoved++;
          console.log(`Deleted duplicate event: ${events[i].id}`);
        }
      } else {
        uniqueEvents++;
      }
    }
    
    console.log(`Cleanup complete:`);
    console.log(`- Total events: ${allEvents.length}`);
    console.log(`- Unique events: ${uniqueEvents}`);
    console.log(`- Duplicates removed: ${duplicatesRemoved}`);
    
    return {
      totalEvents: allEvents.length,
      uniqueEvents,
      duplicatesRemoved
    };
    
  } catch (error) {
    console.error('Error cleaning up duplicate events:', error);
    throw error;
  }
};

// Reset isRecurringProcessed flag for all recurring events
export const resetAllRecurringEvents = async (): Promise<number> => {
  try {
    console.log('Resetting isRecurringProcessed flag for all recurring events...');
    
    // Get all recurring events
    const recurringEvents = await getCollection<Event>('events', [
      ['isRecurring', '==', true]
    ]);
    
    console.log(`Found ${recurringEvents.length} recurring events`);
    
    // Reset isRecurringProcessed flag for all recurring events
    let updatedCount = 0;
    for (const event of recurringEvents) {
      await updateDocument<Event>('events', event.id, {
        isRecurringProcessed: false
      });
      updatedCount++;
      console.log(`Reset isRecurringProcessed flag for event: ${event.id}`);
    }
    
    console.log(`Reset complete for ${updatedCount} recurring events`);
    return updatedCount;
    
  } catch (error) {
    console.error('Error resetting recurring events:', error);
    throw error;
  }
}; 