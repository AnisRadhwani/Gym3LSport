import { Redirect } from 'expo-router';

export default function Home() {
  // This file handles the /home route and redirects to the user home screen
  return <Redirect href="/(user)/home" />;
} 