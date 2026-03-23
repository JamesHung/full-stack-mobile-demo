import type { NoteDetailDto } from "@voice-notes/shared";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ApiError } from "../lib/api/client";
import { useAuthSession, useAuthenticatedApiClient } from "../features/auth/session";
import { getResultPanelState } from "../features/notes/components/ResultPanel";
import { useNoteDetail, useRetryNote } from "../features/notes/queries/useNoteDetail";

export function getNoteDetailScreenState(note: NoteDetailDto) {
  return getResultPanelState(note);
}

export default function NoteDetailScreen() {
  const router = useRouter();
  const session = useAuthSession();
  const params = useLocalSearchParams<{ noteId?: string }>();
  const noteId = typeof params.noteId === "string" ? params.noteId : "demo-note";
  const client = useAuthenticatedApiClient();
  const query = useNoteDetail(client, noteId, Boolean(session?.accessToken));
  const retryMutation = useRetryNote(client, noteId);

  if (!session?.accessToken) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Sign in first to open note details.</Text>
      </SafeAreaView>
    );
  }

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Loading note detail…</Text>
      </SafeAreaView>
    );
  }

  if (!query.data) {
    const message = query.error instanceof ApiError ? query.error.message : "Unable to load note detail.";
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>{message}</Text>
      </SafeAreaView>
    );
  }

  const panel = getNoteDetailScreenState(query.data);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.back();
          }}
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.title}>{query.data.title || "Untitled note"}</Text>
        <Text style={styles.status}>{query.data.status}</Text>

        {panel.mode === "completed" ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.body}>{panel.summary}</Text>
            <Text style={styles.sectionTitle}>Transcript</Text>
            <Text style={styles.body}>{panel.transcript}</Text>
            <Text style={styles.sectionTitle}>Tags</Text>
            <Text style={styles.body}>{panel.tags?.join(", ") || "No tags"}</Text>
          </View>
        ) : null}

        {panel.mode === "failed" ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Failure</Text>
            <Text style={styles.body}>{panel.errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void retryMutation.mutateAsync();
              }}
              style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.retryLabel}>{retryMutation.isPending ? "Retrying…" : "Retry"}</Text>
            </Pressable>
          </View>
        ) : null}

        {panel.mode === "pending" ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Processing</Text>
            <Text style={styles.body}>{panel.message}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f2ea",
  },
  content: {
    padding: 24,
    gap: 14,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#ece4d4",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backLabel: {
    color: "#5e4930",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e2430",
  },
  status: {
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
    color: "#8b6747",
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#8b6747",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#36404d",
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#1e2430",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  message: {
    padding: 24,
    fontSize: 15,
    color: "#4b5563",
  },
});
