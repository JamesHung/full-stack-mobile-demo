import { useQueryClient } from "@tanstack/react-query";
import { noteKeys } from "../queries/keys";

export function useRefreshNotes() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: noteKeys.list() });
  };
}
