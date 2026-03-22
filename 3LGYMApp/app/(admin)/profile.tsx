import { Redirect } from 'expo-router';

/**
 * Old admin profile route – redirects to the new admin-profile screen
 * so admins never see the broken page. User profile stays at (user)/profile.
 */
export default function ProfileRedirect() {
  return <Redirect href={'/(admin)/admin-profile' as any} />;
}
