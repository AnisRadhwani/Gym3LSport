import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAO3f6ObeKDaXDm19BUjRG3k9rHvRug8Gc",
  authDomain: "lgym-badb1.firebaseapp.com",
  projectId: "lgym-badb1",
  storageBucket: "lgym-badb1.firebasestorage.app",
  messagingSenderId: "345817903205",
  appId: "1:345817903205:web:b75a0fa387a65003cb168c",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Functions
export const functions = getFunctions(app); 

export const auth = getAuth(app);