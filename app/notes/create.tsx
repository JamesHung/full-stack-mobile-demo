import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import type { UploadAudioInputDto } from "@voice-notes/shared";
import { validateCreateNotePayload, validateUploadAudioPayload } from "@voice-notes/shared";
import { ApiError } from "../lib/api/client";
import { useAuthSession, useAuthenticatedApiClient } from "../features/auth/session";
import { getCreateVoiceNoteState } from "../features/notes/components/CreateVoiceNoteForm";
import { useCreateNote, useUploadAudio } from "../features/notes/queries/useCreateVoiceNote";

const SAMPLE_AUDIO: UploadAudioInputDto = {
  fileName: "@e2e.m4a",
  mimeType: "audio/mp4",
  fileSizeBytes: 1_024_000,
  durationSeconds: 68,
};

export function buildCreateScreenState(overrides?: {
  title?: string;
  audio?: UploadAudioInputDto;
  error?: string | null;
  isSubmitting?: boolean;
}) {
  return getCreateVoiceNoteState({
    title: overrides?.title ?? "",
    audio: overrides?.audio,
    error: overrides?.error,
    isSubmitting: overrides?.isSubmitting,
  });
}

export default function CreateNoteScreen() {
  const router = useRouter();
  const session = useAuthSession();
  const [title, setTitle] = useState("");
  const [selectedAudio, setSelectedAudio] = useState<UploadAudioInputDto | undefined>();
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const client = useAuthenticatedApiClient();
  const createMutation = useCreateNote(client);
  const uploadMutation = useUploadAudio(client);
  const isSubmitting = createMutation.isPending || uploadMutation.isPending;
  const formState = buildCreateScreenState({
    title,
    audio: selectedAudio,
    error: errorMessage,
    isSubmitting,
  });

  async function handleSubmit() {
    if (!session?.accessToken) {
      setErrorMessage("Sign in before creating a note.");
      return;
    }

    const titleErrors = validateCreateNotePayload({ title });
    const audioErrors = selectedAudio ? validateUploadAudioPayload(selectedAudio) : ["Choose an audio file first."];
    const firstError = [...titleErrors, ...audioErrors][0];
    if (firstError) {
      setErrorMessage(firstError);
      return;
    }

    try {
      setErrorMessage(null);
      const createdNote = await createMutation.mutateAsync({ title });
      setCreatedNoteId(createdNote.id);
      await uploadMutation.mutateAsync({
        noteId: createdNote.id,
        payload: selectedAudio as UploadAudioInputDto,
      });
      router.replace(`/notes/${createdNote.id}`);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to upload the voice note.");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.back();
          }}
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Create a voice note</Text>
        <Text style={styles.description}>Draft a title, pick a sample clip, then upload it for background processing.</Text>
        <TextInput
          onChangeText={setTitle}
          placeholder="Sprint recap"
          style={styles.input}
          value={title}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSelectedAudio(SAMPLE_AUDIO);
            setErrorMessage(null);
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.secondaryLabel}>
            {selectedAudio ? `Selected ${selectedAudio.fileName}` : "Upload sample"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void handleSubmit();
          }}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.primaryLabel}>{isSubmitting ? "Uploading…" : "Create note"}</Text>
        </Pressable>
        <View style={styles.feedback}>
          <Text style={styles.feedbackStatus}>{formState.status}</Text>
          <Text style={styles.feedbackMessage}>{formState.message}</Text>
          {createdNoteId ? <Text style={styles.noteId}>Latest note: {createdNoteId}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4efe7",
    padding: 24,
  },
  card: {
    marginTop: 36,
    borderRadius: 24,
    backgroundColor: "#fffdf9",
    padding: 24,
    gap: 14,
  },
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#efe7d8",
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
    color: "#1d2430",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#596273",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d8cfbf",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  primaryButton: {
    backgroundColor: "#1d2430",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#ece4d4",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  primaryLabel: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryLabel: {
    color: "#5e4930",
    fontWeight: "600",
    fontSize: 16,
  },
  feedback: {
    borderRadius: 16,
    backgroundColor: "#f3f0ea",
    padding: 16,
    gap: 6,
  },
  feedbackStatus: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    color: "#87654d",
  },
  feedbackMessage: {
    fontSize: 15,
    color: "#39424e",
  },
  noteId: {
    fontSize: 12,
    color: "#6b7280",
  },
});
