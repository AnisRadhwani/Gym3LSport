import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAO3f6ObeKDaXDm19BUjRG3k9rHvRug8Gc",
  authDomain: "lgym-badb1.firebaseapp.com",
  projectId: "lgym-badb1",
  storageBucket: "lgym-badb1.firebasestorage.app",
  messagingSenderId: "345817903205",
  appId: "1:345817903205:web:b75a0fa387a65003cb168c",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Auth
// - Native (Android/iOS): use AsyncStorage persistence
// - Web: use default browser persistence
const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

// --- Error handler ---
export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error.code || "";
  switch (errorCode) {
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/email-already-in-use":
      return "This email is already in use.";
    case "auth/weak-password":
      return "Password is too weak.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    case "auth/too-many-requests":
      return "Too many login attempts. Try again later.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return "Something went wrong. Please try again.";
  }
};

// --- Auth functions ---
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: getAuthErrorMessage(error) };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: getAuthErrorMessage(error) };
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: getAuthErrorMessage(error) };
  }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export { auth };

export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};
