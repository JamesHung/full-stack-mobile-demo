import { Platform } from "react-native";

export type ApiBaseUrlPlatform = "android" | "ios" | "web";

export interface ApiBaseUrlEnv {
  EXPO_PUBLIC_API_BASE_URL?: string;
  EXPO_PUBLIC_API_BASE_URL_ANDROID?: string;
  EXPO_PUBLIC_API_BASE_URL_IOS?: string;
}

const DEFAULT_API_BASE_URLS: Record<ApiBaseUrlPlatform, string> = {
  android: "http://10.0.2.2:8000",
  ios: "http://127.0.0.1:8000",
  web: "http://localhost:8000",
};

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function resolveApiBaseUrl(platform: ApiBaseUrlPlatform, env: ApiBaseUrlEnv = process.env): string {
  const platformOverride =
    platform === "android"
      ? env.EXPO_PUBLIC_API_BASE_URL_ANDROID
      : platform === "ios"
        ? env.EXPO_PUBLIC_API_BASE_URL_IOS
        : undefined;

  if (platformOverride?.trim()) {
    return normalizeUrl(platformOverride.trim());
  }

  if (env.EXPO_PUBLIC_API_BASE_URL?.trim()) {
    return normalizeUrl(env.EXPO_PUBLIC_API_BASE_URL.trim());
  }

  return DEFAULT_API_BASE_URLS[platform];
}

export function getApiBaseUrl(env: ApiBaseUrlEnv = process.env): string {
  const platform: ApiBaseUrlPlatform = Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : "web";
  return resolveApiBaseUrl(platform, env);
}
