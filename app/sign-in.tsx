import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiClient, ApiError } from "./lib/api/client";
import { clearAuthSession, setAuthSession } from "./features/auth/session";
import { useDemoLogin } from "./features/notes/queries/useCreateVoiceNote";

export function getDemoLoginCopy(isSubmitting = false) {
  return isSubmitting ? "Signing in…" : "Sign in with the demo account";
}

export function buildSignInScreenState(args: {
  isSubmitting?: boolean;
  error?: string | null;
  displayName?: string | null;
}) {
  if (args.error) {
    return {
      tone: "error",
      message: args.error,
    };
  }

  if (args.displayName) {
    return {
      tone: "success",
      message: `Signed in as ${args.displayName}.`,
    };
  }

  return {
    tone: "neutral",
    message: "Use the seeded demo account to create and review voice notes.",
  };
}

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@example.com");
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useDemoLogin(new ApiClient());
  const screenState = buildSignInScreenState({
    isSubmitting: mutation.isPending,
    error: errorMessage,
    displayName: sessionName,
  });

  async function handleDemoLogin() {
    try {
      setErrorMessage(null);
      const session = await mutation.mutateAsync(email);
      setAuthSession(session);
      setSessionName(session.user.displayName);
      router.replace("/(tabs)");
    } catch (error) {
      clearAuthSession();
      setSessionName(null);
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to start the demo session.");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Voice Notes Summary</Text>
        <Text style={styles.title}>Demo sign-in</Text>
        <Text style={styles.description}>
          Authenticate as the seeded demo user before creating, uploading, and retrying notes.
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          style={styles.input}
          value={email}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void handleDemoLogin();
          }}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
        >
          <Text style={styles.primaryButtonLabel}>{getDemoLoginCopy(mutation.isPending)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            clearAuthSession();
            router.push("/(tabs)");
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.primaryButtonPressed]}
        >
          <Text style={styles.secondaryButtonLabel}>Continue without signing in</Text>
        </Pressable>
        <View style={[styles.feedback, screenState.tone === "error" ? styles.feedbackError : styles.feedbackNeutral]}>
          <Text style={styles.feedbackText}>{screenState.message}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f3ec",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#8a5a44",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e232c",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4c5563",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d7d1c7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fbfaf7",
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#1e232c",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d7d1c7",
    backgroundColor: "#fbfaf7",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonLabel: {
    color: "#1e232c",
    fontSize: 16,
    fontWeight: "600",
  },
  feedback: {
    borderRadius: 14,
    padding: 14,
  },
  feedbackNeutral: {
    backgroundColor: "#f1ede6",
  },
  feedbackError: {
    backgroundColor: "#fdecec",
  },
  feedbackText: {
    color: "#3f4752",
    fontSize: 14,
    lineHeight: 20,
  },
});
