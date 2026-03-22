// Script to clean up duplicate events
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc,
  Timestamp,
  query,
  where,
  updateDoc
} = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAO3f6ObeKDaXDm19BUjRG3k9rHvRug8Gc",
  authDomain: "lgym-badb1.firebaseapp.com",
  projectId: "lgym-badb1",
  storageBucket: "lgym-badb1.firebasestorage.app",
  messagingSenderId: "345817903205",
  appId: "1:345817903205:web:b75a0fa387a65003cb168c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupDuplicateEvents() {
  try {
    console.log('Starting cleanup of duplicate events...');
    
    // Get all events
    const eventsRef = collection(db, 'events');
    const eventsSnapshot = await getDocs(eventsRef);
    const allEvents = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${allEvents.length} total events`);
    
    // Group events by date, title, startTime, endTime, and coachId
    const eventGroups = new Map();
    
    allEvents.forEach(event => {
      const eventDate = event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date.seconds * 1000);
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
        events.sort((a, b) => {
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
          const eventRef = doc(db, 'events', events[i].id);
          await deleteDoc(eventRef);
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
    
  } catch (error) {
    console.error('Error cleaning up duplicate events:', error);
  }
}

// Reset isRecurringProcessed flag for all recurring events
async function resetRecurringEvents() {
  try {
    console.log('Resetting isRecurringProcessed flag for all recurring events...');
    
    // Get all recurring events
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('isRecurring', '==', true));
    const eventsSnapshot = await getDocs(q);
    const recurringEvents = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${recurringEvents.length} recurring events`);
    
    // Reset isRecurringProcessed flag for all recurring events
    for (const event of recurringEvents) {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        isRecurringProcessed: false
      });
      console.log(`Reset isRecurringProcessed flag for event: ${event.id}`);
    }
    
    console.log(`Reset complete for ${recurringEvents.length} recurring events`);
    
  } catch (error) {
    console.error('Error resetting recurring events:', error);
  }
}

// Run the cleanup
cleanupDuplicateEvents().then(() => {
  console.log('Cleanup script completed');
}).catch(error => {
  console.error('Error running cleanup script:', error);
}); 