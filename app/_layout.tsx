import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * Root Layout Component
 * 
 * Wraps the entire application with:
 * - Error boundary for global error handling
 * - Authentication context provider
 * - Navigation stack configuration
 * 
 * @component
 * @returns {JSX.Element} Root layout with providers and navigation
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile/create" />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="profile/view" />
          <Stack.Screen name="request/send" />
          <Stack.Screen name="request/respond" />
        </Stack>
      </AuthProvider>
    </ErrorBoundary>
  );
}
