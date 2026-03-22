/**
 * Script to promote a user to admin status
 * 
 * Usage: 
 * node scripts/promote-admin.js <user-id>
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function promoteUserToAdmin(userId) {
  if (!userId) {
    console.error('Error: User ID is required');
    console.log('Usage: node scripts/promote-admin.js <user-id>');
    process.exit(1);
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      isAdmin: true
    });
    console.log(`✅ User ${userId} promoted to admin successfully`);
    process.exit(0);
  } catch (error) {
    console.error("Error promoting user to admin:", error);
    process.exit(1);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
promoteUserToAdmin(userId); 