import { useQuery } from "@tanstack/react-query";
import { listNotes } from "../api/createNote";
import { ApiClient } from "../../../lib/api/client";
import { noteKeys } from "./keys";

export function useNoteList(client: ApiClient, enabled = true) {
  return useQuery({
    queryKey: noteKeys.list(),
    queryFn: () => listNotes(client),
    enabled,
  });
}
