export const noteKeys = {
  all: ["notes"] as const,
  list: () => [...noteKeys.all, "list"] as const,
  detail: (noteId: string) => [...noteKeys.all, "detail", noteId] as const,
};
