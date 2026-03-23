import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateNoteRequestDto, UploadAudioInputDto } from "@voice-notes/shared";
import { createNote, demoLogin, uploadAudio } from "../api/createNote";
import { noteKeys } from "./keys";
import { ApiClient } from "../../../lib/api/client";

export function useDemoLogin(client: ApiClient) {
  return useMutation({
    mutationFn: (email: string) => demoLogin(client, email),
  });
}

export function useCreateNote(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNoteRequestDto) => createNote(client, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: noteKeys.list() });
    },
  });
}

export function useUploadAudio(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UploadAudioInputDto }) =>
      uploadAudio(client, noteId, payload),
    onSuccess: async (_, { noteId }) => {
      await queryClient.invalidateQueries({ queryKey: noteKeys.list() });
      await queryClient.invalidateQueries({ queryKey: noteKeys.detail(noteId) });
    },
  });
}
