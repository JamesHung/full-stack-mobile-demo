import { Stack } from "expo-router";
import { AppProviders } from "../providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notes/create" />
        <Stack.Screen name="notes/[noteId]" />
      </Stack>
    </AppProviders>
  );
}
