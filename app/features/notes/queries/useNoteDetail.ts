import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { canRetryNote } from "@voice-notes/shared";
import { getNoteDetail, retryNote } from "../api/createNote";
import { ApiClient } from "../../../lib/api/client";
import { noteKeys } from "./keys";

export function useNoteDetail(client: ApiClient, noteId: string, enabled = true) {
  return useQuery({
    queryKey: noteKeys.detail(noteId),
    queryFn: () => getNoteDetail(client, noteId),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "uploaded" || status === "processing" ? 3_000 : false;
    },
  });
}

export function useRetryNote(client: ApiClient, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const current = queryClient.getQueryData<{
        status?: string;
      }>(noteKeys.detail(noteId));
      if (current?.status && !canRetryNote(current.status)) {
        throw new Error("Retry is only available for failed notes.");
      }
      return retryNote(client, noteId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: noteKeys.list() });
      await queryClient.invalidateQueries({ queryKey: noteKeys.detail(noteId) });
    },
  });
}
