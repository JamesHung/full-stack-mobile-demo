import { useSyncExternalStore } from "react";
import type { AuthSessionDto } from "@voice-notes/shared";
import { ApiClient } from "../../lib/api/client";

let currentSession: AuthSessionDto | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

export function getAuthSession() {
  return currentSession;
}

export function setAuthSession(session: AuthSessionDto | null) {
  currentSession = session;
  emitChange();
}

export function clearAuthSession() {
  setAuthSession(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuthSession() {
  return useSyncExternalStore(subscribe, getAuthSession, getAuthSession);
}

export function useAuthenticatedApiClient() {
  const session = useAuthSession();
  return new ApiClient({ accessToken: session?.accessToken ?? null });
}
