import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
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
  );
}
