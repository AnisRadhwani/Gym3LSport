import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, getCurrentUser } from '../lib/auth';
import { getDocumentById } from '../lib/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firestore';

// Define user profile type
export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  photoURL: string;
  membershipType: string;
  membershipDaysLeft: number;
  isAdmin: boolean;
  fullName?: string; // Added to support the fullName field used in Firestore
  lastUpdated?: any; // Add lastUpdated field
}

export const useUser = () => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);

      // Clean up any existing user doc listener before creating a new one
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        // Start with a fallback profile based on auth user
        const fallbackProfile: UserProfile = {
          id: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email || '',
          email: firebaseUser.email || '',
          phoneNumber: firebaseUser.phoneNumber || '',
          photoURL: firebaseUser.photoURL || '',
          membershipType: 'In Progress',
          membershipDaysLeft: 0,
          isAdmin: false,
        };
        setUserProfile((prev) => prev ?? fallbackProfile);
        setLoading(true);

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const userData = docSnapshot.data();
              const profile = {
                id: docSnapshot.id,
                ...userData,
                displayName: userData.displayName || userData.fullName || '',
              } as UserProfile;

              setUserProfile(profile);
            } else {
              console.log('User document does not exist');
              // Keep fallback profile instead of clearing
              setUserProfile((prev) => prev ?? fallbackProfile);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching user profile:', error);
            // Keep whatever profile we already have (fallback or last good)
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Cleanup auth and user doc subscriptions
    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  return {
    user,
    userProfile,
    loading,
    isAdmin: userProfile?.isAdmin || false,
  };
};

export default useUser; 