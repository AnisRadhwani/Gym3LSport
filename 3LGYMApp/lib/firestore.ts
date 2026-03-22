import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  enableIndexedDbPersistence,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { auth } from './auth';

// Your web app's Firebase configuration is imported from auth.ts
// Initialize Firestore
const db = getFirestore();

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firebase persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn('Firebase persistence not supported in this browser');
    }
  });

// Generic fetch document by ID
export const getDocumentById = async <T>(collectionName: string, id: string): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error; // Propagate the error to handle it in the UI
  }
};

// Generic fetch collection
export const getCollection = async <T>(
  collectionName: string, 
  whereConditions?: [string, any, any][],
  orderByField?: string,
  limitCount?: number
): Promise<T[]> => {
  try {
    let collectionRef = collection(db, collectionName);
    let queryRef = query(collectionRef);
    
    // Add where conditions if provided
    if (whereConditions && whereConditions.length > 0) {
      whereConditions.forEach(condition => {
        queryRef = query(queryRef, where(condition[0], condition[1], condition[2]));
      });
    }
    
    // Add orderBy if provided
    if (orderByField) {
      queryRef = query(queryRef, orderBy(orderByField));
    }
    
    // Add limit if provided
    if (limitCount) {
      queryRef = query(queryRef, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(queryRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
  } catch (error) {
    console.error('Error getting collection:', error);
    return [];
  }
};

// Subscribe to real-time updates from a collection
export const subscribeToCollection = <T>(
  collectionName: string,
  callback: (data: T[]) => void,
  whereConditions?: [string, any, any][],
  orderByField?: string,
  limitCount?: number
) => {
  try {
    let collectionRef = collection(db, collectionName);
    let queryRef = query(collectionRef);
    
    // Add where conditions if provided
    if (whereConditions && whereConditions.length > 0) {
      whereConditions.forEach(condition => {
        queryRef = query(queryRef, where(condition[0], condition[1], condition[2]));
      });
    }
    
    // Add orderBy if provided
    if (orderByField) {
      queryRef = query(queryRef, orderBy(orderByField));
    }
    
    // Add limit if provided
    if (limitCount) {
      queryRef = query(queryRef, limit(limitCount));
    }
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(queryRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
      callback(data);
    }, (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
    });
    
    // Return unsubscribe function to clean up listener when component unmounts
    return unsubscribe;
  } catch (error) {
    console.error(`Error setting up subscription to ${collectionName}:`, error);
    return () => {}; // Return empty function if subscription fails
  }
};

// Generic add document
export const addDocument = async <T>(collectionName: string, data: T): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error('Error adding document:', error);
    return null;
  }
};

// Generic update document
export const updateDocument = async <T>(collectionName: string, id: string, data: Partial<T>): Promise<boolean> => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data as DocumentData);
    return true;
  } catch (error) {
    console.error('Error updating document:', error);
    return false;
  }
};

// Generic delete document
export const deleteDocument = async (collectionName: string, id: string): Promise<boolean> => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
};

// Set document with specific ID
export const setDocument = async (collectionName: string, id: string, data: any, merge: boolean = false): Promise<boolean> => {
  try {
    console.log("🧪 Firestore write test:");
    console.log("➡️ Auth UID:", auth.currentUser?.uid);
    console.log("➡️ Target UID:", id);
    console.log("➡️ Equal?", auth.currentUser?.uid === id);
    
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data, { merge });
    console.log("✅ New user document created successfully");
    return true;
  } catch (error) {
    console.error("Error creating/updating user document:", error);
    return false;
  }
};

export { db }; 