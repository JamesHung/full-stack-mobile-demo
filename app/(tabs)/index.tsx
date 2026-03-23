import type { NoteListResponseDto } from "@voice-notes/shared";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "../lib/api/client";
import { useAuthSession, useAuthenticatedApiClient } from "../features/auth/session";
import { renderNoteCardCopy } from "../features/notes/components/NoteCard";
import { useNoteList } from "../features/notes/queries/useNoteList";
import { useRefreshNotes } from "../features/notes/hooks/useRefreshNotes";

export function getListScreenState(response?: NoteListResponseDto, error?: string | null) {
  if (error) {
    return "error";
  }

  if (!response) {
    return "loading";
  }

  return response.items.length === 0 ? "empty" : "ready";
}

export default function NotesListScreen() {
  const router = useRouter();
  const session = useAuthSession();
  const client = useAuthenticatedApiClient();
  const query = useNoteList(client, Boolean(session?.accessToken));
  const refreshNotes = useRefreshNotes();
  const error = query.error instanceof ApiError ? query.error.message : query.error ? "Unable to load notes." : null;
  const state = getListScreenState(query.data, error);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your notes</Text>
          <Text style={styles.subtitle}>Manual refresh keeps async processing states explicit.</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push("/notes/create");
            }}
            style={({ pressed }) => [styles.createButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.createLabel}>Create</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void refreshNotes();
            }}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.refreshLabel}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      {!session?.accessToken ? <Text style={styles.message}>Sign in first to load and manage notes.</Text> : null}
      {session?.accessToken && state === "loading" ? <Text style={styles.message}>Loading notes…</Text> : null}
      {state === "error" ? <Text style={styles.message}>{error}</Text> : null}
      {state === "empty" ? <Text style={styles.message}>No notes yet. Create one to start the processing flow.</Text> : null}

      {session?.accessToken && state === "ready" && query.data ? (
        <ScrollView contentContainerStyle={styles.list}>
          {query.data.items.map((note) => {
            const copy = renderNoteCardCopy(note);
            return (
              <Pressable
                key={note.id}
                accessibilityRole="button"
                onPress={() => {
                  router.push(`/notes/${note.id}`);
                }}
                style={({ pressed }) => [styles.card, pressed && styles.buttonPressed]}
              >
                <Text style={styles.cardTitle}>{copy.title}</Text>
                <Text style={styles.cardStatus}>{note.status}</Text>
                <Text style={styles.cardSubtitle}>{copy.subtitle}</Text>
                <Text style={styles.cardTimestamp}>{copy.updatedAt}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f4ef",
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e2430",
  },
  subtitle: {
    marginTop: 4,
    color: "#5b6574",
    fontSize: 14,
  },
  refreshButton: {
    backgroundColor: "#1e2430",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createButton: {
    backgroundColor: "#ece4d4",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  refreshLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  createLabel: {
    color: "#5e4930",
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  message: {
    fontSize: 15,
    color: "#47505e",
    paddingVertical: 16,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1e2430",
  },
  cardStatus: {
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1,
    color: "#8d6747",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#48515f",
  },
  cardTimestamp: {
    fontSize: 12,
    color: "#6b7280",
  },
});
