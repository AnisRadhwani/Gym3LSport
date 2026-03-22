import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, getCurrentUser, signIn, signUp, logOut } from '../lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const login = async (email: string, password: string) => {
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    return result;
  };

  // Sign up with email and password
  const register = async (email: string, password: string) => {
    setLoading(true);
    const result = await signUp(email, password);
    setLoading(false);
    return result;
  };

  // Sign out
  const logout = async () => {
    setLoading(true);
    const result = await logOut();
    setLoading(false);
    return result;
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
};

export default useAuth; 