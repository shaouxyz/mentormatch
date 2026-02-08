import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { UnreadMessagesProvider } from '@/contexts/UnreadMessagesContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
      <SafeAreaProvider>
        <AuthProvider>
          <UnreadMessagesProvider>
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
            <Stack.Screen name="meeting/schedule" />
            <Stack.Screen name="meeting/respond" />
            <Stack.Screen name="meeting/upcoming" />
          <Stack.Screen name="meeting/add-to-calendar" />
            <Stack.Screen name="messages/chat" />
          </Stack>
          </UnreadMessagesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
